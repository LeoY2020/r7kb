'use client';

import GradientASCII from '@/components/reactbits/GradientASCII';
import { useThemeMode } from '@/components/site/useThemeMode';

const PALETTE = {
  dark: ['#123a8c', '#2f6bff', '#5eead4', '#0a84ff'],
  light: ['#1e3a8a', '#2563eb', '#0ea5e9', '#93c5fd'],
};

/**
 * 首页专用背景：官方 GradientASCII 绝对定位在页面顶部，
 * 随页面一起滚动；底部用遮罩渐隐，避免生硬截断。
 * 只在首页渲染，其它页面保持原样。
 * 另叠一层同风格 CSS 渐变，WebGL2 不可用时仍有背景氛围。
 */
export default function HomeBackground() {
  const mode = useThemeMode();
  const dark = mode === 'dark';

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[120vh] overflow-hidden"
      style={{
        opacity: dark ? 0.62 : 0.55,
        maskImage:
          'linear-gradient(to bottom, #000 0%, #000 58%, rgba(0,0,0,0.55) 82%, transparent 100%)',
        WebkitMaskImage:
          'linear-gradient(to bottom, #000 0%, #000 58%, rgba(0,0,0,0.55) 82%, transparent 100%)',
      }}
    >
      <div className="absolute inset-0 home-bg-fallback" />
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
