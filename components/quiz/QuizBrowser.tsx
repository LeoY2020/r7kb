'use client';

import { useMemo, useState } from 'react';
import RubberSegment from '@/components/reactbits-micro/RubberSegment';
import SquishSwitch from '@/components/reactbits-micro/SquishSwitch';
import EmptyState from '@/components/site/EmptyState';
import QuestionCard from '@/components/quiz/QuestionCard';
import type { Question } from '@/lib/types';

const sampleQuestion: Question = {
  id: 'demo-question',
  subjectId: 'demo',
  stem: '已知一次函数 y = 2x - 3，求它与 x 轴的交点坐标。',
  options: ['(1.5, 0)', '(0, -3)', '(3, 0)', '(-1.5, 0)'],
  answer: '(1.5, 0)',
  explanation: '函数与 x 轴相交时 y = 0，代入得 2x − 3 = 0，解得 x = 1.5，所以交点是 (1.5, 0)。',
  difficulty: 1,
  source: '示例题 · 不计入题库',
};

const filters = [
  { value: 'all', label: '全部题目' },
  { value: 'open', label: '未掌握' },
  { value: 'done', label: '已掌握' },
];

export function QuizBrowser({ questions }: { questions: Question[] }) {
  const [filter, setFilter] = useState('all');
  const [showAnswer, setShowAnswer] = useState(false);
  const [mastery, setMastery] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, Boolean(q.mastered)]))
  );

  const list = useMemo(() => {
    return questions.filter((q) => {
      const done = mastery[q.id] ?? Boolean(q.mastered);
      if (filter === 'open') return !done;
      if (filter === 'done') return done;
      return true;
    });
  }, [questions, filter, mastery]);

  const doneCount = questions.filter((q) => mastery[q.id] ?? q.mastered).length;

  return (
    <div>
      <div className="card flex flex-col gap-5 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <RubberSegment
            items={filters}
            value={filter}
            onChange={(v) => setFilter(v)}
            size="md"
            aria-label="按掌握状态筛选"
            trackColor="rgb(var(--page))"
            thumbColor="rgb(var(--surface))"
            textColor="rgb(var(--ink-muted))"
            activeTextColor="rgb(var(--ink))"
          />
          <div className="flex items-center gap-3 text-[13px] text-ink-muted">
            <SquishSwitch
              checked={showAnswer}
              onChange={setShowAnswer}
              label="显示答案解析"
              width={62}
              height={32}
              radius={16}
              trackColor="rgb(var(--page))"
              trackOnColor="rgb(var(--accent))"
              thumbColor="#ffffff"
              thumbOnColor="#ffffff"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-line pt-4 sm:max-w-md">
          {[
            { label: '题目', value: questions.length },
            { label: '已掌握', value: doneCount },
            { label: '错题', value: questions.length - doneCount },
          ].map((s) => (
            <div key={s.label} className="px-1">
              <p className="text-xl font-semibold tracking-tight text-ink">{s.value}</p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        {questions.length === 0 ? (
          <div className="space-y-8">
            <EmptyState
              icon="quiz"
              title="题库还没有题目"
              description="先把课堂练习与月考题录进来，标记掌握状态后，错题本会自动生成。"
              file="content/quiz/"
              sample={`{
  id: 'q-001',
  subjectId: 'math',
  stem: '已知一次函数 y = 2x - 3，求它与 x 轴的交点。',
  answer: '(1.5, 0)',
  difficulty: 1,
  mastered: false,
  source: '课本例题',
}`}
            />

            <div>
              <div className="mb-3 flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-faint">
                  交互示例
                </span>
                <span className="h-px flex-1 bg-line" />
              </div>
              <QuestionCard
                question={sampleQuestion}
                index={0}
                sample
                mastered={Boolean(mastery[sampleQuestion.id])}
                onMasteredChange={(next) =>
                  setMastery((prev) => ({ ...prev, [sampleQuestion.id]: next }))
                }
                showAnswer={showAnswer}
              />
              <p className="mt-3 text-center font-mono text-[10px] tracking-wider text-ink-faint">
                这只是一张示例卡片，用来演示「显示解析」与「标记掌握」的交互
              </p>
            </div>
          </div>
        ) : list.length === 0 ? (
          <EmptyState compact icon="check" title="这个筛选下没有题目" description="换个筛选条件看看。" />
        ) : (
          <div className="space-y-3">
            {list.map((q, i) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={i}
                mastered={Boolean(mastery[q.id] ?? q.mastered)}
                onMasteredChange={(next) => setMastery((prev) => ({ ...prev, [q.id]: next }))}
                showAnswer={showAnswer}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default QuizBrowser;
