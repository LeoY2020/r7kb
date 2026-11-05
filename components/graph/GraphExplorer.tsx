'use client';

import { useMemo, useState } from 'react';
import RubberSegment from '@/components/reactbits-micro/RubberSegment';
import GraphCanvas from '@/components/graph/GraphCanvas';
import Icon from '@/components/site/Icon';
import type { Concept, Subject } from '@/lib/types';

const levelOptions = [
  { value: 'all', label: '全部层级' },
  { value: '1', label: '基础' },
  { value: '2', label: '进阶' },
  { value: '3', label: '拓展' },
];

const levelName: Record<number, string> = { 1: '基础', 2: '进阶', 3: '拓展' };
const levelColor: Record<number, string> = { 1: '#0071e3', 2: '#5e5ce6', 3: '#30b0c7' };

type GraphExplorerProps = {
  concepts: Concept[];
  subjects: Subject[];
};

export function GraphExplorer({ concepts, subjects }: GraphExplorerProps) {
  const [level, setLevel] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => concepts.find((c) => c.id === selectedId) ?? null,
    [concepts, selectedId]
  );

  const visibleCount =
    level === 'all' ? concepts.length : concepts.filter((c) => c.level === Number(level)).length;

  return (
    <div>
      <div className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <RubberSegment
          items={levelOptions}
          value={level}
          onChange={setLevel}
          size="md"
          aria-label="按层级筛选概念"
          trackColor="#eeeef0"
          thumbColor="#ffffff"
          textColor="#6e6e73"
          activeTextColor="#1d1d1f"
        />
        <div className="flex items-center gap-4 font-mono text-[11px] tracking-wide text-ink-faint">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" />基础
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-iris" />进阶
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-mint" />拓展
          </span>
          <span className="text-ink-faint">|</span>
          <span>{visibleCount} 个概念</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="relative overflow-hidden rounded-card border border-line bg-surface">
          <div className="pointer-events-none absolute inset-0 dot-grid opacity-40" />
          <div className="relative p-4 sm:p-6">
            <GraphCanvas
              concepts={concepts}
              subjects={subjects}
              selectedId={selectedId}
              onSelect={setSelectedId}
              levelFilter={level === 'all' ? null : Number(level)}
            />
          </div>
          <div className="flex items-center justify-between border-t border-line px-4 py-3 font-mono text-[10px] tracking-wider text-ink-faint">
            <span>DIRECTED GRAPH · {concepts.length} NODES</span>
            <span className="hidden sm:inline">点击节点查看概念详情</span>
          </div>
        </div>

        <aside className="space-y-4">
          {selected ? (
            <div className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">
                    {levelName[selected.level ?? 1]} · {selected.subjectId}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold tracking-tight text-ink">{selected.label}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="rounded-full p-1 text-ink-faint transition-colors hover:text-ink"
                  aria-label="关闭详情"
                >
                  <Icon name="close" size={15} />
                </button>
              </div>
              {selected.summary ? (
                <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">{selected.summary}</p>
              ) : null}
              <div className="mt-5">
                <p className="eyebrow">前置概念</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(selected.prerequisites ?? []).length > 0 ? (
                    (selected.prerequisites ?? []).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSelectedId(p)}
                        className="rounded-pill border border-line bg-elevated px-2.5 py-1 font-mono text-[11px] text-ink-muted transition-colors hover:border-accent/40 hover:text-accent"
                      >
                        {p}
                      </button>
                    ))
                  ) : (
                    <span className="text-[13px] text-ink-faint">无（起点概念）</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-5">
              <p className="eyebrow">怎么添加概念</p>
              <ol className="mt-4 space-y-4">
                {[
                  { t: '先在 content/graph/subjects/ 建学科', d: '每门学科一个 Markdown，写 id 与颜色。' },
                  { t: '再登记概念节点', d: '写 label、summary、level。' },
                  { t: '用 prerequisites 连边', d: '填前置概念的 id，图谱会自动画箭头。' },
                ].map((s, i) => (
                  <li key={s.t} className="flex gap-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border border-line bg-elevated font-mono text-[10px] text-accent">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-[13px] text-ink">{s.t}</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-5 rounded-xl border border-line bg-page p-3 font-mono text-[11px] leading-relaxed text-ink-muted">
                <span className="text-ink-faint">{'{'}</span>
                <br />
                &nbsp;&nbsp;id: <span className="text-accent">&apos;linear-function&apos;</span>,
                <br />
                &nbsp;&nbsp;label: <span className="text-accent">&apos;一次函数&apos;</span>,
                <br />
                &nbsp;&nbsp;prerequisites: [<span className="text-accent">&apos;coordinates&apos;</span>],
                <br />
                <span className="text-ink-faint">{'}'}</span>
              </div>
            </div>
          )}

          <div className="card p-5">
            <p className="text-[15px] font-medium text-ink">为什么用有向图？</p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
              先修的箭头指向后学的概念。复习时沿箭头倒推，就知道自己卡在哪一步，而不是把整章重看一遍。
            </p>
            <p className="mt-4 font-mono text-[10px] tracking-wider text-ink-faint">
              {subjects.length === 0
                ? '提示：图谱必须是无环的（概念 A 不能绕回自己）'
                : `${subjects.length} 个学科已建立`}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default GraphExplorer;
