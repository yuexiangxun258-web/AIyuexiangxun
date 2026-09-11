'use client';

import { CSSProperties, ReactNode, useEffect } from 'react';

type CircularGalleryProps = {
  children: ReactNode;
  bend?: number;
  textColor?: string;
  borderRadius?: number;
  scrollEase?: number;
  fontUrl?: string;
  font?: string;
  className?: string;
};

type GalleryStyle = CSSProperties & {
  '--circular-gallery-bend': number;
  '--circular-gallery-text': string;
  '--circular-gallery-radius': string;
  '--circular-gallery-ease': string;
  '--circular-gallery-font': string;
};

export default function CircularGallery({
  children,
  bend = 0,
  textColor = '#ffffff',
  borderRadius = 0.08,
  scrollEase = 0.02,
  fontUrl,
  font = 'bold 30px Orbitron, Inter, sans-serif',
  className = '',
}: CircularGalleryProps) {
  useEffect(() => {
    if (!fontUrl) return;
    const existing = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))
      .find((link) => link.href === fontUrl);
    if (existing) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontUrl;
    link.dataset.circularGalleryFont = 'true';
    document.head.appendChild(link);
    return () => link.remove();
  }, [fontUrl]);

  const style: GalleryStyle = {
    '--circular-gallery-bend': bend,
    '--circular-gallery-text': textColor,
    '--circular-gallery-radius': `${borderRadius * 100}%`,
    '--circular-gallery-ease': `${Math.max(.01, scrollEase) * 50}s`,
    '--circular-gallery-font': font,
  };

  return (
    <div
      className={`circular-gallery ${className}`.trim()}
      style={style}
    >
      {children}
    </div>
  );
}
