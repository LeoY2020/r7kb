import type { Metadata } from 'next';
import Link from 'next/link';
import CountUp from '@/components/reactbits/CountUp';
import SpotlightCard from '@/components/reactbits/SpotlightCard';
import PageHeader from '@/components/site/PageHeader';
import EmptyState from '@/components/site/EmptyState';
import Accordion from '@/components/site/Accordion';
import Reveal from '@/components/site/Reveal';
import Icon from '@/components/site/Icon';
import { getFaqs } from '@/lib/content';

export const metadata: Metadata = {
  title: '常见问题',
  description: '班级里反复被问的问题，集中在这里回答：作业格式、考试范围、复习方法。',
};

const tips = [
  {
    index: '01',
    title: '同题只收一次',
    text: '同一个问题被问第二遍时，就把回答搬进来，下次直接发链接。',
    icon: 'check' as const,
  },
  {
    index: '02',
    title: '回答写成可执行的动作',
    text: '少写「注意一下」，多写「周五 20:00 前交到学习委员处」。',
    icon: 'arrow' as const,
  },
  {
    index: '03',
    title: '挂上分类',
    text: '按「作业 / 考试 / 方法 / 活动」分目录，问题一多也不会乱。',
    icon: 'book' as const,
  },
];

export default function FaqPage() {
  const faqs = getFaqs();

  return (
    <>
      <PageHeader
        latin="FAQ · 常见问题"
        title="重复的问题，只回答一次"
        description="把班级里反复出现的疑问收拢到一处。写清楚一次，之后每个人都少问一次、少等一次。"
        aside={
          <div className="flex items-center gap-6 rounded-card border border-line bg-surface px-5 py-4 shadow-soft">
            <div>
              <p className="eyebrow">已收录</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">
                <CountUp to={faqs.length} from={0} duration={1.2} startWhen />
                <span className="ml-1 text-xs font-normal text-ink-faint">条</span>
              </p>
            </div>
            <div className="h-8 w-px bg-line" />
            <p className="max-w-[10rem] text-[13px] leading-relaxed text-ink-muted">
              内容为空，先按下面的结构占好位置。
            </p>
          </div>
        }
      />

      <section className="container-page py-14 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <Reveal>
            {faqs.length > 0 ? (
              <Accordion items={faqs} />
            ) : (
              <EmptyState
                icon="faq"
                title="还没有问答"
                description="FAQ 的价值在于「一次写好，反复使用」。在 content/faq/ 里按分类建 Markdown 文件，从最近班会里被问最多的三个问题开始最省力。"
                file="content/faq/"
                sample={`{
  id: 'faq-001',
  question: '错题本该怎么用才有效？',
  answer: '每道错题只记三件事：错因、正确思路、同类题一道。',
  category: '方法',
}`}
              />
            )}
          </Reveal>

          <Reveal delay={80}>
            <div className="sticky top-24 space-y-4">
              <SpotlightCard
                theme="light"
                spotlightColor="rgb(var(--accent) / 0.12)"
                className="!rounded-card border border-line !bg-surface !p-6 !shadow-soft"
              >
                <p className="eyebrow">整理原则</p>
                <ul className="mt-5 space-y-5">
                  {tips.map((tip) => (
                    <li key={tip.index} className="flex gap-3.5">
                      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-elevated text-accent">
                        <Icon name={tip.icon} size={15} />
                      </span>
                      <div>
                        <p className="text-[15px] font-medium text-ink">{tip.title}</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{tip.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </SpotlightCard>

              <div className="card-quiet p-6">
                <p className="text-[15px] font-medium text-ink">问题还没答案？</p>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                  先在图谱里找到对应的概念，多数疑问其实卡在前置知识上。
                </p>
                <Link
                  href="/graph/"
                  className="btn-quiet mt-4"
                >
                  去学习图谱
                  <Icon name="arrowUpRight" size={14} />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}