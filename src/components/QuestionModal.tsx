import { useMemo, useState } from 'react';
import { answerPlaceholder, detectKind } from '../lib/questions';
import type { Question, QuestionKind, QuestionOption } from '../lib/types';
import { Button, Field, Icon, IconButton, Modal, useToast } from './ui';

const KIND_OPTIONS: { id: QuestionKind; label: string }[] = [
  { id: 'single', label: '单选题' },
  { id: 'multiple', label: '多选题' },
  { id: 'judge', label: '判断题' },
  { id: 'blank', label: '填空题' },
  { id: 'text', label: '解答题' },
];

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export default function QuestionModal({
  question,
  noteSlug,
  noteTitle,
  onClose,
  onSave,
  onDelete,
}: {
  question: Question;
  noteSlug: string;
  noteTitle: string;
  onClose: () => void;
  onSave: (question: Question) => void;
  onDelete?: () => void;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState<Question>(() => ({ ...question, options: [...question.options] }));
  const [knowledgeText, setKnowledgeText] = useState(question.knowledge.join('，'));

  const kind = useMemo(() => detectKind(draft), [draft]);

  const patch = (next: Partial<Question>) => setDraft((prev) => ({ ...prev, ...next }));

  const switchKind = (next: QuestionKind) => {
    if (next === 'single' || next === 'multiple') {
      const options: QuestionOption[] =
        draft.options.length >= 2
          ? draft.options
          : [
              { tag: 'A', text: '' },
              { tag: 'B', text: '' },
              { tag: 'C', text: '' },
              { tag: 'D', text: '' },
            ];
      setDraft({ ...draft, options, answer: draft.answer || 'A' });
      return;
    }
    if (next === 'judge') {
      setDraft({ ...draft, options: [], answer: draft.answer || '对' });
      return;
    }
    if (next === 'blank') {
      setDraft({
        ...draft,
        options: [],
        stem: /<(?:sp|space)\b/i.test(draft.stem) ? draft.stem : `${draft.stem} <sp></sp>`,
      });
      return;
    }
    setDraft({ ...draft, options: [], answer: '' });
  };

  const addOption = () => {
    const tag = LETTERS[draft.options.length] ?? String(draft.options.length + 1);
    patch({ options: [...draft.options, { tag, text: '' }] });
  };

  const updateOption = (index: number, text: string) => {
    patch({ options: draft.options.map((item, i) => (i === index ? { ...item, text } : item)) });
  };

  const removeOption = (index: number) => {
    const next = draft.options
      .filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, tag: LETTERS[i] ?? String(i + 1) }));
    patch({ options: next });
  };

  const toggleCorrect = (tag: string) => {
    if (kind === 'single') {
      patch({ answer: tag });
      return;
    }
    const letters = draft.answer
      .replace(/[\s,，、;；/]/g, '')
      .toUpperCase()
      .split('')
      .filter(Boolean);
    const next = letters.includes(tag) ? letters.filter((item) => item !== tag) : [...letters, tag];
    next.sort();
    patch({ answer: next.join(',') });
  };

  const submit = () => {
    const cleaned: Question = {
      ...draft,
      stem: draft.stem.trim(),
      answer: draft.answer.trim(),
      explanation: draft.explanation.trim(),
      subject: draft.subject.trim() || '智能电子书',
      knowledge: knowledgeText
        .split(/[,，、;；]/)
        .map((item) => item.trim())
        .filter(Boolean),
      options: draft.options
        .filter((option) => option.text.trim())
        .map((option, index) => ({
          tag: LETTERS[index] ?? option.tag,
          text: option.text.trim(),
        })),
    };

    if (!cleaned.stem) {
      toast.show('题干还没写', 'error');
      return;
    }
    if (cleaned.options.length > 0 && cleaned.options.length < 2) {
      toast.show('选择题至少要有两个选项', 'error');
      return;
    }
    if (!cleaned.answer) {
      toast.show('答案还没写', 'error');
      return;
    }
    if (cleaned.options.length > 0) {
      cleaned.answer = cleaned.answer.replace(/[\s,，、;；/]/g, '').toUpperCase();
      const tags = cleaned.options.map((option) => option.tag);
      if (![...cleaned.answer].every((char) => tags.includes(char))) {
        toast.show('答案字母要在选项范围内', 'error');
        return;
      }
      cleaned.answer = [...cleaned.answer].join(',');
    }
    if (cleaned.kind !== kind) cleaned.kind = kind;
    onSave(cleaned);
  };

  return (
    <Modal
      title="编辑题目"
      onClose={onClose}
      width={680}
      footer={
        <>
          {onDelete ? (
            <Button variant="danger" icon="trash" onClick={onDelete} style={{ marginRight: 'auto' }}>
              删除题目
            </Button>
          ) : null}
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" icon="check" onClick={submit}>
            保存题目
          </Button>
        </>
      }
    >
      <div style={{ fontSize: 12, color: 'rgb(var(--ink-faint))' }}>
        来自《{noteTitle}》 · 保存后会写回笔记的 <code>&lt;question&gt;</code> 块，并自动进入题库。
      </div>

      <div className="field">
        <span className="field-label">题型</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {KIND_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className="add-chip"
              style={
                kind === option.id
                  ? { borderColor: 'rgb(var(--accent))', color: 'rgb(var(--accent))', background: 'rgb(var(--accent-soft))' }
                  : undefined
              }
              onClick={() => switchKind(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <Field
        label="题干"
        hint={
          kind === 'blank'
            ? '填空题用 <sp>答案</sp> 占位表示空，例如：包文档叫 <sp>content.opf</sp>。'
            : '支持行内 Markdown（**加粗**、`代码`、[[笔记]]、$公式$）。'
        }
      >
        <textarea
          className="textarea"
          rows={4}
          value={draft.stem}
          onChange={(event) => patch({ stem: event.target.value })}
          placeholder="写下题目"
        />
      </Field>

      {kind === 'single' || kind === 'multiple' ? (
        <div className="field">
          <span className="field-label">
            选项 {kind === 'multiple' ? '（点击字母可多选正确项）' : '（点击字母设为正确项）'}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {draft.options.map((option, index) => {
              const correct = draft.answer
                .replace(/[\s,，]/g, '')
                .toUpperCase()
                .includes(option.tag);
              return (
                <div key={`${option.tag}-${index}`} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="option-tag"
                    style={
                      correct
                        ? { background: 'rgb(var(--accent))', color: '#fff', borderColor: 'transparent' }
                        : undefined
                    }
                    onClick={() => toggleCorrect(option.tag)}
                    title="设为正确答案"
                  >
                    {option.tag}
                  </button>
                  <input
                    className="input"
                    value={option.text}
                    placeholder={`选项 ${option.tag}`}
                    onChange={(event) => updateOption(index, event.target.value)}
                  />
                  <IconButton
                    icon="trash"
                    label="删除选项"
                    onClick={() => removeOption(index)}
                    disabled={draft.options.length <= 2}
                  />
                </div>
              );
            })}
          </div>
          <Button size="sm" icon="plus" onClick={addOption} style={{ alignSelf: 'flex-start' }}>
            添加选项
          </Button>
        </div>
      ) : null}

      {kind === 'judge' ? (
        <Field label="正确答案">
          <div style={{ display: 'flex', gap: 8 }}>
            {['对', '错'].map((value) => (
              <button
                key={value}
                type="button"
                className="add-chip"
                style={
                  draft.answer === value
                    ? { borderColor: 'rgb(var(--accent))', color: 'rgb(var(--accent))', background: 'rgb(var(--accent-soft))' }
                    : undefined
                }
                onClick={() => patch({ answer: value })}
              >
                {value}
              </button>
            ))}
          </div>
        </Field>
      ) : (
        <Field label="答案" hint={answerPlaceholder(kind)}>
          <input
            className="input"
            value={draft.answer}
            onChange={(event) => patch({ answer: event.target.value })}
            placeholder={answerPlaceholder(kind)}
          />
        </Field>
      )}

      <Field label="解析" hint="讲清楚为什么，以及常见错误。">
        <textarea
          className="textarea"
          rows={3}
          value={draft.explanation}
          onChange={(event) => patch({ explanation: event.target.value })}
          placeholder="选填"
        />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="考查的知识点" hint="多个知识点用逗号分隔。">
          <input
            className="input"
            value={knowledgeText}
            onChange={(event) => setKnowledgeText(event.target.value)}
            placeholder="如：EPUB 3 容器结构"
          />
        </Field>
        <Field label="难度">
          <select
            className="select"
            value={draft.difficulty}
            onChange={(event) => patch({ difficulty: Number(event.target.value) as 1 | 2 | 3 })}
          >
            <option value={1}>1 · 基础</option>
            <option value={2}>2 · 进阶</option>
            <option value={3}>3 · 拓展</option>
          </select>
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="学科">
          <input
            className="input"
            value={draft.subject}
            onChange={(event) => patch({ subject: event.target.value })}
          />
        </Field>
        <Field label="题目 ID" hint={`留空时自动使用 ${noteSlug}-q…`}>
          <input
            className="input"
            value={draft.id}
            onChange={(event) => patch({ id: event.target.value })}
          />
        </Field>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'rgb(var(--ink-faint))' }}>
        <Icon name="eye" size={14} />
        右侧题库列表会同步显示这道题；构建时自动校验答案与选项。
      </div>
    </Modal>
  );
}
