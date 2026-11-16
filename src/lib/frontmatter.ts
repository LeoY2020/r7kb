/** 极简 frontmatter 解析 / 生成（与 class-kb 的 lib/frontmatter.ts 保持一致）。 */
import type { Frontmatter, FrontmatterValue } from './types';

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

export function asString(value: FrontmatterValue | undefined): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value[0] ?? '';
  return String(value);
}

export function asList(value: FrontmatterValue | undefined): string[] {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function asNumber(value: FrontmatterValue | undefined): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

const quoteIfNeeded = (value: string) => {
  if (!value) return '""';
  if (/[:#"]/.test(value) || /^[\s\-*&!|>%@`[\]{},]/.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
};

/** 生成 frontmatter；knownKeys 之外的字段原样保留，保证不丢信息。 */
export function stringifyFrontmatter(data: Frontmatter, knownKeys: string[]): string {
  const keys = [...knownKeys, ...Object.keys(data).filter((key) => !knownKeys.includes(key))];
  const lines: string[] = [];
  for (const key of keys) {
    const value = data[key];
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      lines.push(`${key}: [${value.map((item) => quoteIfNeeded(String(item))).join(', ')}]`);
      continue;
    }
    if (typeof value === 'boolean' || typeof value === 'number') {
      lines.push(`${key}: ${value}`);
      continue;
    }
    const text = String(value);
    if (!text.trim()) continue;
    lines.push(`${key}: ${quoteIfNeeded(text)}`);
  }
  return `---\n${lines.join('\n')}\n---`;
}
