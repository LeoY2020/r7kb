import type { Metadata } from 'next';
import Link from 'next/link';
import CountUp from '@/components/reactbits/CountUp';
import SpotlightCard from '@/components/reactbits/SpotlightCard';
import Icon from '@/components/site/Icon';
import NoteContent from '@/components/knowledge/NoteContent';
import {
  buildWikiResolver,
  getChapterOrder,
  getChapterRootSlug,
  getNoteBySlug,
  getVaultConfig,
  getVaultStats,
  getVaultTags,
} from '@/lib/vault';
import { parseMarkdown } from '@/lib/markdown';

const config = getVaultConfig();

export const metadata: Metadata = {
  title: config.title,
  description: config.description,
};

export default function KnowledgeHomePage() {
  const rootSlug = getChapterRootSlug() ?? 'itb-index';
  const rootNote = getNoteBySlug(rootSlug);
  const stats = getVaultStats();
  const chapters = getChapterOrder().filter((item) => item.slug !== 'itb-book');
  const tags = getVaultTags().filter((item) => item.notes.length > 0).slice(0, 12);
  const blocks = rootNote ? parseMarkdown(rootNote.body, buildWikiResolver()) : [];

  return (
    <div>
      <header className="relative overflow-hidden rounded-panel border border-line bg-surface px-6 py-9 shadow-soft sm:px-9 sm:py-11">
        <div className="pointer-events-none absolute inset-0 -z-0 mesh-soft opacity-60" />
        <p className="eyebrow relative">VAULT · 知识库</p>
        <h1 className="relative mt-3 text-[clamp(1.9rem,3.4vw,2.7rem)] font-semibold tracking-tight text-ink">
          {config.title}
        </h1>
        <p className="relative mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
          {config.description}
        </p>

        <div className="relative mt-7 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-line pt-5">
          {[
            { label: '笔记', value: stats.notes, unit: '篇' },
            { label: '章节', value: stats.chapters, unit: '章' },
            { label: '标签', value: stats.tags, unit: '个' },
          ].map((item) => (
            <div key={item.label}>
              <p className="eyebrow">{item.label}</p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-ink">
                <CountUp to={item.value} from={0} duration={1.2} startWhen />
                <span className="ml-1 text-xs font-normal text-ink-faint">{item.unit}</span>
              </p>
            </div>
          ))}
          {stats.latest ? (
            <p className="text-[12px] text-ink-faint">最近更新 {stats.latest}</p>
          ) : null}
        </div>
      </header>

      {rootNote ? (
        <section className="mt-8 rounded-panel border border-line bg-surface px-5 py-7 shadow-soft sm:px-8 sm:py-9">
          <NoteContent
            blocks={blocks}
            source={rootNote.title}
            slug={rootNote.slug}
          />
        </section>
      ) : null}

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Chapters</p>
            <h2 className="mt-1.5 text-[19px] font-semibold tracking-tight text-ink">章节目录</h2>
          </div>
          <Link href="/knowledge/tags/" className="btn-quiet text-[13px]">
            标签视图
            <Icon name="arrow" size={13} />
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {chapters.map((chapter) => {
            const note = getNoteBySlug(chapter.slug);
            return (
              <Link
                key={chapter.slug}
                href={note ? `/knowledge/${note.slug}/` : '/knowledge/'}
                className="block h-full"
              >
                <SpotlightCard
                  theme="auto"
                  spotlightColor="rgb(var(--accent) / 0.14)"
                  className="!rounded-card flex h-full flex-col border border-line !bg-surface !p-5 !shadow-soft transition-all duration-300 ease-apple hover:-translate-y-0.5 hover:!shadow-lift"
                >
                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">
                    Chapter {chapter.order}
                  </span>
                  <p className="mt-1.5 text-[16px] font-semibold text-ink">{chapter.title}</p>
                  {note?.description ? (
                    <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-muted">
                      {note.description}
                    </p>
                  ) : null}
                  <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-accent">
                    打开章节
                    <Icon name="arrow" size={12} />
                  </span>
                </SpotlightCard>
              </Link>
            );
          })}
        </div>
      </section>

      {tags.length > 0 ? (
        <section className="mt-8">
          <p className="eyebrow">Tags</p>
          <h2 className="mt-1.5 text-[19px] font-semibold tracking-tight text-ink">常用标签</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((item) => (
              <Link
                key={item.tag}
                href={`/knowledge/tags/?tag=${encodeURIComponent(item.tag)}`}
                className="pill transition-colors hover:border-accent/40 hover:text-accent"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: item.color ?? 'rgb(var(--accent))' }}
                />
                #{item.tag}
                <span className="text-ink-faint">{item.notes.length}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
