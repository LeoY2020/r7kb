/** 知识库题目：解析 <question> 块、判断题型、序列化回 Markdown。 */
import type { Question, QuestionKind, QuestionOption } from './types';

const QUESTION_BLOCK = /<question\b([^>]*)>([\s\S]*?)<\/question>/gi;
const SECTION_BLOCK = /<section\b([^>]*)>([\s\S]*?)<\/section>/gi;
const KNOWLEDGE_BLOCK = /<kn\b[^>]*>([\s\S]*?)<\/kn>/gi;
const ANSWER_BLOCK = /<(?:answer|ans)\b[^>]*>([\s\S]*?)<\/(?:answer|ans)>/i;
const EXPLAIN_BLOCK = /<(?:explain|exp)\b[^>]*>([\s\S]*?)<\/(?:explain|exp)>/i;
const BLANK_BLOCK = /<(?:sp|space)\b[^>]*>([\s\S]*?)<\/(?:sp|space)>/gi;
const ATTR = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;

function attrsOf(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  let match: RegExpExecArray | null;
  ATTR.lastIndex = 0;
  while ((match = ATTR.exec(raw))) {
    out[match[1].toLowerCase()] = (match[2] ?? match[3] ?? match[4] ?? '').trim();
  }
  return out;
}

const clean = (value: string | undefined) =>
  (value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export function detectKind(question: Pick<Question, 'options' | 'answer' | 'stem'>): QuestionKind {
  if (question.options.length > 0) {
    const letters = question.answer.replace(/[\s,，、;；/]/g, '').toUpperCase();
    return letters.length > 1 ? 'multiple' : 'single';
  }
  if (/<(?:sp|space)\b/i.test(question.stem)) return 'blank';
  if (/^(对|错|正确|错误|true|false|✓|✗)$/i.test(question.answer.trim())) return 'judge';
  return 'text';
}

function parseQuestion(attrsRaw: string, body: string, index: number, slug: string): Question {
  const attrs = attrsOf(attrsRaw);
  let answer = clean(ANSWER_BLOCK.exec(body)?.[1]);
  let explanation = clean(EXPLAIN_BLOCK.exec(body)?.[1]);

  if (!answer) {
    const legacy = /(?:^|\n)\s*答案\s*[:：]\s*([^\n]+)/.exec(body);
    if (legacy) answer = legacy[1].trim();
  }
  if (!explanation) {
    const legacy = /(?:^|\n)\s*解析\s*[:：]\s*([^\n]+)/.exec(body);
    if (legacy) explanation = legacy[1].trim();
  }

  const knowledge: string[] = [];
  KNOWLEDGE_BLOCK.lastIndex = 0;
  let kn: RegExpExecArray | null;
  while ((kn = KNOWLEDGE_BLOCK.exec(body))) {
    const text = clean(kn[1]);
    if (text) knowledge.push(text);
  }

  const options: QuestionOption[] = [];
  SECTION_BLOCK.lastIndex = 0;
  let section: RegExpExecArray | null;
  while ((section = SECTION_BLOCK.exec(body))) {
    const tag = (attrsOf(section[1]).tag ?? String.fromCharCode(65 + options.length)).toUpperCase();
    const text = clean(section[2]);
    if (!text) continue;
    options.push({ tag, text });
  }
  options.sort((a, b) => a.tag.localeCompare(b.tag));

  const blanks: string[] = [];
  BLANK_BLOCK.lastIndex = 0;
  let blank: RegExpExecArray | null;
  while ((blank = BLANK_BLOCK.exec(body))) {
    const text = clean(blank[1]);
    if (text) blanks.push(text);
  }
  if (!answer && blanks.length > 0) answer = blanks.join(' / ');

  const stem = clean(
    body
      .replace(ANSWER_BLOCK, '')
      .replace(EXPLAIN_BLOCK, '')
      .replace(KNOWLEDGE_BLOCK, '')
      .replace(SECTION_BLOCK, '')
      .replace(/(?:^|\n)\s*答案\s*[:：][^\n]*/g, '')
      .replace(/(?:^|\n)\s*解析\s*[:：][^\n]*/g, ''),
  );

  const difficulty = Number(attrs.difficulty);
  const normalizedDifficulty = difficulty === 2 || difficulty === 3 ? difficulty : 1;

  return {
    id: attrs.id || `${slug}-q${index + 1}`,
    difficulty: normalizedDifficulty,
    subject: attrs.subject || '智能电子书',
    stem,
    options,
    answer,
    explanation,
    knowledge,
    kind: detectKind({ options, answer, stem }),
  };
}

export type ParsedQuestionBlock = {
  question: Question;
  raw: string;
  index: number;
  legacy: boolean;
};

/** 从笔记正文中解析所有题目块（保持原始顺序）。 */
export function parseQuestionBlocks(body: string, slug: string): ParsedQuestionBlock[] {
  const out: ParsedQuestionBlock[] = [];
  QUESTION_BLOCK.lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = QUESTION_BLOCK.exec(body))) {
    out.push({
      question: parseQuestion(match[1], match[2], index, slug),
      raw: match[0],
      index,
      legacy: !/<(?:answer|ans)\b/i.test(match[2]),
    });
    index += 1;
  }
  return out;
}

/** 找到第 index 个题目块在正文中的起止位置，用于精确替换。 */
export function locateQuestionBlock(body: string, index: number): { start: number; end: number } | null {
  QUESTION_BLOCK.lastIndex = 0;
  let match: RegExpExecArray | null;
  let cursor = 0;
  while ((match = QUESTION_BLOCK.exec(body))) {
    if (cursor === index) return { start: match.index, end: match.index + match[0].length };
    cursor += 1;
  }
  return null;
}

const attrEscape = (value: string) => value.replace(/"/g, '&quot;').replace(/\n/g, ' ');

export function serializeQuestion(question: Question, slug: string, index: number): string {
  const defaultId = `${slug}-q${index + 1}`;
  const attrs: string[] = [];
  if (question.id && question.id !== defaultId) attrs.push(`id="${attrEscape(question.id)}"`);
  if (question.difficulty && question.difficulty !== 1) attrs.push(`difficulty="${question.difficulty}"`);
  if (question.subject && question.subject !== '智能电子书') {
    attrs.push(`subject="${attrEscape(question.subject)}"`);
  }

  const parts: string[] = [];
  parts.push(question.stem.trim());
  if (question.options.length > 0) {
    parts.push(
      question.options
        .map((option) => `<section tag="${attrEscape(option.tag)}">${option.text.trim()}</section>`)
        .join('\n'),
    );
  }
  if (question.knowledge.length > 0) {
    parts.push(question.knowledge.map((item) => `<kn>${item.trim()}</kn>`).join('\n'));
  }
  if (question.answer.trim()) parts.push(`<answer>${question.answer.trim()}</answer>`);
  if (question.explanation.trim()) parts.push(`<explain>${question.explanation.trim()}</explain>`);

  const open = attrs.length ? `<question ${attrs.join(' ')}>` : '<question>';
  return `${open}\n${parts.join('\n\n')}\n</question>`;
}

/** 按题型给出默认答案格式提示 */
export function answerPlaceholder(kind: QuestionKind): string {
  switch (kind) {
    case 'multiple':
      return '多个字母，如 ABD 或 A,C';
    case 'single':
      return '一个字母，如 B';
    case 'judge':
      return '对 或 错';
    case 'blank':
      return '依次写各空答案，如 content.opf / spine';
    default:
      return '一段文字答案';
  }
}
