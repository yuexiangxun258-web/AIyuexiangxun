'use client';

import { useEffect, useId, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import './FluidGlass.css';

type FluidMode = 'lens' | 'bar' | 'cube';

type FluidModeProps = {
  scale?: number;
  ior?: number;
  thickness?: number;
  roughness?: number;
  chromaticAberration?: number;
  anisotropy?: number;
};

type FluidGlassStyle = CSSProperties & {
  '--fluid-blur': string;
  '--fluid-edge': string;
  '--fluid-edge-glow': string;
  '--fluid-edge-shadow': string;
  '--fluid-edge-negative': string;
  '--fluid-shift': string;
  '--fluid-shift-negative': string;
  '--fluid-sheen': string;
  '--fluid-stretch': string;
  '--fluid-filter': string;
};

export interface FluidGlassProps extends FluidModeProps {
  children?: ReactNode;
  className?: string;
  mode?: FluidMode;
  lensProps?: FluidModeProps;
  barProps?: FluidModeProps;
  cubeProps?: FluidModeProps;
}

export default function FluidGlass({
  children,
  className = '',
  mode = 'lens',
  lensProps = {},
  barProps = {},
  cubeProps = {},
  ior,
  thickness,
  roughness,
  chromaticAberration,
  anisotropy,
}: FluidGlassProps) {
  const uniqueId = useId().replace(/:/g, '');
  const filterId = `fluid-refraction-${uniqueId}`;
  const containerRef = useRef<HTMLSpanElement>(null);
  const displacementImageRef = useRef<SVGFEImageElement>(null);
  const selectedProps = mode === 'bar' ? barProps : mode === 'cube' ? cubeProps : lensProps;
  const optics = {
    ior: ior ?? selectedProps.ior ?? 1.15,
    thickness: thickness ?? selectedProps.thickness ?? 5,
    roughness: roughness ?? selectedProps.roughness ?? 0,
    chromaticAberration: chromaticAberration ?? selectedProps.chromaticAberration ?? 0.1,
    anisotropy: anisotropy ?? selectedProps.anisotropy ?? 0.01,
  };
  const edge = Math.max(2, optics.thickness * 0.36);
  const shift = Math.max(1, optics.chromaticAberration * 15);
  const blur = 0.45 + optics.roughness * 2.75;
  const stretch = 1 + optics.anisotropy * 2.5;
  const distortion = optics.thickness * 2.2;
  const colorOffset = optics.chromaticAberration * 12;
  const style: FluidGlassStyle = {
    '--fluid-blur': `${blur}px`,
    '--fluid-edge': `${edge}px`,
    '--fluid-edge-glow': `${edge * 1.7}px`,
    '--fluid-edge-shadow': `${edge * 2}px`,
    '--fluid-edge-negative': `${edge * -1}px`,
    '--fluid-shift': `${shift}px`,
    '--fluid-shift-negative': `${shift * -1}px`,
    '--fluid-sheen': String(Math.min(0.72, 0.28 + (optics.ior - 1) * 0.3)),
    '--fluid-stretch': String(stretch),
    '--fluid-filter': `url(#${filterId})`,
  };

  useEffect(() => {
    const container = containerRef.current;
    const displacementImage = displacementImageRef.current;
    if (!container || !displacementImage) return;

    const updateMap = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const radius = Math.round(height / 2);
      const edgeSize = Math.max(6, Math.round(Math.min(width, height) * 0.2));
      const innerWidth = Math.max(1, width - edgeSize * 2);
      const innerHeight = Math.max(1, height - edgeSize * 2);
      const redGradientId = `fluid-red-${uniqueId}`;
      const blueGradientId = `fluid-blue-${uniqueId}`;
      const svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${redGradientId}" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="red"/></linearGradient><linearGradient id="${blueGradientId}" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="blue"/></linearGradient></defs><rect width="${width}" height="${height}" fill="black"/><rect width="${width}" height="${height}" rx="${radius}" fill="url(#${redGradientId})"/><rect width="${width}" height="${height}" rx="${radius}" fill="url(#${blueGradientId})" style="mix-blend-mode:screen"/><rect x="${edgeSize}" y="${edgeSize}" width="${innerWidth}" height="${innerHeight}" rx="${Math.max(1, radius - edgeSize)}" fill="hsl(0 0% 50% / .96)" style="filter:blur(3px)"/></svg>`;
      displacementImage.setAttribute('href', `data:image/svg+xml,${encodeURIComponent(svg)}`);
    };

    updateMap();
    const resizeObserver = new ResizeObserver(updateMap);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [uniqueId]);

  return (
    <span
      ref={containerRef}
      className={`fluid-glass fluid-glass--refractive fluid-glass--${mode} ${className}`.trim()}
      style={style}
      data-ior={optics.ior}
      data-thickness={optics.thickness}
      data-roughness={optics.roughness}
      data-chromatic-aberration={optics.chromaticAberration}
      data-anisotropy={optics.anisotropy}
      aria-hidden={children ? undefined : true}
    >
      <svg className="fluid-glass__filter" aria-hidden="true">
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB" x="-8%" y="-35%" width="116%" height="170%">
            <feImage ref={displacementImageRef} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale={distortion + colorOffset} xChannelSelector="R" yChannelSelector="G" result="dispRed" />
            <feColorMatrix in="dispRed" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale={distortion} xChannelSelector="R" yChannelSelector="G" result="dispGreen" />
            <feColorMatrix in="dispGreen" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale={distortion - colorOffset} xChannelSelector="R" yChannelSelector="G" result="dispBlue" />
            <feColorMatrix in="dispBlue" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue" />
            <feBlend in="red" in2="green" mode="screen" result="redGreen" />
            <feBlend in="redGreen" in2="blue" mode="screen" />
          </filter>
        </defs>
      </svg>
      <span className="fluid-glass__flow" aria-hidden="true" />
      {children ? <span className="fluid-glass__content">{children}</span> : null}
    </span>
  );
}
