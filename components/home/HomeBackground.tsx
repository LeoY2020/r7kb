'use client';

import GradientASCII from '@/components/reactbits/GradientASCII';
import { useThemeMode } from '@/components/site/useThemeMode';

const PALETTE = {
  dark: ['#123a8c', '#2f6bff', '#5eead4', '#0a84ff'],
  light: ['#1e3a8a', '#2563eb', '#0ea5e9', '#93c5fd'],
};

/**
 * 首页专用背景：GradientASCII 固定在视口，向下渐隐，
 * 只在首页渲染；其它页面仍用 layout 里的柔和光晕。
 * 同时叠一层 CSS 渐变兜底，WebGL2 不可用时也有背景氛围。
 */
export default function HomeBackground() {
  const mode = useThemeMode();
  const dark = mode === 'dark';

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        opacity: dark ? 0.62 : 0.55,
        maskImage: 'linear-gradient(to bottom, #000 0%, #000 40%, rgba(0,0,0,0.5) 74%, transparent 96%)',
        WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 40%, rgba(0,0,0,0.5) 74%, transparent 96%)',
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: dark
            ? 'radial-gradient(ellipse 90% 62% at 50% 0%, rgba(47,107,255,0.55) 0%, rgba(18,58,140,0.34) 46%, rgba(9,9,11,0) 80%), radial-gradient(ellipse 55% 38% at 82% 26%, rgba(94,234,212,0.26) 0%, rgba(9,9,11,0) 70%)'
            : 'radial-gradient(ellipse 90% 62% at 50% 0%, rgba(147,197,253,0.8) 0%, rgba(219,234,254,0.6) 46%, rgba(255,255,255,0) 80%), radial-gradient(ellipse 55% 38% at 82% 26%, rgba(56,189,248,0.32) 0%, rgba(255,255,255,0) 70%)',
        }}
      />
      <GradientASCII
        colors={dark ? PALETTE.dark : PALETTE.light}
        shape="horizon"
        characters=" =+xX0S8#@"
        cellSize={20}
        density={0.7}
        glyphOpacity={dark ? 0.55 : 0.42}
        gradientOpacity={dark ? 0.85 : 0.7}
        glow={0.22}
        flicker={0.14}
        softness={0.55}
        grain={0.06}
        flow={0.45}
        speed={0.4}
        mouseInteraction={false}
        clickEffect="none"
        lightMode={!dark}
        className="h-full w-full"
      />
    </div>
  );
}
