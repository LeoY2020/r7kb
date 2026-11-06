'use client';

import Link from 'next/link';
import { useState } from 'react';
import Icon from '@/components/site/Icon';
import BranchedMenu, { type BranchedSection } from '@/components/reactbits-micro/BranchedMenu';
import type { VaultTreeNode } from '@/lib/vault';

type VaultSidebarProps = {
  root?: { slug: string; title: string };
  nodes: VaultTreeNode[];
};

/** 把 vault 目录树压成两层的分支菜单：章节为段，笔记为子项 */
function toSections(nodes: VaultTreeNode[]): BranchedSection[] {
  const collectFiles = (node: VaultTreeNode): { label: string; href: string }[] => {
    const files: { label: string; href: string }[] = [];

    for (const child of node.children) {
      if (child.type === 'note' && child.slug) {
        files.push({ label: child.title, href: `/knowledge/${child.slug}/` });
      } else if (child.type === 'dir') {
        if (child.slug) files.push({ label: child.title, href: `/knowledge/${child.slug}/` });
        files.push(...collectFiles(child));
      }
    }

    return files;
  };

  return nodes
    .filter((node) => node.type === 'dir')
    .map((node) => ({
      id: node.relPath,
      label: node.title,
      href: node.slug ? `/knowledge/${node.slug}/` : undefined,
      children: collectFiles(node),
    }));
}

/** 知识库目录：Obsidian 式层级，用 ReactBits BranchedMenu 呈现分支 */
export function VaultSidebar({ root, nodes }: VaultSidebarProps) {
  const [open, setOpen] = useState(false);
  const sections = toSections(nodes);

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

      <div
        className={`mt-3 rounded-card border border-line bg-surface/70 p-2.5 shadow-soft lg:block ${
          open ? 'block' : 'hidden'
        }`}
      >
        {root ? (
          <Link
            href={`/knowledge/${root.slug}/`}
            className="mb-1.5 flex items-center gap-1.5 rounded-lg bg-accent-soft/60 px-2 py-2 text-[13px] font-semibold text-accent transition-colors hover:bg-accent-soft"
          >
            <Icon name="knowledge" size={14} />
            {root.title}
          </Link>
        ) : null}

        <BranchedMenu sections={sections} rowHeight={30} indent={32} trunk={12} />

        <div className="mt-2 border-t border-line pt-2">
          <Link
            href="/knowledge/tags/"
            className="flex min-h-[30px] items-center gap-1.5 rounded-lg px-2 text-[13px] text-ink-muted transition-colors hover:bg-ink/[0.04] hover:text-ink"
          >
            <Icon name="tag" size={13} />
            按标签浏览
          </Link>
        </div>
      </div>
    </aside>
  );
}

export default VaultSidebar;
