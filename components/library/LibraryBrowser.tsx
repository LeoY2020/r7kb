'use client';

import { useMemo, useState } from 'react';
import RubberSegment from '@/components/reactbits-micro/RubberSegment';
import EmptyState from '@/components/site/EmptyState';
import Icon from '@/components/site/Icon';
import Reveal from '@/components/site/Reveal';
import { resourceTypeLabel, subjectOf, type Resource, type ResourceType, type Subject } from '@/lib/types';

const typeOptions: { value: string; label: string }[] = [
  { value: 'all', label: '全部' },
  ...(Object.keys(resourceTypeLabel) as ResourceType[]).map((t) => ({
    value: t,
    label: resourceTypeLabel[t],
  })),
];

const typeGlyph: Record<ResourceType, string> = {
  pdf: 'PDF',
  slide: 'SLD',
  doc: 'DOC',
  video: 'MP4',
  link: 'URL',
};

export function LibraryBrowser({
  resources,
  subjects,
}: {
  resources: Resource[];
  subjects: Subject[];
}) {
  const [type, setType] = useState('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resources.filter((r) => {
      const matchType = type === 'all' || r.type === type;
      const matchQuery =
        !q ||
        r.title.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q) ||
        (subjectOf(subjects, r.subjectId)?.name ?? '').toLowerCase().includes(q);
      return matchType && matchQuery;
    });
  }, [type, query, resources, subjects]);

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <RubberSegment
          items={typeOptions}
          value={type}
          onChange={(v) => setType(v)}
          size="md"
          aria-label="按资料类型筛选"
          className="max-w-full"
          trackColor="rgb(var(--page))"
          thumbColor="rgb(var(--surface))"
          textColor="rgb(var(--ink-muted))"
          activeTextColor="rgb(var(--ink))"
        />

        <label className="group flex h-10 w-full items-center gap-2.5 rounded-pill border border-line bg-surface px-4 transition-colors focus-within:border-accent/40 lg:w-72">
          <Icon name="search" size={16} className="text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索标题、学科或说明"
            className="h-full w-full bg-transparent text-[13px] text-ink placeholder:text-ink-faint focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-ink-faint transition-colors hover:text-ink"
              aria-label="清空搜索"
            >
              <Icon name="close" size={14} />
            </button>
          ) : null}
        </label>
      </div>

      <div className="mt-3 flex items-center justify-between font-mono text-[11px] tracking-wide text-ink-faint">
        <span>
          {filtered.length} / {resources.length} 份资料
        </span>
        <span className="hidden sm:inline">{subjects.length} 个学科</span>
      </div>

      <div className="mt-8">
        {resources.length === 0 ? (
          <EmptyState
            icon="library"
            title="资料库还是空的"
            description="课件、讲义、复习提纲都可以放进来。文件本体放 public/resources/，条目登记在 content/library/。"
            file="content/library/"
            sample={`{
  id: 'r-001',
  title: '第一单元复习提纲',
  subjectId: 'math',
  type: 'pdf',
  href: '/resources/unit-1-review.pdf',
  size: '1.2 MB',
  updatedAt: '2026-03-01',
}`}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            compact
            icon="search"
            title="没有匹配的资料"
            description="换个类型或关键词试试。"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((r, i) => {
              const subject = subjectOf(subjects, r.subjectId);
              return (
                <Reveal key={r.id} delay={i * 40}>
                  <a
                    href={r.href}
                    className="card card-hover group relative flex h-full flex-col overflow-hidden p-5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-md border border-line bg-page px-2 py-1 font-mono text-[10px] tracking-widest text-ink-faint">
                        {typeGlyph[r.type]}
                      </span>
                      {subject ? (
                        <span className="font-mono text-[10px] tracking-wider" style={{ color: subject.color }}>
                          {subject.name}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-4 text-[15px] font-medium text-ink transition-colors group-hover:text-accent">
                      {r.title}
                    </h3>
                    {r.description ? (
                      <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-muted">
                        {r.description}
                      </p>
                    ) : null}
                    <div className="mt-auto flex items-center justify-between pt-5 font-mono text-[10px] tracking-wide text-ink-faint">
                      <span>{r.size ?? '—'}</span>
                      <span>{r.updatedAt ?? ''}</span>
                    </div>
                  </a>
                </Reveal>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default LibraryBrowser;
