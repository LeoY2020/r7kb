import type { Metadata } from 'next';
import CountUp from '@/components/reactbits/CountUp';
import PageHeader from '@/components/site/PageHeader';
import GraphExplorer from '@/components/graph/GraphExplorer';
import Reveal from '@/components/site/Reveal';
import { getChapterGraph } from '@/lib/vault';

export const metadata: Metadata = {
  title: '学习图谱',
  description: '把知识库里的所有笔记画成一张关系图，章节按 chapter-links.json 的先修关系连边，其余笔记作为独立节点。',
};

export default function GraphPage() {
  const { concepts, subjects } = getChapterGraph();
  const linkCount = concepts.reduce(
    (sum, c) => sum + (c.prerequisites?.length ?? 0) + (c.related?.length ?? 0),
    0
  );

  return (
    <>
      <PageHeader
        latin="GRAPH · 学习图谱"
        title="每个章节，都有它的上一站"
        description="知识库里的所有笔记都会出现在图上。章节按 chapter-links.json 的先修关系连成有向图，还没设置关系的笔记也会单独占一个节点。"
        aside={
          <div className="flex items-center gap-6 rounded-card border border-line bg-surface px-5 py-4 shadow-soft">
            <div>
              <p className="eyebrow">笔记</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">
                <CountUp to={concepts.length} from={0} duration={1.2} startWhen />
                <span className="ml-1 text-xs font-normal text-ink-faint">个</span>
              </p>
            </div>
            <div className="h-8 w-px bg-line" />
            <div>
              <p className="eyebrow">关联</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">
                <CountUp to={linkCount} from={0} duration={1.2} startWhen />
                <span className="ml-1 text-xs font-normal text-ink-faint">条</span>
              </p>
            </div>
          </div>
        }
      />

      <section className="container-page py-14 sm:py-20">
        <Reveal>
          <GraphExplorer concepts={concepts} subjects={subjects} />
        </Reveal>
      </section>

      <section className="container-page pb-20 sm:pb-28">
        <Reveal>
          <div className="card p-6 sm:p-8">
            <p className="eyebrow">维护约定</p>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              {[
                {
                  t: '节点来自章节',
                  d: 'content/knowledge/ 里每个章节目录的 index.md 就是一个节点，标题与描述自动同步。',
                },
                {
                  t: '边写在 chapter-links.json',
                  d: '在 content/knowledge/_config/chapter-links.json 里写 prerequisites / next / related。',
                },
                {
                  t: '引用必须存在且无环',
                  d: '指向不存在的章节、或先修关系绕回自己，构建都会直接报错并指出位置。',
                },
              ].map((item) => (
                <div key={item.t}>
                  <p className="text-[15px] font-medium text-ink">{item.t}</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{item.d}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
