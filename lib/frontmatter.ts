import type { Concept, Faq, Question, Resource, ResourceType, Subject } from './types';

/* ------------------------------------------------------------------ */
/* 极简 frontmatter 解析（YAML 子集，不引入依赖）                      */
/* ------------------------------------------------------------------ */

export type FrontmatterValue = string | number | boolean | null | string[];
export type Frontmatter = Record<string, FrontmatterValue>;

function parseScalar(input: string): FrontmatterValue {
  const value = input.trim();
  if (!value) return '';
  if (value === 'null' || value === '~') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return splitInlineList(inner).map((item) => String(parseScalar(item) ?? ''));
  }
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).replace(/\\"/g, '"');
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

/** 逗号分隔，忽略引号里的逗号 */
function splitInlineList(input: string): string[] {
  const out: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  for (const char of input) {
    if (quote) {
      if (char === quote) quote = null;
      current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === ',') {
      out.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  out.push(current);
  return out.map((item) => item.trim()).filter(Boolean);
}

export function parseFrontmatter(raw: string): { data: Frontmatter; body: string } {
  const source = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (!source.startsWith('---\n')) return { data: {}, body: source.trim() };

  const end = source.indexOf('\n---', 4);
  if (end === -1) return { data: {}, body: source.trim() };

  const header = source.slice(4, end);
  let body = source.slice(end + 4);
  if (body.startsWith('\n')) body = body.slice(1);

  const data: Frontmatter = {};
  const lines = header.split('\n');

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (!match) continue;

    const key = match[1];
    const rest = match[2];

    if (rest.trim()) {
      data[key] = parseScalar(rest);
      continue;
    }

    const list: string[] = [];
    let j = i + 1;
    while (j < lines.length) {
      const next = lines[j].trim();
      if (!next) {
        j += 1;
        continue;
      }
      if (next.startsWith('- ')) {
        list.push(String(parseScalar(next.slice(2)) ?? ''));
        j += 1;
        continue;
      }
      break;
    }
    if (list.length) {
      data[key] = list;
      i = j - 1;
    } else {
      data[key] = '';
    }
  }

  return { data, body: body.trim() };
}

/* ------------------------------------------------------------------ */
/* frontmatter 字段读取工具                                            */
/* ------------------------------------------------------------------ */

export function asString(value: FrontmatterValue | undefined): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value[0];
  return String(value);
}

export function asNumber(value: FrontmatterValue | undefined): number | undefined {
  const raw = asString(value);
  if (raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export function asBoolean(value: FrontmatterValue | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  const raw = String(value).trim().toLowerCase();
  if (raw === 'true' || raw === 'yes' || raw === '1') return true;
  if (raw === 'false' || raw === 'no' || raw === '0') return false;
  return undefined;
}

export function asList(value: FrontmatterValue | undefined): string[] {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* 正文 → 纯文本摘要                                                   */
/* ------------------------------------------------------------------ */

const escapeForText = (input: string) =>
  input
    .replace(/\r\n/g, '\n')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[\[([^\]|#]*)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g, '$2$1')
    .replace(/[*_>#`~]/g, '')
    .replace(/\n+/g, ' ')
    .trim();

/** 取正文第一段（跳过标题、引用、代码、题目块）作为摘要 */
export function excerpt(body: string, maxLength = 140): string | undefined {
  const cleaned = body
    .replace(/<problem>[\s\S]*?<\/problem>/g, '')
    .replace(/<question>[\s\S]*?<\/question>/g, '')
    .replace(/```[\s\S]*?```/g, '');

  for (const block of cleaned.split(/\n{2,}/)) {
    const text = escapeForText(block);
    if (!text) continue;
    if (text.startsWith('!')) continue;
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/* 根据 frontmatter 映射到共享类型（供 lib/content.ts 使用）           */
/* ------------------------------------------------------------------ */

export type RawDoc = { data: Frontmatter; body: string; filePath: string; relPath: string };

export function toSubject(doc: RawDoc, fallbackId: string): Subject {
  return {
    id: asString(doc.data.id) ?? fallbackId,
    name: asString(doc.data.name) ?? asString(doc.data.title) ?? fallbackId,
    color: asString(doc.data.color) ?? 'var(--accent)',
  };
}

export function toConcept(doc: RawDoc, fallbackId: string): Concept {
  const level = asNumber(doc.data.level);
  const normalized = level === 1 || level === 2 || level === 3 ? level : undefined;
  return {
    id: asString(doc.data.id) ?? fallbackId,
    label: asString(doc.data.label) ?? asString(doc.data.title) ?? fallbackId,
    subjectId: asString(doc.data.subject) ?? asString(doc.data.subjectId) ?? '',
    summary: asString(doc.data.summary) ?? excerpt(doc.body),
    prerequisites: asList(doc.data.prerequisites),
    level: normalized ?? 1,
    tags: asList(doc.data.tags),
  };
}

export function toQuestion(doc: RawDoc, fallbackId: string, options: string[]): Question {
  const difficulty = asNumber(doc.data.difficulty);
  const normalized = difficulty === 1 || difficulty === 2 || difficulty === 3 ? difficulty : undefined;
  return {
    id: asString(doc.data.id) ?? fallbackId,
    subjectId: asString(doc.data.subject) ?? asString(doc.data.subjectId) ?? '',
    stem: asString(doc.data.stem) ?? excerpt(doc.body, 400) ?? fallbackId,
    options: options.length ? options : undefined,
    answer: asString(doc.data.answer),
    explanation: asString(doc.data.explanation) ?? doc.body ?? undefined,
    difficulty: normalized ?? 1,
    conceptId: asString(doc.data.concept),
    mastered: asBoolean(doc.data.mastered) ?? false,
    source: asString(doc.data.source),
    tags: asList(doc.data.tags),
  };
}

const resourceTypes: ResourceType[] = ['pdf', 'slide', 'doc', 'video', 'link'];

export function toResource(doc: RawDoc, fallbackId: string): Resource {
  const typeRaw = asString(doc.data.type);
  const type = resourceTypes.includes(typeRaw as ResourceType)
    ? (typeRaw as ResourceType)
    : 'link';
  return {
    id: asString(doc.data.id) ?? fallbackId,
    title: asString(doc.data.title) ?? fallbackId,
    subjectId: asString(doc.data.subject) ?? asString(doc.data.subjectId),
    type,
    href: asString(doc.data.href) ?? '#',
    size: asString(doc.data.size),
    updatedAt: asString(doc.data.updatedAt),
    description: asString(doc.data.description) ?? excerpt(doc.body),
    tags: asList(doc.data.tags),
  };
}

export function toFaq(doc: RawDoc, fallbackId: string): Faq {
  return {
    id: asString(doc.data.id) ?? fallbackId,
    question: asString(doc.data.question) ?? asString(doc.data.title) ?? fallbackId,
    answer: doc.body || (asString(doc.data.answer) ?? ''),
    category: asString(doc.data.category),
  };
}
