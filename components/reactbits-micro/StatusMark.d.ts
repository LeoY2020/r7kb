import type { CSSProperties, FC, ReactNode } from 'react';

export interface StatusMarkProps {
  status?: 'pending' | 'running' | 'done' | 'failed' | 'cancelled';
  progress?: number;
  label?: ReactNode;
  color?: string;
  doneColor?: string;
  errorColor?: string;
  size?: number;
  strokeWidth?: number;
  dashes?: number;
  fontSize?: number;
  spinDuration?: number;
  arcLength?: number;
  drawDuration?: number;
  fillOpacity?: number;
  strike?: boolean;
  strikeDelay?: number;
  className?: string;
  style?: CSSProperties;
}

declare const StatusMark: FC<StatusMarkProps>;
export default StatusMark;
