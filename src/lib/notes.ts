/** 知识库笔记：路径推导、解析、序列化、目录树。 */
import {
  asList,
  asNumber,
  asString,
  parseFrontmatter,
  stringifyFrontmatter,
} from './frontmatter';
import type { Frontmatter, Note } from './types';

export const VAULT_PREFIX = 'content/knowledge/';
export const LIBRARY_PATH = 'content/library/items.json';
export const LINKS_PATH = 'content/knowledge/_config/chapter-links.json';
export const ORDER_PATH = 'content/knowledge/_config/chapter-order.json';
export const FOLDERS_PATH = 'content/knowledge/_config/folders.json';

const FRONTMATTER_KEYS = [
  'slug',
  'title',
  'description',
  'tags',
  'order',
  'chapter',
  'updated',
];

export const isVaultNotePath = (filePath: string) =>
  filePath.startsWith(VAULT_PREFIX) &&
  filePath.toLowerCase().endsWith('.md') &&
  !filePath.split('/').some((part) => part.startsWith('_') || part.startsWith('.'));

export const vaultRel = (filePath: string) =>
  filePath.startsWith(VAULT_PREFIX) ? filePath.slice(VAULT_PREFIX.length) : filePath;

const cleanFileName = (name: string) =>
  name
    .replace(/\.md$/i, '')
    .replace(/^\d+(?:\.\d+)*\s*[-_、.]?\s*/, '')
    .trim();

export function deriveSlug(relPath: string, data: Frontmatter): string {
  const explicit = asString(data.slug);
  if (explicit) return explicit;
  const file = relPath.split('/').pop() ?? relPath;
  return file
    .replace(/\.md$/i, '')
    .replace(/^\d+(?:\.\d+)*\s*[-_、.]?\s*/, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

export function parseNote(filePath: string, raw: string): Note {
  const rel = vaultRel(filePath);
  const { data, body } = parseFrontmatter(raw);
  const fileName = rel.split('/').pop() ?? rel;
  return {
    path: filePath,
    dir: rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '',
    fileName,
    isIndex: fileName.toLowerCase() === 'index.md',
    slug: deriveSlug(rel, data),
    title: asString(data.title) || cleanFileName(fileName) || rel,
    description: asString(data.description),
    tags: asList(data.tags),
    order: asNumber(data.order) ?? 9999,
    chapter: asString(data.chapter),
    updated: asString(data.updated),
    body,
    data,
  };
}

export function serializeNote(note: Note): string {
  const data: Frontmatter = { ...note.data };
  data.slug = note.slug;
  data.title = note.title;
  if (note.description.trim()) data.description = note.description.trim();
  else delete data.description;
  if (note.tags.length) data.tags = note.tags;
  else delete data.tags;
  if (Number.isFinite(note.order)) data.order = note.order;
  if (note.chapter.trim()) data.chapter = note.chapter.trim();
  else delete data.chapter;
  if (note.updated.trim()) data.updated = note.updated.trim();
  else delete data.updated;

  const header = stringifyFrontmatter(data, FRONTMATTER_KEYS);
  return `${header}\n\n${note.body.trim()}\n`;
}

export type TreeDir = {
  type: 'dir';
  name: string;
  rel: string;
  title: string;
  order: number;
  notes: TreeNote[];
  dirs: TreeDir[];
};

export type TreeNote = {
  type: 'note';
  name: string;
  title: string;
  slug: string;
  path: string;
  order: number;
};

export type VaultTree = { notes: TreeNote[]; dirs: TreeDir[] };

export function parseFolders(text: string | undefined): string[] {
  if (!text) return [];
  try {
    const data = JSON.parse(text) as { folders?: unknown };
    if (!Array.isArray(data.folders)) return [];
    return [
      ...new Set(
        data.folders
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''))
          .filter(Boolean),
      ),
    ];
  } catch {
    return [];
  }
}

export function serializeFolders(folders: string[]): string {
  return `${JSON.stringify({ folders: [...new Set(folders)].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')) }, null, 2)}\n`;
}

/** 按目录生成侧栏树；目录顺序优先使用目录内 index.md 的 order。 */
export function buildVaultTree(notes: Note[], extraFolders: string[] = []): VaultTree {
  const byDir = new Map<string, Note[]>();
  for (const note of notes) {
    const list = byDir.get(note.dir) ?? [];
    list.push(note);
    byDir.set(note.dir, list);
  }

  const knownDirs = new Set<string>();
  const addDir = (rel: string) => {
    if (!rel) return;
    const parts = rel.split('/').filter(Boolean);
    let acc = '';
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      knownDirs.add(acc);
    }
  };
  for (const note of notes) addDir(note.dir);
  for (const folder of extraFolders) addDir(folder);

  const childDirs = (parent: string): string[] => {
    const prefix = parent ? `${parent}/` : '';
    const dirs = new Set<string>();
    for (const dir of knownDirs) {
      if (!dir.startsWith(prefix)) continue;
      const rest = dir.slice(prefix.length);
      if (!rest || rest.includes('/')) continue;
      dirs.add(prefix + rest);
    }
    return [...dirs];
  };

  const build = (dirRel: string): TreeDir => {
    const items = byDir.get(dirRel) ?? [];
    const index = items.find((note) => note.isIndex);
    const subDirs = childDirs(dirRel).map(build);
    subDirs.sort((a, b) => (a.order !== b.order ? a.order - b.order : a.name.localeCompare(b.name, 'zh-Hans-CN')));
    const list: TreeNote[] = items
      .filter((note) => !note.isIndex)
      .map<TreeNote>((note) => ({
        type: 'note',
        name: note.fileName.replace(/\.md$/i, ''),
        title: note.title,
        slug: note.slug,
        path: note.path,
        order: note.order,
      }))
      .sort((a, b) => (a.order !== b.order ? a.order - b.order : a.name.localeCompare(b.name, 'zh-Hans-CN')));
    return {
      type: 'dir',
      name: dirRel.split('/').pop() ?? dirRel,
      rel: dirRel,
      title: index?.title || cleanFileName(dirRel.split('/').pop() ?? dirRel),
      order: index?.order ?? 9999,
      notes: list,
      dirs: subDirs,
    };
  };

  const rootDirs = childDirs('').map(build);
  rootDirs.sort((a, b) => (a.order !== b.order ? a.order - b.order : a.name.localeCompare(b.name, 'zh-Hans-CN')));
  const rootNotes: TreeNote[] = (byDir.get('') ?? [])
    .filter((note) => !note.isIndex)
    .map<TreeNote>((note) => ({
      type: 'note',
      name: note.fileName.replace(/\.md$/i, ''),
      title: note.title,
      slug: note.slug,
      path: note.path,
      order: note.order,
    }));

  return { notes: rootNotes, dirs: rootDirs };
}

export function safeFileName(title: string): string {
  return (
    title
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, '-')
      .trim() || 'note'
  );
}

/** 依据标题生成不冲突的 slug */
export function uniqueSlug(base: string, used: Set<string>): string {
  const normalized = base || 'note';
  if (!used.has(normalized)) return normalized;
  let index = 2;
  while (used.has(`${normalized}-${index}`)) index += 1;
  return `${normalized}-${index}`;
}

export function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
