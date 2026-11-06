'use client';

import GradientASCII from '@/components/reactbits/GradientASCII';
import { useThemeMode } from '@/components/site/useThemeMode';

const PALETTE = {
  dark: ['#123a8c', '#2f6bff', '#5eead4', '#0a84ff'],
  light: ['#dce9ff', '#ffffff', '#b9dcff', '#60a5fa'],
};

/**
 * 首页专用背景：GradientASCII 固定在视口，向下渐隐，
 * 只在首页渲染；其它页面仍用 layout 里的柔和光晕。
 */
export default function HomeBackground() {
  const mode = useThemeMode();
  const dark = mode === 'dark';

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        opacity: dark ? 0.45 : 0.34,
        maskImage: 'linear-gradient(to bottom, #000 0%, #000 40%, rgba(0,0,0,0.5) 74%, transparent 96%)',
        WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 40%, rgba(0,0,0,0.5) 74%, transparent 96%)',
      }}
    >
      <GradientASCII
        colors={dark ? PALETTE.dark : PALETTE.light}
        shape="horizon"
        characters=" =+xX0S8#@"
        cellSize={20}
        density={0.7}
        glyphOpacity={dark ? 0.5 : 0.3}
        gradientOpacity={dark ? 0.85 : 0.6}
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
