import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Icon from '@/components/site/Icon';
import NoteContent from '@/components/knowledge/NoteContent';
import { parseMarkdown } from '@/lib/markdown';
import {
  buildWikiResolver,
  getBacklinks,
  getBreadcrumbs,
  getChapterLinksForNote,
  getNoteBySlug,
  getNoteSiblings,
  getTagColor,
  getVaultNotes,
} from '@/lib/vault';

type NotePageProps = {
  params: { slug: string };
};

export function generateStaticParams() {
  return getVaultNotes().map((note) => ({ slug: note.slug }));
}

export function generateMetadata({ params }: NotePageProps): Metadata {
  const note = getNoteBySlug(params.slug);
  if (!note) return {};
  return {
    title: note.title,
    description: note.description,
  };
}

const relationLabels = {
  prerequisites: '先读这些',
  next: '接下来读',
  related: '相关章节',
} as const;

export default function KnowledgeNotePage({ params }: NotePageProps) {
  const note = getNoteBySlug(params.slug);
  if (!note) notFound();

  const blocks = parseMarkdown(note.body, buildWikiResolver());
  const crumbs = getBreadcrumbs(note.slug);
  const chapterLinks = getChapterLinksForNote(note);
  const backlinks = getBacklinks(note.slug);
  const siblings = getNoteSiblings(note.slug);

  const relations = (Object.keys(relationLabels) as Array<keyof typeof relationLabels>)
    .map((key) => ({ key, label: relationLabels[key], items: chapterLinks[key] }))
    .filter((group) => group.items.length > 0);

  return (
    <article>
      <nav aria-label="面包屑" className="flex flex-wrap items-center gap-1.5 text-[12px] text-ink-faint">
        <Link href="/knowledge/" className="transition-colors hover:text-accent">
          知识库
        </Link>
        {crumbs.map((crumb) => (
          <span key={crumb.slug} className="flex items-center gap-1.5">
            <Icon name="chevronRight" size={11} />
            <Link href={crumb.href ?? '/knowledge/'} className="transition-colors hover:text-accent">
              {crumb.title}
            </Link>
          </span>
        ))}
      </nav>

      <header className="mt-4 border-b border-line pb-6">
        <p className="eyebrow">NOTE · {note.slug}</p>
        <h1 className="mt-2 text-[clamp(1.7rem,3.1vw,2.4rem)] font-semibold tracking-tight text-ink">
          {note.title}
        </h1>
        {note.description ? (
          <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-muted">{note.description}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {note.tags.map((tag) => (
            <Link
              key={tag}
              href={`/knowledge/tags/?tag=${encodeURIComponent(tag)}`}
              className="pill transition-colors hover:border-accent/40 hover:text-accent"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: getTagColor(tag) ?? 'rgb(var(--accent))' }}
              />
              #{tag}
            </Link>
          ))}
          {note.updated ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-faint">
              <Icon name="calendar" size={12} />
              {note.updated}
            </span>
          ) : null}
        </div>
      </header>

      <div className="mt-7">
        <NoteContent blocks={blocks} source={note.title} slug={note.slug} />
      </div>

      {relations.length > 0 ? (
        <section className="mt-10 rounded-card border border-line bg-elevated p-5">
          <p className="eyebrow">Chapter links</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {relations.map((group) => (
              <div key={group.key}>
                <p className="text-[12px] font-medium text-ink-muted">{group.label}</p>
                <ul className="mt-2 space-y-1.5">
                  {group.items.map((item) => (
                    <li key={`${group.key}-${item.title}`}>
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="inline-flex items-center gap-1 text-[13px] text-accent transition-colors hover:text-accent-hover"
                        >
                          <Icon name="link" size={12} />
                          {item.title}
                        </Link>
                      ) : (
                        <span className="text-[13px] text-ink-faint">{item.title}（未创建）</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {backlinks.length > 0 ? (
        <section className="mt-4 rounded-card border border-line bg-surface p-5">
          <p className="eyebrow">Backlinks · 反向链接</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {backlinks.map((item) => (
              <Link key={item.slug ?? item.title} href={item.href ?? '/knowledge/'} className="pill hover:text-accent">
                <Icon name="arrow" size={12} className="rotate-180" />
                {item.title}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {siblings.prev || siblings.next ? (
        <nav className="mt-8 flex items-stretch justify-between gap-3 border-t border-line pt-5 text-[13px]">
          {siblings.prev ? (
            <Link
              href={`/knowledge/${siblings.prev.slug}/`}
              className="group flex max-w-[48%] flex-col gap-0.5 rounded-xl px-2 py-1.5 transition-colors hover:text-accent"
            >
              <span className="text-[11px] text-ink-faint">上一篇</span>
              <span className="font-medium text-ink group-hover:text-accent">{siblings.prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {siblings.next ? (
            <Link
              href={`/knowledge/${siblings.next.slug}/`}
              className="group ml-auto flex max-w-[48%] flex-col gap-0.5 rounded-xl px-2 py-1.5 text-right transition-colors hover:text-accent"
            >
              <span className="text-[11px] text-ink-faint">下一篇</span>
              <span className="font-medium text-ink group-hover:text-accent">{siblings.next.title}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </article>
  );
}
