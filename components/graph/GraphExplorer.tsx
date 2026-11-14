'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import GraphCanvas from '@/components/graph/GraphCanvas';
import GraphSettingsPanel from '@/components/graph/GraphSettingsPanel';
import {
  DEFAULT_GRAPH_SETTINGS,
  loadGraphSettings,
  saveGraphSettings,
  type GraphSettings,
} from '@/lib/graph-settings';
import type { Concept, Subject } from '@/lib/types';

type GraphExplorerProps = {
  concepts: Concept[];
  subjects: Subject[];
};

export function GraphExplorer({ concepts, subjects }: GraphExplorerProps) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<GraphSettings>(DEFAULT_GRAPH_SETTINGS);

  useEffect(() => {
    setSettings(loadGraphSettings());
  }, []);

  const updateSettings = (patch: Partial<GraphSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      saveGraphSettings(next);
      return next;
    });
  };

  const edgeCount = useMemo(
    () => concepts.reduce((sum, c) => sum + (c.prerequisites?.length ?? 0) + (c.related?.length ?? 0), 0),
    [concepts]
  );

  return (
    <div>
      <div className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] tracking-wide text-ink-faint">
          <span className="flex items-center gap-1.5">
            <span className="h-px w-5 bg-ink/30" />前置
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-px w-5 border-t border-dashed border-accent/60" />相关
          </span>
          <span className="text-ink-faint">|</span>
          <span>
            {concepts.length} 个笔记 · {edgeCount} 条关联
          </span>
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden font-mono text-[11px] tracking-wide text-ink-faint sm:block">
            拖动节点 · 滚轮缩放
          </p>
          <button
            type="button"
            onClick={() => setSettingsOpen((open) => !open)}
            className={`rounded-pill border px-3 py-1.5 font-mono text-[11px] transition-colors ${
              settingsOpen
                ? 'border-accent/50 bg-accent-soft text-accent'
                : 'border-line bg-elevated text-ink-muted hover:text-ink'
            }`}
          >
            图谱设置
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="relative overflow-hidden rounded-card border border-line bg-surface">
          <div className="pointer-events-none absolute inset-0 dot-grid opacity-40" />
          <div className="relative p-2 sm:p-3">
            <GraphCanvas
              concepts={concepts}
              subjects={subjects}
              onSelect={(id) => router.push(`/knowledge/${id}/`)}
              settings={settings}
            />
          </div>
          <div className="flex items-center justify-between border-t border-line px-4 py-3 font-mono text-[10px] tracking-wider text-ink-faint">
            <span>GRAPH VIEW · {concepts.length} NODES</span>
            <span className="hidden sm:inline">点击节点直接打开章节</span>
          </div>
        </div>

        <aside className="space-y-4">
          {settingsOpen ? (
            <GraphSettingsPanel
              settings={settings}
              onChange={updateSettings}
              onReset={() => {
                setSettings(DEFAULT_GRAPH_SETTINGS);
                saveGraphSettings(DEFAULT_GRAPH_SETTINGS);
              }}
              onClose={() => setSettingsOpen(false)}
            />
          ) : (
            <div className="card p-5">
              <p className="eyebrow">怎么维护这张图</p>
              <ol className="mt-4 space-y-4">
                {[
                  { t: '笔记存在就上墙', d: '知识库里任何一篇笔记都会成为节点；章节目录的 index.md 标题会自动作为节点名。' },
                  { t: '在 chapter-links.json 连边', d: 'prerequisites 是前置，next 是下一章，related 会画成虚线。' },
                  { t: '构建期校验', d: '指向不存在的章节或绕成环，构建都会直接报错并指出位置。' },
                ].map((step, index) => (
                  <li key={step.t} className="flex gap-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border border-line bg-elevated font-mono text-[10px] text-accent">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-[13px] text-ink">{step.t}</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">{step.d}</p>
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
