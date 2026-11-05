/**
 * 极简 Markdown → 结构化块渲染器（无第三方依赖、可在构建期运行）。
 *
 * 支持：标题、段落、列表、任务项、引用、代码块、表格、图片、加粗/斜体、
 * Obsidian 双链 `[[目标]]`、`[[目标|别名]]`、`#标签`，
 * 以及知识库自用的 `<problem>` / `<question>` 题目块。
 *
 * 所有原文都会转义，只有白名单内的标签由本文件生成。
 */

export type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; id: string; html: string }
  | { type: 'paragraph'; html: string }
  | { type: 'list'; ordered: boolean; html: string }
  | { type: 'code'; lang?: string; code: string }
  | { type: 'quote'; html: string }
  | { type: 'table'; html: string }
  | { type: 'image'; src: string; alt: string }
  | { type: 'problem'; variant: 'problem' | 'question'; raw: string }
  | { type: 'hr' };

export type WikiResolver = (target: string) => { title: string; href?: string };

const escapeHtml = (input: string) =>
  input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeAttr = (input: string) => escapeHtml(input).replace(/`/g, '&#96;');

function headingId(text: string): string {
  return text
    .replace(/[*_`~[\]()]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .toLowerCase()
    .slice(0, 64) || 'section';
}

/** 行内渲染：双链、标签、链接、图片、强调、行内代码 */
export function renderInline(text: string, resolveWiki?: WikiResolver): string {
  const codes: string[] = [];
  let source = text.replace(/`([^`\n]+)`/g, (_, code: string) => {
    codes.push(`<code>${escapeHtml(code)}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });

  source = escapeHtml(source);

  // 图片（先于普通链接）
  source = source.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt: string, src: string) => {
    return `<img src="${src}" alt="${alt}" loading="lazy" decoding="async" />`;
  });

  // Obsidian 双链
  source = source.replace(/\[\[([^\]]+)\]\]/g, (_, raw: string) => {
    const [targetPart, alias] = raw.split('|');
    const [target, anchor] = targetPart.split('#');
    const label = (alias ?? anchor ?? target).trim();
    const resolved = resolveWiki?.(target.trim());
    if (resolved?.href) {
      return `<a class="wiki-link" href="${escapeAttr(resolved.href)}">${escapeHtml(label)}</a>`;
    }
    return `<span class="wiki-link" data-broken="true" title="未找到对应笔记">${escapeHtml(label)}</span>`;
  });

  // 普通 Markdown 链接
  source = source.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, href: string) => {
    const external = /^https?:\/\//i.test(href);
    const suffix = external ? ' target="_blank" rel="noreferrer"' : '';
    return `<a href="${escapeAttr(href)}"${suffix}>${label}</a>`;
  });

  // 加粗 / 斜体
  source = source.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  source = source.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

  // 标签：正文里的 #标签 自动变成链接，不改变章节关联
  source = source.replace(
    /(^|[\s。；，、：:()（）])#([\p{L}\p{N}_-]{1,24})/gu,
    (_, head: string, tag: string) =>
      `${head}<a class="tag-link" href="/knowledge/tags/?tag=${encodeURIComponent(tag)}">#${tag}</a>`
  );

  // 还原行内代码
  source = source.replace(/\u0000(\d+)\u0000/g, (_, index: string) => codes[Number(index)] ?? '');
  return source;
}

function splitRow(line: string): string[] {
  let row = line.trim();
  if (row.startsWith('|')) row = row.slice(1);
  if (row.endsWith('|')) row = row.slice(0, -1);
  return row.split('|').map((cell) => cell.trim());
}

const TABLE_SEPARATOR = /^\s*\|?[\s:|-]+\|?\s*$/;

function startsList(line: string): boolean {
  return /^\s*(?:[-*+]|\d+[.)])\s+/.test(line);
}

function listMatch(line: string): { indent: number; marker: string; content: string } | null {
  const match = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line);
  if (!match) return null;
  return { indent: match[1].length, marker: match[2], content: match[3] };
}

function renderListItem(content: string, resolveWiki?: WikiResolver): string {
  const task = /^\[([ xX])\]\s+(.*)$/.exec(content);
  if (task) {
    const checked = task[1].toLowerCase() === 'x';
    return `<li class="task-item"><span class="task-check" data-checked="${
      checked ? 'true' : 'false'
    }">${checked ? '✓' : ''}</span><span>${renderInline(task[2], resolveWiki)}</span></li>`;
  }
  return `<li>${renderInline(content, resolveWiki)}</li>`;
}

/** 解析正文为块列表；resolveWiki 由服务端基于 vault 索引提供 */
export function parseMarkdown(body: string, resolveWiki?: WikiResolver): MarkdownBlock[] {
  const lines = body.replace(/\r\n?/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  const flushParagraph = (chunks: string[]) => {
    const text = chunks.map((line) => line.trim()).join('\n').trim();
    if (!text) return;
    blocks.push({ type: 'paragraph', html: renderInline(text, resolveWiki) });
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // 代码块
    if (/^```/.test(trimmed)) {
      const lang = trimmed.slice(3).trim() || undefined;
      const bodyLines: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        bodyLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: 'code', lang, code: bodyLines.join('\n') });
      continue;
    }

    // 题目块
    const problem = /^<(problem|question)(?:\s[^>]*)?>/i.exec(trimmed);
    if (problem) {
      const variant = problem[1].toLowerCase() as 'problem' | 'question';
      const rawLines: string[] = [];
      i += 1;
      while (i < lines.length && !new RegExp(`</${variant}\\s*>`, 'i').test(lines[i])) {
        rawLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: 'problem', variant, raw: rawLines.join('\n').trim() });
      continue;
    }

    // 标题
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      const level = heading[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      blocks.push({
        type: 'heading',
        level,
        id: headingId(heading[2]),
        html: renderInline(heading[2], resolveWiki),
      });
      i += 1;
      continue;
    }

    // 分隔线
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }

    // 表格
    if (trimmed.includes('|') && i + 1 < lines.length && TABLE_SEPARATOR.test(lines[i + 1])) {
      const head = splitRow(trimmed);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      const headHtml = head.map((cell) => `<th>${renderInline(cell, resolveWiki)}</th>`).join('');
      const rowsHtml = rows
        .map(
          (row) =>
            `<tr>${row
              .map((cell) => `<td>${renderInline(cell, resolveWiki)}</td>`)
              .join('')}</tr>`
        )
        .join('');
      blocks.push({
        type: 'table',
        html: `<div class="table-wrap"><table><thead><tr>${headHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`,
      });
      continue;
    }

    // 列表
    if (startsList(line)) {
      const items: { ordered: boolean; html: string }[] = [];
      let ordered = false;
      while (i < lines.length) {
        if (!lines[i].trim()) {
          // 列表后的空行结束，除非下一行还是列表
          if (i + 1 < lines.length && startsList(lines[i + 1])) {
            i += 1;
            continue;
          }
          break;
        }
        const match = listMatch(lines[i]);
        if (!match) break;
        if (items.length === 0) ordered = /\d/.test(match.marker);
        const depth = Math.min(Math.floor(match.indent / 2), 4);
        const html = renderListItem(match.content, resolveWiki);
        items.push({
          ordered,
          html: depth > 0 ? html.replace('<li', `<li style="margin-left:${depth * 1.1}rem"`) : html,
        });
        i += 1;
      }
      blocks.push({
        type: 'list',
        ordered,
        html: `<${ordered ? 'ol' : 'ul'}>${items.map((item) => item.html).join('')}</${
          ordered ? 'ol' : 'ul'
        }>`,
      });
      continue;
    }

    // 引用
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push({
        type: 'quote',
        html: `<blockquote><p>${renderInline(quoteLines.join('\n'), resolveWiki)}</p></blockquote>`,
      });
      continue;
    }

    // 单行图片成块，便于题注与布局
    const image = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(trimmed);
    if (image) {
      blocks.push({ type: 'image', src: image[2], alt: image[1] });
      i += 1;
      continue;
    }

    // 段落
    const paragraphLines: string[] = [];
    while (i < lines.length) {
      const current = lines[i];
      if (!current.trim()) break;
      if (
        /^(#{1,6})\s+/.test(current.trim()) ||
        /^```/.test(current.trim()) ||
        /^<(problem|question)(\s|>)/i.test(current.trim()) ||
        startsList(current) ||
        current.trim().startsWith('>')
      ) {
        break;
      }
      paragraphLines.push(current);
      i += 1;
    }
    flushParagraph(paragraphLines);
  }

  return blocks;
}

/** 从 Markdown 里抽离纯文本（用于摘要 / 搜索） */
export function markdownToText(body: string): string {
  return body
    .replace(/<problem>[\s\S]*?<\/problem>/gi, ' ')
    .replace(/<question>[\s\S]*?<\/question>/gi, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[\[([^\]|#]*)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g, '$2$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
