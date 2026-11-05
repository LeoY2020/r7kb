'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { mainNav, site } from '@/data/site';
import Icon from './Icon';
import ThemeToggle from './ThemeToggle';

function isActive(pathname: string, href: string) {
  const base = href.replace(/\/$/, '');
  if (!base) return pathname === '/' || pathname === '';
  return pathname === base || pathname === `${base}/` || pathname.startsWith(`${base}/`);
}

export function Navbar() {
  const pathname = usePathname() || '/';
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="container-page pt-3 sm:pt-4">
        <div
          className={`glass relative flex h-[56px] items-center justify-between gap-3 rounded-pill border-line pl-3 pr-2 transition-[background-color,box-shadow] duration-500 ease-apple sm:h-[60px] sm:pl-4 sm:pr-3 ${
            scrolled || open ? 'shadow-lift' : ''
          }`}
          style={scrolled || open ? { background: 'var(--glass-bg)' } : undefined}
        >
          <Link href="/" className="group flex shrink-0 items-center gap-2.5" aria-label={site.name}>
            <span className="grid h-8 w-8 place-items-center rounded-[11px] bg-accent-soft text-accent transition-colors duration-200 ease-apple group-hover:bg-accent group-hover:text-white">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 3 20 7.5v9L12 21 4 16.5v-9L12 3Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path d="M12 21v-9l8-4.5" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
                <circle cx="12" cy="12" r="1.7" fill="currentColor" />
              </svg>
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[13px] font-semibold tracking-[-0.01em] text-ink">
                {site.name}
              </span>
              <span className="mt-1 hidden font-mono text-[9px] uppercase tracking-[0.22em] text-ink-faint sm:block">
                {site.latinName}
              </span>
            </span>
          </Link>

          <nav
            aria-label="主导航"
            className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex"
          >
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-pill px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-200 ease-apple xl:px-3 ${
                  isActive(pathname, item.href)
                    ? 'bg-accent-soft text-accent'
                    : 'text-ink-muted hover:bg-ink/[0.04] hover:text-ink'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />

            <Link href="/knowledge/" className="btn btn-primary hidden xl:inline-flex">
              进入知识库
              <Icon name="arrow" size={15} />
            </Link>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-pill border border-line bg-surface/70 text-ink transition-colors duration-200 ease-apple hover:bg-surface lg:hidden"
              aria-expanded={open}
              aria-label={open ? '关闭菜单' : '打开菜单'}
            >
              <Icon name={open ? 'close' : 'menu'} size={18} />
            </button>
          </div>
        </div>
      </div>

      {open ? (
        <div className="container-page lg:hidden">
          <div className="mt-2 overflow-hidden rounded-panel border border-line bg-surface p-2 shadow-lift">
            <nav aria-label="移动端导航" className="flex flex-col">
              {mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-[14px] px-3.5 py-3 text-[14px] transition-colors duration-200 ease-apple ${
                    isActive(pathname, item.href)
                      ? 'bg-accent-soft font-medium text-accent'
                      : 'text-ink-muted hover:bg-ink/[0.03] hover:text-ink'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="font-mono text-[10px] tracking-[0.18em] text-ink-faint">
                    {item.latin}
                  </span>
                </Link>
              ))}
              <div className="mx-3 my-2 h-px bg-ink/[0.06]" />
              <div className="flex items-center justify-between px-2 pb-1 pt-1">
                <span className="font-mono text-[10px] tracking-[0.18em] text-ink-faint">
                  APPEARANCE
                </span>
                <span className="text-[12px] text-ink-muted">明暗主题</span>
              </div>
              <Link href="/knowledge/" className="btn btn-primary mx-1 mb-1">
                进入知识库
                <Icon name="arrow" size={15} />
              </Link>
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export default Navbar;
