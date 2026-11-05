import type { Metadata } from 'next';
import TagBrowser from '@/components/knowledge/TagBrowser';
import { getVaultTags } from '@/lib/vault';

export const metadata: Metadata = {
  title: '标签浏览',
  description: '按 #标签 浏览知识库笔记，与 Obsidian 标签习惯保持一致。',
};

export default function KnowledgeTagsPage() {
  const tags = getVaultTags();

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="eyebrow">TAGS · 标签</p>
        <h1 className="mt-2 text-[clamp(1.6rem,2.8vw,2.2rem)] font-semibold tracking-tight text-ink">
          按标签浏览
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-muted">
          正文里的 #标签 与 Obsidian 写法一致，点击即可筛选。标签只改变浏览视图，不改变章节关联。
        </p>
      </header>
      <div className="mt-6">
        <TagBrowser tags={tags} />
      </div>
    </div>
  );
}
