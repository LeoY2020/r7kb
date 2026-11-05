'use client';

import Link from 'next/link';
import BlurText from '@/components/reactbits/BlurText';
import StarBorder from '@/components/reactbits/StarBorder';
import Icon from '@/components/site/Icon';
import { useThemeMode } from '@/components/site/useThemeMode';

/**
 * 首页底部行动区。
 * StarBorder 的颜色走 canvas，无法解析 CSS 变量，所以这里根据当前主题取具体色值。
 */
export function HomeCta() {
  const theme = useThemeMode();
  const dark = theme === 'dark';
  const palette = dark
    ? {
        color: '#0a84ff',
        trailColor: '#8a88ff',
        backgroundColor: '#161619',
        textColor: '#f5f5f7',
        borderColor: 'rgba(255,255,255,0.10)',
      }
    : {
        color: '#0071e3',
        trailColor: '#5e5ce6',
        backgroundColor: '#ffffff',
        textColor: '#1d1d1f',
        borderColor: 'rgba(0,0,0,0.08)',
      };

  return (
    <div className="card relative overflow-hidden rounded-panel px-6 py-16 text-center sm:px-12 sm:py-20">
      <div className="pointer-events-none absolute inset-0 mesh-soft opacity-70" />
      <p className="relative eyebrow">Start here</p>
      <div className="relative mt-4 flex justify-center">
        <BlurText
          text="先把第一个概念放进图谱"
          animateBy="words"
          direction="bottom"
          delay={70}
          color="rgb(var(--ink))"
          className="justify-center text-[clamp(1.7rem,3.2vw,2.6rem)] font-semibold tracking-tight"
        />
      </div>
      <p className="relative mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-ink-muted">
        一个概念加一条前置关系，就是这张网的第一根线。剩下的，交给一个学期慢慢长出来。
      </p>
      <div className="relative mt-9 flex flex-wrap items-center justify-center gap-3">
        <StarBorder
          as={Link}
          href="/graph/"
          theme={dark ? 'dark' : 'light'}
          color={palette.color}
          trailColor={palette.trailColor}
          backgroundColor={palette.backgroundColor}
          textColor={palette.textColor}
          borderColor={palette.borderColor}
          radius={999}
          thickness={1}
          className="px-6 py-2.5 text-[15px] font-medium"
        >
          去学习图谱
        </StarBorder>
        <a href="https://reactbits.dev/" target="_blank" rel="noreferrer" className="btn-quiet">
          React Bits 官网
          <Icon name="arrowUpRight" size={14} />
        </a>
      </div>
    </div>
  );
}

export default HomeCta;
