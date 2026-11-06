import Link from 'next/link';
import Hero from '@/components/home/Hero';
import MicroShowcase from '@/components/home/MicroShowcase';
import HomeCta from '@/components/home/HomeCta';
import HomeBackground from '@/components/home/HomeBackground';
import SpotlightCard from '@/components/reactbits/SpotlightCard';
import Reveal from '@/components/site/Reveal';
import SectionHeading from '@/components/site/SectionHeading';
import Icon from '@/components/site/Icon';
import { modules, steps } from '@/data/site';
import { getStats } from '@/lib/content';

export default function HomePage() {
  const stats = getStats();
  const total = stats.concepts + stats.questions + stats.resources + stats.faqs;

  return (
    <>
      <HomeBackground />
      <Hero />

      {/* 四个入口 */}
      <section className="section container-page">
        <Reveal>
          <SectionHeading
            eyebrow="六个入口"
            title="一条线索，六个入口"
            description="图谱给关系，知识库给依据与延伸，题库给检验，错题本给复盘，资料库给原件，FAQ 给解释。六条线最后指向同一件事：把这一学期学明白。"
            action={<span className="pill">已收录 {total} 条</span>}
          />
        </Reveal>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m, i) => (
            <Reveal key={m.href} delay={i * 60}>
              <Link href={m.href} className="block h-full">
                <SpotlightCard
                  theme="auto"
                  spotlightColor="rgb(var(--accent) / 0.12)"
                  className="!rounded-card h-full border border-line !bg-surface !p-7 !shadow-soft transition-all duration-300 ease-apple hover:-translate-y-0.5 hover:!shadow-lift"
                >
                  <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-[14px] border border-line bg-page text-accent">
                        <Icon name={m.icon} size={19} />
                      </span>
                      <span className="text-[12px] text-ink-faint">{m.index}</span>
                    </div>

                    <h3 className="mt-7 text-[19px] font-semibold tracking-tight text-ink">
                      {m.title}
                    </h3>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-ink-faint">
                      {m.latin}
                    </p>
                    <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">{m.description}</p>

                    <div className="mt-8 flex items-center justify-between border-t border-line pt-4">
                      <span className="text-[12px] text-ink-faint">{m.hint}</span>
                      <span className="inline-flex items-center gap-1 text-[13px] font-medium text-accent">
                        进入
                        <Icon name="arrow" size={14} />
                      </span>
                    </div>
                  </div>
                </SpotlightCard>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 三步上手 */}
      <section className="section container-page">
        <Reveal>
          <SectionHeading
            eyebrow="怎么填"
            title="内容空着，位置已经留好"
            description="填内容不需要碰组件。按顺序改数据源，刷新页面就会自己长出来。"
          />
        </Reveal>

        <div className="mt-12 grid gap-3 md:grid-cols-3">
          {steps.map((step, i) => (
            <Reveal key={step.index} delay={i * 70}>
              <div className="card h-full p-7">
                <span className="text-[12px] font-medium text-accent">{step.index}</span>
                <p className="mt-5 text-[16px] font-medium text-ink">{step.title}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{step.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Micro 交互预览 */}
      <section className="section container-page">
        <Reveal>
          <SectionHeading
            eyebrow="React Bits Micro"
            title="小动效，决定手感"
            description="下面这些交互现在就能点。内容填满后，它们会分别出现在筛选、标记、收藏和状态提示里。"
          />
        </Reveal>
        <Reveal delay={60}>
          <div className="mt-12">
            <MicroShowcase />
          </div>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="container-page pb-24">
        <Reveal>
          <HomeCta />
        </Reveal>
      </section>
    </>
  );
}