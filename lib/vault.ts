import fs from 'node:fs';
import path from 'node:path';
import { asList, asNumber, asString, parseFrontmatter, type Frontmatter } from './frontmatter';
// asNumber / asString 仍用于 frontmatter；JSON 配置用下面的 readString / readNumber。

/**
 * 知识库（Obsidian vault）构建期加载器，仅服务端使用。
 *
 * 目录：class-kb/content/knowledge/
 * - 普通 .md 即一篇笔记，文件名可带序号（1.1-xxx.md），slug 写在 frontmatter。
 * - 目录中的 index.md 代表该目录本身，父级目录的层级高于子级。
 * - `_config/` 下的章节关联配置只在构建时读取，不在网页中展示。
 * - 以 `_` 或 `.` 开头的文件/目录不参与加载。
 */

const VAULT_ROOT = path.join(process.cwd(), 'content', 'knowledge');
const CONFIG_ROOT = path.join(VAULT_ROOT, '_config');

const NOTE_CACHE = new Map<string, unknown>();
const HIDDEN = (name: string) => name.startsWith('_') || name.startsWith('.');

/** JSON 配置里的 unknown 值 → 字符串 / 数字 */
function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function readNumber(value: unknown): number | undefined {
  const raw = readString(value);
  if (raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function cache<T>(key: string, factory: () => T): T {
  if (NOTE_CACHE.has(key)) return NOTE_CACHE.get(key) as T;
  const value = factory();
  NOTE_CACHE.set(key, value);
  return value;
}

function walkMarkdown(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (HIDDEN(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMarkdown(full));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) out.push(full);
  }
  return out.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
}

function relOf(filePath: string): string {
  return path.relative(VAULT_ROOT, filePath).split(path.sep).join('/');
}

/** 文件名去掉 .md 与开头的序号，作为兜底标题 / slug 候选 */
function cleanFileName(name: string): string {
  return name
    .replace(/\.md$/i, '')
    .replace(/^\d+(?:\.\d+)*\s*[-_、.]?\s*/, '')
    .trim();
}

function derivedSlug(relPath: string, data: Frontmatter): string {
  const explicit = asString(data.slug);
  if (explicit) return explicit;
  const file = relPath.split('/').pop() ?? relPath;
  const base = file.replace(/\.md$/i, '');
  return base
    .replace(/^\d+(?:\.\d+)*\s*[-_、.]?\s*/, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

export type VaultNote = {
  slug: string;
  title: string;
  description?: string;
  tags: string[];
  order: number;
  /** frontmatter 中声明的章节，仅作展示 */
  chapter?: string;
  updated?: string;
  relPath: string;
  /** 笔记所在目录（相对 vault 根） */
  dir: string;
  isIndex: boolean;
  body: string;
};

export type VaultConfig = {
  title: string;
  description: string;
  author?: string;
  source?: string;
};

export type VaultTreeNode = {
  type: 'note' | 'dir';
  /** 展示名 */
  title: string;
  /** 指向的笔记 slug；目录指向 index.md，没有 index 时为 undefined */
  slug?: string;
  relPath: string;
  order: number;
  children: VaultTreeNode[];
};

export type ChapterOrderItem = {
  slug: string;
  title: string;
  order: number;
  parent?: string;
};

export type ChapterLinks = {
  prerequisites: string[];
  next: string[];
  related: string[];
};

export type ResolvedLink = {
  slug?: string;
  title: string;
  href?: string;
};

export type ChapterLinkGroups = {
  prerequisites: ResolvedLink[];
  next: ResolvedLink[];
  related: ResolvedLink[];
};

export type VaultTag = {
  tag: string;
  color?: string;
  notes: ResolvedLink[];
};

/* ------------------------------------------------------------------ */
/* 基础读取                                                            */
/* ------------------------------------------------------------------ */

export function getVaultConfig(): VaultConfig {
  return cache('vault-config', () => {
    const fallback: VaultConfig = {
      title: '智能电子书知识库',
      description: '以 Obsidian 目录组织的中文智能电子书构建指南。',
    };
    const file = path.join(CONFIG_ROOT, 'vault.json');
    if (!fs.existsSync(file)) return fallback;
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<VaultConfig>;
      return {
        title: readString(parsed.title) ?? fallback.title,
        description: readString(parsed.description) ?? fallback.description,
        author: readString(parsed.author),
        source: readString(parsed.source),
      };
    } catch {
      return fallback;
    }
  });
}

export function getVaultNotes(): VaultNote[] {
  return cache('vault-notes', () => {
    const files = walkMarkdown(VAULT_ROOT);
    return files.map((filePath) => {
      const raw = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
      const { data, body } = parseFrontmatter(raw);
      const relPath = relOf(filePath);
      const file = relPath.split('/').pop() ?? relPath;
      return {
        slug: derivedSlug(relPath, data),
        title: asString(data.title) ?? cleanFileName(file),
        description: asString(data.description),
        tags: asList(data.tags),
        order: asNumber(data.order) ?? 9999,
        chapter: asString(data.chapter),
        updated: asString(data.updated),
        relPath,
        dir: relPath.includes('/') ? relPath.slice(0, relPath.lastIndexOf('/')) : '',
        isIndex: file.toLowerCase() === 'index.md',
        body,
      } satisfies VaultNote;
    });
  });
}

export function getNoteBySlug(slug: string): VaultNote | undefined {
  return getVaultNotes().find((note) => note.slug === slug);
}

/* ------------------------------------------------------------------ */
/* 目录树（父级目录层级更高）                                          */
/* ------------------------------------------------------------------ */

function dirTitle(dirRel: string, index?: VaultNote): string {
  if (index) return index.title;
  const base = dirRel.split('/').pop() ?? dirRel;
  return cleanFileName(base);
}

export function getVaultTree(): { root?: VaultNote; children: VaultTreeNode[] } {
  return cache('vault-tree', () => {
    const notes = getVaultNotes();
    const byDirIndex = new Map<string, VaultNote>();
    for (const note of notes) {
      if (note.isIndex) byDirIndex.set(note.dir, note);
    }

    const notesByDir = new Map<string, VaultNote[]>();
    for (const note of notes) {
      if (note.isIndex) continue;
      const list = notesByDir.get(note.dir) ?? [];
      list.push(note);
      notesByDir.set(note.dir, list);
    }

    const childDirs = (parent: string): string[] => {
      const prefix = parent ? `${parent}/` : '';
      const dirs = new Set<string>();
      for (const note of notes) {
        if (!note.dir) continue;
        if (!note.dir.startsWith(prefix)) continue;
        const remainder = note.dir.slice(prefix.length);
        if (!remainder) continue;
        dirs.add(prefix + remainder.split('/')[0]);
      }
      return [...dirs].sort((a, b) => {
        const ia = byDirIndex.get(a)?.order ?? 9999;
        const ib = byDirIndex.get(b)?.order ?? 9999;
        if (ia !== ib) return ia - ib;
        return a.localeCompare(b, 'zh-Hans-CN');
      });
    };

    const buildDir = (dirRel: string, depth: number): VaultTreeNode => {
      const index = byDirIndex.get(dirRel);
      const children: VaultTreeNode[] = [];
      for (const note of notesByDir.get(dirRel) ?? []) {
        children.push({
          type: 'note',
          title: note.title,
          slug: note.slug,
          relPath: note.relPath,
          order: note.order,
          children: [],
        });
      }
      for (const childDir of childDirs(dirRel)) {
        if (depth < 0) continue;
        children.push(buildDir(childDir, depth - 1));
      }
      children.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.title.localeCompare(b.title, 'zh-Hans-CN');
      });
      return {
        type: 'dir',
        title: dirTitle(dirRel, index),
        slug: index?.slug,
        relPath: dirRel || 'index.md',
        order: index?.order ?? 9999,
        children,
      };
    };

    const root = byDirIndex.get('');
    const children = childDirs('').map((dir) => buildDir(dir, 6));
    return { root, children };
  });
}

/* ------------------------------------------------------------------ */
/* 面包屑 / 相邻笔记                                                   */
/* ------------------------------------------------------------------ */

export function getBreadcrumbs(slug: string): ResolvedLink[] {
  const note = getNoteBySlug(slug);
  if (!note) return [];
  const notes = getVaultNotes();
  const trail: ResolvedLink[] = [];

  const indexes = new Map<string, VaultNote>();
  for (const item of notes) if (item.isIndex) indexes.set(item.dir, item);

  // 祖先目录（由浅到深）
  const parts = note.dir ? note.dir.split('/') : [];
  for (let i = 0; i <= parts.length; i += 1) {
    const dirRel = parts.slice(0, i).join('/');
    const index = indexes.get(dirRel);
    if (index && index.slug !== note.slug) {
      trail.push({ slug: index.slug, title: index.title, href: `/knowledge/${index.slug}/` });
    }
  }
  return trail;
}

export function getNoteSiblings(slug: string): { prev?: VaultNote; next?: VaultNote } {
  const note = getNoteBySlug(slug);
  if (!note) return {};
  const siblings = getVaultNotes()
    .filter((item) => item.dir === note.dir && !item.isIndex)
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.title.localeCompare(b.title, 'zh-Hans-CN');
    });
  const index = siblings.findIndex((item) => item.slug === slug);
  if (index === -1) return {};
  return { prev: siblings[index - 1], next: siblings[index + 1] };
}

/* ------------------------------------------------------------------ */
/* 章节配置（_config 不参与网页展示）                                  */
/* ------------------------------------------------------------------ */

export function getChapterOrder(): ChapterOrderItem[] {
  return cache('chapter-order', () => {
    const file = path.join(CONFIG_ROOT, 'chapter-order.json');
    if (!fs.existsSync(file)) return [];
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as { chapters?: unknown };
      if (!Array.isArray(parsed.chapters)) return [];
      const out: ChapterOrderItem[] = [];
      for (const item of parsed.chapters) {
        const record = item as Record<string, unknown>;
        const slug = readString(record.slug);
        if (!slug) continue;
        const parent = readString(record.parent);
        out.push({
          slug,
          title: readString(record.title) ?? slug,
          order: readNumber(record.order) ?? 9999,
          ...(parent ? { parent } : {}),
        });
      }
      return out.sort((a, b) => a.order - b.order);
    } catch {
      return [];
    }
  });
}

export function getChapterRootSlug(): string | undefined {
  return cache('chapter-root', () => {
    const file = path.join(CONFIG_ROOT, 'chapter-order.json');
    if (!fs.existsSync(file)) return undefined;
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as { root?: unknown };
      return readString(parsed.root);
    } catch {
      return undefined;
    }
  });
}

function getRawChapterLinks(): Record<string, ChapterLinks> {
  return cache('chapter-links', () => {
    const file = path.join(CONFIG_ROOT, 'chapter-links.json');
    if (!fs.existsSync(file)) return {};
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as { links?: unknown };
      const links = parsed.links;
      if (!links || typeof links !== 'object') return {};
      const out: Record<string, ChapterLinks> = {};
      for (const [key, value] of Object.entries(links as Record<string, unknown>)) {
        const record = (value ?? {}) as Record<string, unknown>;
        out[key] = {
          prerequisites: asList(record.prerequisites as string[] | string),
          next: asList(record.next as string[] | string),
          related: asList(record.related as string[] | string),
        };
      }
      return out;
    } catch {
      return {};
    }
  });
}

/** 笔记所属章节的 index slug：章节内所有笔记共用同一套章节关联 */
export function getChapterSlugForNote(note: VaultNote): string | undefined {
  const indexes = new Map<string, VaultNote>();
  for (const item of getVaultNotes()) {
    if (item.isIndex) indexes.set(item.dir, item);
  }
  if (note.isIndex) return note.slug;
  return indexes.get(note.dir)?.slug;
}

function resolveLink(slug: string, fallbackTitle?: string): ResolvedLink {
  const note = getNoteBySlug(slug);
  if (!note) return { title: fallbackTitle ?? slug };
  return { slug: note.slug, title: note.title, href: `/knowledge/${note.slug}/` };
}

export function getChapterLinksForNote(note: VaultNote): ChapterLinkGroups {
  const links = getRawChapterLinks();
  const key = getChapterSlugForNote(note) ?? note.slug;
  const entry = links[key] ?? { prerequisites: [], next: [], related: [] };
  return {
    prerequisites: entry.prerequisites.map((slug) => resolveLink(slug)),
    next: entry.next.map((slug) => resolveLink(slug)),
    related: entry.related.map((slug) => resolveLink(slug)),
  };
}

/* ------------------------------------------------------------------ */
/* 双链解析 / 反向链接                                                 */
/* ------------------------------------------------------------------ */

function normalizeTarget(value: string): string {
  return value
    .split('|')[0]
    .split('#')[0]
    .replace(/\.md$/i, '')
    .trim()
    .toLowerCase();
}

function looseName(value: string): string {
  return value
    .replace(/\.md$/i, '')
    .replace(/^\d+(?:\.\d+)*\s*[-_、.]?\s*/, '')
    .replace(/^\d+\s*[-_]\s*/, '')
    .trim()
    .toLowerCase();
}

export function buildWikiResolver(): (target: string) => { title: string; href?: string } {
  const notes = getVaultNotes();
  const bySlug = new Map<string, VaultNote>();
  const byTitle = new Map<string, VaultNote>();
  const byFileName = new Map<string, VaultNote>();

  for (const note of notes) {
    bySlug.set(note.slug.toLowerCase(), note);
    byTitle.set(note.title.toLowerCase(), note);
    const file = note.relPath.split('/').pop() ?? '';
    const base = file.replace(/\.md$/i, '');
    byFileName.set(looseName(base), note);
    byFileName.set(base.toLowerCase(), note);
  }

  return (target: string) => {
    const key = normalizeTarget(target);
    const direct = bySlug.get(key) ?? byTitle.get(key) ?? byFileName.get(key);
    if (direct) {
      return { title: direct.title, href: `/knowledge/${direct.slug}/` };
    }
    const loose = byFileName.get(looseName(key));
    if (loose) return { title: loose.title, href: `/knowledge/${loose.slug}/` };
    return { title: target.split('|')[0].trim() };
  };
}

const WIKI_RE = /\[\[([^\]]+)\]\]/g;

export function extractWikiTargets(body: string): string[] {
  const targets: string[] = [];
  for (const match of body.matchAll(WIKI_RE)) {
    const raw = match[1];
    const target = raw.split('|')[0].split('#')[0].trim();
    if (target) targets.push(target);
  }
  return targets;
}

export function getBacklinks(slug: string): ResolvedLink[] {
  const note = getNoteBySlug(slug);
  if (!note) return [];
  const out: ResolvedLink[] = [];
  const seen = new Set<string>();
  const resolver = buildWikiResolver();
  for (const other of getVaultNotes()) {
    if (other.slug === slug) continue;
    const hit = extractWikiTargets(other.body).some(
      (target) => resolver(target).href === `/knowledge/${slug}/`
    );
    if (!hit || seen.has(other.slug)) continue;
    seen.add(other.slug);
    out.push({ slug: other.slug, title: other.title, href: `/knowledge/${other.slug}/` });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 标签                                                                */
/* ------------------------------------------------------------------ */

function getTagConfig(): Record<string, { color?: string; chapters?: string[] }> {
  return cache('tag-map', () => {
    const file = path.join(CONFIG_ROOT, 'tag-map.json');
    if (!fs.existsSync(file)) return {};
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as { tags?: unknown };
      if (!parsed.tags || typeof parsed.tags !== 'object') return {};
      const out: Record<string, { color?: string; chapters?: string[] }> = {};
      for (const [tag, value] of Object.entries(parsed.tags as Record<string, unknown>)) {
        const record = (value ?? {}) as Record<string, unknown>;
        out[tag] = {
          color: readString(record.color),
          chapters: asList(record.chapters as string[] | string),
        };
      }
      return out;
    } catch {
      return {};
    }
  });
}

/** 正文里出现的 #标签 也算标签，便于 Obsidian 写法直接可用 */
function bodyTags(body: string): string[] {
  const out: string[] = [];
  const re = /(?:^|[\s。；，、：:()（）])#([\p{L}\p{N}_-]{1,24})/gu;
  for (const match of body.matchAll(re)) out.push(match[1]);
  return out;
}

export function getVaultTags(): VaultTag[] {
  return cache('vault-tags', () => {
    const config = getTagConfig();
    const notes = getVaultNotes();
    const byTag = new Map<string, ResolvedLink[]>();

    for (const note of notes) {
      const tags = new Set<string>([...note.tags, ...bodyTags(note.body)]);
      for (const tag of tags) {
        const list = byTag.get(tag) ?? [];
        if (!list.some((item) => item.slug === note.slug)) {
          list.push({ slug: note.slug, title: note.title, href: `/knowledge/${note.slug}/` });
        }
        byTag.set(tag, list);
      }
    }

    const configured = Object.keys(config);
    const discovered = [...byTag.keys()].filter((tag) => !configured.includes(tag));
    return [...configured, ...discovered].map((tag) => ({
      tag,
      color: config[tag]?.color,
      notes: (byTag.get(tag) ?? []).sort((a, b) =>
        a.title.localeCompare(b.title, 'zh-Hans-CN')
      ),
    }));
  });
}

export function getTagColor(tag: string): string | undefined {
  return getTagConfig()[tag]?.color;
}

/* ------------------------------------------------------------------ */
/* 概览统计                                                            */
/* ------------------------------------------------------------------ */

export function getVaultStats() {
  return cache('vault-stats', () => {
    const notes = getVaultNotes();
    const tags = getVaultTags();
    const chapters = getChapterOrder();
    const latest = [...notes].sort((a, b) => (b.updated ?? '').localeCompare(a.updated ?? ''))[0];
    return {
      notes: notes.length,
      tags: tags.length,
      chapters: chapters.length,
      latest: latest?.updated,
    };
  });
}
