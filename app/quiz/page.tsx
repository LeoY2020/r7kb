import type { Metadata } from 'next';
import Link from 'next/link';
import CountUp from '@/components/reactbits/CountUp';
import SpotlightCard from '@/components/reactbits/SpotlightCard';
import PageHeader from '@/components/site/PageHeader';
import QuizBrowser from '@/components/quiz/QuizBrowser';
import Reveal from '@/components/site/Reveal';
import Icon from '@/components/site/Icon';
import { getQuestions, getSubjects } from '@/lib/content';

export const metadata: Metadata = {
  title: '题库',
  description: '按学科与掌握程度筛题，错题单独归入错题本，复习先看最该看的那几道。',
};

export default function QuizPage() {
  const questions = getQuestions();
  const subjects = getSubjects();

  return (
    <>
      <PageHeader
        latin="QUIZ · 题库"
        title="刷题不怕多，怕的是不知道错在哪"
        description="题目按学科与难度归档。做错的题可以一键收进错题本，错题本存在你自己的浏览器里，随时可以导出。"
        aside={
          <div className="flex items-center gap-6 rounded-card border border-line bg-surface px-5 py-4 shadow-soft">
            <div>
              <p className="eyebrow">题库</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">
                <CountUp to={questions.length} from={0} duration={1.2} startWhen />
                <span className="ml-1 text-xs font-normal text-ink-faint">题</span>
              </p>
            </div>
            <div className="h-8 w-px bg-line" />
            <p className="max-w-[10rem] text-[13px] leading-relaxed text-ink-muted">
              {subjects.length > 0 ? `${subjects.length} 个学科已建立` : '学科尚未建立'}
            </p>
          </div>
        }
      />

      <section className="container-page py-14 sm:py-20">
        <Reveal>
          <QuizBrowser questions={questions} />
        </Reveal>
      </section>

      <section className="container-page pb-20 sm:pb-28">
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/mistakes/" className="block h-full">
            <SpotlightCard
              theme="auto"
              spotlightColor="rgb(var(--rose) / 0.14)"
              className="!rounded-card group flex h-full flex-col border border-line !bg-surface !p-6 !shadow-soft transition-all duration-300 ease-apple hover:-translate-y-0.5 hover:!shadow-lift"
            >
              <Icon name="notebook" size={20} className="text-rose" />
              <p className="mt-4 text-[15px] font-medium text-ink">把错题收进本子</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                知识库里的题目块可以一键加入错题本，也可以自己录一道；数据存在浏览器里，可导入导出 JSON。
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent">
                打开错题本 <Icon name="arrowUpRight" size={13} />
              </span>
            </SpotlightCard>
          </Link>
          <Link href="/knowledge/" className="block h-full">
            <SpotlightCard
              theme="auto"
              spotlightColor="rgb(var(--accent) / 0.14)"
              className="!rounded-card group flex h-full flex-col border border-line !bg-surface !p-6 !shadow-soft transition-all duration-300 ease-apple hover:-translate-y-0.5 hover:!shadow-lift"
            >
              <Icon name="knowledge" size={20} className="text-accent" />
              <p className="mt-4 text-[15px] font-medium text-ink">题目出处找知识库</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                智能电子书按章节组织，配合原文与章节关联一起看，比单看解析更省时间。
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent">
                打开知识库 <Icon name="arrowUpRight" size={13} />
              </span>
            </SpotlightCard>
          </Link>
        </div>
      </section>
    </>
  );
}
