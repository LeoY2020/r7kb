'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import ClickSpark from '@/components/reactbits/ClickSpark';
import Icon from '@/components/site/Icon';
import { useMistakes } from '@/components/mistakes/MistakesProvider';
import {
  formatDateTime,
  parseMistakesJson,
  type ImportResult,
  type Mistake,
} from '@/lib/mistakes';

type PreviewItem = {
  mistake: Mistake;
  /** 与本机错题本 id 相同 */
  duplicate: boolean;
};

type ParseState =
  | { phase: 'empty' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; fileName: string; fileSize: number; items: PreviewItem[]; invalid: number };

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** 截断题干用于预览 */
function stemPreview(stem: string): string {
  const compact = stem.replace(/\s+/g, ' ').trim();
  return compact.length > 80 ? `${compact.slice(0, 80)}…` : compact;
}

/**
 * 图形化错题导入：拖拽 / 选择文件 → 解析预览（可逐条勾选）→ 确认导入。
 * 不再让用户手写 JSON。
 */
export function ImportDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  /** 导入完成后的回调，用于展示 notice */
  onImported: (result: ImportResult) => void;
}) {
  const { mistakes, importParsedMistakes } = useMistakes();
  const [state, setState] = useState<ParseState>({ phase: 'empty' });
  const [dragging, setDragging] = useState(false);
  /** 被用户取消勾选的条目 id */
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const existingIds = useMemo(() => new Set(mistakes.map((item) => item.id)), [mistakes]);

  const reset = useCallback(() => {
    setState({ phase: 'empty' });
    setDragging(false);
    setExcluded(new Set());
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  // 关闭时清空状态，下次打开重新开始
  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  // Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const readFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = parseMistakesJson(text);
        if (parsed.error) {
          setState({ phase: 'error', message: parsed.error });
          return;
        }
        const items: PreviewItem[] = parsed.items.map((mistake) => ({
          mistake,
          duplicate: existingIds.has(mistake.id),
        }));
        if (items.length === 0 && parsed.invalid === 0) {
          setState({ phase: 'error', message: '文件里没有找到错题数据。' });
          return;
        }
        setState({
          phase: 'ready',
          fileName: file.name,
          fileSize: file.size,
          items,
          invalid: parsed.invalid,
        });
        setExcluded(new Set());
      } catch {
        setState({ phase: 'error', message: '读取文件失败，请重试。' });
      } finally {
        if (fileRef.current) fileRef.current.value = '';
      }
    },
    [existingIds]
  );

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void readFile(event.dataTransfer.files?.[0]);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const toggleItem = (id: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const ready = state.phase === 'ready' ? state : null;
  const selected = ready ? ready.items.filter((item) => !excluded.has(item.mistake.id)) : [];
  const selectedDuplicates = selected.filter((item) => item.duplicate).length;

  const handleConfirm = () => {
    if (!ready || selected.length === 0) return;
    const result = importParsedMistakes(selected.map((item) => item.mistake));
    onImported(result);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="导入错题"
    >
      {/* 背板 */}
      <button
        type="button"
        aria-label="关闭"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/40 backdrop-blur-md"
      />

      <div
        ref={dialogRef}
        className="relative flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-[20px] border border-line bg-surface shadow-lift"
      >
        {/* 标题栏 */}
        <div className="flex items-center gap-3 border-b border-line px-6 py-4">
          <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-accent-soft text-accent">
            <Icon name="upload" size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold tracking-tight text-ink">导入错题</p>
            <p className="text-[12px] text-ink-faint">选择或拖入导出的 JSON 文件，预览确认后写入错题本</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto grid h-8 w-8 place-items-center rounded-pill text-ink-faint transition-colors hover:bg-elevated hover:text-ink"
            aria-label="关闭导入窗口"
          >
            <Icon name="close" size={15} />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {state.phase === 'empty' ? (
            <div
              onDragEnter={() => setDragging(true)}
              onDragOver={handleDragOver}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`dot-grid flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all duration-200 ${
                dragging
                  ? 'scale-[1.01] border-accent bg-accent-soft/60'
                  : 'border-line bg-elevated'
              }`}
            >
              <span
                className={`grid h-14 w-14 place-items-center rounded-2xl border border-line bg-surface text-accent transition-transform duration-200 ${
                  dragging ? 'scale-110' : ''
                }`}
              >
                <Icon name="upload" size={22} />
              </span>
              <p className="mt-4 text-[14.5px] font-medium text-ink">
                {dragging ? '松手即可读取文件' : '把 JSON 文件拖到这里'}
              </p>
              <p className="mt-1 text-[12px] text-ink-faint">
                支持错题本导出的 Mistake[] 数组或 {'{ "mistakes": [...] }'} 格式
              </p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="btn-secondary mt-5 h-9 px-5 text-[13px]"
              >
                <Icon name="file" size={14} />
                选择文件
              </button>
            </div>
          ) : null}

          {state.phase === 'error' ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-rose/30 bg-rose/10 px-6 py-12 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose/15 text-rose">
                <Icon name="alert" size={20} />
              </span>
              <p className="mt-4 text-[14px] font-medium text-rose">{state.message}</p>
              <button
                type="button"
                onClick={() => {
                  setState({ phase: 'empty' });
                  setExcluded(new Set());
                }}
                className="btn-secondary mt-5 h-9 px-5 text-[13px]"
              >
                重新选择文件
              </button>
            </div>
          ) : null}

          {ready ? (
            <div>
              {/* 文件摘要 */}
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-elevated px-4 py-3">
                <Icon name="file" size={15} className="shrink-0 text-accent" />
                <span className="max-w-[240px] truncate text-[13px] font-medium text-ink">{ready.fileName}</span>
                <span className="text-[12px] text-ink-faint">{formatSize(ready.fileSize)}</span>
                <span className="ml-auto flex flex-wrap items-center gap-1.5">
                  <span className="chip bg-accent-soft text-accent">{ready.items.length} 道有效</span>
                  {ready.invalid > 0 ? (
                    <span className="chip border border-rose/30 bg-rose/10 text-rose">{ready.invalid} 条无效</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setState({ phase: 'empty' });
                      setExcluded(new Set());
                    }}
                    className="btn-quiet text-[12px]"
                  >
                    换一个文件
                  </button>
                </span>
              </div>

              {/* 条目预览 */}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-ink-faint">
                  预览 · 勾选要导入的条目
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (excluded.size === 0) setExcluded(new Set(ready.items.map((item) => item.mistake.id)));
                    else setExcluded(new Set());
                  }}
                  className="btn-quiet text-[12px]"
                >
                  {excluded.size === 0 ? '全不选' : '全选'}
                </button>
              </div>

              <ul className="mt-2.5 space-y-2" role="list">
                {ready.items.map((item) => {
                  const checked = !excluded.has(item.mistake.id);
                  return (
                    <li key={item.mistake.id}>
                      <label
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                          checked ? 'border-accent/40 bg-accent-soft/40' : 'border-line bg-elevated opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleItem(item.mistake.id)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--accent))]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5">
                            {item.mistake.subject ? (
                              <span className="chip bg-surface text-ink-muted">{item.mistake.subject}</span>
                            ) : null}
                            {item.duplicate ? (
                              <span className="chip border border-line text-ink-faint">已存在 · 会跳过</span>
                            ) : null}
                            {item.mistake.mastered ? (
                              <span className="chip bg-mint/10 text-mint">已掌握</span>
                            ) : null}
                            <span className="ml-auto text-[11px] text-ink-faint">
                              {formatDateTime(item.mistake.createdAt)}
                            </span>
                          </span>
                          <span className="mt-1.5 block text-[13.5px] leading-relaxed text-ink">
                            {stemPreview(item.mistake.stem)}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>

        {/* 底部操作 */}
        <div className="flex flex-wrap items-center gap-3 border-t border-line bg-elevated/60 px-6 py-4">
          {ready ? (
            <p className="text-[12px] text-ink-muted">
              将导入 <span className="font-semibold text-accent">{selected.length}</span> 道
              {selectedDuplicates > 0 ? `，其中 ${selectedDuplicates} 道与本机重复（自动跳过）` : ''}
              {ready.items.length - selected.length > 0
                ? `，已取消勾选 ${ready.items.length - selected.length} 道`
                : ''}
            </p>
          ) : (
            <p className="text-[12px] text-ink-faint">数据只保存在你自己的浏览器 localStorage 里</p>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn-secondary h-9 px-4 text-[13px]">
              取消
            </button>
            {ready ? (
              <ClickSpark
                sparkColor="rgb(var(--accent))"
                sparkCount={10}
                sparkSize={11}
                sparkRadius={26}
                className="inline-flex h-9 rounded-pill"
              >
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={selected.length === 0}
                  className="btn-primary h-9 px-5 text-[13px] disabled:opacity-50"
                >
                  <Icon name="check" size={14} />
                  确认导入 {selected.length > 0 ? selected.length : ''} 道
                </button>
              </ClickSpark>
            ) : null}
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => void readFile(event.target.files?.[0])}
        />
      </div>
    </div>
  );
}

export default ImportDialog;
