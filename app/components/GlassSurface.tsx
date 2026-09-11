'use client';

import type { CSSProperties, ReactNode } from 'react';
import './GlassSurface.css';

type GlassSurfaceStyle = CSSProperties & {
  '--glass-displace': string;
  '--glass-distortion-scale': string;
  '--glass-red-offset': string;
  '--glass-green-offset': string;
  '--glass-blue-offset': string;
  '--glass-brightness': string;
  '--glass-edge-inset': string;
  '--glass-glow': string;
  '--glass-blur': string;
};

export interface GlassSurfaceProps {
  children?: ReactNode;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  className?: string;
  displace?: number;
  distortionScale?: number;
  redOffset?: number;
  greenOffset?: number;
  blueOffset?: number;
  brightness?: number;
  opacity?: number;
  mixBlendMode?: CSSProperties['mixBlendMode'];
  frameOnly?: boolean;
}

export default function GlassSurface({
  children,
  width = 300,
  height = 200,
  borderRadius = 24,
  className = '',
  displace = 15,
  distortionScale = 270,
  redOffset = 50,
  greenOffset = 50,
  blueOffset = 50,
  brightness = 85,
  opacity = 0.8,
  mixBlendMode = 'screen',
  frameOnly = false,
}: GlassSurfaceProps) {
  const style: GlassSurfaceStyle = {
    width,
    height,
    borderRadius,
    opacity,
    mixBlendMode,
    '--glass-displace': `${displace}px`,
    '--glass-distortion-scale': `${distortionScale}px`,
    '--glass-red-offset': `${redOffset / 50}px`,
    '--glass-green-offset': `${greenOffset / -50}px`,
    '--glass-blue-offset': `${blueOffset / 50}px`,
    '--glass-brightness': `${brightness}%`,
    '--glass-edge-inset': `${displace * -.08}px`,
    '--glass-glow': `${displace * .55}px`,
    '--glass-blur': `${displace * .035}px`,
  };

  return (
    <span
      className={`glass-surface${frameOnly ? ' glass-surface--frame' : ''} ${className}`.trim()}
      style={style}
      aria-hidden={frameOnly ? true : undefined}
    >
      {frameOnly ? null : <span className="glass-surface__content">{children}</span>}
    </span>
  );
}
