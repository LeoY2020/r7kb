'use client';

import SpringCheck from '@/components/reactbits-micro/SpringCheck';
import Icon from '@/components/site/Icon';
import type { Question } from '@/lib/types';

type QuestionCardProps = {
  question: Question;
  index: number;
  mastered: boolean;
  onMasteredChange: (next: boolean) => void;
  showAnswer: boolean;
  sample?: boolean;
};

const difficultyLabel = ['', '基础', '进阶', '拓展'];

export function QuestionCard({
  question,
  index,
  mastered,
  onMasteredChange,
  showAnswer,
  sample = false,
}: QuestionCardProps) {
  const difficulty = question.difficulty ?? 1;

  return (
    <article className="card card-hover group relative overflow-hidden p-5 sm:p-6">
      {sample ? (
        <span className="chip absolute right-4 top-4 border border-line bg-elevated font-mono tracking-widest text-ink-faint">
          示例
        </span>
      ) : null}

      <div className="flex gap-4">
        <span className="mt-0.5 font-mono text-[11px] text-ink-faint">
          {String(index + 1).padStart(2, '0')}
        </span>

        <div className="min-w-0 flex-1">
          <p className="pr-16 text-[15px] leading-relaxed text-ink">{question.stem}</p>

          {question.options?.length ? (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {question.options.map((opt, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 rounded-xl border border-line bg-page px-3 py-2 text-[13px] text-ink-muted"
                >
                  <span className="font-mono text-[10px] text-ink-faint">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{opt}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {showAnswer && (question.answer || question.explanation) ? (
            <div className="mt-4 rounded-xl border border-accent/15 bg-accent-soft p-4">
              {question.answer ? (
                <p className="text-[13px] text-ink">
                  <span className="mr-2 font-mono text-[10px] uppercase tracking-widest text-accent">
                    答案
                  </span>
                  {question.answer}
                </p>
              ) : null}
              {question.explanation ? (
                <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{question.explanation}</p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-ink-faint">
              <Icon name="sparkle" size={12} className="text-ink-faint" />
              {difficultyLabel[difficulty]} · L{difficulty}
            </span>
            {question.source ? (
              <span className="font-mono text-[10px] tracking-wider text-ink-faint">
                {question.source}
              </span>
            ) : null}

            <div className="ml-auto">
              <SpringCheck
                label={mastered ? '已掌握' : '标记掌握'}
                checked={mastered}
                onChange={onMasteredChange}
                color="#6e6e73"
                fillColor="#0071e3"
                checkColor="#ffffff"
                fontSize={12}
                boxSize={18}
                strike="none"
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default QuestionCard;
