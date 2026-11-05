'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import Icon from '@/components/site/Icon';
import type { VaultTreeNode } from '@/lib/vault';

type VaultSidebarProps = {
  root?: { slug: string; title: string };
  nodes: VaultTreeNode[];
};

function TreeNodes({ nodes, depth = 0 }: { nodes: VaultTreeNode[]; depth?: number }) {
  const pathname = usePathname();

  return (
    <div className={depth > 0 ? 'ml-2 border-l border-line pl-2.5' : ''}>
      {nodes.map((node) => {
        const href = node.slug ? `/knowledge/${node.slug}/` : undefined;
        const active = href ? pathname === href || pathname === href.replace(/\/$/, '') : false;

        if (node.type === 'dir') {
          return (
            <div key={node.relPath} className="py-0.5">
              {href ? (
                <Link
                  href={href}
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold transition-colors ${
                    active
                      ? 'bg-accent-soft text-accent'
                      : 'text-ink hover:bg-ink/[0.04]'
                  }`}
                >
                  <Icon name="book" size={13} className="shrink-0 opacity-70" />
                  {node.title}
                </Link>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-1.5 text-[13px] font-semibold text-ink-muted">
                  <Icon name="book" size={13} className="shrink-0 opacity-70" />
                  {node.title}
                </div>
              )}
              {node.children.length > 0 ? <TreeNodes nodes={node.children} depth={depth + 1} /> : null}
            </div>
          );
        }

        return (
          <Link
            key={node.relPath}
            href={href ?? '#'}
            className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-[13px] leading-snug transition-colors ${
              active
                ? 'bg-accent-soft font-medium text-accent'
                : 'text-ink-muted hover:bg-ink/[0.04] hover:text-ink'
            }`}
          >
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-faint/70" />
            {node.title}
          </Link>
        );
      })}
    </div>
  );
}

/** 知识库目录树：目录层级高于笔记，缩进表达父子关系 */
export function VaultSidebar({ root, nodes }: VaultSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="flex items-center justify-between gap-2 lg:block">
        <p className="eyebrow">Vault</p>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-3 py-1.5 text-[12px] font-medium text-ink-muted lg:hidden"
          aria-expanded={open}
        >
          <Icon name="menu" size={13} />
          目录
        </button>
      </div>

      <nav
        className={`mt-3 rounded-card border border-line bg-surface/70 p-3 shadow-soft lg:block ${
          open ? 'block' : 'hidden'
        }`}
        aria-label="知识库目录"
      >
        {root ? (
          <Link
            href={`/knowledge/${root.slug}/`}
            className="mb-2 flex items-center gap-1.5 rounded-lg bg-accent-soft/60 px-2 py-2 text-[13px] font-semibold text-accent transition-colors hover:bg-accent-soft"
          >
            <Icon name="knowledge" size={14} />
            {root.title}
          </Link>
        ) : null}
        <TreeNodes nodes={nodes} />
        <div className="mt-3 border-t border-line pt-3">
          <Link
            href="/knowledge/tags/"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-ink-muted transition-colors hover:bg-ink/[0.04] hover:text-ink"
          >
            <Icon name="tag" size={13} />
            按标签浏览
          </Link>
        </div>
      </nav>
    </aside>
  );
}

export default VaultSidebar;
