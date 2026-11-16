import { useMemo, useState, type ReactNode } from 'react';
import { LIBRARY_PATH } from '../lib/notes';
import { useWorkspace } from '../lib/workspace';
import { RESOURCE_TYPES, type LibraryItem } from '../lib/types';
import {
  Button,
  ContextMenu,
  Empty,
  Field,
  Icon,
  IconButton,
  Modal,
  PromptModal,
  formatBytes,
  formatDate,
  useToast,
  type ContextMenuItem,
} from '../components/ui';

type RawItem = LibraryItem;
type LibraryData = { folders: string[]; resources: RawItem[] };

const RES_PREFIX = '/resources/';

function cleanFolder(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/');
}

function parseLibrary(text: string | undefined): LibraryData {
  if (!text) return { folders: [], resources: [] };
  try {
    const data = JSON.parse(text) as { folders?: unknown; resources?: unknown };
    return {
      folders: Array.isArray(data.folders)
        ? [...new Set(data.folders.filter((item): item is string => typeof item === 'string').map(cleanFolder))]
        : [],
      resources: Array.isArray(data.resources) ? (data.resources as RawItem[]).map((item) => ({ ...item })) : [],
    };
  } catch {
    return { folders: [], resources: [] };
  }
}

const relFromHref = (href: string) => (href.startsWith(RES_PREFIX) ? href.slice(RES_PREFIX.length) : '');
const parentOf = (rel: string) => (rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '');
const baseName = (rel: string) => rel.split('/').pop() ?? rel;

const folderOf = (item: RawItem) => {
  const rel = relFromHref(item.href);
  if (rel) return parentOf(rel);
  return cleanFolder(item.folder ?? '');
};

const nameOf = (item: RawItem) => {
  const rel = relFromHref(item.href);
  return rel ? baseName(rel) : item.title || item.id || '链接';
};

const TYPE_COLOR: Record<LibraryItem['type'], string> = {
  pdf: 'rgb(var(--rose))',
  slide: 'rgb(var(--iris))',
  doc: 'rgb(var(--accent))',
  video: 'rgb(var(--mint))',
  link: 'rgb(var(--ink-muted))',
};

const fileType = (name: string): LibraryItem['type'] => {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (['ppt', 'pptx', 'key'].includes(ext)) return 'slide';
  if (['mp4', 'mov', 'webm'].includes(ext)) return 'video';
  if (['html', 'htm', 'url'].includes(ext)) return 'link';
  return 'doc';
};

const guessTitle = (name: string) => name.replace(/\.[^.]+$/, '');

type FolderNode = { rel: string; name: string; children: FolderNode[] };

function buildFolderTree(list: string[]): FolderNode[] {
  const roots: FolderNode[] = [];
  const map = new Map<string, FolderNode>();
  const ensure = (rel: string): FolderNode => {
    const existing = map.get(rel);
    if (existing) return existing;
    const node: FolderNode = { rel, name: baseName(rel), children: [] };
    map.set(rel, node);
    const parent = parentOf(rel);
    if (parent) ensure(parent).children.push(node);
    else roots.push(node);
    return node;
  };
  for (const rel of [...list].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))) ensure(rel);
  const sortNode = (nodes: FolderNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
    nodes.forEach((node) => sortNode(node.children));
  };
  sortNode(roots);
  return roots;
}

type MenuTarget =
  | { kind: 'blank' }
  | { kind: 'folder'; rel: string }
  | { kind: 'file'; index: number };

type PromptState =
  | { mode: 'newFolder'; parent: string }
  | { mode: 'renameFolder'; rel: string; value: string }
  | { mode: 'renameFile'; index: number; value: string }
  | { mode: 'moveFile'; index: number; value: string };

export default function LibraryPage() {
  const {
    fileText,
    updateFile,
    addUpload,
    removeUpload,
    uploads,
    addMove,
    deleteFile,
    loading,
  } = useWorkspace();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [currentDir, setCurrentDir] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [menu, setMenu] = useState<{ x: number; y: number; target: MenuTarget } | null>(null);
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const [editing, setEditing] = useState<{
    item: RawItem;
    index: number | null;
    base64?: string;
    path?: string;
  } | null>(null);
  const [confirmState, setConfirmState] =
    useState<{ kind: 'file'; index: number; title: string } | { kind: 'folder'; rel: string } | null>(
      null,
    );
  const [folderInfo, setFolderInfo] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ kind: 'file'; index: number } | { kind: 'folder'; rel: string } | null>(
    null,
  );
  const [dropTarget, setDropTarget] = useState('');
  const [osDragging, setOsDragging] = useState(false);
  const [selected, setSelected] = useState('');

  const parsed = useMemo(() => parseLibrary(fileText(LIBRARY_PATH)), [fileText]);
  const items = parsed.resources;

  const folders = useMemo(() => {
    const set = new Set<string>(parsed.folders.map(cleanFolder).filter(Boolean));
    const register = (rel: string) => {
      const parts = cleanFolder(rel).split('/').filter(Boolean);
      let acc = '';
      for (const part of parts) {
        acc = acc ? `${acc}/${part}` : part;
        set.add(acc);
      }
    };
    parsed.folders.forEach(register);
    items.forEach((item) => register(folderOf(item)));
    return [...set];
  }, [parsed.folders, items]);

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

  const writeLibrary = (nextItems: RawItem[], nextFolders: string[] = parsed.folders) => {
    const payload = {
      folders: [...new Set(nextFolders.map(cleanFolder).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'zh-Hans-CN'),
      ),
      resources: nextItems,
    };
    updateFile(LIBRARY_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  };

  const pending = useMemo(() => new Set(uploads.map((upload) => upload.path)), [uploads]);

  const keyword = query.trim().toLowerCase();
  const matches = (item: RawItem) =>
    !keyword ||
    item.title.toLowerCase().includes(keyword) ||
    item.description?.toLowerCase().includes(keyword) ||
    item.tags?.some((tag) => tag.toLowerCase().includes(keyword));

  const subFolders = useMemo(
    () =>
      folders
        .filter((rel) => parentOf(rel) === currentDir)
        .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')),
    [folders, currentDir],
  );

  const visibleItems = useMemo(
    () => items.filter((item) => folderOf(item) === currentDir && matches(item)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, currentDir, keyword],
  );

  const subFolderCount = (rel: string) =>
    items.filter((item) => {
      const folder = folderOf(item);
      return folder === rel || folder.startsWith(`${rel}/`);
    }).length;

  /* --------------------------- 文件系统操作 --------------------------- */

  const movePhysical = (fromRel: string, toRel: string) => {
    if (fromRel === toRel) return;
    const fromPath = `public/resources/${fromRel}`;
    const toPath = `public/resources/${toRel}`;
    const pendingUpload = uploads.find((upload) => upload.path === fromPath);
    if (pendingUpload) {
      removeUpload(fromPath);
      addUpload({ ...pendingUpload, path: toPath, name: baseName(toRel) });
    } else {
      addMove({ from: fromPath, to: toPath });
    }
  };

  const moveFile = (index: number, toDir: string) => {
    const item = items[index];
    if (!item) return;
    const to = cleanFolder(toDir);
    if (folderOf(item) === to) return;
    const name = nameOf(item);
    if (items.some((other, i) => i !== index && folderOf(other) === to && nameOf(other) === name)) {
      toast.show('目标文件夹里已有同名文件', 'error');
      return;
    }
    const rel = relFromHref(item.href);
    const next = items.map((other, i) => {
      if (i !== index) return other;
      if (!rel) return { ...other, folder: to || undefined };
      const newRel = to ? `${to}/${name}` : name;
      movePhysical(rel, newRel);
      return { ...other, href: `${RES_PREFIX}${newRel}`, folder: to || undefined };
    });
    writeLibrary(next);
    toast.show(`已移动到「${to ? baseName(to) : '资料库根目录'}」，发布后生效`);
  };

  const relocateFolder = (fromRel: string, toParent: string, nextName = baseName(fromRel)) => {
    const parent = cleanFolder(toParent);
    const newRel = parent ? `${parent}/${nextName}` : nextName;
    if (newRel === fromRel) return;
    if (newRel.startsWith(`${fromRel}/`)) {
      toast.show('不能把文件夹移动到它自己的子目录里', 'error');
      return;
    }
    if (folders.includes(newRel)) {
      toast.show('目标位置已有同名文件夹', 'error');
      return;
    }

    const nextItems = items.map((item) => {
      const folder = folderOf(item);
      if (folder !== fromRel && !folder.startsWith(`${fromRel}/`)) return item;
      const suffix = folder.slice(fromRel.length);
      const nextFolder = `${newRel}${suffix}`;
      const rel = relFromHref(item.href);
      if (!rel) return { ...item, folder: nextFolder };
      const nextRel = `${nextFolder}/${baseName(rel)}`;
      movePhysical(rel, nextRel);
      return { ...item, href: `${RES_PREFIX}${nextRel}`, folder: nextFolder };
    });
    const nextFolders = parsed.folders.map((rel) =>
      rel === fromRel || rel.startsWith(`${fromRel}/`) ? `${newRel}${rel.slice(fromRel.length)}` : rel,
    );
    if (!nextFolders.some((rel) => cleanFolder(rel) === newRel)) nextFolders.push(newRel);
    writeLibrary(nextItems, nextFolders);
    if (currentDir === fromRel || currentDir.startsWith(`${fromRel}/`)) {
      setCurrentDir(`${newRel}${currentDir.slice(fromRel.length)}`);
    }
  };

  const createFolder = (parent: string, value: string) => {
    const name = value.replace(/[\\/:*?"<>|]/g, '-').trim();
    if (!name) return;
    const rel = parent ? `${parent}/${name}` : name;
    if (folders.includes(rel)) {
      toast.show('该位置已有同名文件夹', 'error');
      return;
    }
    writeLibrary(items, [...parsed.folders, rel]);
    toast.show('文件夹已创建');
  };

  const removeItem = (index: number) => {
    const item = items[index];
    if (!item) return;
    const rel = relFromHref(item.href);
    if (rel) {
      const path = `public/resources/${rel}`;
      if (uploads.some((upload) => upload.path === path)) removeUpload(path);
      else deleteFile(path);
    }
    writeLibrary(items.filter((_, i) => i !== index));
  };

  const removeFolder = (rel: string) => {
    const next = items.filter((item) => {
      const folder = folderOf(item);
      const inside = folder === rel || folder.startsWith(`${rel}/`);
      if (inside) {
        const itemRel = relFromHref(item.href);
        if (itemRel) {
          const path = `public/resources/${itemRel}`;
          if (uploads.some((upload) => upload.path === path)) removeUpload(path);
          else deleteFile(path);
        }
      }
      return !inside;
    });
    const nextFolders = parsed.folders.filter((item) => item !== rel && !item.startsWith(`${rel}/`));
    writeLibrary(next, nextFolders);
    if (currentDir === rel || currentDir.startsWith(`${rel}/`)) setCurrentDir(parentOf(rel));
    toast.show('文件夹及其中的资料已删除，发布后生效');
  };

  /* --------------------------- 上传 --------------------------- */

  const startUpload = (file: File, dir: string) => {
    if (file.size > 20 * 1024 * 1024) {
      toast.show('文件超过 20MB，暂时无法上传', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      const base64 = dataUrl.split(',')[1] ?? '';
      const safeName = file.name.replace(/[\\/:*?"<>|]/g, '-');
      const used = new Set(items.map((item) => relFromHref(item.href)).filter(Boolean));
      let name = safeName;
      let counter = 2;
      const relFor = (value: string) => (dir ? `${dir}/${value}` : value);
      while (used.has(relFor(name))) {
        const dot = safeName.lastIndexOf('.');
        name =
          dot > 0
            ? `${safeName.slice(0, dot)}-${counter}${safeName.slice(dot)}`
            : `${safeName}-${counter}`;
        counter += 1;
      }
      const rel = relFor(name);
      setEditing({
        item: {
          id: guessTitle(name),
          title: guessTitle(file.name),
          type: fileType(name),
          href: `${RES_PREFIX}${rel}`,
          folder: dir || undefined,
          size: formatBytes(file.size),
          updatedAt: new Date().toISOString().slice(0, 10),
          description: '',
          tags: [],
        },
        index: null,
        base64,
        path: `public/resources/${rel}`,
      });
    };
    reader.readAsDataURL(file);
  };

  const uploadFiles = (files: FileList | null, dir: string) => {
    if (!files || files.length === 0) return;
    startUpload(files[0], dir);
    if (files.length > 1) toast.show('一次先填一个文件的信息，完成后再拖下一个');
  };

  const saveItem = (item: RawItem, index: number | null, base64?: string, path?: string) => {
    if (!item.title.trim()) {
      toast.show('请填写标题', 'error');
      return;
    }
    if (!item.href.trim()) {
      toast.show('请填写文件地址', 'error');
      return;
    }
    const rel = relFromHref(item.href);
    const saved: RawItem = {
      ...item,
      folder: rel ? parentOf(rel) || undefined : cleanFolder(item.folder ?? '') || undefined,
    };
    const next = [...items];
    if (index === null) next.push(saved);
    else next[index] = saved;
    writeLibrary(next);
    if (base64 && path) {
      addUpload({ path, base64, size: 0, name: baseName(path) });
    }
    setEditing(null);
    toast.show(index === null ? '资料已添加，发布后出现在资料库' : '资料信息已更新');
  };

  /* --------------------------- 菜单 --------------------------- */

  const openMenu = (event: React.MouseEvent, target: MenuTarget) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({ x: event.clientX, y: event.clientY, target });
  };

  const menuItems = (target: MenuTarget): ContextMenuItem[] => {
    if (target.kind === 'file') {
      const item = items[target.index];
      if (!item) return [];
      return [
        { label: '编辑信息 / 属性', icon: 'edit', onClick: () => setEditing({ item: { ...item }, index: target.index }) },
        {
          label: '重命名文件',
          icon: 'file',
          onClick: () =>
            setPrompt({
              mode: 'renameFile',
              index: target.index,
              value: nameOf(item).replace(/\.[^.]+$/, ''),
            }),
        },
        {
          label: '移动到…',
          icon: 'folder',
          onClick: () => setPrompt({ mode: 'moveFile', index: target.index, value: folderOf(item) }),
        },
        { separator: true },
        {
          label: '删除',
          icon: 'trash',
          danger: true,
          onClick: () => setConfirmState({ kind: 'file', index: target.index, title: item.title }),
        },
      ];
    }

    if (target.kind === 'folder') {
      return [
        { label: '打开', icon: 'folderOpen', onClick: () => setCurrentDir(target.rel) },
        {
          label: '新建子文件夹',
          icon: 'folderPlus',
          onClick: () => setPrompt({ mode: 'newFolder', parent: target.rel }),
        },
        {
          label: '上传文件到此文件夹',
          icon: 'upload',
          onClick: () => {
            setCurrentDir(target.rel);
            window.setTimeout(() => document.getElementById('library-file-input')?.click(), 0);
          },
        },
        { separator: true },
        {
          label: '重命名',
          icon: 'edit',
          onClick: () =>
            setPrompt({ mode: 'renameFolder', rel: target.rel, value: baseName(target.rel) }),
        },
        {
          label: '属性',
          icon: 'info',
          onClick: () => setFolderInfo(target.rel),
        },
        { separator: true },
        {
          label: '删除文件夹',
          icon: 'trash',
          danger: true,
          onClick: () => setConfirmState({ kind: 'folder', rel: target.rel }),
        },
      ];
    }

    return [
      {
        label: '新建文件夹',
        icon: 'folderPlus',
        onClick: () => setPrompt({ mode: 'newFolder', parent: currentDir }),
      },
      {
        label: '上传文件',
        icon: 'upload',
        onClick: () => document.getElementById('library-file-input')?.click(),
      },
      {
        label: '添加外部链接',
        icon: 'link',
        onClick: () =>
          setEditing({
            item: {
              id: '',
              title: '',
              type: 'link',
              href: '',
              folder: currentDir || undefined,
              updatedAt: new Date().toISOString().slice(0, 10),
              description: '',
              tags: [],
            },
            index: null,
          }),
      },
    ];
  };

  /* --------------------------- 渲染 --------------------------- */

  const crumbs = currentDir ? currentDir.split('/') : [];

  const renderTree = (nodes: FolderNode[], depth: number): ReactNode =>
    nodes.map((node) => {
      const isCollapsed = collapsed[node.rel];
      return (
        <div key={node.rel}>
          <div
            className="lib-tree-row"
            data-active={currentDir === node.rel}
            data-drop={dropTarget === node.rel}
            style={{ paddingLeft: 8 + depth * 14 }}
            onClick={() => setCurrentDir(node.rel)}
            onDoubleClick={() => setCurrentDir(node.rel)}
            onContextMenu={(event) => openMenu(event, { kind: 'folder', rel: node.rel })}
            onDragOver={(event) => {
              if (!drag) return;
              event.preventDefault();
              event.stopPropagation();
              setDropTarget(node.rel);
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (drag?.kind === 'file') moveFile(drag.index, node.rel);
              else if (drag?.kind === 'folder') relocateFolder(drag.rel, node.rel);
              setDrag(null);
              setDropTarget('');
            }}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = 'move';
              setDrag({ kind: 'folder', rel: node.rel });
            }}
            onDragEnd={() => {
              setDrag(null);
              setDropTarget('');
            }}
          >
            <span
              className="tree-caret"
              onClick={(event) => {
                event.stopPropagation();
                setCollapsed((prev) => ({ ...prev, [node.rel]: !prev[node.rel] }));
              }}
            >
              {node.children.length > 0 ? (
                <Icon name={isCollapsed ? 'chevronRight' : 'chevronDown'} size={12} />
              ) : (
                <span style={{ width: 12, display: 'inline-block' }} />
              )}
            </span>
            <Icon name={isCollapsed ? 'folder' : 'folderOpen'} size={14} />
            <span className="tree-label">{node.name}</span>
          </div>
          {!isCollapsed ? renderTree(node.children, depth + 1) : null}
        </div>
      );
    });

  return (
    <div className="library-layout">
      <div className="card lib-nav">
        <div className="explorer-head">
          <span className="explorer-title">资料库</span>
          <IconButton
            icon="folderPlus"
            label="新建文件夹"
            onClick={() => setPrompt({ mode: 'newFolder', parent: currentDir })}
          />
        </div>
        <div
          className="tree-scroll"
          onContextMenu={(event) => {
            if (event.target === event.currentTarget) openMenu(event, { kind: 'blank' });
          }}
        >
          <div
            className="lib-tree-row"
            data-active={currentDir === ''}
            onClick={() => setCurrentDir('')}
            style={{ paddingLeft: 8 }}
          >
            <span className="tree-caret">
              <span style={{ width: 12, display: 'inline-block' }} />
            </span>
            <Icon name="library" size={14} />
            <span className="tree-label">资料库</span>
          </div>
          {renderTree(folderTree, 1)}
          <div className="tree-hint">右键新建文件夹 / 上传文件，拖动可移动</div>
        </div>
      </div>

      <div className="card lib-main">
        <div className="lib-toolbar">
          <button
            type="button"
            className="toolbar-btn"
            title="返回上一级"
            onClick={() => setCurrentDir(parentOf(currentDir))}
            disabled={!currentDir}
          >
            <Icon name="logout" size={14} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <div className="lib-breadcrumb">
            <button type="button" className="crumb" onClick={() => setCurrentDir('')}>
              资料库
            </button>
            {crumbs.map((crumb, index) => (
              <span key={`${crumb}-${index}`} className="crumb-wrap">
                <span className="crumb-sep">/</span>
                <button
                  type="button"
                  className="crumb"
                  onClick={() => setCurrentDir(crumbs.slice(0, index + 1).join('/'))}
                >
                  {crumb}
                </button>
              </span>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <input
            className="input input-sm"
            style={{ maxWidth: 200 }}
            placeholder="搜索资料"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button
            size="sm"
            icon="folderPlus"
            onClick={() => setPrompt({ mode: 'newFolder', parent: currentDir })}
          >
            新建文件夹
          </Button>
          <Button
            size="sm"
            icon="upload"
            onClick={() => document.getElementById('library-file-input')?.click()}
          >
            上传
          </Button>
          <input
            id="library-file-input"
            type="file"
            hidden
            onChange={(event) => {
              uploadFiles(event.target.files, currentDir);
              event.target.value = '';
            }}
          />
        </div>

        <div
          className="lib-canvas"
          data-over={osDragging || dropTarget === '__current__'}
          onClick={() => setSelected('')}
          onContextMenu={(event) => {
            if (event.target === event.currentTarget) openMenu(event, { kind: 'blank' });
          }}
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes('Files')) {
              event.preventDefault();
              setOsDragging(true);
              return;
            }
            if (!drag) return;
            event.preventDefault();
            setDropTarget('__current__');
          }}
          onDragLeave={(event) => {
            if (event.target === event.currentTarget) {
              setOsDragging(false);
              if (dropTarget === '__current__') setDropTarget('');
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setOsDragging(false);
            setDropTarget('');
            if (event.dataTransfer.files.length > 0) {
              uploadFiles(event.dataTransfer.files, currentDir);
              return;
            }
            if (drag?.kind === 'file') moveFile(drag.index, currentDir);
            else if (drag?.kind === 'folder') relocateFolder(drag.rel, currentDir);
            setDrag(null);
          }}
        >
          {subFolders.length === 0 && visibleItems.length === 0 ? (
            <Empty>
              {loading
                ? '正在读取资料库…'
                : '这个文件夹还是空的。把文件拖进来，或右键新建文件夹。'}
            </Empty>
          ) : (
            <div className="library-grid">
              {subFolders.map((rel) => (
                <div
                  key={`folder-${rel}`}
                  className="file-card"
                  data-kind="folder"
                  data-selected={selected === `folder:${rel}`}
                  data-drop={dropTarget === rel}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'move';
                    setDrag({ kind: 'folder', rel });
                  }}
                  onDragEnd={() => {
                    setDrag(null);
                    setDropTarget('');
                  }}
                  onDragOver={(event) => {
                    if (!drag) return;
                    event.preventDefault();
                    event.stopPropagation();
                    setDropTarget(rel);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (drag?.kind === 'file') moveFile(drag.index, rel);
                    else if (drag?.kind === 'folder') relocateFolder(drag.rel, rel);
                    setDrag(null);
                    setDropTarget('');
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelected(`folder:${rel}`);
                  }}
                  onDoubleClick={() => setCurrentDir(rel)}
                  onContextMenu={(event) => openMenu(event, { kind: 'folder', rel })}
                >
                  <span className="file-icon" style={{ color: 'rgb(var(--accent))' }}>
                    <Icon name="folder" size={18} />
                  </span>
                  <div className="file-title">{baseName(rel)}</div>
                  <div className="file-meta">
                    <span>{subFolderCount(rel)} 份资料</span>
                  </div>
                </div>
              ))}

              {visibleItems.map((item) => {
                const index = items.indexOf(item);
                const rel = relFromHref(item.href);
                const isPending = rel ? pending.has(`public/resources/${rel}`) : false;
                return (
                  <div
                    key={`${item.id}-${index}`}
                    className="file-card"
                    data-kind="file"
                    data-selected={selected === `file:${index}`}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move';
                      setDrag({ kind: 'file', index });
                    }}
                    onDragEnd={() => {
                      setDrag(null);
                      setDropTarget('');
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelected(`file:${index}`);
                    }}
                    onDoubleClick={() => setEditing({ item: { ...item }, index })}
                    onContextMenu={(event) => openMenu(event, { kind: 'file', index })}
                  >
                    <div className="file-actions">
                      <IconButton
                        icon="edit"
                        label="编辑信息"
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditing({ item: { ...item }, index });
                        }}
                      />
                      <IconButton
                        icon="trash"
                        label="删除"
                        onClick={(event) => {
                          event.stopPropagation();
                          setConfirmState({ kind: 'file', index, title: item.title });
                        }}
                      />
                    </div>
                    <span className="file-icon" style={{ color: TYPE_COLOR[item.type] }}>
                      {RESOURCE_TYPES.find((type) => type.id === item.type)?.label ?? '文件'}
                    </span>
                    <div className="file-title">{item.title}</div>
                    {item.description ? (
                      <div style={{ fontSize: 11.5, color: 'rgb(var(--ink-muted))', lineHeight: 1.5 }}>
                        {item.description}
                      </div>
                    ) : null}
                    <div className="file-meta">
                      {item.size ? <span>{item.size}</span> : null}
                      {item.subject ? <span>{item.subject}</span> : null}
                      <span style={{ marginLeft: 'auto' }}>
                        {isPending ? '待上传' : formatDate(item.updatedAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="lib-hint">
            双击文件夹进入 · 右键查看更多操作 · 直接把文件拖到窗口里即可上传
          </div>
        </div>
      </div>

      {menu ? (
        <ContextMenu x={menu.x} y={menu.y} items={menuItems(menu.target)} onClose={() => setMenu(null)} />
      ) : null}

      {prompt?.mode === 'newFolder' ? (
        <PromptModal
          title="新建文件夹"
          label="文件夹名称"
          placeholder="如：第一章课件"
          hint={`位置：${prompt.parent || '资料库根目录'}`}
          confirmText="创建"
          onClose={() => setPrompt(null)}
          onConfirm={(value) => {
            createFolder(prompt.parent, value);
            setPrompt(null);
          }}
        />
      ) : null}

      {prompt?.mode === 'renameFolder' ? (
        <PromptModal
          title="重命名文件夹"
          label="新的文件夹名称"
          initial={prompt.value}
          confirmText="重命名"
          onClose={() => setPrompt(null)}
          onConfirm={(value) => {
            relocateFolder(prompt.rel, parentOf(prompt.rel), value.replace(/[\\/:*?"<>|]/g, '-'));
            setPrompt(null);
          }}
        />
      ) : null}

      {prompt?.mode === 'renameFile' ? (
        <PromptModal
          title="重命名文件"
          label="新的文件名（保留扩展名）"
          initial={prompt.value}
          hint={`当前：${nameOf(items[prompt.index] ?? ({} as RawItem))}`}
          confirmText="重命名"
          onClose={() => setPrompt(null)}
          onConfirm={(value) => {
            const item = items[prompt.index];
            if (!item) return;
            const original = nameOf(item);
            const ext = original.includes('.') ? `.${original.split('.').pop()}` : '';
            const name = value.replace(/[\\/:*?"<>|]/g, '-') + ext;
            const folder = folderOf(item);
            const rel = relFromHref(item.href);
            if (rel) {
              const nextRel = folder ? `${folder}/${name}` : name;
              if (items.some((other, i) => i !== prompt.index && relFromHref(other.href) === nextRel)) {
                toast.show('目标位置已有同名文件', 'error');
                return;
              }
              movePhysical(rel, nextRel);
              writeLibrary(
                items.map((other, i) =>
                  i === prompt.index
                    ? { ...other, href: `${RES_PREFIX}${nextRel}`, folder: folder || undefined }
                    : other,
                ),
              );
            } else {
              toast.show('外部链接请直接编辑信息里的地址', 'error');
            }
            setPrompt(null);
          }}
        />
      ) : null}

      {prompt?.mode === 'moveFile' ? (
        <PromptModal
          title="移动文件"
          label="目标文件夹（留空表示根目录）"
          initial={prompt.value}
          placeholder="如：第一章课件"
          confirmText="移动"
          onClose={() => setPrompt(null)}
          onConfirm={(value) => {
            moveFile(prompt.index, value);
            setPrompt(null);
          }}
        />
      ) : null}

      {editing ? (
        <ItemModal
          state={editing}
          onClose={() => setEditing(null)}
          onSave={saveItem}
          onCancelUpload={() => {
            if (editing.path) removeUpload(editing.path);
            setEditing(null);
          }}
        />
      ) : null}

      {folderInfo ? (
        <Modal
          title={`「${baseName(folderInfo)}」属性`}
          onClose={() => setFolderInfo(null)}
          width={420}
          footer={<Button onClick={() => setFolderInfo(null)}>关闭</Button>}
        >
          <div className="detail-list">
            <div>
              <span>位置</span>
              <b>/resources/{folderInfo}</b>
            </div>
            <div>
              <span>包含资料</span>
              <b>{subFolderCount(folderInfo)} 份</b>
            </div>
            <div>
              <span>子文件夹</span>
              <b>{folders.filter((rel) => parentOf(rel) === folderInfo).length} 个</b>
            </div>
          </div>
        </Modal>
      ) : null}

      {confirmState ? (
        <Modal
          title={confirmState.kind === 'folder' ? '删除文件夹？' : '删除资料？'}
          onClose={() => setConfirmState(null)}
          width={440}
          footer={
            <>
              <Button onClick={() => setConfirmState(null)}>取消</Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (confirmState.kind === 'folder') removeFolder(confirmState.rel);
                  else removeItem(confirmState.index);
                  setConfirmState(null);
                }}
              >
                删除
              </Button>
            </>
          }
        >
          <p style={{ fontSize: 13, lineHeight: 1.7, color: 'rgb(var(--ink-muted))' }}>
            {confirmState.kind === 'folder'
              ? `「${baseName(confirmState.rel)}」中的资料也会一起删除，发布后生效。`
              : `《${confirmState.title}》及其文件会从仓库删除，发布后生效。`}
          </p>
        </Modal>
      ) : null}
    </div>
  );
}

function ItemModal({
  state,
  onClose,
  onSave,
  onCancelUpload,
}: {
  state: { item: RawItem; index: number | null; base64?: string; path?: string };
  onClose: () => void;
  onSave: (item: RawItem, index: number | null, base64?: string, path?: string) => void;
  onCancelUpload: () => void;
}) {
  const [item, setItem] = useState<RawItem>({ ...state.item });
  const [tagsText, setTagsText] = useState((state.item.tags ?? []).join('，'));
  const patch = (value: Partial<RawItem>) => setItem((prev) => ({ ...prev, ...value }));

  return (
    <Modal
      title={state.index === null ? '填写资料信息' : '资料属性'}
      onClose={state.base64 ? onCancelUpload : onClose}
      width={560}
      footer={
        <>
          <Button onClick={state.base64 ? onCancelUpload : onClose}>取消</Button>
          <Button
            variant="primary"
            icon="check"
            onClick={() =>
              onSave(
                {
                  ...item,
                  tags: tagsText
                    .split(/[,，、;；]/)
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                  subject: item.subject?.trim() || undefined,
                  description: item.description?.trim() || undefined,
                },
                state.index,
                state.base64,
                state.path,
              )
            }
          >
            保存
          </Button>
        </>
      }
    >
      {state.base64 ? (
        <div
          style={{
            padding: 10,
            borderRadius: 10,
            background: 'rgb(var(--accent-soft))',
            fontSize: 12.5,
            color: 'rgb(var(--accent))',
          }}
        >
          文件已就绪，保存后会随发布一起上传到仓库。
        </div>
      ) : null}

      <Field label="标题">
        <input
          className="input"
          autoFocus
          value={item.title}
          onChange={(event) => patch({ title: event.target.value })}
        />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="类型">
          <select
            className="select"
            value={item.type}
            onChange={(event) => patch({ type: event.target.value as LibraryItem['type'] })}
          >
            {RESOURCE_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="学科">
          <input
            className="input"
            value={item.subject ?? ''}
            placeholder="留空表示公共资料"
            onChange={(event) => patch({ subject: event.target.value })}
          />
        </Field>
      </div>

      <Field
        label="文件地址"
        hint={state.base64 ? '上传路径，一般不用改' : '站内文件写 /resources/文件夹/xxx，外部链接写完整 https:// 地址'}
      >
        <input
          className="input"
          value={item.href}
          onChange={(event) => patch({ href: event.target.value })}
        />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="显示大小">
          <input
            className="input"
            value={item.size ?? ''}
            placeholder="如 2.4 MB"
            onChange={(event) => patch({ size: event.target.value })}
          />
        </Field>
        <Field label="更新日期">
          <input
            className="input"
            value={item.updatedAt ?? ''}
            placeholder="YYYY-MM-DD"
            onChange={(event) => patch({ updatedAt: event.target.value })}
          />
        </Field>
      </div>

      <Field label="简介">
        <textarea
          className="textarea"
          rows={2}
          value={item.description ?? ''}
          onChange={(event) => patch({ description: event.target.value })}
        />
      </Field>

      <Field label="标签" hint="逗号分隔">
        <input className="input" value={tagsText} onChange={(event) => setTagsText(event.target.value)} />
      </Field>
    </Modal>
  );
}
