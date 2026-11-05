import type { ReactNode } from 'react';
import Icon, { type IconName } from './Icon';

type EmptyStateProps = {
  icon?: IconName;
  title: string;
  description: string;
  /** 数据该写在哪里，展示成等宽小字 */
  file?: string;
  /** 示例条目（注释形态），帮助第一次填充 */
  sample?: string;
  action?: ReactNode;
  compact?: boolean;
};

/**
 * 统一的空状态：内容还没填时，页面也不至于像坏掉。
 * 浅色版本：白卡 + 虚线边框 + 极淡点阵，图标用 accent 底色，无发光。
 */
export function EmptyState({
  icon = 'sparkle',
  title,
  description,
  file,
  sample,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-card border border-dashed border-line bg-surface ${
        compact ? 'px-6 py-10' : 'px-6 py-16 sm:px-10 sm:py-20'
      }`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 dot-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]"
      />

      <div className="relative flex flex-col items-center text-center">
        <span className="grid h-14 w-14 place-items-center rounded-[18px] bg-accent-soft text-accent">
          <Icon name={icon} size={24} />
        </span>

        <h3 className="mt-6 text-[16px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
        <p className="mt-2 max-w-md text-[14px] leading-relaxed text-ink-muted">{description}</p>

        {file ? (
          <p className="mt-5 rounded-pill border border-line bg-elevated px-3.5 py-1.5 font-mono text-[11px] text-ink-muted">
            在 <span className="text-accent">{file}</span> 里添加第一条
          </p>
        ) : null}

        {sample ? (
          <pre className="mt-5 w-full max-w-lg overflow-x-auto rounded-xl border border-line bg-elevated p-4 text-left font-mono text-[11px] leading-relaxed text-ink-muted">
            <code>{sample}</code>
          </pre>
        ) : null}

        {action ? <div className="mt-7">{action}</div> : null}
      </div>
    </div>
  );
}

export default EmptyState;
