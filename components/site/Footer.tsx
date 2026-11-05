import Link from 'next/link';
import { mainNav, site } from '@/data/site';
import { getConcepts, getFaqs, getQuestions, getResources } from '@/lib/content';

const contentFiles = [
  { path: 'content/graph/', label: '学科与概念（目录层级 = 图谱层级）' },
  { path: 'content/knowledge/', label: '智能电子书 Obsidian 目录 + 章节关联配置' },
  { path: 'content/quiz/', label: '题库 Markdown' },
  { path: 'content/library/', label: '资料条目；原文件放 public/resources/' },
  { path: 'content/faq/', label: '常见问题 Markdown' },
  { path: 'data/site.ts', label: '班级信息 / 导航 / 模块文案' },
];

export function Footer() {
  const classLine = [site.grade, site.className].filter(Boolean).join(' · ');
  const concepts = getConcepts();
  const questions = getQuestions();
  const resources = getResources();
  const faqs = getFaqs();

  return (
    <footer className="mt-24 border-t border-line">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-[11px] bg-accent-soft text-accent">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 3 20 7.5v9L12 21 4 16.5v-9L12 3Z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 21v-9l8-4.5" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
              </svg>
            </span>
            <div>
              <p className="text-[13.5px] font-semibold tracking-[-0.01em] text-ink">{site.name}</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.24em] text-ink-faint">
                {site.latinName}
              </p>
            </div>
          </div>
          <p className="mt-5 max-w-sm text-[13px] leading-relaxed text-ink-muted">
            {site.slogan}
          </p>
          <p className="mt-3 font-mono text-[11px] text-ink-faint">
            {classLine || '班级信息待填写'}
            {site.term ? ` · ${site.term}` : ''}
          </p>
        </div>

        <div>
          <p className="eyebrow">Sitemap</p>
          <ul className="mt-4 space-y-2.5 text-[13px]">
            <li>
              <Link
                className="text-ink-muted transition-colors duration-200 ease-apple hover:text-ink"
                href="/"
              >
                首页
              </Link>
            </li>
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  className="text-ink-muted transition-colors duration-200 ease-apple hover:text-ink"
                  href={item.href}
                >
                  {item.label}
                  <span className="ml-2 font-mono text-[10px] tracking-[0.16em] text-ink-faint">
                    {item.latin}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="eyebrow">Where to edit</p>
          <ul className="mt-4 space-y-3">
            {contentFiles.map((f) => (
              <li key={f.path}>
                <p className="font-mono text-[11px] text-ink">{f.path}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-faint">{f.label}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-5 text-[12px] text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}
            {site.maintainer ? ` · 维护：${site.maintainer}` : ''}
          </p>
          <p className="font-mono tracking-wide">
            内容 {concepts.length} 概念 / {questions.length} 题 / {resources.length} 资料 /{' '}
            {faqs.length} 问答
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
