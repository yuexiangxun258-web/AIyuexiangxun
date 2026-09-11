'use client';

import { useEffect, useRef } from 'react';
import { Mesh, Program, Renderer, Texture, Triangle } from 'ogl';
import './WarpText.css';

const VERTEX = `
precision highp float;
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT = `
precision highp float;
uniform sampler2D uText;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uActive;
uniform float uTime;
uniform float uRadius;
uniform float uStrength;
uniform float uRefraction;
varying vec2 vUv;

vec4 sampleText(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
  return texture2D(uText, uv);
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 delta = vUv - uPointer;
  vec2 metric = vec2(delta.x * aspect, delta.y);
  float distanceToPointer = length(metric);
  float radius = max(0.02, uRadius);
  float lens = (1.0 - smoothstep(radius * 0.5, radius, distanceToPointer)) * uActive;
  float normalizedDistance = clamp(distanceToPointer / radius, 0.0, 1.0);
  vec2 direction = distanceToPointer > 0.0001
    ? vec2(metric.x / aspect, metric.y) / distanceToPointer
    : vec2(0.0);
  float bulge = normalizedDistance * (1.0 - normalizedDistance) * 4.0;
  float ripple = sin(normalizedDistance * 18.0 - uTime * 5.2) * (1.0 - normalizedDistance);
  vec2 localWarp = -direction * (bulge * 0.032 + ripple * 0.008) * uStrength * lens;
  vec2 displaced = vUv + localWarp;
  vec2 split = direction * uRefraction * lens * (0.35 + bulge);
  vec4 base = sampleText(displaced);
  vec4 redSample = sampleText(displaced + split);
  vec4 blueSample = sampleText(displaced - split);
  float alpha = max(base.a, max(redSample.a, blueSample.a));
  gl_FragColor = vec4(redSample.r, base.g, blueSample.b, alpha);
}
`;

type WarpTextProps = {
  text: string;
  as?: 'span' | 'h2';
  className?: string;
  strength?: number;
  radius?: number;
  refraction?: number;
};

const parseSpacing = (value: string) => value === 'normal' ? 0 : Number.parseFloat(value) || 0;

export default function WarpText({
  text,
  as = 'span',
  className = '',
  strength = 1,
  radius = 0.52,
  refraction = 0.014,
}: WarpTextProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const Tag = as;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let renderer: Renderer | null = null;
    let raf = 0;
    let disposed = false;
    let texture: Texture | null = null;
    let program: Program | null = null;
    let geometry: Triangle | null = null;
    let pointerX = 0.5;
    let pointerY = 0.5;
    let pointerTargetX = 0.5;
    let pointerTargetY = 0.5;
    let active = 0;
    let activeTarget = 0;
    let padX = 0;
    let padY = 0;

    try {
      renderer = new Renderer({ alpha: true, antialias: true, dpr: Math.min(devicePixelRatio || 1, 2) });
    } catch {
      return;
    }

    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.className = 'warp-text__canvas';
    root.appendChild(canvas);
    texture = new Texture(gl, { generateMipmaps: false, minFilter: gl.LINEAR, magFilter: gl.LINEAR, wrapS: gl.CLAMP_TO_EDGE, wrapT: gl.CLAMP_TO_EDGE });
    geometry = new Triangle(gl);
    program = new Program(gl, {
      vertex: VERTEX,
      fragment: FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uText: { value: texture },
        uResolution: { value: [1, 1] },
        uPointer: { value: [0.5, 0.5] },
        uActive: { value: 0 },
        uTime: { value: 0 },
        uRadius: { value: radius },
        uStrength: { value: strength },
        uRefraction: { value: refraction },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });

    const drawTextTexture = () => {
      if (disposed || !renderer || !texture || !program) return;
      const rect = root.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const styles = getComputedStyle(root);
      const dpr = Math.min(devicePixelRatio || 1, 2);
      padX = Math.ceil(rect.height * 0.2);
      padY = Math.ceil(rect.height * 0.22);
      const width = Math.ceil(rect.width + padX * 2);
      const height = Math.ceil(rect.height + padY * 2);
      renderer.setSize(width, height);
      canvas.style.left = `${-padX}px`;
      canvas.style.top = `${-padY}px`;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const textCanvas = document.createElement('canvas');
      textCanvas.width = Math.max(1, Math.floor(width * dpr));
      textCanvas.height = Math.max(1, Math.floor(height * dpr));
      const context = textCanvas.getContext('2d');
      if (!context) return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.font = `${styles.fontStyle} ${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
      context.fillStyle = styles.color;
      context.textAlign = 'left';
      context.textBaseline = 'alphabetic';
      context.imageSmoothingEnabled = true;
      const spacing = parseSpacing(styles.letterSpacing);
      const metrics = context.measureText(text);
      const fontSize = Number.parseFloat(styles.fontSize) || 16;
      const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.78;
      const descent = metrics.actualBoundingBoxDescent || fontSize * 0.18;
      const baseline = padY + (rect.height + ascent - descent) / 2;
      let x = padX;
      Array.from(text).forEach((character, index) => {
        context.fillText(character, x, baseline);
        x += context.measureText(character).width + (index === Array.from(text).length - 1 ? 0 : spacing);
      });
      texture.image = textCanvas;
      texture.needsUpdate = true;
      program.uniforms.uResolution.value = [width, height];
      renderer.render({ scene: mesh });
      root.dataset.warpReady = 'true';
    };

    const updatePointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const rect = root.getBoundingClientRect();
      pointerTargetX = (event.clientX - rect.left + padX) / Math.max(1, rect.width + padX * 2);
      pointerTargetY = 1 - (event.clientY - rect.top + padY) / Math.max(1, rect.height + padY * 2);
      activeTarget = 1;
      scheduleRender();
    };
    const leavePointer = () => {
      activeTarget = 0;
      scheduleRender();
    };
    const startedAt = performance.now();
    const render = (now: number) => {
      raf = 0;
      if (disposed || !renderer || !program) return;
      pointerX += (pointerTargetX - pointerX) * 0.16;
      pointerY += (pointerTargetY - pointerY) * 0.16;
      active += (activeTarget - active) * 0.18;
      if (activeTarget === 0 && active < 0.01) active = 0;
      program.uniforms.uPointer.value = [pointerX, pointerY];
      program.uniforms.uActive.value = reduceMotion ? 0 : active;
      program.uniforms.uTime.value = (now - startedAt) * 0.001;
      renderer.render({ scene: mesh });
      if (activeTarget > 0 || active > 0) raf = requestAnimationFrame(render);
    };
    function scheduleRender() {
      if (!raf && !disposed) raf = requestAnimationFrame(render);
    }

    const resizeObserver = new ResizeObserver(drawTextTexture);
    resizeObserver.observe(root);
    root.addEventListener('pointermove', updatePointer, { passive: true });
    root.addEventListener('pointerenter', updatePointer, { passive: true });
    root.addEventListener('pointerleave', leavePointer);
    void document.fonts?.ready.then(drawTextTexture);
    drawTextTexture();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      root.removeEventListener('pointermove', updatePointer);
      root.removeEventListener('pointerenter', updatePointer);
      root.removeEventListener('pointerleave', leavePointer);
      root.removeAttribute('data-warp-ready');
      canvas.remove();
      geometry?.remove?.();
      program?.remove?.();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [radius, refraction, strength, text]);

  return (
    <Tag ref={(node) => { rootRef.current = node; }} className={`warp-text ${className}`.trim()} aria-label={text}>
      <span className="warp-text__content" aria-hidden="true">{text}</span>
    </Tag>
  );
}
