import type { Metadata } from 'next';
import CountUp from '@/components/reactbits/CountUp';
import PageHeader from '@/components/site/PageHeader';
import GraphExplorer from '@/components/graph/GraphExplorer';
import Reveal from '@/components/site/Reveal';
import { getConcepts, getSubjects } from '@/lib/content';

export const metadata: Metadata = {
  title: '学习图谱',
  description: '把班级知识库里的概念按先修关系连成一张有向图，看清每个知识点从哪来、往哪去。',
};

export default function GraphPage() {
  const concepts = getConcepts();
  const subjects = getSubjects();
  const levelCount = new Set(concepts.map((c) => c.level ?? 1)).size;

  return (
    <>
      <PageHeader
        latin="GRAPH · 学习图谱"
        title="每个知识点，都有它的上一站"
        description="概念按先修关系连成一张有向图。沿着箭头走，就是一条从基础到拓展的学习路径；倒着走，能快速定位自己卡在哪一步。"
        aside={
          <div className="flex items-center gap-6 rounded-card border border-line bg-surface px-5 py-4 shadow-soft">
            <div>
              <p className="eyebrow">概念</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">
                <CountUp to={concepts.length} from={0} duration={1.2} startWhen />
                <span className="ml-1 text-xs font-normal text-ink-faint">个</span>
              </p>
            </div>
            <div className="h-8 w-px bg-line" />
            <div>
              <p className="eyebrow">层级</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">
                <CountUp to={levelCount} from={0} duration={1.2} startWhen />
                <span className="ml-1 text-xs font-normal text-ink-faint">层</span>
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
                  t: '一个概念一个文件',
                  d: '写在 content/graph/concepts/ 里，目录层级（基础/进阶/拓展）会自动成为图谱层级。',
                },
                {
                  t: '一条边 = 一条依赖',
                  d: '只有当「不先学 A 就学不懂 B」时才写 prerequisites，弱相关别连。',
                },
                {
                  t: '必须无环',
                  d: '如果绕一圈回到自己，说明拆得不够细，先把概念拆开。',
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
