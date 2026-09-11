'use client';

import { useEffect, useRef } from 'react';
import './CRTWarp.css';

export interface CRTWarpProps {
  color?: string;
  backgroundColor?: string;
  speed?: number;
  curvature?: number;
  scanlineStrength?: number;
  scanlineFrequency?: number;
  waveAmplitude?: number;
  waveFrequency?: number;
  bloom?: number;
  bloomRadius?: number;
  noise?: number;
  vignette?: number;
  brightness?: number;
  pixelation?: number;
  rgbShift?: number;
  mouseReact?: boolean;
  mouseStrength?: number;
  dpr?: number;
  fps?: number;
  className?: string;
}

const vertexShader = `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

varying vec2 vUv;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform vec3 uColor;
uniform vec3 uBackground;
uniform float uTime;
uniform float uCurvature;
uniform float uScanlineStrength;
uniform float uScanlineFrequency;
uniform float uWaveAmplitude;
uniform float uWaveFrequency;
uniform float uBloom;
uniform float uBloomRadius;
uniform float uNoise;
uniform float uVignette;
uniform float uBrightness;
uniform float uPixelation;
uniform float uRgbShift;
uniform float uMouseReact;
uniform float uMouseStrength;

const float TAU = 6.28318530718;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec2 warpUv(vec2 uv) {
  vec2 p = uv * 2.0 - 1.0;
  float radius = dot(p, p);
  p *= 1.0 + radius * uCurvature * 0.2;

  vec2 mouseVector = uv - uMouse;
  float mouseInfluence = exp(-dot(mouseVector, mouseVector) * 10.0) * uMouseReact;
  p += mouseVector * mouseInfluence * uMouseStrength * 0.075;
  return p * 0.5 + 0.5;
}

float signalAt(vec2 uv, float channelOffset) {
  float pixelSize = max(1.0, uPixelation);
  vec2 pixelUv = floor(uv * uResolution / pixelSize) * pixelSize / uResolution;
  float verticalWave = sin((pixelUv.y * uWaveFrequency + uTime * 0.9) * TAU)
    * uWaveAmplitude * 0.018;
  float travelingWave = sin((pixelUv.x * 1.35 - uTime * 1.45) * TAU)
    * uWaveAmplitude * 0.034;
  float crossWave = sin(((pixelUv.x * 0.7 + pixelUv.y) * 2.1 + uTime * 0.75) * TAU)
    * uWaveAmplitude * 0.014;
  float wave = verticalWave + travelingWave + crossWave;
  float phase = (pixelUv.y + wave - uTime * 0.012 + channelOffset) * uScanlineFrequency * TAU;
  float narrowLine = pow(0.5 + 0.5 * cos(phase), 7.0);
  float wideLine = pow(0.5 + 0.5 * cos(phase), mix(2.2, 0.75, uBloomRadius));
  return clamp(narrowLine * uScanlineStrength + wideLine * uBloom * 0.28, 0.0, 1.0);
}

void main() {
  vec2 uv = warpUv(vUv);
  float red = signalAt(uv, uRgbShift);
  float green = signalAt(uv, 0.0);
  float blue = signalAt(uv, -uRgbShift);
  vec3 signal = vec3(red, green, blue);

  float horizontalFlow = 0.5 + 0.5 * sin((uv.x * 1.55 - uTime * 1.1) * TAU);
  float diagonalFlow = 0.5 + 0.5 * sin(((uv.x * 0.65 + uv.y) * 1.8 + uTime * 0.72) * TAU);
  float sweepPosition = fract(uTime * 0.42);
  float sweep = exp(-pow((uv.x - sweepPosition) * 4.8, 2.0));
  vec3 base = uBackground * (0.74 + horizontalFlow * 0.16 + diagonalFlow * 0.12);
  base += uColor * sweep * 0.1;
  vec3 color = mix(base, uColor, signal * (0.58 + uBloom * 0.22));

  float grain = hash(gl_FragCoord.xy + floor(uTime * 37.0)) - 0.5;
  color += grain * uNoise;

  vec2 edge = vUv * (1.0 - vUv.yx);
  float vignette = pow(clamp(edge.x * edge.y * 18.0, 0.0, 1.0), 0.24);
  color *= mix(1.0 - uVignette, 1.0, vignette);
  color *= uBrightness;

  gl_FragColor = vec4(color, 1.0);
}
`;

const parseHexColor = (value: string): [number, number, number] => {
  const normalized = value.replace('#', '').trim();
  const hex = normalized.length === 3
    ? normalized.split('').map((character) => character + character).join('')
    : normalized.padEnd(6, '0').slice(0, 6);
  return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255) as [number, number, number];
};

const compileShader = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

export default function CRTWarp({
  color = '#F5EFEA',
  backgroundColor = '#91CFD5',
  speed = 0.35,
  curvature = 0.22,
  scanlineStrength = 0.47,
  scanlineFrequency = 245,
  waveAmplitude = 0.3,
  waveFrequency = 3.1,
  bloom = 0.6,
  bloomRadius = 0.8,
  noise = 0.045,
  vignette = 0.08,
  brightness = 1.5,
  pixelation = 1,
  rgbShift = 0.013,
  mouseReact = false,
  mouseStrength = 0.5,
  dpr = 1,
  fps = 30,
  className = '',
}: CRTWarpProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: 'high-performance',
    });
    if (!gl) return;

    const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShader);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader);
    if (!vertex || !fragment) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.useProgram(program);
    const position = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
      resolution: gl.getUniformLocation(program, 'uResolution'),
      mouse: gl.getUniformLocation(program, 'uMouse'),
      color: gl.getUniformLocation(program, 'uColor'),
      background: gl.getUniformLocation(program, 'uBackground'),
      time: gl.getUniformLocation(program, 'uTime'),
      curvature: gl.getUniformLocation(program, 'uCurvature'),
      scanlineStrength: gl.getUniformLocation(program, 'uScanlineStrength'),
      scanlineFrequency: gl.getUniformLocation(program, 'uScanlineFrequency'),
      waveAmplitude: gl.getUniformLocation(program, 'uWaveAmplitude'),
      waveFrequency: gl.getUniformLocation(program, 'uWaveFrequency'),
      bloom: gl.getUniformLocation(program, 'uBloom'),
      bloomRadius: gl.getUniformLocation(program, 'uBloomRadius'),
      noise: gl.getUniformLocation(program, 'uNoise'),
      vignette: gl.getUniformLocation(program, 'uVignette'),
      brightness: gl.getUniformLocation(program, 'uBrightness'),
      pixelation: gl.getUniformLocation(program, 'uPixelation'),
      rgbShift: gl.getUniformLocation(program, 'uRgbShift'),
      mouseReact: gl.getUniformLocation(program, 'uMouseReact'),
      mouseStrength: gl.getUniformLocation(program, 'uMouseStrength'),
    };

    const foreground = parseHexColor(color);
    const background = parseHexColor(backgroundColor);
    const mouse = { x: 0.5, y: 0.5 };
    let frame = 0;
    let isVisible = true;
    let previousFrame = 0;
    const startedAt = performance.now();
    const frameInterval = 1000 / Math.max(1, fps);

    const resize = () => {
      const rect = root.getBoundingClientRect();
      const renderDpr = Math.max(0.5, Math.min(2, dpr));
      const width = Math.max(1, Math.round(rect.width * renderDpr));
      const height = Math.max(1, Math.round(rect.height * renderDpr));
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!mouseReact) return;
      const rect = root.getBoundingClientRect();
      mouse.x = (event.clientX - rect.left) / Math.max(1, rect.width);
      mouse.y = 1 - (event.clientY - rect.top) / Math.max(1, rect.height);
    };

    const draw = (now: number) => {
      frame = window.requestAnimationFrame(draw);
      if (!isVisible || document.hidden || now - previousFrame < frameInterval) return;
      previousFrame = now;
      resize();
      gl.useProgram(program);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform2f(uniforms.mouse, mouse.x, mouse.y);
      gl.uniform3f(uniforms.color, foreground[0], foreground[1], foreground[2]);
      gl.uniform3f(uniforms.background, background[0], background[1], background[2]);
      gl.uniform1f(uniforms.time, ((now - startedAt) / 1000) * speed);
      gl.uniform1f(uniforms.curvature, curvature);
      gl.uniform1f(uniforms.scanlineStrength, scanlineStrength);
      gl.uniform1f(uniforms.scanlineFrequency, scanlineFrequency);
      gl.uniform1f(uniforms.waveAmplitude, waveAmplitude);
      gl.uniform1f(uniforms.waveFrequency, waveFrequency);
      gl.uniform1f(uniforms.bloom, bloom);
      gl.uniform1f(uniforms.bloomRadius, bloomRadius);
      gl.uniform1f(uniforms.noise, noise);
      gl.uniform1f(uniforms.vignette, vignette);
      gl.uniform1f(uniforms.brightness, brightness);
      gl.uniform1f(uniforms.pixelation, pixelation);
      gl.uniform1f(uniforms.rgbShift, rgbShift);
      gl.uniform1f(uniforms.mouseReact, mouseReact ? 1 : 0);
      gl.uniform1f(uniforms.mouseStrength, mouseStrength);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const resizeObserver = new ResizeObserver(resize);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    }, { rootMargin: '120px 0px' });
    resizeObserver.observe(root);
    visibilityObserver.observe(root);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    resize();
    frame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener('pointermove', handlePointerMove);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, [backgroundColor, bloom, bloomRadius, brightness, color, curvature, dpr, fps, mouseReact, mouseStrength, noise, pixelation, rgbShift, scanlineFrequency, scanlineStrength, speed, vignette, waveAmplitude, waveFrequency]);

  return (
    <div ref={rootRef} className={`crt-warp ${className}`.trim()}>
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  );
}
