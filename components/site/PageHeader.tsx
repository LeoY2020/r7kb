import type { ReactNode } from 'react';
import ShinyText from '@/components/reactbits/ShinyText';
import Reveal from './Reveal';

type PageHeaderProps = {
  latin: string;
  title: string;
  description: string;
  /** 右侧统计或操作区 */
  aside?: ReactNode;
  children?: ReactNode;
};

export function PageHeader({ latin, title, description, aside, children }: PageHeaderProps) {
  return (
    <header className="relative overflow-hidden border-b border-line pb-12 pt-32 sm:pt-36">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 mesh-soft opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
      />
      {/* 顶部彩色发丝线 */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent"
      />

      <div className="container-page">
        <Reveal>
          <p className="eyebrow">
            <ShinyText
              text={latin}
              speed={5}
              trigger="view"
              color="var(--ink-faint)"
              shineColor="var(--accent)"
            />
          </p>
          <div className="mt-4 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-[clamp(1.9rem,3.6vw,2.9rem)] font-semibold leading-[1.12] tracking-[-0.025em] text-ink">
                {title}
              </h1>
              <p className="lede mt-4 max-w-xl">{description}</p>
            </div>
            {/* aside 的白色卡片由调用方自带（四个子页均已是 .card 等价样式），这里只做布局，避免双层卡片 */}
            {aside ? <div className="shrink-0">{aside}</div> : null}
          </div>
        </Reveal>
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </header>
  );
}

export default PageHeader;
