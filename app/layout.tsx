import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import Navbar from '@/components/site/Navbar';
import Footer from '@/components/site/Footer';
import { site } from '@/data/site';

export const metadata: Metadata = {
  title: {
    default: `${site.name} · 把知识点连成网`,
    template: `%s · ${site.name}`,
  },
  description:
    '一个属于班级的知识库：学习图谱、智能电子书知识库、题库与错题本、资料库、常见问题，把一学期的知识收拢到一处。',
  keywords: ['班级知识库', '学习图谱', '错题本', '智能电子书', '知识管理'],
  authors: [{ name: site.maintainer || site.name }],
};

export const viewport: Viewport = {
  themeColor: '#f5f5f7',
  width: 'device-width',
  initialScale: 1,
};

/** 首屏前决定明暗主题，避免闪白 */
const themeInit = `(function(){try{var k='class-kb-theme';var s=localStorage.getItem(k);var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=s?s==='dark':m;var e=document.documentElement;e.dataset.theme=d?'dark':'light';e.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="relative min-h-screen font-sans antialiased">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInit}
        </Script>

        {/* 顶部柔和光晕：只做一层，保持页面干净 */}
        <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[70vh] mesh-soft" />

        <a
          href="#main"
          className="sr-only rounded-pill bg-surface px-4 py-2 text-sm text-ink shadow-soft focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60]"
        >
          跳到主内容
        </a>

        <Navbar />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
