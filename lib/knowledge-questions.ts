import type { Question } from './types';
import { getVaultNotes, type VaultNote } from './vault';

/**
 * 知识库题目解析（构建期，仅服务端）。
 *
 * 笔记里的题目统一写在 `<question>…</question>` 块中，块内用标签区分结构：
 *   <section tag="A">选项</section>   选项（按 tag 排序）
 *   <answer> / <ans>                  答案
 *   <explain> / <exp>                 解析
 *   <kn>                              考察的知识点（可多个）
 *   <sp> / <space>                    填空题空位，渲染为 ____
 *
 * 兼容旧写法：没有 answer 标签时，会读取正文里的「答案：」「解析：」行。
 * 格式说明见 docs/KNOWLEDGE-FORMAT.md。
 */

export const DEFAULT_QUESTION_SUBJECT = '智能电子书';

type ParsedQuestion = Question;

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

function cleanText(value: string | undefined): string {
  if (!value) return '';
  return value
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripQuestionTags(value: string): string {
  return cleanText(
    value
      .replace(BLANK_BLOCK, '____')
      .replace(/\n?\s*答案\s*[:：][^\n]*/g, '')
      .replace(/\n?\s*解析\s*[:：][^\n]*/g, '')
  );
}

function normalizeChoiceAnswer(raw: string, tags: string[], options: string[]): string {
  const letters = tags.join('');
  const compact = raw.replace(/[\s,，、;；/]/g, '').toUpperCase();
  if (compact && /^[A-Z]+$/.test(compact) && [...compact].every((ch) => letters.includes(ch))) {
    return compact.split('').join(',');
  }
  // 允许直接写选项内容
  const index = options.findIndex((option) => option.trim() === raw.trim());
  if (index >= 0) return tags[index];
  return raw.trim();
}

function parseBlock(rawAttrs: string, body: string, note: VaultNote, index: number): ParsedQuestion {
  const attrs = attrsOf(rawAttrs);
  const source = `知识库 · ${note.title}`;
  const id = attrs.id || `${note.slug}-q${index + 1}`;

  let answer = cleanText(ANSWER_BLOCK.exec(body)?.[1]);
  let explanation = cleanText(EXPLAIN_BLOCK.exec(body)?.[1]);

  // 旧写法兼容：答案：xxx / 解析：xxx
  if (!answer) {
    const legacyAnswer = /(?:^|\n)\s*答案\s*[:：]\s*([^\n]+)/.exec(body);
    if (legacyAnswer) answer = legacyAnswer[1].trim();
  }
  if (!explanation) {
    const legacyExplain = /(?:^|\n)\s*解析\s*[:：]\s*([^\n]+)/.exec(body);
    if (legacyExplain) explanation = legacyExplain[1].trim();
  }

  const knowledge: string[] = [];
  KNOWLEDGE_BLOCK.lastIndex = 0;
  let knMatch: RegExpExecArray | null;
  while ((knMatch = KNOWLEDGE_BLOCK.exec(body))) {
    const text = cleanText(knMatch[1]);
    if (text) knowledge.push(text);
  }

  const tags: string[] = [];
  const options: string[] = [];
  const blanks: string[] = [];
  let sectionMatch: RegExpExecArray | null;
  SECTION_BLOCK.lastIndex = 0;
  while ((sectionMatch = SECTION_BLOCK.exec(body))) {
    const tag = (attrsOf(sectionMatch[1]).tag ?? String.fromCharCode(65 + tags.length)).toUpperCase();
    const text = cleanText(sectionMatch[2]);
    if (!text) continue;
    tags.push(tag);
    options.push(text);
  }

  // 填空题：<sp> 里的内容同时作为空位答案的兜底
  BLANK_BLOCK.lastIndex = 0;
  let blankMatch: RegExpExecArray | null;
  while ((blankMatch = BLANK_BLOCK.exec(body))) {
    const text = cleanText(blankMatch[1]);
    if (text) blanks.push(text);
  }
  if (!answer && blanks.length > 0) answer = blanks.join(' / ');

  let stem = body
    .replace(ANSWER_BLOCK, '')
    .replace(EXPLAIN_BLOCK, '')
    .replace(KNOWLEDGE_BLOCK, '')
    .replace(SECTION_BLOCK, '')
    .replace(/(?:^|\n)\s*答案\s*[:：][^\n]*/g, '')
    .replace(/(?:^|\n)\s*解析\s*[:：][^\n]*/g, '');
  stem = stripQuestionTags(stem);

  const difficultyRaw = attrs.difficulty ?? '1';
  if (!['1', '2', '3'].includes(difficultyRaw)) {
    throw new Error(`[question] ${note.relPath} 的第 ${index + 1} 道题 difficulty 只能是 1 / 2 / 3`);
  }
  const difficulty = Number(difficultyRaw) as 1 | 2 | 3;

  if (options.length > 0) answer = normalizeChoiceAnswer(answer, tags, options);

  if (!stem) {
    throw new Error(`[question] ${note.relPath} 的第 ${index + 1} 道题没有题干`);
  }
  if (!answer) {
    throw new Error(
      `[question] ${note.relPath} 的第 ${index + 1} 道题缺少答案：请用 <answer>…</answer> 或 <ans>…</ans> 包裹`
    );
  }

  return {
    id,
    subjectId: attrs.subject || DEFAULT_QUESTION_SUBJECT,
    stem,
    options: options.length > 0 ? options : undefined,
    answer,
    explanation: explanation || undefined,
    difficulty,
    mastered: false,
    source,
    tags: knowledge.length > 0 ? knowledge : undefined,
    conceptId: knowledge[0],
  };
}

export function getKnowledgeQuestions(): Question[] {
  const questions: Question[] = [];
  for (const note of getVaultNotes()) {
    if (!note.body.includes('<question')) continue;
    let index = 0;
    QUESTION_BLOCK.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = QUESTION_BLOCK.exec(note.body))) {
      const question = parseBlock(match[1], match[2], note, index);
      questions.push(question);
      index += 1;
    }
  }
  return questions;
}
