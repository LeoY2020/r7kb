'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import Icon from '@/components/site/Icon';
import BranchedMenu from '@/components/reactbits/BranchedMenu';
import type { BranchedMenuItem } from '@/components/reactbits/BranchedMenu';
import type { VaultTreeNode } from '@/lib/vault';

type VaultSidebarProps = {
  root?: { slug: string; title: string };
  nodes: VaultTreeNode[];
};

/** 把 vault 目录树压成两层分支菜单：章节为段，笔记为子项（value 为 slug） */
function toItems(nodes: VaultTreeNode[]): BranchedMenuItem[] {
  const collectFiles = (node: VaultTreeNode): { value: string; label: string }[] => {
    const files: { value: string; label: string }[] = [];

    for (const child of node.children) {
      if (child.type === 'note' && child.slug) {
        files.push({ value: child.slug, label: child.title });
      } else if (child.type === 'dir') {
        if (child.slug) files.push({ value: child.slug, label: child.title });
        files.push(...collectFiles(child));
      }
    }

    return files;
  };

  return nodes
    .filter((node) => node.type === 'dir')
    .map((node) => ({
      label: node.title,
      children: collectFiles(node),
    }));
}

/** 从 /knowledge/<slug>/ 里取出当前笔记 slug */
function currentSlug(pathname: string | null): string {
  if (!pathname) return '';
  const match = pathname.match(/^\/knowledge\/([^/]+)\/?$/);
  if (!match) return '';
  return decodeURIComponent(match[1]);
}

/** 知识库目录：Obsidian 式层级，用 ReactBits 官方 BranchedMenu 呈现分支 */
export function VaultSidebar({ root, nodes }: VaultSidebarProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const items = toItems(nodes);
  const active = currentSlug(pathname);
  const activeSection = items.findIndex((item) =>
    item.children?.some((child) => child.value === active),
  );

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

        <BranchedMenu
          items={items}
          defaultOpen={activeSection >= 0 ? activeSection : 0}
          defaultActive={active}
          onSelect={(value) => {
            router.push(`/knowledge/${value}/`);
            setOpen(false);
          }}
          color="rgb(var(--ink))"
          accentColor="rgb(var(--accent))"
          lineColor="rgb(var(--line))"
          width={208}
          rowHeight={30}
          indent={34}
          trunk={12}
          fontSize={13}
        />

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
