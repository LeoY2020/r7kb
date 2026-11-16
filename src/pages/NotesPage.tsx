import { useMemo, useState } from 'react';
import {
  buildVaultTree,
  deriveSlug,
  parseNote,
  safeFileName,
  today,
  uniqueSlug,
  VAULT_PREFIX,
  type TreeDir,
  type TreeNote,
} from '../lib/notes';
import { parseBlocks, serializeBlocks } from '../lib/blocks';
import { useWorkspace } from '../lib/workspace';
import type { Note } from '../lib/types';
import { Button, Empty, Field, Icon, IconButton, Modal, useToast } from '../components/ui';
import BlockEditor from '../components/BlockEditor';

function Tree({
  dirs,
  notes,
  activePath,
  dirty,
  onSelect,
}: {
  dirs: TreeDir[];
  notes: TreeNote[];
  activePath: string;
  dirty: (path: string) => boolean;
  onSelect: (path: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const renderNote = (note: TreeNote) => (
    <button
      key={note.path}
      type="button"
      className="tree-note"
      data-active={activePath === note.path}
      data-dirty={dirty(note.path)}
      onClick={() => onSelect(note.path)}
      title={note.path}
    >
      <Icon name="file" size={13} />
      <span>{note.title}</span>
    </button>
  );

  const renderDir = (dir: TreeDir) => {
    const isCollapsed = collapsed[dir.rel];
    return (
      <div key={dir.rel} className="tree-dir">
        <button
          type="button"
          className="tree-dir-toggle"
          onClick={() => setCollapsed((prev) => ({ ...prev, [dir.rel]: !prev[dir.rel] }))}
        >
          <Icon name={isCollapsed ? 'chevronRight' : 'chevronDown'} size={12} />
          <span>{dir.title}</span>
        </button>
        {!isCollapsed ? (
          <>
            {dir.notes.map(renderNote)}
            {dir.dirs.map(renderDir)}
          </>
        ) : null}
      </div>
    );
  };

  return (
    <div className="tree-scroll">
      {notes.length > 0 ? (
        <>
          <div className="tree-group-title">根目录</div>
          {notes.map(renderNote)}
        </>
      ) : null}
      {dirs.map(renderDir)}
    </div>
  );
}

function NoteEditor({ note, onDeleted }: { note: Note; onDeleted: () => void }) {
  const { saveNote, deleteFile, notes } = useWorkspace();
  const toast = useToast();
  const [draft, setDraft] = useState<Note>(note);
  const [blocks, setBlocks] = useState(() => parseBlocks(note.body));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tagsText, setTagsText] = useState(note.tags.join('，'));

  const duplicates = notes.filter((item) => item.slug === draft.slug && item.path !== draft.path);

  const commit = (next: Note, nextBlocks = blocks) => {
    const body = serializeBlocks(nextBlocks, next.slug);
    const saved: Note = { ...next, body };
    setDraft(saved);
    setBlocks(nextBlocks);
    saveNote(saved);
  };

  const patch = (value: Partial<Note>, nextBlocks = blocks) => {
    commit({ ...draft, ...value }, nextBlocks);
  };

  return (
    <div>
      <div className="card editor-head">
        <input
          className="editor-title-input"
          value={draft.title}
          placeholder="笔记标题"
          onChange={(event) => patch({ title: event.target.value })}
        />
        <textarea
          className="textarea"
          rows={2}
          style={{ minHeight: 54, fontSize: 13.5 }}
          value={draft.description}
          placeholder="一句话简介（显示在标题下与图谱里）"
          onChange={(event) => patch({ description: event.target.value })}
        />

        <div className="editor-meta-grid">
          <Field label="slug（网址 / 题目 id 前缀）">
            <input
              className="input input-sm"
              value={draft.slug}
              onChange={(event) => patch({ slug: event.target.value })}
            />
          </Field>
          <Field label="排序">
            <input
              className="input input-sm"
              type="number"
              value={Number.isFinite(draft.order) ? draft.order : 9999}
              onChange={(event) => patch({ order: Number(event.target.value) })}
            />
          </Field>
          <Field label="章节">
            <input
              className="input input-sm"
              value={draft.chapter}
              placeholder="如：01-认识智能电子书"
              onChange={(event) => patch({ chapter: event.target.value })}
            />
          </Field>
          <Field label="更新日期">
            <input
              className="input input-sm"
              value={draft.updated}
              placeholder="YYYY-MM-DD"
              onChange={(event) => patch({ updated: event.target.value })}
            />
          </Field>
        </div>

        <Field label="标签（逗号分隔）">
          <input
            className="input input-sm"
            value={tagsText}
            placeholder="智能电子书, 基础, 学习图谱"
            onChange={(event) => {
              setTagsText(event.target.value);
              patch({
                tags: event.target.value
                  .split(/[,，、;；]/)
                  .map((item) => item.trim())
                  .filter(Boolean),
              });
            }}
          />
        </Field>

        {duplicates.length > 0 ? (
          <div style={{ fontSize: 12, color: 'rgb(var(--rose))' }}>
            slug 与「{duplicates.map((item) => item.title).join('、')}」重复，发布前请改成唯一的 slug。
          </div>
        ) : null}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11.5, color: 'rgb(var(--ink-faint))' }}>
            {draft.path}
          </span>
          <Button
            size="sm"
            variant="danger"
            icon="trash"
            style={{ marginLeft: 'auto' }}
            onClick={() => setConfirmDelete(true)}
          >
            删除笔记
          </Button>
        </div>
      </div>

      <div className="card" style={{ paddingTop: 0 }}>
        <BlockEditor
          blocks={blocks}
          slug={draft.slug}
          noteTitle={draft.title}
          onChange={(nextBlocks) => commit(draft, nextBlocks)}
        />
      </div>

      {confirmDelete ? (
        <Modal
          title="删除这篇笔记？"
          onClose={() => setConfirmDelete(false)}
          width={420}
          footer={
            <>
              <Button onClick={() => setConfirmDelete(false)}>取消</Button>
              <Button
                variant="danger"
                onClick={() => {
                  deleteFile(note.path);
                  setConfirmDelete(false);
                  toast.show('已标记删除，发布后生效');
                  onDeleted();
                }}
              >
                删除
              </Button>
            </>
          }
        >
          <p style={{ fontSize: 13, lineHeight: 1.7, color: 'rgb(var(--ink-muted))' }}>
            《{draft.title}》会在发布时从仓库删除。图谱里指向它的连线也会需要手动清理。
          </p>
        </Modal>
      ) : null}
    </div>
  );
}

function NewNoteModal({
  onClose,
  onCreate,
  existingDirs,
  notes,
}: {
  onClose: () => void;
  onCreate: (path: string, text: string) => void;
  existingDirs: string[];
  notes: Note[];
}) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [dir, setDir] = useState(existingDirs[0] ?? '');
  const [fileName, setFileName] = useState('');
  const [asIndex, setAsIndex] = useState(false);

  const usedSlugs = useMemo(() => new Set(notes.map((note) => note.slug)), [notes]);
  const slug = uniqueSlug(
    deriveSlug(fileName || title, { title } as never) || 'note',
    usedSlugs,
  );

  const submit = () => {
    if (!title.trim()) {
      toast.show('先写标题', 'error');
      return;
    }
    const baseName = safeFileName(fileName.trim() || `${slug}-${title.trim()}`);
    const name = asIndex ? 'index.md' : `${baseName}.md`;
    const cleanDir = dir.replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/');
    const path = `${VAULT_PREFIX}${cleanDir ? `${cleanDir}/` : ''}${name}`;
    if (notes.some((note) => note.path === path)) {
      toast.show('同目录下已有同名文件', 'error');
      return;
    }
    const header = [
      '---',
      `slug: ${slug}`,
      `title: ${title.trim()}`,
      `description: `,
      `tags: []`,
      `order: 9999`,
      cleanDir ? `chapter: ${cleanDir.split('/').pop()}` : '',
      `updated: ${today()}`,
      '---',
      '',
      '',
    ]
      .filter((line) => line !== '')
      .join('\n');
    onCreate(path, `${header}\n`);
    onClose();
  };

  return (
    <Modal
      title="新建笔记"
      onClose={onClose}
      width={520}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" icon="plus" onClick={submit}>
            创建
          </Button>
        </>
      }
    >
      <Field label="标题">
        <input
          className="input"
          autoFocus
          value={title}
          placeholder="如：智能电子书的五个层级"
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      <Field label="所在目录" hint="留空表示放在知识库根目录；可以直接输入新目录名。">
        <input
          className="input"
          list="dir-options"
          value={dir}
          placeholder="如：智能电子书/01-认识智能电子书"
          onChange={(event) => setDir(event.target.value)}
        />
        <datalist id="dir-options">
          {existingDirs.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </Field>
      <Field label="文件名（不含 .md）" hint={`slug 将使用：${slug}`}>
        <input
          className="input"
          value={fileName}
          placeholder="留空自动根据标题生成"
          onChange={(event) => setFileName(event.target.value)}
        />
      </Field>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={asIndex}
          onChange={(event) => setAsIndex(event.target.checked)}
        />
        作为该目录的首页（index.md）
      </label>
    </Modal>
  );
}

export default function NotesPage() {
  const { notes, addFile, isDirty, loading } = useWorkspace();
  const toast = useToast();
  const [selected, setSelected] = useState(() => {
    const target = sessionStorage.getItem('r7kb-studio-note');
    if (target) sessionStorage.removeItem('r7kb-studio-note');
    return target ?? '';
  });
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return notes;
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(keyword) ||
        note.slug.toLowerCase().includes(keyword) ||
        note.description.toLowerCase().includes(keyword) ||
        note.tags.some((tag) => tag.toLowerCase().includes(keyword)),
    );
  }, [notes, query]);

  const tree = useMemo(() => buildVaultTree(filtered), [filtered]);
  const dirs = useMemo(() => {
    const set = new Set<string>();
    for (const note of notes) if (note.dir) set.add(note.dir);
    return [...set].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
  }, [notes]);

  const active = notes.find((note) => note.path === selected) ?? filtered[0] ?? notes[0];

  return (
    <div className="notes-layout">
      <div className="card tree-panel">
        <div style={{ padding: '12px 12px 8px', display: 'flex', gap: 6 }}>
          <input
            className="input input-sm"
            placeholder="搜索标题 / slug / 标签"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <IconButton icon="plus" label="新建笔记" onClick={() => setCreating(true)} />
        </div>
        <div className="hairline" />
        {filtered.length === 0 && !loading ? (
          <Empty>没有匹配的笔记</Empty>
        ) : (
          <Tree
            dirs={tree.dirs}
            notes={tree.notes}
            activePath={active?.path ?? ''}
            dirty={isDirty}
            onSelect={setSelected}
          />
        )}
      </div>

      <div>
        {active ? (
          <NoteEditor
            key={active.path}
            note={active}
            onDeleted={() => {
              const next = notes.find((note) => note.path !== active.path);
              setSelected(next?.path ?? '');
            }}
          />
        ) : (
          <div className="card">
            <Empty>还没有笔记，点左上角 + 新建一篇。</Empty>
          </div>
        )}
      </div>

      {creating ? (
        <NewNoteModal
          notes={notes}
          existingDirs={dirs}
          onClose={() => setCreating(false)}
          onCreate={(path, text) => {
            addFile(path, text);
            setSelected(path);
            toast.show('笔记已创建，记得填写简介并发布');
          }}
        />
      ) : null}
    </div>
  );
}
