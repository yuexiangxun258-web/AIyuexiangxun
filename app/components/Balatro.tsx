'use client';

import { Mesh, Program, Renderer, Triangle } from 'ogl';
import { useEffect, useRef } from 'react';
import './Balatro.css';

type BalatroProps = {
  spinRotation?: number;
  spinSpeed?: number;
  offset?: [number, number];
  color1?: string;
  color2?: string;
  color3?: string;
  contrast?: number;
  lighting?: number;
  spinAmount?: number;
  pixelFilter?: number;
  spinEase?: number;
  isRotate?: boolean;
  mouseInteraction?: boolean;
};

const hexToVec4 = (hex: string): [number, number, number, number] => {
  const value = hex.replace('#', '');
  const normalized = value.length === 3
    ? value.split('').map((character) => character + character).join('')
    : value.padEnd(6, '0').slice(0, 8);
  return [
    Number.parseInt(normalized.slice(0, 2), 16) / 255,
    Number.parseInt(normalized.slice(2, 4), 16) / 255,
    Number.parseInt(normalized.slice(4, 6), 16) / 255,
    normalized.length === 8 ? Number.parseInt(normalized.slice(6, 8), 16) / 255 : 1,
  ];
};

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec3 iResolution;
uniform float uSpinRotation;
uniform float uSpinSpeed;
uniform vec2 uOffset;
uniform vec4 uColor1;
uniform vec4 uColor2;
uniform vec4 uColor3;
uniform float uContrast;
uniform float uLighting;
uniform float uSpinAmount;
uniform float uPixelFilter;
uniform float uSpinEase;
uniform bool uIsRotate;
uniform vec2 uMouse;
varying vec2 vUv;

vec4 effect(vec2 screenSize, vec2 screenCoords) {
  float pixelSize = length(screenSize.xy) / uPixelFilter;
  vec2 uv = (floor(screenCoords.xy / pixelSize) * pixelSize - 0.5 * screenSize.xy) / length(screenSize.xy) - uOffset;
  float uvLength = length(uv);

  float speed = uSpinRotation * uSpinEase * 0.2;
  if (uIsRotate) speed = iTime * speed;
  speed += 302.2 + (uMouse.x * 2.0 - 1.0) * 0.1;

  float pixelAngle = atan(uv.y, uv.x) + speed - uSpinEase * 20.0 * (uSpinAmount * uvLength + (1.0 - uSpinAmount));
  vec2 middle = (screenSize.xy / length(screenSize.xy)) / 2.0;
  uv = vec2(uvLength * cos(pixelAngle) + middle.x, uvLength * sin(pixelAngle) + middle.y) - middle;
  uv *= 30.0;

  speed = iTime * uSpinSpeed + (uMouse.x * 2.0 - 1.0) * 2.0;
  vec2 uv2 = vec2(uv.x + uv.y);
  for (int i = 0; i < 5; i++) {
    uv2 += sin(max(uv.x, uv.y)) + uv;
    uv += 0.5 * vec2(
      cos(5.1123314 + 0.353 * uv2.y + speed * 0.131121),
      sin(uv2.x - 0.113 * speed)
    );
    uv -= cos(uv.x + uv.y) - sin(uv.x * 0.711 - uv.y);
  }

  float contrastMod = 0.25 * uContrast + 0.5 * uSpinAmount + 1.2;
  float paint = min(2.0, max(0.0, length(uv) * 0.035 * contrastMod));
  float colorOne = max(0.0, 1.0 - contrastMod * abs(1.0 - paint));
  float colorTwo = max(0.0, 1.0 - contrastMod * abs(paint));
  float colorThree = 1.0 - min(1.0, colorOne + colorTwo);
  float light = (uLighting - 0.2) * max(colorOne * 5.0 - 4.0, 0.0)
    + uLighting * max(colorTwo * 5.0 - 4.0, 0.0);

  return (0.3 / uContrast) * uColor1
    + (1.0 - 0.3 / uContrast) * (
      uColor1 * colorOne
      + uColor2 * colorTwo
      + vec4(colorThree * uColor3.rgb, colorThree * uColor1.a)
    )
    + light;
}

void main() {
  gl_FragColor = effect(iResolution.xy, vUv * iResolution.xy);
}
`;

export default function Balatro({
  spinRotation = -2,
  spinSpeed = 7,
  offset = [0, 0],
  color1 = '#DE443B',
  color2 = '#006BB4',
  color3 = '#162325',
  contrast = 3.5,
  lighting = 0.4,
  spinAmount = 0.25,
  pixelFilter = 745,
  spinEase = 1,
  isRotate = false,
  mouseInteraction = true,
}: BalatroProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: Renderer;
    try {
      renderer = new Renderer({ alpha: false, antialias: false, dpr: Math.min(window.devicePixelRatio || 1, 1.35) });
    } catch {
      return;
    }

    const gl = renderer.gl;
    gl.clearColor(0.57, 0.81, 0.84, 1);
    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: [1, 1, 1] },
        uSpinRotation: { value: spinRotation },
        uSpinSpeed: { value: spinSpeed },
        uOffset: { value: offset },
        uColor1: { value: hexToVec4(color1) },
        uColor2: { value: hexToVec4(color2) },
        uColor3: { value: hexToVec4(color3) },
        uContrast: { value: contrast },
        uLighting: { value: lighting },
        uSpinAmount: { value: spinAmount },
        uPixelFilter: { value: pixelFilter },
        uSpinEase: { value: spinEase },
        uIsRotate: { value: isRotate },
        uMouse: { value: [0.5, 0.5] },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });
    const canvas = gl.canvas;
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);

    let frame = 0;
    let visible = true;
    let pointerX = 0.5;
    let pointerTargetX = 0.5;
    let lastRenderAt = 0;
    const startedAt = performance.now();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height));
      program.uniforms.iResolution.value = [gl.canvas.width, gl.canvas.height, gl.canvas.width / Math.max(1, gl.canvas.height)];
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!mouseInteraction) return;
      const rect = container.getBoundingClientRect();
      if (event.clientY < rect.top || event.clientY > rect.bottom) return;
      pointerTargetX = Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(1, rect.width)));
    };

    const draw = (now: number) => {
      frame = window.requestAnimationFrame(draw);
      if (!visible || document.hidden) return;
      if (now - lastRenderAt < 1000 / 30) return;
      lastRenderAt = now;
      pointerX += (pointerTargetX - pointerX) * 0.075;
      program.uniforms.uMouse.value = [pointerX, 0.5];
      program.uniforms.iTime.value = reduceMotion ? 0 : (now - startedAt) * 0.001;
      renderer.render({ scene: mesh });
    };

    const resizeObserver = new ResizeObserver(resize);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    }, { rootMargin: '120px 0px' });
    resizeObserver.observe(container);
    visibilityObserver.observe(container);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    resize();
    frame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener('pointermove', handlePointerMove);
      canvas.remove();
      geometry.remove?.();
      program.remove?.();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [color1, color2, color3, contrast, isRotate, lighting, mouseInteraction, offset, pixelFilter, spinAmount, spinEase, spinRotation, spinSpeed]);

  return <div ref={containerRef} className="balatro-container" />;
}
