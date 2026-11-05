'use client';

import { useMemo, useState } from 'react';
import ClickSpark from '@/components/reactbits/ClickSpark';
import CountUp from '@/components/reactbits/CountUp';
import EmptyState from '@/components/site/EmptyState';
import Icon from '@/components/site/Icon';
import ImportDialog from '@/components/mistakes/ImportDialog';
import MistakeForm from '@/components/mistakes/MistakeForm';
import { useMistakes } from '@/components/mistakes/MistakesProvider';
import {
  collectFieldValues,
  copyText,
  downloadMistakes,
  formatDateTime,
  mistakeMatchesQuery,
  type ImportResult,
  type Mistake,
  type MistakeInput,
} from '@/lib/mistakes';

type StatusFilter = 'all' | 'open' | 'mastered';

const selectClass =
  'h-9 rounded-pill border border-line bg-surface px-3 text-[12px] text-ink outline-none transition-colors focus:border-accent';

function MistakeCard({
  mistake,
  onEdit,
  onDelete,
  onToggle,
}: {
  mistake: Mistake;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = [
      mistake.stem,
      mistake.answer ? `答案：${mistake.answer}` : '',
      mistake.explanation ? `解析：${mistake.explanation}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
    const ok = await copyText(text);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <article
      className={`rounded-card border bg-surface p-4 shadow-soft transition-colors sm:p-5 ${
        mistake.mastered ? 'border-mint/30' : 'border-line'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {mistake.subject ? (
          <span className="chip bg-accent-soft text-accent">{mistake.subject}</span>
        ) : null}
        {mistake.tags?.map((tag) => (
          <span key={tag} className="chip border border-line text-ink-muted">
            #{tag}
          </span>
        ))}
        {mistake.mastered ? (
          <span className="chip bg-mint/10 text-mint">
            <Icon name="check" size={11} />
            已掌握
          </span>
        ) : null}
        <span className="ml-auto text-[11px] text-ink-faint">{formatDateTime(mistake.createdAt)}</span>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-[14.5px] leading-[1.8] text-ink">{mistake.stem}</p>

      {mistake.answer || mistake.explanation ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent transition-colors hover:text-accent-hover"
            aria-expanded={open}
          >
            <Icon name="chevronDown" size={12} className={open ? 'rotate-180' : ''} />
            {open ? '收起答案与解析' : '展开答案与解析'}
          </button>
          {open ? (
            <div className="mt-2.5 space-y-2.5 rounded-xl bg-page/70 p-3.5">
              {mistake.answer ? (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">答案</p>
                  <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink">{mistake.answer}</p>
                </div>
              ) : null}
              {mistake.explanation ? (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">解析</p>
                  <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-muted">
                    {mistake.explanation}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
        {mistake.source ? <span className="mr-auto text-[12px] text-ink-faint">来源：{mistake.source}</span> : <span className="mr-auto" />}
        <button type="button" onClick={handleCopy} className="btn-quiet text-[12px]">
          <Icon name={copied ? 'check' : 'copy'} size={12} />
          {copied ? '已复制' : '复制'}
        </button>
        <button type="button" onClick={onToggle} className="btn-quiet text-[12px]">
          <Icon name="check" size={12} />
          {mistake.mastered ? '标记未掌握' : '标记已掌握'}
        </button>
        <button type="button" onClick={onEdit} className="btn-quiet text-[12px]">
          <Icon name="edit" size={12} />
          编辑
        </button>
        <button type="button" onClick={onDelete} className="btn-quiet text-[12px] text-rose hover:text-rose">
          <Icon name="trash" size={12} />
          删除
        </button>
      </div>
    </article>
  );
}

/** 错题本主界面：筛选、搜索、增删改、导入导出，全部数据存在 localStorage */
export function MistakesBrowser() {
  const {
    mistakes,
    hydrated,
    storageError,
    addMistake,
    updateMistake,
    removeMistake,
    toggleMastered,
    clearMistakes,
  } = useMistakes();

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [subject, setSubject] = useState('');
  const [source, setSource] = useState('');
  const [forming, setForming] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const subjects = useMemo(() => collectFieldValues(mistakes, 'subject'), [mistakes]);
  const sources = useMemo(() => collectFieldValues(mistakes, 'source'), [mistakes]);
  const masteredCount = mistakes.filter((item) => item.mastered).length;

  const filtered = useMemo(() => {
    return mistakes.filter((mistake) => {
      if (status === 'open' && mistake.mastered) return false;
      if (status === 'mastered' && !mistake.mastered) return false;
      if (subject && mistake.subject !== subject) return false;
      if (source && mistake.source !== source) return false;
      return mistakeMatchesQuery(mistake, query);
    });
  }, [mistakes, status, subject, source, query]);

  const editing = editingId ? mistakes.find((item) => item.id === editingId) ?? null : null;
  const showForm = forming || Boolean(editing);

  const closeForm = () => {
    setForming(false);
    setEditingId(null);
  };

  const handleSubmit = (input: MistakeInput) => {
    if (editing) updateMistake(editing.id, input);
    else addMistake(input);
    closeForm();
    setNotice(editing ? '已保存修改。' : '已加入错题本。');
  };

  const handleDelete = (mistake: Mistake) => {
    if (!window.confirm('确定删除这道错题？删除后无法恢复。')) return;
    removeMistake(mistake.id);
    if (editingId === mistake.id) closeForm();
    setNotice('已删除。');
  };

  const handleExport = () => {
    if (mistakes.length === 0) {
      setNotice('错题本为空，没有可导出的内容。');
      return;
    }
    const filename = downloadMistakes(mistakes);
    setNotice(`已导出 ${mistakes.length} 道错题：${filename}`);
  };

  const handleImported = (result: ImportResult) => {
    const parts = [`新增 ${result.added} 道`];
    if (result.duplicates) parts.push(`跳过重复 ${result.duplicates} 道`);
    setNotice(parts.join('，') + '。');
  };

  if (!hydrated) {
    return (
      <div className="rounded-card border border-line bg-surface px-6 py-14 text-center text-[13px] text-ink-muted">
        正在读取本机错题本…
      </div>
    );
  }

  return (
    <div>
      {/* 统计带 */}
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: '全部错题', value: mistakes.length, color: 'text-ink', suffix: '' },
          { label: '未掌握', value: mistakes.length - masteredCount, color: 'text-rose', suffix: '' },
          { label: '已掌握', value: masteredCount, color: 'text-mint', suffix: '' },
          {
            label: '掌握率',
            value: mistakes.length === 0 ? 0 : Math.round((masteredCount / mistakes.length) * 100),
            color: 'text-accent',
            suffix: '%',
          },
        ].map((item) => (
          <div key={item.label} className="card px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-faint">{item.label}</p>
            <p className={`mt-1 text-[24px] font-semibold tracking-tight ${item.color}`}>
              <CountUp to={item.value} from={0} duration={1} startWhen />
              {item.suffix}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Icon
            name="search"
            size={14}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索题干、答案、解析、标签…"
            className="h-10 w-full rounded-pill border border-line bg-surface pl-9 pr-4 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent"
            aria-label="搜索错题"
          />
        </div>

        <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className={selectClass} aria-label="掌握状态">
          <option value="all">全部（{mistakes.length}）</option>
          <option value="open">未掌握（{mistakes.length - masteredCount}）</option>
          <option value="mastered">已掌握（{masteredCount}）</option>
        </select>

        {subjects.length > 0 ? (
          <select value={subject} onChange={(event) => setSubject(event.target.value)} className={selectClass} aria-label="学科">
            <option value="">全部学科</option>
            {subjects.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        ) : null}

        {sources.length > 0 ? (
          <select value={source} onChange={(event) => setSource(event.target.value)} className={selectClass} aria-label="来源">
            <option value="">全部来源</option>
            {sources.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        ) : null}

        <ClickSpark
          sparkColor="rgb(var(--accent))"
          sparkCount={10}
          sparkSize={11}
          sparkRadius={26}
          className="inline-flex h-9"
        >
          <button
            type="button"
            onClick={() => {
              closeForm();
              setForming(true);
            }}
            className="btn-primary h-9 px-4 text-[13px]"
          >
            <Icon name="plus" size={14} />
            添加错题
          </button>
        </ClickSpark>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={handleExport} className="btn-secondary h-8 px-3 text-[12px]">
          <Icon name="download" size={13} />
          导出 JSON
        </button>
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="btn-secondary h-8 px-3 text-[12px]"
        >
          <Icon name="upload" size={13} />
          导入错题
        </button>
        {mistakes.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              if (!window.confirm(`确定清空全部 ${mistakes.length} 道错题？建议先导出备份。`)) return;
              clearMistakes();
              setNotice('错题本已清空。');
            }}
            className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-ink-faint transition-colors hover:text-rose"
          >
            <Icon name="trash" size={12} />
            清空
          </button>
        ) : null}
      </div>

      {notice ? (
        <p role="status" className="mt-3 rounded-xl border border-line bg-elevated px-3.5 py-2 text-[12px] text-ink-muted">
          {notice}
        </p>
      ) : null}

      {storageError ? (
        <p role="alert" className="mt-3 rounded-xl border border-rose/30 bg-rose/10 px-3.5 py-2 text-[12px] text-rose">
          {storageError}
        </p>
      ) : null}

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImported={handleImported} />

      {showForm ? (
        <div className="mt-5">
          <MistakeForm
            key={editing?.id ?? 'new'}
            initial={editing}
            subjectOptions={subjects}
            sourceOptions={sources}
            onSubmit={handleSubmit}
            onCancel={closeForm}
          />
        </div>
      ) : null}

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] text-ink-faint">
            显示 {filtered.length} / {mistakes.length} 道
          </p>
          {(subject || source || status !== 'all' || query) ? (
            <button
              type="button"
              onClick={() => {
                setSubject('');
                setSource('');
                setStatus('all');
                setQuery('');
              }}
              className="btn-quiet text-[12px]"
            >
              清除筛选
            </button>
          ) : null}
        </div>

        <div className="mt-3 space-y-3">
          {filtered.map((mistake) => (
            <MistakeCard
              key={mistake.id}
              mistake={mistake}
              onEdit={() => {
                setForming(false);
                setEditingId(mistake.id);
              }}
              onDelete={() => handleDelete(mistake)}
              onToggle={() => toggleMastered(mistake.id)}
            />
          ))}
        </div>

        {filtered.length === 0 ? (
          mistakes.length === 0 ? (
            <EmptyState
              icon="notebook"
              title="错题本还是空的"
              description="从知识库的题目块一键加入，或者直接点上面的「添加错题」手动录入。所有内容只保存在你自己的浏览器里，可随时导出 JSON。"
              action={
                <button type="button" onClick={() => setForming(true)} className="btn-primary">
                  <Icon name="plus" size={15} />
                  添加第一道错题
                </button>
              }
            />
          ) : (
            <EmptyState
              compact
              icon="filter"
              title="没有符合条件的错题"
              description="换个关键词，或者清除筛选条件再试一次。"
              action={
                <button
                  type="button"
                  onClick={() => {
                    setSubject('');
                    setSource('');
                    setStatus('all');
                    setQuery('');
                  }}
                  className="btn-secondary"
                >
                  清除筛选
                </button>
              }
            />
          )
        ) : null}
      </div>
    </div>
  );
}

export default MistakesBrowser;
