'use client';

import Particles from '@/components/reactbits/Particles';
import { useThemeMode } from '@/components/site/useThemeMode';

/**
 * 首屏粒子层：颜色跟随明暗主题。
 * 之前固定传入浅灰 `#c7c7cc` 且 `lightMode` 恒为 true，
 * 深色主题下会变成一整片由灰到黑的雾，看起来像背景没加载出来。
 */
export default function HeroParticles() {
  const mode = useThemeMode();
  const dark = mode === 'dark';

  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      <Particles
        particleColors={dark ? ['#0a84ff', '#5e5ce6', '#30b0c7'] : ['#0071e3', '#5e5ce6', '#30b0c7']}
        particleCount={80}
        particleSpread={14}
        speed={0.04}
        particleBaseSize={70}
        sizeRandomness={1.4}
        alphaParticles
        lightMode={!dark}
        disableRotation
        className="opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent_72%)]"
      />
    </div>
  );
}
