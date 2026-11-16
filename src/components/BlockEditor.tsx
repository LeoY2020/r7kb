import { useEffect, useRef, useState } from 'react';
import { makeBlock, nextKey, type Block, type BlockKind } from '../lib/blocks';
import { htmlToInline, inlineToHtml, renderStem } from '../lib/inline';
import { detectKind } from '../lib/questions';
import type { Question } from '../lib/types';
import { Button, Icon, IconButton, Modal, useToast } from './ui';
import QuestionModal from './QuestionModal';

const TYPE_LABEL: Record<BlockKind, string> = {
  h1: '大标题',
  h2: '标题',
  h3: '小标题',
  p: '正文',
  bullet: '无序列表',
  ordered: '有序列表',
  quote: '引用',
  code: '代码块',
  divider: '分割线',
  image: '图片',
  table: '表格',
  question: '题目',
  raw: '原始 Markdown',
};

const ADDABLE: BlockKind[] = [
  'p',
  'h2',
  'h3',
  'bullet',
  'ordered',
  'quote',
  'code',
  'table',
  'image',
  'divider',
  'question',
  'raw',
];

function InlineEditable({
  value,
  placeholder,
  onChange,
  onFocus,
}: {
  value: string;
  placeholder: string;
  onChange: (text: string) => void;
  onFocus: (element: HTMLElement) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (document.activeElement === element) return;
    const html = inlineToHtml(value);
    if (element.innerHTML !== html) element.innerHTML = html;
  }, [value]);

  return (
    <div
      ref={ref}
      className="block-input"
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      spellCheck={false}
      onInput={() => onChange(htmlToInline(ref.current))}
      onFocus={() => ref.current && onFocus(ref.current)}
      onBlur={() => {
        if (ref.current) ref.current.innerHTML = inlineToHtml(value);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          document.execCommand('insertLineBreak');
          onChange(htmlToInline(ref.current));
        }
      }}
      onPaste={(event) => {
        event.preventDefault();
        const text = event.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
      }}
    />
  );
}

function QuestionPreview({
  question,
  onEdit,
}: {
  question: Question;
  onEdit: () => void;
}) {
  const kind = detectKind(question);
  const answers = question.answer
    .replace(/[\s,，、;；/]/g, '')
    .toUpperCase()
    .split('');
  return (
    <div className="question-card">
      <div className="question-card-head">
        <span className="kind-badge">
          {{ single: '单选', multiple: '多选', judge: '判断', blank: '填空', text: '解答' }[kind]}
        </span>
        <span style={{ fontSize: 11.5, color: 'rgb(var(--ink-faint))' }}>
          难度 {question.difficulty} · {question.knowledge[0] ?? '未标注知识点'}
        </span>
        <Button size="sm" icon="edit" onClick={onEdit} style={{ marginLeft: 'auto' }}>
          编辑题目
        </Button>
      </div>
      <div className="question-card-body">
        <div className="question-stem">{renderStem(question.stem) || '（题干为空）'}</div>
        {question.options.length > 0 ? (
          <div className="option-list">
            {question.options.map((option) => (
              <div
                key={option.tag}
                className="option-row"
                data-correct={answers.includes(option.tag)}
              >
                <span className="option-tag">{option.tag}</span>
                <span>{option.text}</span>
              </div>
            ))}
          </div>
        ) : null}
        <div className="answer-line">
          <b>答案</b>：{question.answer || '（未填写）'}
        </div>
        {question.explanation ? (
          <div className="explain-line">解析：{question.explanation}</div>
        ) : null}
        {question.knowledge.length > 0 ? (
          <div className="knowledge-row">
            {question.knowledge.map((item) => (
              <span key={item} className="chip">
                {item}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function BlockEditor({
  blocks,
  slug,
  noteTitle,
  onChange,
}: {
  blocks: Block[];
  slug: string;
  noteTitle: string;
  onChange: (blocks: Block[]) => void;
}) {
  const toast = useToast();
  const [active, setActive] = useState<{ index: number; element: HTMLElement } | null>(null);
  const [editing, setEditing] = useState<{ index: number; question: Question } | null>(null);
  const [insert, setInsert] = useState<{ kind: 'link' | 'wiki'; text: string; value: string } | null>(
    null,
  );

  const update = (index: number, patch: Partial<Block>) => {
    const next = blocks.map((block, i) => (i === index ? { ...block, ...patch } : block));
    onChange(next);
  };

  const updateText = (index: number, text: string) => update(index, { text });

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(blocks.filter((_, i) => i !== index));
  };

  const duplicate = (index: number) => {
    const copy = { ...blocks[index], key: nextKey() };
    const next = [...blocks];
    next.splice(index + 1, 0, copy);
    onChange(next);
  };

  const add = (type: BlockKind) => {
    const block = makeBlock(type);
    if (type === 'question') {
      block.question = {
        id: `${slug}-q${blocks.filter((item) => item.type === 'question').length + 1}`,
        difficulty: 1,
        subject: '智能电子书',
        stem: '',
        options: [],
        answer: '',
        explanation: '',
        knowledge: [],
        kind: 'text',
      };
    }
    onChange([...blocks, block]);
  };

  const run = (command: string, value?: string) => {
    if (!active) {
      toast.show('先在正文里点一下要编辑的位置', 'error');
      return;
    }
    active.element.focus();
    document.execCommand(command, false, value);
    updateText(active.index, htmlToInline(active.element));
  };

  const wrapSelection = (before: string, after = before) => {
    if (!active) {
      toast.show('先选中一段文字', 'error');
      return;
    }
    const element = active.element;
    element.focus();
    const selection = window.getSelection();
    const text = selection?.toString() ?? '';
    document.execCommand('insertText', false, `${before}${text}${after}`);
    updateText(active.index, htmlToInline(element));
  };

  const insertHtml = (html: string) => {
    if (!active) {
      toast.show('先在正文里点一下要编辑的位置', 'error');
      return;
    }
    active.element.focus();
    document.execCommand('insertHTML', false, html);
    updateText(active.index, htmlToInline(active.element));
  };

  const confirmInsert = () => {
    if (!insert) return;
    if (insert.kind === 'link') {
      const url = insert.value.trim();
      if (!url) return;
      if (insert.text.trim()) {
        insertHtml(
          `<a href="${url.replace(/"/g, '&quot;')}" target="_blank" rel="noreferrer">${insert.text}</a>`,
        );
      } else {
        insertHtml(`<a href="${url.replace(/"/g, '&quot;')}" target="_blank" rel="noreferrer">${url}</a>`);
      }
    } else {
      const target = insert.value.trim();
      if (!target) return;
      insertHtml(
        `<span class="inline-wiki" data-wiki="${target.replace(/"/g, '&quot;')}">${insert.text.trim() || target}</span>`,
      );
    }
    setInsert(null);
  };

  return (
    <>
      <div className="block-toolbar">
        <button type="button" className="toolbar-btn" onClick={() => run('bold')} title="加粗">
          <b>B</b>
        </button>
        <button type="button" className="toolbar-btn" onClick={() => run('italic')} title="斜体">
          <i>I</i>
        </button>
        <button type="button" className="toolbar-btn" onClick={() => wrapSelection('~~')} title="删除线">
          S
        </button>
        <button type="button" className="toolbar-btn" onClick={() => wrapSelection('`')} title="行内代码">
          {'</>'}
        </button>
        <span className="toolbar-sep" />
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => setInsert({ kind: 'link', text: window.getSelection()?.toString() ?? '', value: '' })}
        >
          <Icon name="link" size={14} />
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => setInsert({ kind: 'wiki', text: '', value: '' })}
          title="链接到其他笔记"
        >
          [[ ]]
        </button>
        <button type="button" className="toolbar-btn" onClick={() => insertHtml('#')} title="标签">
          #
        </button>
        <button type="button" className="toolbar-btn" onClick={() => wrapSelection('$')} title="行内公式">
          ∑
        </button>
        <span className="toolbar-sep" />
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => run('removeFormat')}
          title="清除格式"
        >
          清除
        </button>
      </div>

      <div className="block-list">
        {blocks.map((block, index) => (
          <div key={block.key} className="block" data-type={block.type}>
            <div className="block-tools">
              <button
                type="button"
                className="block-grip"
                title="上移"
                onClick={() => move(index, -1)}
              >
                <Icon name="chevronDown" size={13} style={{ transform: 'rotate(180deg)' }} />
              </button>
              <button
                type="button"
                className="block-grip"
                title="下移"
                onClick={() => move(index, 1)}
              >
                <Icon name="chevronDown" size={13} />
              </button>
              <button
                type="button"
                className="block-grip"
                title="删除这一段"
                onClick={() => remove(index)}
              >
                <Icon name="trash" size={12} />
              </button>
            </div>

            <div>
              {block.type === 'divider' ? (
                <div className="block-divider" />
              ) : block.type === 'code' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input
                    className="input input-sm"
                    value={block.lang ?? ''}
                    placeholder="语言（可选），如 json / js / bash"
                    style={{ maxWidth: 240 }}
                    onChange={(event) => update(index, { lang: event.target.value })}
                  />
                  <textarea
                    className="code-editor"
                    value={block.text}
                    spellCheck={false}
                    onChange={(event) => updateText(index, event.target.value)}
                  />
                </div>
              ) : block.type === 'table' || block.type === 'raw' ? (
                <textarea
                  className="raw-editor"
                  value={block.text}
                  spellCheck={false}
                  onChange={(event) => updateText(index, event.target.value)}
                />
              ) : block.type === 'image' ? (
                <div className="block-image">
                  <input
                    className="input input-sm"
                    value={block.alt ?? ''}
                    placeholder="图片说明"
                    style={{ maxWidth: 180 }}
                    onChange={(event) => update(index, { alt: event.target.value })}
                  />
                  <input
                    className="input input-sm"
                    value={block.src ?? ''}
                    placeholder="图片地址 /resources/xxx.png"
                    style={{ flex: 1, minWidth: 180 }}
                    onChange={(event) => update(index, { src: event.target.value })}
                  />
                </div>
              ) : block.type === 'question' ? (
                block.question ? (
                  <QuestionPreview
                    question={block.question}
                    onEdit={() => setEditing({ index, question: block.question as Question })}
                  />
                ) : (
                  <div className="card-quiet" style={{ padding: 14, fontSize: 13 }}>
                    这条题目块无法解析，建议删除后重新添加。
                  </div>
                )
              ) : block.type === 'bullet' || block.type === 'ordered' ? (
                <div className="block-bullet">
                  <span className="block-dot">{block.type === 'bullet' ? '•' : `${index + 1}.`}</span>
                  <InlineEditable
                    value={block.text}
                    placeholder={block.type === 'bullet' ? '列表项' : '步骤'}
                    onChange={(text) => updateText(index, text)}
                    onFocus={(element) => setActive({ index, element })}
                  />
                </div>
              ) : (
                <InlineEditable
                  value={block.text}
                  placeholder={
                    block.type === 'h1'
                      ? '大标题'
                      : block.type === 'h2'
                        ? '小标题'
                        : block.type === 'h3'
                          ? '更小的标题'
                          : block.type === 'quote'
                            ? '引用一段话'
                            : "写点什么，输入 '/' 也可以直接插入内容"
                  }
                  onChange={(text) => updateText(index, text)}
                  onFocus={(element) => setActive({ index, element })}
                />
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  minHeight: 20,
                  marginTop: 2,
                  opacity: 0.55,
                }}
              >
                <select
                  className="select input-sm"
                  style={{ width: 104, height: 24, fontSize: 11, padding: '0 24px 0 8px' }}
                  value={block.type}
                  onChange={(event) => update(index, { type: event.target.value as BlockKind })}
                >
                  {ADDABLE.map((type) => (
                    <option key={type} value={type}>
                      {TYPE_LABEL[type]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="toolbar-btn"
                  style={{ height: 24, fontSize: 11 }}
                  onClick={() => duplicate(index)}
                >
                  复制
                </button>
              </div>
            </div>
          </div>
        ))}

        <div className="block-add">
          <div className="add-row">
            {ADDABLE.map((type) => (
              <button key={type} type="button" className="add-chip" onClick={() => add(type)}>
                + {TYPE_LABEL[type]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {editing && (
        <QuestionModal
          question={editing.question}
          noteSlug={slug}
          noteTitle={noteTitle}
          onClose={() => setEditing(null)}
          onSave={(question) => {
            const next = blocks.map((block, i) =>
              i === editing.index ? { ...block, question } : block,
            );
            onChange(next);
            setEditing(null);
            toast.show('题目已更新');
          }}
          onDelete={() => {
            onChange(blocks.filter((_, i) => i !== editing.index));
            setEditing(null);
            toast.show('题目已删除');
          }}
        />
      )}

      {insert && (
        <Modal
          title={insert.kind === 'link' ? '插入链接' : '链接到其他笔记'}
          onClose={() => setInsert(null)}
          width={440}
          footer={
            <>
              <Button onClick={() => setInsert(null)}>取消</Button>
              <Button variant="primary" onClick={confirmInsert}>
                插入
              </Button>
            </>
          }
        >
          {insert.kind === 'link' ? (
            <label className="field">
              <span className="field-label">链接地址</span>
              <input
                className="input"
                autoFocus
                placeholder="https://…"
                value={insert.value}
                onChange={(event) => setInsert({ ...insert, value: event.target.value })}
              />
            </label>
          ) : (
            <>
              <label className="field">
                <span className="field-label">笔记标题 / slug</span>
                <input
                  className="input"
                  autoFocus
                  placeholder="如：五级智能电子书"
                  value={insert.value}
                  onChange={(event) => setInsert({ ...insert, value: event.target.value })}
                />
              </label>
              <label className="field">
                <span className="field-label">显示文字（可选）</span>
                <input
                  className="input"
                  placeholder="默认与笔记同名"
                  value={insert.text}
                  onChange={(event) => setInsert({ ...insert, text: event.target.value })}
                />
              </label>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
