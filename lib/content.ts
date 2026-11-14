import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter, toFaq, toSubject, type RawDoc } from './frontmatter';
import { getChapterGraph } from './vault';
import type {
  Faq,
  Question,
  Resource,
  ResourceType,
  Stats,
  Subject,
} from './types';

/**
 * 构建期内容加载器（仅服务端 / 静态导出时使用）。
 *
 * 内容分两种：
 *   正文型 → Markdown + frontmatter
 *     graph/subjects、faq、knowledge
 *   记录型 → JSON（没有正文，只有字段）
 *     quiz/*.json、library/items.json
 *
 * 学习图谱由 `lib/vault.ts` 的 getChapterGraph() 从知识库章节生成。
 * 所有校验都在这里做：字段缺失、id 重复、引用不存在都会让
 * `npm run build` 直接失败，并指出文件与位置，避免静默变成默认值。
 *
 * 客户端组件不要 import 本文件（含 node:fs）。
 */

const CONTENT_ROOT = path.join(process.cwd(), 'content');

const isHidden = (name: string) =>
  name.startsWith('_') || name.startsWith('.') || name === 'README.md';

function fail(message: string): never {
  throw new Error(`[content] ${message}`);
}

/* ------------------------------------------------------------------ */
/* 文件读取                                                            */
/* ------------------------------------------------------------------ */

function walkMarkdown(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (isHidden(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkMarkdown(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      out.push(full);
    }
  }
  return out.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
}

function toRelative(filePath: string): string {
  return path.relative(CONTENT_ROOT, filePath).split(path.sep).join('/');
}

function loadDocs(dir: string): RawDoc[] {
  return walkMarkdown(dir).map((filePath) => {
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data, body } = parseFrontmatter(raw);
    return { data, body, filePath, relPath: toRelative(filePath) };
  });
}

/** 读取 JSON；文件不存在返回 null */
function readJson(relPath: string): unknown {
  const file = path.join(CONTENT_ROOT, relPath);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf8');
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    fail(`content/${relPath} 不是合法 JSON：${(error as Error).message}`);
  }
}

/** JSON 目录下的所有 .json（跳过 `_` / `.` 开头） */
function listJson(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !isHidden(entry.name) && entry.name.toLowerCase().endsWith('.json'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
}

/* ------------------------------------------------------------------ */
/* JSON 字段读取工具（严格：类型不对就报错，不猜）                     */
/* ------------------------------------------------------------------ */

function asObject(value: unknown, where: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${where} 必须是一个对象`);
  }
  return value as Record<string, unknown>;
}

function str(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function requiredStr(value: unknown, where: string, field: string): string {
  const result = str(value);
  if (!result) fail(`${where} 缺少 ${field}`);
  return result;
}

function strList(value: unknown, where: string, field: string): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) fail(`${where} 的 ${field} 必须是数组`);
  const out = value
    .map((item) => (typeof item === 'string' ? item.trim() : String(item ?? '').trim()))
    .filter(Boolean);
  return out.length ? out : undefined;
}

function levelOf(value: unknown, where: string, field: string): 1 | 2 | 3 | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  if (n !== 1 && n !== 2 && n !== 3) fail(`${where} 的 ${field} 只能是 1 / 2 / 3`);
  return n;
}

function boolOf(value: unknown, where: string, field: string): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'boolean') fail(`${where} 的 ${field} 必须是 true / false`);
  return value;
}

/* ------------------------------------------------------------------ */
/* 加载 + 进程内缓存（构建期重复调用只读一次盘）                      */
/* ------------------------------------------------------------------ */

const cache = new Map<string, unknown>();

function cached<T>(key: string, factory: () => T): T {
  if (cache.has(key)) return cache.get(key) as T;
  const value = factory();
  cache.set(key, value);
  return value;
}

function fallbackId(relPath: string): string {
  return relPath
    .replace(/^[^/]+\//, '')
    .replace(/^.*?\/(subjects|concepts)\//, '')
    .replace(/\.md$/i, '')
    .replace(/\//g, '-');
}

/* ---------------------------- 学科 ---------------------------- */

export function getSubjects(): Subject[] {
  return cached('subjects', () => {
    const subjects = loadDocs(path.join(CONTENT_ROOT, 'graph', 'subjects')).map((doc) =>
      toSubject(doc, fallbackId(doc.relPath))
    );
    const seen = new Set<string>();
    for (const subject of subjects) {
      if (seen.has(subject.id)) fail(`学科 id 重复：${subject.id}`);
      seen.add(subject.id);
    }
    return subjects;
  });
}

/* ---------------------------- 图谱 ---------------------------- */

/**
 * 学习图谱不再单独维护概念与边，直接由知识库章节 +
 * `content/knowledge/_config/chapter-links.json` 生成，见 `lib/vault.ts`。
 */

/* ---------------------------- 题库 ---------------------------- */

const RESOURCE_TYPES: ResourceType[] = ['pdf', 'slide', 'doc', 'video', 'link'];

function questionFromJson(
  item: unknown,
  where: string,
  subjectDefault: string
): Question {
  const raw = asObject(item, where);
  const id = requiredStr(raw.id, where, 'id');
  const stem = requiredStr(raw.stem, where, 'stem（题干）');
  const subjectId = str(raw.subject) ?? str(raw.subjectId) ?? subjectDefault;
  if (!subjectId) fail(`${where}（${id}）没有 subject，文件顶层也没有指定`);

  return {
    id,
    subjectId,
    stem,
    options: strList(raw.options, where, 'options'),
    answer: str(raw.answer),
    explanation: str(raw.explanation),
    difficulty: levelOf(raw.difficulty, where, 'difficulty') ?? 1,
    conceptId: str(raw.conceptId) ?? str(raw.concept),
    mastered: boolOf(raw.mastered, where, 'mastered') ?? false,
    source: str(raw.source),
    tags: strList(raw.tags, where, 'tags'),
  };
}

export function getQuestions(): Question[] {
  return cached('questions', () => {
    const dir = path.join(CONTENT_ROOT, 'quiz');
    const questions: Question[] = [];
    const seen = new Set<string>();

    for (const name of listJson(dir)) {
      const relPath = `quiz/${name}`;
      const root = asObject(readJson(relPath), `content/${relPath}`);
      if (!Array.isArray(root.questions)) fail(`content/${relPath} 缺少 questions 数组`);
      const subjectDefault = str(root.subject) ?? '';

      root.questions.forEach((item, index) => {
        const where = `content/${relPath} → questions[${index}]`;
        const question = questionFromJson(item, where, subjectDefault);
        if (seen.has(question.id)) fail(`题目 id 重复：${question.id}（${relPath}）`);
        seen.add(question.id);
        questions.push(question);
      });
    }

    return questions;
  });
}

/* ---------------------------- 资料库 ---------------------------- */

function resourceIdFromHref(href: string, index: number): string {
  const base = path
    .basename(href.split(/[?#]/)[0])
    .replace(/\.[^.]+$/, '')
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `resource-${index + 1}`;
}

export function getResources(): Resource[] {
  return cached('resources', () => {
    const data = readJson('library/items.json');
    if (data === null) return [];
    const root = asObject(data, 'content/library/items.json');
    if (!Array.isArray(root.resources)) fail('content/library/items.json 缺少 resources 数组');

    const seen = new Set<string>();
    return root.resources.map((item, index) => {
      const where = `content/library/items.json → resources[${index}]`;
      const raw = asObject(item, where);
      const title = requiredStr(raw.title, where, 'title');
      const href = requiredStr(raw.href, where, 'href');
      const typeRaw = requiredStr(raw.type, where, 'type');
      if (!RESOURCE_TYPES.includes(typeRaw as ResourceType)) {
        fail(`${where} 的 type "${typeRaw}" 不合法，只能是 ${RESOURCE_TYPES.join(' / ')}`);
      }
      const id = str(raw.id) ?? resourceIdFromHref(href, index);
      if (seen.has(id)) fail(`资料 id 重复：${id}`);
      seen.add(id);

      return {
        id,
        title,
        subjectId: str(raw.subject) ?? str(raw.subjectId),
        type: typeRaw as ResourceType,
        href,
        size: str(raw.size),
        updatedAt: str(raw.updatedAt),
        description: str(raw.description),
        tags: strList(raw.tags, where, 'tags'),
      };
    });
  });
}

/* ---------------------------- 常见问题 ---------------------------- */

export function getFaqs(): Faq[] {
  return cached('faqs', () =>
    loadDocs(path.join(CONTENT_ROOT, 'faq')).map((doc) => toFaq(doc, fallbackId(doc.relPath)))
  );
}

/* ---------------------------- 统计 ---------------------------- */

export function getStats(): Stats {
  const questions = getQuestions();
  return {
    concepts: getChapterGraph().concepts.length,
    subjects: getSubjects().length,
    questions: questions.length,
    wrong: questions.filter((q) => q.mastered === false).length,
    resources: getResources().length,
    faqs: getFaqs().length,
  };
}
