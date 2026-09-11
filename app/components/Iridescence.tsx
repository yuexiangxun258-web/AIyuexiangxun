'use client';

import { useEffect, useRef } from 'react';
import { Color, Mesh, Program, Renderer, Triangle } from 'ogl';
import './Iridescence.css';

const vertexShader = `
precision highp float;

attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uResolution;
uniform vec2 uMouse;
uniform float uAmplitude;
uniform float uSpeed;

varying vec2 vUv;

void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / mr;

  uv += (uMouse - vec2(0.5)) * uAmplitude;
  float d = -uTime * 0.5 * uSpeed;
  float a = 0.0;
  for (float i = 0.0; i < 8.0; ++i) {
    a += cos(i - d - a * uv.x);
    d += sin(uv.y * i + a);
  }
  d += uTime * 0.5 * uSpeed;
  vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
  col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;
  gl_FragColor = vec4(col, 1.0);
}
`;

type IridescenceProps = {
  color?: [number, number, number];
  mouseReact?: boolean;
  amplitude?: number;
  speed?: number;
  className?: string;
};

export default function Iridescence({
  color = [1, 1, 1],
  mouseReact = true,
  amplitude = 0.1,
  speed = 1,
  className = '',
}: IridescenceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [red, green, blue] = color;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({
      alpha: false,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, 1.35),
    });
    const gl = renderer.gl;
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      stop();
    };
    const handleContextRestored = () => {
      resize();
      updateLayerVisibility();
    };
    gl.canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(gl.canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new Color(red, green, blue) },
        uResolution: { value: new Color(1, 1, 1) },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uAmplitude: { value: amplitude },
        uSpeed: { value: speed },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });
    const owningSection = container.closest('.innovation-page');
    let visible = false;
    let frame = 0;
    let visibilityFrame = 0;
    let startTime = performance.now();
    let lastRenderAt = 0;

    const resize = () => {
      const bounds = container.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      renderer.setSize(width, height);
      program.uniforms.uResolution.value = new Color(
        gl.canvas.width,
        gl.canvas.height,
        gl.canvas.width / Math.max(gl.canvas.height, 1),
      );
      renderer.render({ scene: mesh });
    };

    const render = (time: number) => {
      if (!visible || document.hidden) {
        frame = 0;
        return;
      }
      if (time - lastRenderAt < 1000 / 30) {
        frame = window.requestAnimationFrame(render);
        return;
      }
      lastRenderAt = time;
      program.uniforms.uTime.value = (time - startTime) / 1000;
      renderer.render({ scene: mesh });
      frame = window.requestAnimationFrame(render);
    };

    const start = () => {
      if (frame || !visible || document.hidden) return;
      startTime = performance.now() - Number(program.uniforms.uTime.value) * 1000;
      frame = window.requestAnimationFrame(render);
    };

    const stop = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };

    const updateLayerVisibility = () => {
      const bounds = owningSection?.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const nextVisible = Boolean(bounds && bounds.bottom > 0 && bounds.top < viewportHeight);
      const backgroundLayer = container.parentElement;
      if (backgroundLayer && bounds) {
        const clipTop = Math.max(0, Math.min(viewportHeight, bounds.top));
        const clipBottom = Math.max(0, Math.min(viewportHeight, viewportHeight - bounds.bottom));
        backgroundLayer.style.setProperty('--innovation-clip-top', `${clipTop}px`);
        backgroundLayer.style.setProperty('--innovation-clip-bottom', `${clipBottom}px`);
      }
      if (nextVisible === visible) return;
      visible = nextVisible;
      if (backgroundLayer) backgroundLayer.dataset.visible = String(visible);
      if (visible) start();
      else stop();
    };
    const scheduleLayerVisibilityUpdate = () => {
      if (visibilityFrame) return;
      visibilityFrame = window.requestAnimationFrame(() => {
        visibilityFrame = 0;
        updateLayerVisibility();
      });
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!mouseReact) return;
      const bounds = container.getBoundingClientRect();
      program.uniforms.uMouse.value = [
        (event.clientX - bounds.left) / Math.max(bounds.width, 1),
        1 - (event.clientY - bounds.top) / Math.max(bounds.height, 1),
      ];
    };

    const handleVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      updateLayerVisibility();
    });

    resizeObserver.observe(container);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('scroll', scheduleLayerVisibilityUpdate, { passive: true });
    gl.canvas.addEventListener('webglcontextlost', handleContextLost);
    gl.canvas.addEventListener('webglcontextrestored', handleContextRestored);
    if (mouseReact) container.addEventListener('pointermove', handlePointerMove);
    resize();
    updateLayerVisibility();

    return () => {
      stop();
      window.cancelAnimationFrame(visibilityFrame);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('scroll', scheduleLayerVisibilityUpdate);
      gl.canvas.removeEventListener('webglcontextlost', handleContextLost);
      gl.canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      container.removeEventListener('pointermove', handlePointerMove);
      if (container.parentElement) {
        delete container.parentElement.dataset.visible;
        container.parentElement.style.removeProperty('--innovation-clip-top');
        container.parentElement.style.removeProperty('--innovation-clip-bottom');
      }
      gl.canvas.remove();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [amplitude, blue, green, mouseReact, red, speed]);

  return <div ref={containerRef} className={`iridescence ${className}`.trim()} aria-hidden="true" />;
}
