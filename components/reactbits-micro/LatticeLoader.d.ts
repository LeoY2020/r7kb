import type { CSSProperties, FC } from 'react';

export interface LatticeLoaderPattern {
  cells: (number | null)[];
  loop?: number;
  scale?: number;
  lit?: number;
}

export interface LatticeLoaderProps {
  label?: string;
  doneLabel?: string;
  errorLabel?: string;
  status?: 'working' | 'done' | 'error';
  pattern?: string | LatticeLoaderPattern;
  grid?: 3 | 4;
  shape?: 'round' | 'square';
  color?: string;
  doneColor?: string;
  errorColor?: string;
  cellSize?: number;
  gap?: number;
  fontSize?: number;
  step?: number;
  idleOpacity?: number;
  glow?: boolean;
  glowColor?: string;
  showTimer?: boolean;
  elapsed?: number;
  className?: string;
  style?: CSSProperties;
}

declare const LatticeLoader: FC<LatticeLoaderProps>;
export default LatticeLoader;
