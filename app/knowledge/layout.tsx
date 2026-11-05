import type { ReactNode } from 'react';
import VaultSidebar from '@/components/knowledge/VaultSidebar';
import { getVaultTree } from '@/lib/vault';

/**
 * 知识库布局：左侧 Obsidian 风格目录树，右侧笔记正文。
 * 目录与笔记的父子关系同 Obsidian：父目录层级更高，子目录网点缩进。
 */
export default function KnowledgeLayout({ children }: { children: ReactNode }) {
  const tree = getVaultTree();

  return (
    <div className="container-page pb-24 pt-28 sm:pt-32">
      <div className="grid gap-8 lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-12">
        <VaultSidebar
          root={tree.root ? { slug: tree.root.slug, title: tree.root.title } : undefined}
          nodes={tree.children}
        />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
