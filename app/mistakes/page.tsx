import type { Metadata } from 'next';
import Link from 'next/link';
import PageHeader from '@/components/site/PageHeader';
import MistakesBrowser from '@/components/mistakes/MistakesBrowser';
import { MistakesProvider } from '@/components/mistakes/MistakesProvider';
import Icon from '@/components/site/Icon';

export const metadata: Metadata = {
  title: '错题本',
  description: '在前端手动添加错题，或从知识库题目块一键收藏；数据保存在浏览器 localStorage，可导入导出 JSON。',
};

export default function MistakesPage() {
  return (
    <>
      <PageHeader
        latin="MISTAKES · 错题本"
        title="错题不抄第二遍，只复习真正不会的"
        description="错题本完全存在你自己的浏览器里：可以手动录入，也可以从知识库的题目块一键加入，随时导出 JSON 备份或换设备继续用。"
        aside={
          <div className="rounded-card border border-line bg-surface px-5 py-4 shadow-soft">
            <p className="eyebrow">存储位置</p>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-muted">
              <Icon name="notebook" size={14} />
              localStorage · 仅本机
            </p>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/knowledge/" className="pill transition-colors hover:border-accent/40 hover:text-accent">
            <Icon name="knowledge" size={13} />
            去知识库收藏题目
          </Link>
          <Link href="/quiz/" className="pill transition-colors hover:border-accent/40 hover:text-accent">
            <Icon name="quiz" size={13} />
            去题库刷题
          </Link>
        </div>
      </PageHeader>

      <section className="container-page py-12 sm:py-16">
        <MistakesProvider>
          <MistakesBrowser />
        </MistakesProvider>
      </section>
    </>
  );
}
