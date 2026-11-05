'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ClickSpark from '@/components/reactbits/ClickSpark';
import Icon from '@/components/site/Icon';
import { useMistakesOptional } from '@/components/mistakes/MistakesProvider';
import {
  buildMistakeFromProblem,
  copyText,
  loadStoredMistakes,
  parseProblemRaw,
  sameProblem,
  saveStoredMistakes,
  sortMistakes,
  type Mistake,
} from '@/lib/mistakes';

type ProblemBlockProps = {
  raw: string;
  variant?: 'problem' | 'question';
  /** 来源笔记标题 */
  source?: string;
  /** 来源笔记 slug */
  slug?: string;
  /** 本笔记内的题目序号（从 1 开始） */
  index?: number;
};

/**
 * 知识库题目块：一键复制原文 / 加入错题本。
 * 在 MistakesProvider 内会共享错题状态；单独使用时退回 localStorage 直读直写。
 */
export function ProblemBlock({ raw, variant = 'problem', source, slug, index }: ProblemBlockProps) {
  const context = useMistakesOptional();
  const parsed = parseProblemRaw(raw);
  const sourceLabel = [source, index ? `第 ${index} 题` : undefined].filter(Boolean).join(' · ');

  const [fallback, setFallback] = useState<Mistake[]>([]);
  const [copied, setCopied] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    if (!context) setFallback(loadStoredMistakes());
  }, [context]);

  const mistakes = context?.mistakes ?? fallback;
  const exists = mistakes.some(
    (item) => sameProblem(item, { stem: parsed.stem, source: sourceLabel || undefined })
  );

  const handleCopy = async () => {
    const ok = await copyText(raw);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const handleAdd = () => {
    if (exists) return;
    const input = buildMistakeFromProblem(raw, sourceLabel || undefined);
    if (slug || source) input.from = { ...(slug ? { slug } : {}), ...(source ? { title: source } : {}) };

    if (context) {
      context.addMistake(input);
    } else {
      const mistake = {
        ...input,
        id: `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        stem: input.stem,
        createdAt: new Date().toISOString(),
        mastered: false,
      } as Mistake;
      const next = sortMistakes([mistake, ...loadStoredMistakes()]);
      saveStoredMistakes(next);
      setFallback(next);
    }

    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1800);
  };

  const isQuestion = variant === 'question';

  return (
    <section
      className={`my-8 overflow-hidden rounded-card border border-line bg-surface shadow-soft ${
        isQuestion ? 'border-l-[3px] border-l-iris' : 'border-l-[3px] border-l-accent'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-elevated/60 px-4 py-2.5 sm:px-5">
        <div className="flex items-center gap-2">
          <span className={`chip ${isQuestion ? 'bg-iris/10 text-iris' : 'bg-accent-soft text-accent'}`}>
            {isQuestion ? 'QUESTION' : 'PROBLEM'}
          </span>
          {index ? <span className="text-[12px] text-ink-faint">第 {index} 题</span> : null}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-2.5 py-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <Icon name={copied ? 'check' : 'copy'} size={13} />
            {copied ? '已复制' : '复制题目'}
          </button>
         {exists ? (
            <Link
              href="/mistakes/"
              className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-mint/10 px-2.5 py-1.5 text-[12px] font-medium text-mint transition-colors hover:border-mint/40"
            >
              <Icon name="check" size={13} />
              已在错题本
            </Link>
          ) : (
            <ClickSpark
              sparkColor="rgb(var(--accent))"
              sparkCount={10}
              sparkSize={11}
              sparkRadius={26}
              className="inline-flex"
            >
              <button
                type="button"
                onClick={handleAdd}
                className="inline-flex items-center gap-1.5 rounded-pill bg-accent px-2.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-accent-hover"
              >
                <Icon name={justAdded ? 'check' : 'notebook'} size={13} />
                {justAdded ? '已加入' : '加入错题本'}
              </button>
            </ClickSpark>
          )}
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5 sm:py-5">
        <p className="whitespace-pre-wrap text-[15px] leading-[1.8] text-ink">{parsed.stem}</p>

        {parsed.answer || parsed.explanation ? (
          <div className="mt-4 border-t border-line pt-3">
            <button
              type="button"
              onClick={() => setShowAnswer((value) => !value)}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent transition-colors hover:text-accent-hover"
              aria-expanded={showAnswer}
            >
              <Icon name="chevronDown" size={13} className={showAnswer ? 'rotate-180' : ''} />
              {showAnswer ? '收起答案与解析' : '查看答案与解析'}
            </button>

            {showAnswer ? (
              <div className="mt-3 space-y-3 rounded-xl bg-page/70 p-3.5">
                {parsed.answer ? (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">答案</p>
                    <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-ink">
                      {parsed.answer}
                    </p>
                  </div>
                ) : null}
                {parsed.explanation ? (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">解析</p>
                    <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-muted">
                      {parsed.explanation}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {sourceLabel ? <p className="mt-4 text-[12px] text-ink-faint">来源：{sourceLabel}</p> : null}
      </div>
    </section>
  );
}

export default ProblemBlock;
