'use client';

import { useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

/** ThemeToggle 切换主题时广播的事件名 */
export const THEME_CHANGE_EVENT = 'class-kb-theme-change';

/**
 * 读取当前明暗主题，并跟随主题切换 / 其它标签页的 localStorage 变化。
 * 首屏默认 light，挂载后立即同步，避免把 SSR 结果写死成某一种主题。
 */
export function useThemeMode(): ThemeMode {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof document === 'undefined') return 'light';
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    const sync = () => {
      setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
    };
    sync();

    const onCustom = (event: Event) => {
      const detail = (event as CustomEvent<ThemeMode>).detail;
      if (detail === 'dark' || detail === 'light') setTheme(detail);
      else sync();
    };
    window.addEventListener(THEME_CHANGE_EVENT, onCustom);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== 'class-kb-theme') return;
      sync();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return theme;
}

export default useThemeMode;
