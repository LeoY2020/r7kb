/** 笔记正文 ⇄ 块结构（标题 / 段落 / 列表 / 引用 / 代码 / 表格 / 图片 / 题目）。 */
import { parseQuestionBlocks, serializeQuestion } from './questions';
import type { Question } from './types';

export type BlockKind =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'p'
  | 'bullet'
  | 'ordered'
  | 'quote'
  | 'code'
  | 'divider'
  | 'image'
  | 'table'
  | 'question'
  | 'raw';

export type Block = {
  key: string;
  type: BlockKind;
  text: string;
  lang?: string;
  alt?: string;
  src?: string;
  question?: Question;
  questionIndex?: number;
};

let counter = 0;
export const nextKey = () => `b${++counter}`;

export function makeBlock(type: BlockKind, text = ''): Block {
  return { key: nextKey(), type, text };
}

const SPECIAL_START = /^(#{1,6}\s|```|>\s?|\s*[-*+]\s+|\s*\d+[.)]\s+|!\[[^\]]*\]\([^)]*\)\s*$|\s*\||\s*(?:---|\*\*\*|___)\s*$|<question\b)/i;

export function parseBlocks(body: string): Block[] {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  const flushParagraph = (buffer: string[]) => {
    if (!buffer.length) return;
    const text = buffer.join('\n').trim();
    if (text) blocks.push({ key: nextKey(), type: 'p', text });
    buffer.length = 0;
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (/^<question\b/i.test(trimmed)) {
      const collected: string[] = [];
      while (i < lines.length) {
        collected.push(lines[i]);
        const done = /<\/question>/i.test(lines[i]);
        i += 1;
        if (done) break;
      }
      const raw = collected.join('\n');
      const parsed = parseQuestionBlocks(raw, 'note')[0];
      blocks.push({
        key: nextKey(),
        type: 'question',
        text: raw,
        question: parsed?.question,
        questionIndex: 0,
      });
      continue;
    }

    if (/^```/.test(trimmed)) {
      const lang = trimmed.slice(3).trim();
      const collected: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        collected.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ key: nextKey(), type: 'code', text: collected.join('\n'), lang });
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = Math.min(heading[1].length, 3);
      blocks.push({ key: nextKey(), type: (`h${level}` as BlockKind), text: heading[2].trim() });
      i += 1;
      continue;
    }

    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push({ key: nextKey(), type: 'divider', text: '' });
      i += 1;
      continue;
    }

    const image = /^!\[([^\]]*)\]\(([^)]+)\)\s*$/.exec(trimmed);
    if (image) {
      blocks.push({ key: nextKey(), type: 'image', text: '', alt: image[1], src: image[2] });
      i += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const collected: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        collected.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push({ key: nextKey(), type: 'quote', text: collected.join('\n').trim() });
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      blocks.push({ key: nextKey(), type: 'bullet', text: line.replace(/^\s*[-*+]\s+/, '') });
      i += 1;
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      blocks.push({ key: nextKey(), type: 'ordered', text: line.replace(/^\s*\d+[.)]\s+/, '') });
      i += 1;
      continue;
    }

    if (/^\s*\|/.test(line)) {
      const collected: string[] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        collected.push(lines[i]);
        i += 1;
      }
      blocks.push({ key: nextKey(), type: 'table', text: collected.join('\n') });
      continue;
    }

    if (/^</.test(trimmed)) {
      const collected: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^<question\b/i.test(lines[i].trim())) {
        collected.push(lines[i]);
        i += 1;
      }
      blocks.push({ key: nextKey(), type: 'raw', text: collected.join('\n') });
      continue;
    }

    const buffer: string[] = [];
    const start = i;
    while (i < lines.length && lines[i].trim() && !SPECIAL_START.test(lines[i])) {
      buffer.push(lines[i]);
      i += 1;
    }
    flushParagraph(buffer);
    if (i === start) i += 1;
  }

  return blocks;
}

const listItemText = (type: BlockKind, block: Block, index: number): string => {
  const text = block.text.trim();
  if (type === 'bullet') return `- ${text}`;
  return `${index}. ${text}`;
};

export function serializeBlocks(blocks: Block[], slug: string): string {
  const chunks: string[] = [];

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    switch (block.type) {
      case 'h1':
      case 'h2':
      case 'h3': {
        const level = Number(block.type.slice(1));
        chunks.push(`${'#'.repeat(level)} ${block.text.trim()}`);
        break;
      }
      case 'p':
      case 'raw':
        chunks.push(block.text.trim());
        break;
      case 'bullet':
      case 'ordered': {
        const lines: string[] = [];
        let cursor = i;
        let number = 1;
        while (cursor < blocks.length && blocks[cursor].type === block.type) {
          lines.push(listItemText(block.type, blocks[cursor], number));
          cursor += 1;
          number += 1;
        }
        chunks.push(lines.join('\n'));
        i = cursor - 1;
        break;
      }
      case 'quote':
        chunks.push(
          block.text
            .split('\n')
            .map((line) => `> ${line}`.trimEnd())
            .join('\n'),
        );
        break;
      case 'code':
        chunks.push(`\`\`\`${block.lang ?? ''}\n${block.text.replace(/\n+$/, '')}\n\`\`\``);
        break;
      case 'divider':
        chunks.push('---');
        break;
      case 'image':
        chunks.push(`![${block.alt ?? ''}](${block.src ?? ''})`);
        break;
      case 'table':
        chunks.push(block.text.trim());
        break;
      case 'question':
        if (block.question) {
          chunks.push(serializeQuestion(block.question, slug, block.questionIndex ?? 0));
        } else {
          chunks.push(block.text.trim());
        }
        break;
      default:
        break;
    }
  }

  return chunks.filter(Boolean).join('\n\n');
}
