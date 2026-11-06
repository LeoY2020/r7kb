import type { FC, ReactElement, ReactNode } from 'react';

export interface WarmTooltipProps {
  content: ReactNode;
  shortcut?: ReactNode;
  children: ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  warmWindow?: number;
  surfaceColor?: string;
  inkColor?: string;
  size?: 'sm' | 'md' | 'lg';
  radius?: number;
  gap?: number;
  arrow?: boolean;
  popDuration?: number;
  popScale?: number;
  popBlur?: number;
  showFuse?: boolean;
  longPress?: number;
  disabled?: boolean;
  className?: string;
}

export interface WarmTooltipGroupProps {
  delay?: number;
  warmWindow?: number;
  travel?: number;
  lean?: number;
  onWarmChange?: (warm: boolean) => void;
  children?: ReactNode;
}

export declare const WarmTooltipGroup: FC<WarmTooltipGroupProps>;

declare const WarmTooltip: FC<WarmTooltipProps>;
export default WarmTooltip;
