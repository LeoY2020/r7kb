'use client';

import { useState, type FormEvent } from 'react';
import Icon from '@/components/site/Icon';
import type { Mistake, MistakeInput } from '@/lib/mistakes';

type MistakeFormProps = {
  initial?: Mistake | null;
  /** 已出现过的学科 / 来源，做输入建议 */
  subjectOptions?: string[];
  sourceOptions?: string[];
  onSubmit: (input: MistakeInput) => void;
  onCancel: () => void;
};

const fieldClass =
  'w-full rounded-xl border border-line bg-page px-3 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent';
const labelClass = 'mb-1.5 block text-[12px] font-medium text-ink-muted';

function splitTags(value: string): string[] {
  return value
    .split(/[,，、;；\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function MistakeForm({
  initial,
  subjectOptions = [],
  sourceOptions = [],
  onSubmit,
  onCancel,
}: MistakeFormProps) {
  const [stem, setStem] = useState(initial?.stem ?? '');
  const [answer, setAnswer] = useState(initial?.answer ?? '');
  const [explanation, setExplanation] = useState(initial?.explanation ?? '');
  const [subject, setSubject] = useState(initial?.subject ?? '');
  const [source, setSource] = useState(initial?.source ?? '');
  const [tags, setTags] = useState((initial?.tags ?? []).join('，'));
  const [error, setError] = useState('');

  const isEditing = Boolean(initial);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedStem = stem.trim();
    if (!trimmedStem) {
      setError('题干不能为空，先把题目抄下来吧。');
      return;
    }
    onSubmit({
      stem: trimmedStem,
      answer: answer.trim() || undefined,
      explanation: explanation.trim() || undefined,
      subject: subject.trim() || undefined,
      source: source.trim() || undefined,
      tags: splitTags(tags),
      mastered: initial?.mastered ?? false,
      from: initial?.from ?? null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-card border border-line bg-elevated p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{isEditing ? 'EDIT MISTAKE' : 'NEW MISTAKE'}</p>
          <h2 className="mt-1.5 text-[17px] font-semibold text-ink">
            {isEditing ? '编辑这道错题' : '添加一道错题'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="grid h-8 w-8 place-items-center rounded-pill border border-line text-ink-muted transition-colors hover:text-ink"
          aria-label="关闭表单"
        >
          <Icon name="close" size={14} />
        </button>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="mistake-stem" className={labelClass}>
            题干 <span className="text-rose">*</span>
          </label>
          <textarea
            id="mistake-stem"
            value={stem}
            onChange={(event) => {
              setStem(event.target.value);
              if (error) setError('');
            }}
            rows={4}
            placeholder="把题目抄在这里，含选项也可以。"
            className={fieldClass + ' resize-y leading-relaxed'}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="mistake-subject" className={labelClass}>
              学科
            </label>
            <input
              id="mistake-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              list="mistake-subject-options"
              placeholder="如：数学"
              className={fieldClass}
            />
            <datalist id="mistake-subject-options">
              {subjectOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="mistake-source" className={labelClass}>
              来源
            </label>
            <input
              id="mistake-source"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              list="mistake-source-options"
              placeholder="如：10 月月考 第 12 题"
              className={fieldClass}
            />
            <datalist id="mistake-source-options">
              {sourceOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="mistake-answer" className={labelClass}>
              答案
            </label>
            <textarea
              id="mistake-answer"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              rows={2}
              placeholder="可以只写最终结果"
              className={fieldClass + ' resize-y'}
            />
          </div>
          <div>
            <label htmlFor="mistake-tags" className={labelClass}>
              标签
            </label>
            <input
              id="mistake-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="用逗号分隔：函数，计算"
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="mistake-explanation" className={labelClass}>
            解析
          </label>
          <textarea
            id="mistake-explanation"
            value={explanation}
            onChange={(event) => setExplanation(event.target.value)}
            rows={3}
            placeholder="为什么错、正确的思路是什么。"
            className={fieldClass + ' resize-y leading-relaxed'}
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-[13px] text-rose">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary">
          <Icon name="check" size={16} />
          {isEditing ? '保存修改' : '加入错题本'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          取消
        </button>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          仅存在本机浏览器
        </span>
      </div>
    </form>
  );
}

export default MistakeForm;
