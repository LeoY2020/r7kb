'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from '@/components/site/Icon';
import type { VaultTag } from '@/lib/vault';

/** 标签浏览：URL 查询参数 ?tag= 与页面状态双向同步 */
export function TagBrowser({ tags }: { tags: VaultTag[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const read = () => {
      const raw = new URLSearchParams(window.location.search).get('tag');
      setActive(raw);
    };
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);

  const select = (tag: string | null) => {
    setActive(tag);
    const url = tag
      ? `/knowledge/tags/?tag=${encodeURIComponent(tag)}`
      : '/knowledge/tags/';
    window.history.replaceState(null, '', url);
  };

  const current = tags.find((item) => item.tag === active);
  const visible = current ? [current] : tags.filter((item) => item.notes.length > 0);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => select(null)}
          className={`pill transition-colors ${
            active ? 'hover:border-accent/40 hover:text-accent' : 'border-accent/40 bg-accent-soft text-accent'
          }`}
        >
          全部标签
          <span className="text-ink-faint">{tags.filter((item) => item.notes.length > 0).length}</span>
        </button>
        {tags.map((item) => (
          <button
            key={item.tag}
            type="button"
            onClick={() => select(item.tag)}
            className={`pill transition-colors ${
              active === item.tag
                ? 'border-accent/50 bg-accent-soft text-accent'
                : 'hover:border-accent/40 hover:text-accent'
            }`}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: item.color ?? 'rgb(var(--accent))' }}
            />
            #{item.tag}
            <span className="text-ink-faint">{item.notes.length}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-6">
        {visible.map((item) => (
          <section key={item.tag} className="rounded-card border border-line bg-surface p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.color ?? 'rgb(var(--accent))' }}
                />
                #{item.tag}
              </h2>
              <span className="text-[12px] text-ink-faint">{item.notes.length} 篇笔记</span>
            </div>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {item.notes.map((note) => (
                <li key={note.slug ?? note.title}>
                  <Link
                    href={note.href ?? '/knowledge/'}
                    className="group flex items-center gap-2 rounded-xl border border-line bg-page/60 px-3 py-2.5 text-[13px] text-ink transition-colors hover:border-accent/40 hover:text-accent"
                  >
                    <Icon name="file" size={13} className="shrink-0 text-ink-faint group-hover:text-accent" />
                    {note.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-8 rounded-card border border-dashed border-line px-5 py-10 text-center text-[13px] text-ink-muted">
          这个标签下还没有笔记。
        </p>
      ) : null}
    </div>
  );
}

export default TagBrowser;
