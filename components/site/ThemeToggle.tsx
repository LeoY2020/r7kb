'use client';

import { useEffect, useState } from 'react';
import Icon from './Icon';
import { THEME_CHANGE_EVENT } from './useThemeMode';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'class-kb-theme';

function paintMeta(theme: ThemeMode) {
  const color = theme === 'dark' ? '#09090b' : '#f5f5f7';
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', color);
}

export function applyTheme(theme: ThemeMode, persist = true) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle('dark', theme === 'dark');
  paintMeta(theme);
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* 隐私模式下忽略 */
    }
  }
  try {
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }));
  } catch {
    /* SSR 或极旧环境下忽略 */
  }
}

function readTheme(): ThemeMode {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/**
 * 明暗主题切换。首屏主题由 app/layout.tsx 里的 beforeInteractive 脚本决定，避免闪烁。
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(readTheme());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next: ThemeMode = event.newValue === 'dark' ? 'dark' : 'light';
      applyTheme(next, false);
      setTheme(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [mounted]);

  const next: ThemeMode = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={() => {
        applyTheme(next);
        setTheme(next);
      }}
      className={`grid h-9 w-9 place-items-center rounded-pill border border-line bg-surface/70 text-ink transition-colors duration-200 ease-apple hover:bg-surface ${className}`}
      aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
      title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
    >
      <Icon name={mounted && theme === 'dark' ? 'sun' : 'moon'} size={17} />
    </button>
  );
}

export default ThemeToggle;
