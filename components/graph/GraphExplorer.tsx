'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import GraphCanvas from '@/components/graph/GraphCanvas';
import Icon from '@/components/site/Icon';
import type { Concept, Subject } from '@/lib/types';

type GraphExplorerProps = {
  concepts: Concept[];
  subjects: Subject[];
};

export function GraphExplorer({ concepts, subjects }: GraphExplorerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const byId = useMemo(() => new Map(concepts.map((c) => [c.id, c])), [concepts]);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;
  const edgeCount = useMemo(
    () => concepts.reduce((sum, c) => sum + (c.prerequisites?.length ?? 0) + (c.related?.length ?? 0), 0),
    [concepts]
  );

  return (
    <div>
      <div className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-4 font-mono text-[11px] tracking-wide text-ink-faint">
          <span className="flex items-center gap-1.5">
            <span className="h-px w-5 bg-ink/30" />前置
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-px w-5 border-t border-dashed border-accent/60" />相关
          </span>
          <span className="text-ink-faint">|</span>
          <span>
            {concepts.length} 个章节 · {edgeCount} 条关联
          </span>
        </div>
        <p className="font-mono text-[11px] tracking-wide text-ink-faint">
          数据源：content/knowledge/_config/chapter-links.json
        </p>
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
            />
          </div>
          <div className="flex items-center justify-between border-t border-line px-4 py-3 font-mono text-[10px] tracking-wider text-ink-faint">
            <span>CHAPTER GRAPH · {concepts.length} NODES</span>
            <span className="hidden sm:inline">点击节点查看章节详情</span>
          </div>
        </div>

        <aside className="space-y-4">
          {selected ? (
            <div className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">
                    {subjects.find((s) => s.id === selected.subjectId)?.name ?? selected.subjectId}
                    {selected.order ? ` · 第 ${selected.order} 站` : ''}
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
                <p className="eyebrow">前置章节</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(selected.prerequisites ?? []).length > 0 ? (
                    (selected.prerequisites ?? []).map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedId(id)}
                        className="rounded-pill border border-line bg-elevated px-2.5 py-1 font-mono text-[11px] text-ink-muted transition-colors hover:border-accent/40 hover:text-accent"
                      >
                        {byId.get(id)?.label ?? id}
                      </button>
                    ))
                  ) : (
                    <span className="text-[13px] text-ink-faint">无（起点章节）</span>
                  )}
                </div>
              </div>

              {(selected.related ?? []).length > 0 ? (
                <div className="mt-4">
                  <p className="eyebrow">相关章节</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(selected.related ?? []).map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedId(id)}
                        className="rounded-pill border border-dashed border-line bg-elevated px-2.5 py-1 font-mono text-[11px] text-ink-muted transition-colors hover:border-accent/40 hover:text-accent"
                      >
                        {byId.get(id)?.label ?? id}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {selected.href ? (
                <Link
                  href={selected.href}
                  className="mt-5 inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:text-accent-hover"
                >
                  打开这一章
                  <Icon name="arrow" size={14} />
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="card p-5">
              <p className="eyebrow">怎么维护这张图</p>
              <ol className="mt-4 space-y-4">
                {[
                  { t: '在知识库里建章节', d: '每个章节目录写一个 index.md，标题与 description 会自动成为节点。' },
                  { t: '在 chapter-links.json 连边', d: 'prerequisites 是前置，next 是下一章，related 会画成虚线。' },
                  { t: '构建期校验', d: '指向不存在的章节或绕成环，构建都会直接报错并指出位置。' },
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
                &nbsp;&nbsp;&quot;ch-02&quot;: <span className="text-ink-faint">{'{'}</span>
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;prerequisites: [<span className="text-accent">&apos;ch-01&apos;</span>],
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;next: [<span className="text-accent">&apos;ch-03&apos;</span>],
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;related: [<span className="text-accent">&apos;ch-04&apos;</span>]
                <br />
                &nbsp;&nbsp;<span className="text-ink-faint">{'}'}</span>
                <br />
                <span className="text-ink-faint">{'}'}</span>
              </div>
            </div>
          )}

          <div className="card p-5">
            <p className="text-[15px] font-medium text-ink">为什么按章节连？</p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
              先修的箭头指向后学的章节。复习时沿箭头倒推，就知道自己卡在哪一步，而不是把整章重看一遍。
            </p>
            <p className="mt-4 font-mono text-[10px] tracking-wider text-ink-faint">
              {subjects.length === 0
                ? '提示：图谱必须是无环的（章节不能绕回自己）'
                : `${subjects.length} 个知识库已接入`}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default GraphExplorer;
