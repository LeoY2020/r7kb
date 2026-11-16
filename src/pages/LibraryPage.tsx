import { useMemo, useState } from 'react';
import { LIBRARY_PATH } from '../lib/notes';
import { useWorkspace } from '../lib/workspace';
import { RESOURCE_TYPES, type LibraryItem } from '../lib/types';
import {
  Button,
  Empty,
  Field,
  Icon,
  IconButton,
  Modal,
  formatBytes,
  formatDate,
  useToast,
} from '../components/ui';

type RawItem = LibraryItem;

function parseItems(text: string | undefined): RawItem[] {
  if (!text) return [];
  try {
    const data = JSON.parse(text) as { resources?: RawItem[] };
    return (data.resources ?? []).map((item) => ({ ...item }));
  } catch {
    return [];
  }
}

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

export default function LibraryPage() {
  const { fileText, updateFile, addUpload, uploads, removeUpload } = useWorkspace();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ item: RawItem; index: number | null; base64?: string; path?: string } | null>(
    null,
  );
  const [deleting, setDeleting] = useState<{ item: RawItem; index: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const items = useMemo(() => parseItems(fileText(LIBRARY_PATH)), [fileText]);
  const pending = useMemo(() => new Set(uploads.map((upload) => upload.path)), [uploads]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(keyword) ||
        item.description?.toLowerCase().includes(keyword) ||
        item.tags?.some((tag) => tag.toLowerCase().includes(keyword)),
    );
  }, [items, query]);

  const writeItems = (next: RawItem[]) => {
    updateFile(LIBRARY_PATH, `${JSON.stringify({ resources: next }, null, 2)}\n`);
  };

  const startUpload = (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      toast.show('文件超过 20MB，暂时无法上传', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      const base64 = dataUrl.split(',')[1] ?? '';
      const safeName = file.name.replace(/[\\/:*?"<>|]/g, '-');
      const existing = new Set(items.map((item) => item.href));
      let name = safeName;
      let index = 2;
      while (existing.has(`/resources/${name}`)) {
        const dot = safeName.lastIndexOf('.');
        name =
          dot > 0
            ? `${safeName.slice(0, dot)}-${index}${safeName.slice(dot)}`
            : `${safeName}-${index}`;
        index += 1;
      }
      setEditing({
        item: {
          id: guessTitle(name),
          title: guessTitle(file.name),
          type: fileType(name),
          href: `/resources/${name}`,
          size: formatBytes(file.size),
          updatedAt: new Date().toISOString().slice(0, 10),
          description: '',
          tags: [],
        },
        index: null,
        base64,
        path: `public/resources/${name}`,
      });
    };
    reader.readAsDataURL(file);
  };

  const uploadFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    startUpload(files[0]);
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
    const next = [...items];
    if (index === null) next.push(item);
    else next[index] = item;
    writeItems(next);
    if (base64 && path) {
      addUpload({ path, base64, size: 0, name: path.split('/').pop() ?? path });
    }
    setEditing(null);
    toast.show(index === null ? '资料已添加，发布后出现在资料库' : '资料信息已更新');
  };

  const deleteItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    writeItems(next);
    setDeleting(null);
    toast.show('已从资料库移除（文件本身保留在仓库里）');
  };

  return (
    <div className="list-page">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <span className="pill">
          <Icon name="library" size={13} /> {items.length} 份资料
        </span>
        {uploads.length > 0 ? <span className="pill">待上传 {uploads.length}</span> : null}
        <div style={{ flex: 1 }} />
        <input
          className="input input-sm"
          style={{ maxWidth: 260 }}
          placeholder="搜索资料"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button
          size="sm"
          icon="plus"
          onClick={() =>
            setEditing({
              item: {
                id: '',
                title: '',
                type: 'link',
                href: '',
                updatedAt: new Date().toISOString().slice(0, 10),
                description: '',
                tags: [],
              },
              index: null,
            })
          }
        >
          添加链接
        </Button>
      </div>

      <label
        className="dropzone"
        data-over={dragging}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          uploadFiles(event.dataTransfer.files);
        }}
      >
        <input
          type="file"
          hidden
          onChange={(event) => {
            uploadFiles(event.target.files);
            event.target.value = '';
          }}
        />
        <Icon name="upload" size={26} />
        <div style={{ fontSize: 14, fontWeight: 500, color: 'rgb(var(--ink))' }}>
          把文件拖到这里，或点击选择
        </div>
        <div style={{ fontSize: 12 }}>
          PDF / 课件 / 文档 / 视频 / 链接 · 单个文件不超过 20MB · 上传后填写展示信息
        </div>
      </label>

      {filtered.length === 0 ? (
        <div className="card">
          <Empty>还没有资料。</Empty>
        </div>
      ) : (
        <div className="library-grid">
          {filtered.map((item) => {
            const index = items.indexOf(item);
            const pendingUpload = [...pending].some((path) => path.endsWith(item.href.replace('/resources/', '')));
            return (
              <div key={`${item.id}-${index}`} className="file-card">
                <div className="file-actions">
                  <IconButton
                    icon="edit"
                    label="编辑信息"
                    onClick={() => setEditing({ item: { ...item }, index })}
                  />
                  <IconButton icon="trash" label="移除" onClick={() => setDeleting({ item, index })} />
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
                    {pendingUpload ? '待上传' : formatDate(item.updatedAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

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

      {deleting ? (
        <Modal
          title="从资料库移除？"
          onClose={() => setDeleting(null)}
          width={420}
          footer={
            <>
              <Button onClick={() => setDeleting(null)}>取消</Button>
              <Button variant="danger" onClick={() => deleteItem(deleting.index)}>
                移除
              </Button>
            </>
          }
        >
          <p style={{ fontSize: 13, lineHeight: 1.7, color: 'rgb(var(--ink-muted))' }}>
            《{deleting.item.title}》会从资料列表消失；已上传的文件不会从仓库删除。
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
      title={state.index === null ? '填写资料信息' : '编辑资料信息'}
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
        hint={state.base64 ? '上传路径，一般不用改' : '站内文件写 /resources/xxx，外部链接写完整 https:// 地址'}
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
        <input
          className="input"
          value={tagsText}
          onChange={(event) => setTagsText(event.target.value)}
        />
      </Field>
    </Modal>
  );
}
