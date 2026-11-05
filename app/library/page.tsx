import type { Metadata } from 'next';
import CountUp from '@/components/reactbits/CountUp';
import SpotlightCard from '@/components/reactbits/SpotlightCard';
import PageHeader from '@/components/site/PageHeader';
import LibraryBrowser from '@/components/library/LibraryBrowser';
import Reveal from '@/components/site/Reveal';
import Icon from '@/components/site/Icon';
import { getResources, getSubjects } from '@/lib/content';

export const metadata: Metadata = {
  title: '资料库',
  description: '班级课件、讲义与复习资料集中存放，一个入口找到本学期所有文件。',
};

const conventions = [
  {
    icon: 'book' as const,
    title: '文件放 public/resources/',
    text: '按「学期-学科-单元」建子目录，文件名不要用「最终版」「真的最终版」。',
  },
  {
    icon: 'file' as const,
    title: '条目写进 content/library/',
    text: '每份资料一个 Markdown 文件，frontmatter 里登记 href、类型与更新时间。',
  },
  {
    icon: 'download' as const,
    title: '只放能直接用的',
    text: '能直接下载、直接打印、直接背的资料优先，半成品放草稿区。',
  },
];

export default function LibraryPage() {
  const resources = getResources();
  const subjects = getSubjects();

  return (
    <>
      <PageHeader
        latin="LIBRARY · 资料库"
        title="一个入口，找到这学期的每一份资料"
        description="课件、讲义、复习提纲、真题……按类型与学科归档，不用再在群聊记录里翻二十页。"
        aside={
          <div className="flex items-center gap-6 rounded-card border border-line bg-surface px-5 py-4 shadow-soft">
            <div>
              <p className="eyebrow">资料</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">
                <CountUp to={resources.length} from={0} duration={1.2} startWhen />
                <span className="ml-1 text-xs font-normal text-ink-faint">份</span>
              </p>
            </div>
            <div className="h-8 w-px bg-line" />
            <p className="max-w-[10rem] text-[13px] leading-relaxed text-ink-muted">
              目录已就位，等待第一份文件归档。
            </p>
          </div>
        }
      />

      <section className="container-page py-14 sm:py-20">
        <LibraryBrowser resources={resources} subjects={subjects} />
      </section>

      <section className="container-page pb-20 sm:pb-28">
        <Reveal>
          <div className="grid gap-4 md:grid-cols-3">
            {conventions.map((c) => (
              <SpotlightCard
                key={c.title}
                theme="light"
                spotlightColor="rgb(var(--accent) / 0.14)"
                className="!rounded-card border border-line !bg-surface !p-5 !shadow-soft transition-all duration-300 ease-apple hover:-translate-y-0.5 hover:!shadow-lift"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-accent-soft text-accent">
                  <Icon name={c.icon} size={16} />
                </span>
                <p className="mt-4 text-[15px] font-medium text-ink">{c.title}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{c.text}</p>
              </SpotlightCard>
            ))}
          </div>
        </Reveal>
      </section>
    </>
  );
}
