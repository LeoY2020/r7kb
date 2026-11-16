/** 行内 Markdown ↔ contenteditable HTML 的双向转换（覆盖知识库常用语法）。 */

export function escapeHtml(input: string): string {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const unescapeHtml = (input: string) =>
  input.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** Markdown 行内语法 → HTML（供 contenteditable 初始渲染）。 */
export function inlineToHtml(markdown: string): string {
  if (!markdown) return '';
  const codes: string[] = [];
  let text = escapeHtml(markdown);

  text = text.replace(/`([^`\n]+)`/g, (_match, code: string) => {
    codes.push(code);
    return `\u0000${codes.length - 1}\u0000`;
  });

  text = text.replace(
    /!\[([^\]]*)\]\(([^)\s]+)\)/g,
    (_m, alt: string, src: string) => `<span class="inline-image">🖼 ${alt || src}</span>`,
  );
  text = text.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_m, label: string, href: string) =>
      `<a href="${href}" target="_blank" rel="noreferrer">${label}</a>`,
  );
  text = text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target: string, label?: string) => {
    return `<span class="inline-wiki" data-wiki="${target.trim()}">${(label || target).trim()}</span>`;
  });
  text = text.replace(
    /(^|[\s(（])#([\p{L}\p{N}_-]+)/gu,
    (_m, prefix: string, tag: string) => `${prefix}<span class="inline-tag">#${tag}</span>`,
  );
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  text = text.replace(/~~([^~\n]+)~~/g, '<s>$1</s>');
  text = text.replace(/\$([^$\n]+)\$/g, '<span class="inline-math">$1</span>');
  text = text.replace(/\n/g, '<br>');

  text = text.replace(/\u0000(\d+)\u0000/g, (_m, index: string) => `<code>${codes[Number(index)]}</code>`);
  return text;
}

function walk(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue ?? '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  const inner = Array.from(element.childNodes).map(walk).join('');

  switch (tag) {
    case 'br':
      return '\n';
    case 'strong':
    case 'b':
      return inner.trim() ? `**${inner}**` : inner;
    case 'em':
    case 'i':
      return inner.trim() ? `*${inner}*` : inner;
    case 's':
    case 'del':
    case 'strike':
      return inner.trim() ? `~~${inner}~~` : inner;
    case 'code':
      return `\`${element.textContent ?? ''}\``;
    case 'a': {
      const href = element.getAttribute('href') ?? '';
      return href ? `[${inner || href}](${href})` : inner;
    }
    case 'span': {
      if (element.classList.contains('inline-wiki')) {
        const target = element.getAttribute('data-wiki') || inner;
        const label = element.textContent ?? target;
        return label && label !== target ? `[[${target}|${label}]]` : `[[${target}]]`;
      }
      if (element.classList.contains('inline-tag')) return element.textContent ?? '';
      if (element.classList.contains('inline-math')) return `$${element.textContent ?? ''}$`;
      if (element.classList.contains('inline-image')) return inner;
      return inner;
    }
    case 'div':
    case 'p':
      return `${inner}\n`;
    default:
      return inner;
  }
}

/** contenteditable DOM → Markdown 行内文本。 */
export function htmlToInline(element: HTMLElement | null): string {
  if (!element) return '';
  return unescapeHtml(
    Array.from(element.childNodes)
      .map(walk)
      .join('')
      .replace(/\u00a0/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s+$/, ''),
  );
}

/** 在文本里渲染题目题干（<sp> → ____）。 */
export function renderStem(stem: string): string {
  return stem.replace(/<(?:sp|space)\b[^>]*>([\s\S]*?)<\/(?:sp|space)>/gi, '____');
}
