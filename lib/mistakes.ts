/**
 * 错题本数据层（纯客户端）。
 *
 * - localStorage 键：class-kb-mistakes-v1，值为 Mistake[] JSON。
 * - 这里只放与 React 无关的类型、校验、解析、导入导出工具，
 *   方便 `app/mistakes`、`components/mistakes` 与知识库的 ProblemBlock 共用。
 */

export const MISTAKES_STORAGE_KEY = 'class-kb-mistakes-v1';

export type MistakeFrom = { slug?: string; title?: string } | null;

export type Mistake = {
  /** crypto.randomUUID()（带兜底） */
  id: string;
  stem: string;
  answer?: string;
  explanation?: string;
  subject?: string;
  /** 来源（如章节名 / 题号） */
  source?: string;
  tags?: string[];
  /** ISO 时间 */
  createdAt: string;
  updatedAt?: string;
  mastered?: boolean;
  /** 来自知识库哪个笔记 */
  from?: MistakeFrom;
};

/** 新增/编辑时提交的数据（id 与时间由数据层生成） */
export type MistakeInput = {
  stem: string;
  answer?: string;
  explanation?: string;
  subject?: string;
  source?: string;
  tags?: string[];
  mastered?: boolean;
  from?: MistakeFrom;
};

export type ImportResult = {
  /** 新加入的条数 */
  added: number;
  /** 因 id 重复而跳过的条数 */
  duplicates: number;
  /** 格式不合法而跳过的条数 */
  invalid: number;
  /** 文件里解析出的原始条数 */
  total: number;
  /** 整体无法解析时的错误信息 */
  error?: string;
};

export type ParsedMistakes = {
  items: Mistake[];
  invalid: number;
  error?: string;
};

export type ParsedProblem = {
  stem: string;
  answer?: string;
  explanation?: string;
};

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function asString(value: unknown, max = 20000): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function asIsoDate(value: unknown): string | undefined {
  const raw = asString(value, 64);
  if (!raw) return undefined;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function normalizeTags(value: unknown): string[] | undefined {
  const list: unknown[] = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,，、;；\s]+/)
      : [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const item of list) {
    if (typeof item !== 'string') continue;
    const tag = item.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag.slice(0, 24));
  }
  return tags.length > 0 ? tags : undefined;
}

function normalizeFrom(value: unknown): MistakeFrom | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const slug = asString(record.slug, 200);
  const title = asString(record.title, 200);
  if (!slug && !title) return undefined;
  return { ...(slug ? { slug } : {}), ...(title ? { title } : {}) };
}

/** 生成 id：优先 crypto.randomUUID，不支持时退回时间戳 + 随机串 */
export function createMistakeId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* 某些非安全上下文会抛错，走兜底 */
  }
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 把任意输入整理成合法的 Mistake；缺少题干时返回 null。
 * 导入时逐条校验，坏条目直接跳过。
 */
export function normalizeMistake(value: unknown): Mistake | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;

  const stem = asString(record.stem);
  if (!stem) return null;

  const createdAt = asIsoDate(record.createdAt) ?? new Date().toISOString();
  const updatedAt = asIsoDate(record.updatedAt);
  const answer = asString(record.answer);
  const explanation = asString(record.explanation);
  const subject = asString(record.subject, 60);
  const source = asString(record.source, 200);
  const tags = normalizeTags(record.tags);
  const from = normalizeFrom(record.from);

  return {
    id: asString(record.id, 128) ?? createMistakeId(),
    stem,
    ...(answer ? { answer } : {}),
    ...(explanation ? { explanation } : {}),
    ...(subject ? { subject } : {}),
    ...(source ? { source } : {}),
    ...(tags ? { tags } : {}),
    createdAt,
    ...(updatedAt ? { updatedAt } : {}),
    mastered: record.mastered === true,
    ...(from ? { from } : {}),
  };
}

/** 新错题按时间倒序，编辑过的也尽量排在前面 */
export function sortMistakes(list: Mistake[]): Mistake[] {
  return [...list].sort((a, b) => {
    const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });
}

/** 解析一段 JSON 文本里的错题数组；支持数组或 { mistakes: [] } 包装 */
export function parseMistakesJson(text: string): ParsedMistakes {
  const trimmed = text.trim();
  if (!trimmed) return { items: [], invalid: 0, error: '内容为空，没有可导入的数据。' };
  let payload: unknown;
  try {
    payload = JSON.parse(trimmed);
  } catch {
    return { items: [], invalid: 0, error: '不是合法的 JSON，请检查引号与逗号。' };
  }
  return parseMistakesPayload(payload);
}

export function parseMistakesPayload(payload: unknown): ParsedMistakes {
  let rawList: unknown[];
  if (Array.isArray(payload)) {
    rawList = payload;
  } else if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const wrapped = record.mistakes ?? record.items ?? record.data;
    if (!Array.isArray(wrapped)) {
      return { items: [], invalid: 0, error: 'JSON 结构不对：需要 Mistake[] 数组。' };
    }
    rawList = wrapped;
  } else {
    return { items: [], invalid: 0, error: 'JSON 结构不对：需要 Mistake[] 数组。' };
  }

  const items: Mistake[] = [];
  let invalid = 0;
  for (const raw of rawList) {
    const mistake = normalizeMistake(raw);
    if (mistake) items.push(mistake);
    else invalid += 1;
  }
  return { items, invalid };
}

/** 解析 localStorage 里的原始字符串；坏数据当作空数组，不让页面崩 */
export function parseStoredMistakes(raw: string | null | undefined): Mistake[] {
  if (!raw) return [];
  try {
    const parsed = parseMistakesPayload(JSON.parse(raw));
    return parsed.items;
  } catch {
    return [];
  }
}

export function loadStoredMistakes(): Mistake[] {
  if (typeof window === 'undefined') return [];
  try {
    return parseStoredMistakes(window.localStorage.getItem(MISTAKES_STORAGE_KEY));
  } catch {
    return [];
  }
}

/** 写入 localStorage；空间不足/隐私模式返回 false */
export function saveStoredMistakes(list: Mistake[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(MISTAKES_STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/** 按 id 去重合并（导入用） */
export function mergeMistakes(
  existing: Mistake[],
  incoming: Mistake[]
): { mistakes: Mistake[]; added: number; duplicates: number } {
  const seen = new Set(existing.map((item) => item.id));
  const next = [...existing];
  let added = 0;
  let duplicates = 0;
  for (const mistake of incoming) {
    if (seen.has(mistake.id)) {
      duplicates += 1;
      continue;
    }
    seen.add(mistake.id);
    next.push(mistake);
    added += 1;
  }
  return { mistakes: sortMistakes(next), added, duplicates };
}

/** 导出文件名：class-kb-mistakes-YYYYMMDD.json */
export function exportFileName(date = new Date()): string {
  return `class-kb-mistakes-${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}.json`;
}

/** 触发浏览器下载 JSON，返回文件名（SSR 时只返回文件名） */
export function downloadMistakes(mistakes: Mistake[], date = new Date()): string {
  const filename = exportFileName(date);
  if (typeof window === 'undefined' || typeof document === 'undefined') return filename;
  const blob = new Blob([JSON.stringify(mistakes, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return filename;
}

/**
 * 解析知识库题目块：
 * 「答案：」「解析：」开头的行分别作为答案 / 解析，其余为题干。
 */
export function parseProblemRaw(raw: string): ParsedProblem {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const stem: string[] = [];
  const answer: string[] = [];
  const explanation: string[] = [];
  let section: 'stem' | 'answer' | 'explanation' = 'stem';

  for (const line of lines) {
    const trimmed = line.trim();
    const answerMatch = trimmed.match(/^(?:参考|标准)?答案\s*[：:]\s*(.*)$/);
    if (answerMatch) {
      section = 'answer';
      if (answerMatch[1]) answer.push(answerMatch[1]);
      continue;
    }
    const explanationMatch = trimmed.match(/^(?:解析|讲解|分析)\s*[：:]\s*(.*)$/);
    if (explanationMatch) {
      section = 'explanation';
      if (explanationMatch[1]) explanation.push(explanationMatch[1]);
      continue;
    }
    if (section === 'stem') stem.push(line);
    else if (section === 'answer') answer.push(line);
    else explanation.push(line);
  }

  const stemText = trimBlock(stem);
  return {
    stem: stemText || raw.trim(),
    answer: trimBlock(answer) || undefined,
    explanation: trimBlock(explanation) || undefined,
  };
}

function trimBlock(lines: string[]): string {
  const copy = lines.map((line) => line.replace(/\s+$/g, ''));
  while (copy.length > 0 && !copy[0].trim()) copy.shift();
  while (copy.length > 0 && !copy[copy.length - 1].trim()) copy.pop();
  return copy.join('\n').trim();
}

/** 知识库题目 → 错题输入 */
export function buildMistakeFromProblem(raw: string, source?: string): MistakeInput {
  const parsed = parseProblemRaw(raw);
  const trimmedSource = source?.trim();
  return {
    stem: parsed.stem,
    ...(parsed.answer ? { answer: parsed.answer } : {}),
    ...(parsed.explanation ? { explanation: parsed.explanation } : {}),
    ...(trimmedSource ? { source: trimmedSource } : {}),
    from: trimmedSource ? { title: trimmedSource } : null,
  };
}

function comparable(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** 判断某道题是否已经在错题本里（题干 + 来源相同） */
export function sameProblem(mistake: Mistake, problem: { stem?: string; source?: string }): boolean {
  const left = comparable(mistake.stem);
  const right = comparable(problem.stem ?? '');
  if (!left || !right || left !== right) return false;
  const leftSource = comparable(mistake.source ?? '');
  const rightSource = comparable(problem.source ?? '');
  return leftSource === rightSource;
}

/** 搜索匹配：题干、答案、解析、学科、来源、标签 */
export function mistakeMatchesQuery(mistake: Mistake, query: string): boolean {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return true;
  const haystack = [
    mistake.stem,
    mistake.answer ?? '',
    mistake.explanation ?? '',
    mistake.subject ?? '',
    mistake.source ?? '',
    ...(mistake.tags ?? []),
  ]
    .join('\n')
    .toLowerCase();
  return haystack.includes(keyword);
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(
    date.getHours()
  )}:${pad2(date.getMinutes())}`;
}

export function isCreatedToday(iso: string, now = new Date()): boolean {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/** 从错题里收集筛选项（去重、排序） */
export function collectFieldValues(mistakes: Mistake[], field: 'subject' | 'source'): string[] {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const mistake of mistakes) {
    const value = mistake[field]?.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    values.push(value);
  }
  return values.sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

export function collectTags(mistakes: Mistake[]): string[] {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const mistake of mistakes) {
    for (const tag of mistake.tags ?? []) {
      const value = tag.trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      values.push(value);
    }
  }
  return values.sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

/**
 * 复制文本：优先 navigator.clipboard，失败时用 execCommand 兜底。
 * 返回是否复制成功。
 */
export async function copyText(text: string): Promise<boolean> {
  const value = text.trim();
  if (!value) return false;

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      /* 权限或非安全上下文失败，继续兜底 */
    }
  }

  if (typeof document === 'undefined') return false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}
