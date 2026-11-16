import { useMemo, useState, type ReactNode } from 'react';
import {
  buildVaultTree,
  deriveSlug,
  FOLDERS_PATH,
  parseFolders,
  safeFileName,
  serializeFolders,
  today,
  uniqueSlug,
  VAULT_PREFIX,
  vaultRel,
  type TreeDir,
  type TreeNote,
} from '../lib/notes';
import { parseBlocks, serializeBlocks } from '../lib/blocks';
import { useWorkspace } from '../lib/workspace';
import type { Note } from '../lib/types';
import {
  Button,
  ContextMenu,
  Empty,
  Field,
  Icon,
  IconButton,
  longPressHandler,
  Modal,
  PromptModal,
  useToast,
  type ContextMenuItem,
} from '../components/ui';
import BlockEditor from '../components/BlockEditor';

const joinAbs = (relDir: string, name: string) =>
  `${VAULT_PREFIX}${relDir ? `${relDir}/` : ''}${name}`;

const parentOf = (rel: string) => (rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '');
const baseName = (rel: string) => rel.split('/').pop() ?? rel;

type MenuTarget =
  | { kind: 'root' }
  | { kind: 'dir'; rel: string }
  | { kind: 'note'; path: string };

type PromptState =
  | { mode: 'renameNote'; path: string; value: string }
  | { mode: 'renameDir'; rel: string; value: string }
  | { mode: 'moveNote'; path: string; value: string }
  | { mode: 'newFolder'; parent: string }
  | { mode: 'newNote'; dir: string };

type ConfirmState =
  | { kind: 'note'; path: string; title: string }
  | { kind: 'dir'; rel: string; title: string };

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
          <span style={{ fontSize: 11.5, color: 'rgb(var(--ink-faint))' }}>{draft.path}</span>
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

export default function NotesPage() {
  const { notes, addFile, deleteFile, fileText, updateFile, isDirty, loading } = useWorkspace();
  const toast = useToast();
  const [selected, setSelected] = useState(() => {
    const target = sessionStorage.getItem('r7kb-studio-note');
    if (target) sessionStorage.removeItem('r7kb-studio-note');
    return target ?? '';
  });
  const [selectedDir, setSelectedDir] = useState('');
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [menu, setMenu] = useState<{ x: number; y: number; target: MenuTarget } | null>(null);
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [drag, setDrag] = useState<{ kind: 'note' | 'dir'; rel: string } | null>(null);
  const [dropTarget, setDropTarget] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  const folders = useMemo(() => parseFolders(fileText(FOLDERS_PATH)), [fileText]);

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

  const tree = useMemo(() => buildVaultTree(filtered, folders), [filtered, folders]);

  const active = notes.find((note) => note.path === selected) ?? filtered[0] ?? notes[0];

  const saveFolders = (list: string[]) => {
    updateFile(FOLDERS_PATH, serializeFolders(list));
  };

  const openMenu = (event: React.MouseEvent, target: MenuTarget) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({ x: event.clientX, y: event.clientY, target });
  };

  const openMenuAt = (x: number, y: number, target: MenuTarget) => {
    setMenu({ x, y, target });
  };

  const toggleDir = (rel: string) => {
    setCollapsed((prev) => ({ ...prev, [rel]: !prev[rel] }));
  };

  const moveNote = (path: string, targetDir: string) => {
    const note = notes.find((item) => item.path === path);
    if (!note || note.dir === targetDir) return;
    const newPath = joinAbs(targetDir, note.fileName);
    if (notes.some((item) => item.path === newPath)) {
      toast.show('目标文件夹里已有同名笔记', 'error');
      return;
    }
    addFile(newPath, fileText(path) ?? '');
    deleteFile(path);
    if (selected === path) setSelected(newPath);
    toast.show(`已移动到「${targetDir ? baseName(targetDir) : '知识库根目录'}」，发布后生效`);
  };

  const moveDir = (rel: string, targetParent: string) => {
    const newRel = targetParent ? `${targetParent}/${baseName(rel)}` : baseName(rel);
    if (newRel === rel) return;
    if (newRel.startsWith(`${rel}/`)) {
      toast.show('不能把文件夹移动到它自己的子目录里', 'error');
      return;
    }
    if (folders.includes(newRel) || notes.some((item) => item.dir === newRel)) {
      toast.show('目标位置已有同名文件夹', 'error');
      return;
    }
    for (const note of notes) {
      if (note.dir !== rel && !note.dir.startsWith(`${rel}/`)) continue;
      const suffix = note.dir.slice(rel.length);
      const newPath = joinAbs(`${newRel}${suffix}`, note.fileName);
      addFile(newPath, fileText(note.path) ?? '');
      deleteFile(note.path);
      if (selected === note.path) setSelected(newPath);
    }
    const nextFolders = folders.map((item) =>
      item === rel || item.startsWith(`${rel}/`) ? `${newRel}${item.slice(rel.length)}` : item,
    );
    if (!nextFolders.includes(newRel)) nextFolders.push(newRel);
    saveFolders([...new Set(nextFolders)]);
    toast.show('文件夹已移动，发布后生效');
  };

  const renameNote = (path: string, value: string) => {
    const note = notes.find((item) => item.path === path);
    if (!note) return;
    const name = safeFileName(value.replace(/\.md$/i, ''));
    const newPath = joinAbs(note.dir, `${name}.md`);
    if (newPath === path) return;
    if (notes.some((item) => item.path === newPath)) {
      toast.show('同目录下已有同名笔记', 'error');
      return;
    }
    addFile(newPath, fileText(path) ?? '');
    deleteFile(path);
    if (selected === path) setSelected(newPath);
    toast.show('笔记已重命名');
  };

  const createFolder = (parent: string, value: string) => {
    const name = safeFileName(value);
    const rel = parent ? `${parent}/${name}` : name;
    if (folders.includes(rel) || notes.some((item) => item.dir === rel)) {
      toast.show('该位置已有同名文件夹', 'error');
      return;
    }
    saveFolders([...folders, rel]);
    setCollapsed((prev) => ({ ...prev, [parent]: false }));
    setSelectedDir(rel);
    toast.show('文件夹已创建，发布后生效');
  };

  const deleteTreeNote = (path: string) => {
    deleteFile(path);
    if (selected === path) {
      const next = notes.find((item) => item.path !== path);
      setSelected(next?.path ?? '');
    }
    toast.show('已标记删除，发布后生效');
  };

  const deleteFolder = (rel: string) => {
    for (const note of notes) {
      if (note.dir === rel || note.dir.startsWith(`${rel}/`)) deleteFile(note.path);
    }
    saveFolders(folders.filter((item) => item !== rel && !item.startsWith(`${rel}/`)));
    if (selected.startsWith(joinAbs(rel, ''))) setSelected('');
    toast.show('文件夹及其中的笔记已标记删除');
  };

  const createNote = (dir: string, title: string, fileName: string, asIndex: boolean) => {
    const usedSlugs = new Set(notes.map((note) => note.slug));
    const slug = uniqueSlug(deriveSlug(fileName || title, {}) || 'note', usedSlugs);
    const name = asIndex ? 'index.md' : `${safeFileName(fileName.trim() || `${slug}-${title}`)}.md`;
    const path = joinAbs(dir, name);
    if (notes.some((note) => note.path === path)) {
      toast.show('同目录下已有同名文件', 'error');
      return;
    }
    const header = [
      '---',
      `slug: ${slug}`,
      `title: ${title}`,
      'description: ',
      'tags: []',
      'order: 9999',
      dir ? `chapter: ${baseName(dir)}` : '',
      `updated: ${today()}`,
      '---',
      '',
      '',
    ]
      .filter((line) => line !== '')
      .join('\n');
    addFile(path, `${header}\n`);
    setSelected(path);
    setSelectedDir(dir);
    setMobileOpen(true);
    toast.show('笔记已创建，记得填写简介并发布');
  };

  const menuItems = (target: MenuTarget): ContextMenuItem[] => {
    if (target.kind === 'note') {
      const note = notes.find((item) => item.path === target.path);
      const rel = vaultRel(target.path);
      return [
        { label: '打开', icon: 'file', onClick: () => setSelected(target.path) },
        {
          label: '重命名',
          icon: 'edit',
          onClick: () =>
            setPrompt({
              mode: 'renameNote',
              path: target.path,
              value: rel.split('/').pop()?.replace(/\.md$/i, '') ?? '',
            }),
        },
        {
          label: '移动到…',
          icon: 'folder',
          onClick: () =>
            setPrompt({
              mode: 'moveNote',
              path: target.path,
              value: note?.dir ?? '',
            }),
        },
        { separator: true },
        {
          label: '删除笔记',
          icon: 'trash',
          danger: true,
          onClick: () => setConfirmState({ kind: 'note', path: target.path, title: note?.title ?? '' }),
        },
      ];
    }

    if (target.kind === 'dir') {
      return [
        {
          label: '在此新建笔记',
          icon: 'filePlus',
          onClick: () => setPrompt({ mode: 'newNote', dir: target.rel }),
        },
        {
          label: '新建子文件夹',
          icon: 'folderPlus',
          onClick: () => setPrompt({ mode: 'newFolder', parent: target.rel }),
        },
        { separator: true },
        {
          label: '重命名文件夹',
          icon: 'edit',
          onClick: () => setPrompt({ mode: 'renameDir', rel: target.rel, value: baseName(target.rel) }),
        },
        {
          label: '删除文件夹',
          icon: 'trash',
          danger: true,
          onClick: () =>
            setConfirmState({ kind: 'dir', rel: target.rel, title: baseName(target.rel) }),
        },
      ];
    }

    return [
      {
        label: '新建笔记',
        icon: 'filePlus',
        onClick: () => setPrompt({ mode: 'newNote', dir: '' }),
      },
      {
        label: '新建文件夹',
        icon: 'folderPlus',
        onClick: () => setPrompt({ mode: 'newFolder', parent: '' }),
      },
    ];
  };

  const renderNote = (note: TreeNote, depth: number): ReactNode => {
    const rel = vaultRel(note.path);
    return (
      <div
        key={note.path}
        className="tree-row"
        data-kind="note"
        data-active={selected === note.path}
        data-dirty={isDirty(note.path)}
        data-drop={dropTarget === rel}
        style={{ paddingLeft: 8 + depth * 14 }}
        title={note.path}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', note.path);
          setDrag({ kind: 'note', rel });
        }}
        onDragEnd={() => {
          setDrag(null);
          setDropTarget('');
        }}
        onDragOver={(event) => {
          if (!drag || drag.kind !== 'note' || drag.rel === rel) return;
          event.preventDefault();
          event.stopPropagation();
          setDropTarget(rel);
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (drag?.kind === 'note') {
            const targetDir = parentOf(rel);
            const source = `${VAULT_PREFIX}${drag.rel}`;
            moveNote(source, targetDir);
          }
          setDrag(null);
          setDropTarget('');
        }}
        onClick={() => {
          setSelected(note.path);
          setSelectedDir(parentOf(rel));
          setMobileOpen(true);
        }}
        onContextMenu={(event) => openMenu(event, { kind: 'note', path: note.path })}
        {...longPressHandler((x, y) => openMenuAt(x, y, { kind: 'note', path: note.path }))}
      >
        <Icon name="file" size={13} />
        <span className="tree-label">{note.title}</span>
      </div>
    );
  };

  const renderDir = (dir: TreeDir, depth: number): ReactNode => {
    const isCollapsed = collapsed[dir.rel];
    return (
      <div key={dir.rel}>
        <div
          className="tree-row"
          data-kind="dir"
          data-active={selectedDir === dir.rel}
          data-drop={dropTarget === dir.rel}
          style={{ paddingLeft: 8 + depth * 14 }}
          title={dir.rel}
          draggable
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', dir.rel);
            setDrag({ kind: 'dir', rel: dir.rel });
          }}
          onDragEnd={() => {
            setDrag(null);
            setDropTarget('');
          }}
          onDragOver={(event) => {
            if (!drag || drag.kind === 'dir' && drag.rel === dir.rel) return;
            event.preventDefault();
            event.stopPropagation();
            setDropTarget(dir.rel);
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (drag?.kind === 'note') moveNote(`${VAULT_PREFIX}${drag.rel}`, dir.rel);
            else if (drag?.kind === 'dir') moveDir(drag.rel, dir.rel);
            setDrag(null);
            setDropTarget('');
          }}
          onClick={() => {
            setSelectedDir(dir.rel);
            toggleDir(dir.rel);
          }}
          onContextMenu={(event) => openMenu(event, { kind: 'dir', rel: dir.rel })}
          {...longPressHandler((x, y) => openMenuAt(x, y, { kind: 'dir', rel: dir.rel }))}
        >
          <span className="tree-caret">
            <Icon name={isCollapsed ? 'chevronRight' : 'chevronDown'} size={12} />
          </span>
          <Icon name={isCollapsed ? 'folder' : 'folderOpen'} size={14} />
          <span className="tree-label">{dir.title}</span>
        </div>
        {!isCollapsed ? (
          <>
            {dir.notes.map((note) => renderNote(note, depth + 1))}
            {dir.dirs.map((child) => renderDir(child, depth + 1))}
          </>
        ) : null}
      </div>
    );
  };

  return (
    <div className="notes-layout" data-mobile-open={mobileOpen}>
      <div className="card tree-panel">
        <div className="explorer-head">
          <span className="explorer-title">知识库</span>
          <IconButton
            icon="filePlus"
            label="新建笔记"
            onClick={() => setPrompt({ mode: 'newNote', dir: selectedDir })}
          />
          <IconButton
            icon="folderPlus"
            label="新建文件夹"
            onClick={() => setPrompt({ mode: 'newFolder', parent: selectedDir })}
          />
        </div>
        <div className="explorer-search">
          <input
            className="input input-sm"
            placeholder="搜索标题 / slug / 标签"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="hairline" />
        <div
          className="tree-scroll"
          data-drop={dropTarget === '__root__'}
          onContextMenu={(event) => {
            if (event.target === event.currentTarget) openMenu(event, { kind: 'root' });
          }}
          {...longPressHandler((x, y) => openMenuAt(x, y, { kind: 'root' }))}
          onDragOver={(event) => {
            if (!drag) return;
            event.preventDefault();
            setDropTarget('__root__');
          }}
          onDragLeave={(event) => {
            if (event.target === event.currentTarget) setDropTarget('');
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (drag?.kind === 'note') moveNote(`${VAULT_PREFIX}${drag.rel}`, '');
            else if (drag?.kind === 'dir') moveDir(drag.rel, '');
            setDrag(null);
            setDropTarget('');
          }}
        >
          {filtered.length === 0 && folders.length === 0 && !loading ? (
            <Empty>还没有笔记，右键或点右上角 + 新建一篇。</Empty>
          ) : (
            <>
              {tree.notes.map((note) => renderNote(note, 0))}
              {tree.dirs.map((dir) => renderDir(dir, 0))}
              <div className="tree-hint">右键可新建 / 重命名 / 删除，拖动可移动到其他文件夹</div>
            </>
          )}
        </div>
      </div>

      <div className="notes-editor">
        <button
          type="button"
          className="mobile-back"
          onClick={() => setMobileOpen(false)}
        >
          <Icon name="chevronDown" size={14} style={{ transform: 'rotate(90deg)' }} />
          返回目录
        </button>
        {active ? (
          <NoteEditor
            key={active.path}
            note={active}
            onDeleted={() => {
              const next = notes.find((note) => note.path !== active.path);
              setSelected(next?.path ?? '');
              if (!next) setMobileOpen(false);
            }}
          />
        ) : (
          <div className="card">
            <Empty>还没有笔记，点左上角 + 新建一篇。</Empty>
          </div>
        )}
      </div>

      {menu ? (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems(menu.target)}
          onClose={() => setMenu(null)}
        />
      ) : null}

      {prompt?.mode === 'newNote' ? (
        <NewNoteModal
          dir={prompt.dir}
          onClose={() => setPrompt(null)}
          onCreate={(title, fileName, asIndex) => {
            createNote(prompt.dir, title, fileName, asIndex);
            setPrompt(null);
          }}
        />
      ) : null}

      {prompt?.mode === 'newFolder' ? (
        <PromptModal
          title="新建文件夹"
          label="文件夹名称"
          initial=""
          placeholder="如：03-进阶功能"
          hint={`位置：${prompt.parent || '知识库根目录'}`}
          confirmText="创建"
          onClose={() => setPrompt(null)}
          onConfirm={(value) => {
            createFolder(prompt.parent, value);
            setPrompt(null);
          }}
        />
      ) : null}

      {prompt?.mode === 'renameNote' ? (
        <PromptModal
          title="重命名笔记"
          label="文件名（不含 .md）"
          initial={prompt.value}
          hint="只改文件名，标题和 slug 仍可在右侧编辑"
          confirmText="重命名"
          onClose={() => setPrompt(null)}
          onConfirm={(value) => {
            renameNote(prompt.path, value);
            setPrompt(null);
          }}
        />
      ) : null}

      {prompt?.mode === 'moveNote' ? (
        <PromptModal
          title="移动笔记"
          label="目标文件夹（留空表示根目录）"
          initial={prompt.value}
          placeholder="如：智能电子书/01-认识智能电子书"
          hint="输入已存在的文件夹路径，留空则移到知识库根目录"
          confirmText="移动"
          onClose={() => setPrompt(null)}
          onConfirm={(value) => {
            moveNote(prompt.path, value.replace(/^\/+|\/+$/g, ''));
            setPrompt(null);
          }}
        />
      ) : null}

      {prompt?.mode === 'renameDir' ? (
        <PromptModal
          title="移动文件夹"
          label="新的上级目录（留空表示根目录）"
          initial={parentOf(prompt.rel)}
          placeholder="如：智能电子书"
          hint={`当前：${prompt.rel}；输入完成后会整体移动该文件夹`}
          confirmText="移动"
          onClose={() => setPrompt(null)}
          onConfirm={(value) => {
            moveDir(prompt.rel, value);
            setPrompt(null);
          }}
        />
      ) : null}

      {confirmState ? (
        <Modal
          title={confirmState.kind === 'dir' ? '删除文件夹？' : '删除这篇笔记？'}
          onClose={() => setConfirmState(null)}
          width={440}
          footer={
            <>
              <Button onClick={() => setConfirmState(null)}>取消</Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (confirmState.kind === 'dir') deleteFolder(confirmState.rel);
                  else deleteTreeNote(confirmState.path);
                  setConfirmState(null);
                }}
              >
                删除
              </Button>
            </>
          }
        >
          <p style={{ fontSize: 13, lineHeight: 1.7, color: 'rgb(var(--ink-muted))' }}>
            {confirmState.kind === 'dir'
              ? `「${confirmState.title}」及其中所有笔记会在发布时从仓库删除。`
              : `《${confirmState.title}》会在发布时从仓库删除。`}
          </p>
        </Modal>
      ) : null}
    </div>
  );
}

function NewNoteModal({
  dir,
  onCreate,
  onClose,
}: {
  dir: string;
  onCreate: (title: string, fileName: string, asIndex: boolean) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [fileName, setFileName] = useState('');
  const [asIndex, setAsIndex] = useState(false);

  const submit = () => {
    if (!title.trim()) return;
    onCreate(title.trim(), fileName, asIndex);
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
      <Field label="文件名（不含 .md，可留空）">
        <input
          className="input"
          value={fileName}
          placeholder="留空会根据标题自动生成"
          onChange={(event) => setFileName(event.target.value)}
        />
      </Field>
      <Field label="位置">
        <input className="input" value={dir || '知识库根目录'} readOnly />
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
