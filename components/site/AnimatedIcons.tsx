'use client';

import { MorphIcon } from 'morphicons/react';

/**
 * 状态图标：形状在两种状态之间做 spring morph，而不是直接换一张图。
 * 几何与 Icon.tsx 里的 sun / moon / menu / close 一致（24 格 stroke 1.6），
 * 所以 morph 结束时和静态图标完全对齐。
 */

/** 太阳：外圈 + 8 条光芒（circle 转成等价的 arc 写法） */
const SUN =
  'M12 7.8a4.2 4.2 0 1 1 0 8.4a4.2 4.2 0 1 1 0-8.4' +
  'M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2' +
  'M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6';

/** 月亮 */
const MOON = 'M20 14.5A8.2 8.2 0 0 1 9.5 4a8.2 8.2 0 1 0 10.5 10.5z';

const MENU = 'M4 7h16M4 12h16M4 17h16';
const CLOSE = 'M6 6l12 12M18 6 6 18';

export function ThemeIcon({ dark, size = 17 }: { dark: boolean; size?: number }) {
  return (
    <MorphIcon
      icon={dark ? SUN : MOON}
      spring="snappy"
      size={size}
      strokeWidth={1.6}
      reducedMotion="user"
    />
  );
}

export function MenuIcon({ open, size = 18 }: { open: boolean; size?: number }) {
  return (
    <MorphIcon
      icon={open ? CLOSE : MENU}
      spring="snappy"
      size={size}
      strokeWidth={1.6}
      reducedMotion="user"
    />
  );
}
