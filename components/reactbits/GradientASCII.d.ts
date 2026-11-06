import type { CSSProperties, ReactElement } from 'react';

export type GradientAsciiShape = 'horizon' | 'pinch' | 'rise' | 'eclipse';
export type GradientAsciiClickEffect = 'wave' | 'burst' | 'none';

export interface GradientASCIIProps {
  colors?: string[];
  shape?: GradientAsciiShape;
  characters?: string;
  cellSize?: number;
  density?: number;
  glyphOpacity?: number;
  gradientOpacity?: number;
  glow?: number;
  depthOfField?: number;
  flicker?: number;
  softness?: number;
  scale?: number;
  flow?: number;
  speed?: number;
  grain?: number;
  variation?: number;
  mouseInteraction?: boolean;
  scrambleRadius?: number;
  clickEffect?: GradientAsciiClickEffect;
  intro?: boolean;
  lightMode?: boolean;
  fontFamily?: string;
  dpr?: number;
  className?: string;
  style?: CSSProperties;
}

export default function GradientASCII(props: GradientASCIIProps): ReactElement | null;
