'use client';

import { useEffect, useRef } from 'react';
import { Geometry, Mesh, Program, Renderer, Texture } from 'ogl';
import './ElasticMesh.css';

const VERT = `
precision highp float;
attribute vec2 aGrid;
attribute vec2 uv;
attribute vec3 aOffset;
attribute vec3 aNormal;
uniform float uAspect;
varying vec2 vUv;
varying vec3 vNormal;
varying float vDepth;
void main() {
  vUv = uv;
  vec2 base = vec2((aGrid.x * 2.0 - 1.0) * uAspect, 1.0 - aGrid.y * 2.0);
  vec3 p = vec3(base + aOffset.xy, aOffset.z);
  gl_Position = vec4(vec2(p.x / uAspect, p.y), 0.0, 1.0);
  vNormal = aNormal;
  vDepth = aOffset.z;
}
`;

const FRAG = `
precision highp float;
varying vec2 vUv;
varying vec3 vNormal;
varying float vDepth;
uniform sampler2D tMap;
uniform float uReady;
uniform float uSurfaceAspect;
uniform float uTextureAspect;
uniform float uShading;
uniform vec2 uRes;
uniform float uRadius;
void main() {
  if (uReady < 0.5) discard;
  vec2 sampleUv = vUv;
  if (uTextureAspect > uSurfaceAspect) {
    sampleUv.x = 0.5 + (sampleUv.x - 0.5) * (uSurfaceAspect / uTextureAspect);
  } else {
    sampleUv.y = 0.5 + (sampleUv.y - 0.5) * (uTextureAspect / uSurfaceAspect);
  }
  vec3 base = texture2D(tMap, sampleUv).rgb;
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(vec3(-0.35, 0.55, 0.78));
  vec3 halfDir = normalize(lightDir + vec3(0.0, 0.0, 1.0));
  float diffuse = clamp(dot(normal, lightDir), 0.0, 1.0);
  float specular = pow(clamp(dot(normal, halfDir), 0.0, 1.0), 24.0);
  float flatSpecular = pow(clamp(halfDir.z, 0.0, 1.0), 24.0);
  specular = clamp((specular - flatSpecular) / (1.0 - flatSpecular), 0.0, 1.0);
  vec3 lit = base * (1.0 - uShading * 0.2) + base * diffuse * uShading * 0.42;
  lit *= clamp(1.0 + vDepth * 0.42, 0.72, 1.2);
  lit += vec3(1.0) * specular * uShading * 0.32;
  vec2 p = (vUv - 0.5) * uRes;
  vec2 halfRes = uRes * 0.5;
  float radius = min(uRadius, min(halfRes.x, halfRes.y));
  vec2 q = abs(p) - (halfRes - radius);
  float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
  float alpha = 1.0 - smoothstep(-1.25, 1.25, sd);
  if (alpha <= 0.002) discard;
  gl_FragColor = vec4(lit, alpha);
}
`;

type ElasticMeshProps = {
  sourceSelector: string;
  borderRadius?: number;
  stiffness?: number;
  damping?: number;
  grabRadius?: number;
  pull?: number;
  wobble?: number;
  shading?: number;
  resolution?: number;
  className?: string;
};

export default function ElasticMesh({
  sourceSelector,
  borderRadius = 24,
  stiffness = 0.048,
  damping = 0.18,
  grabRadius = 0.64,
  pull = 0.52,
  wobble = 5.8,
  shading = 0.68,
  resolution = 19,
  className = '',
}: ElasticMeshProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const source = document.querySelector<HTMLVideoElement>(sourceSelector);
    const target = container?.parentElement;
    if (!container || !source || !target) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderer = new Renderer({ alpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio || 1, 1.5) });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const size = Math.max(8, Math.min(28, Math.round(resolution)));
    const nodeCount = size * size;
    const grid = new Float32Array(nodeCount * 2);
    const uv = new Float32Array(nodeCount * 2);
    const offset = new Float32Array(nodeCount * 3);
    const normal = new Float32Array(nodeCount * 3);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const index = y * size + x;
        const u = x / (size - 1);
        const v = y / (size - 1);
        grid[index * 2] = u;
        grid[index * 2 + 1] = v;
        uv[index * 2] = u;
        uv[index * 2 + 1] = v;
        normal[index * 3 + 2] = 1;
      }
    }

    const indices = new Uint16Array((size - 1) * (size - 1) * 6);
    let pointerIndex = 0;
    for (let y = 0; y < size - 1; y += 1) {
      for (let x = 0; x < size - 1; x += 1) {
        const a = y * size + x;
        const b = a + 1;
        const c = a + size;
        const d = c + 1;
        indices[pointerIndex++] = a;
        indices[pointerIndex++] = c;
        indices[pointerIndex++] = b;
        indices[pointerIndex++] = b;
        indices[pointerIndex++] = c;
        indices[pointerIndex++] = d;
      }
    }

    const geometry = new Geometry(gl, {
      aGrid: { size: 2, data: grid },
      uv: { size: 2, data: uv },
      aOffset: { size: 3, data: offset },
      aNormal: { size: 3, data: normal },
      index: { data: indices },
    });
    const texture = new Texture(gl, { generateMipmaps: false, flipY: false });
    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      transparent: true,
      cullFace: null,
      uniforms: {
        tMap: { value: texture },
        uReady: { value: 0 },
        uSurfaceAspect: { value: 1 },
        uTextureAspect: { value: 1 },
        uShading: { value: shading },
        uRes: { value: [1, 1] },
        uRadius: { value: borderRadius },
        uAspect: { value: 1 },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });
    const baseX = new Float32Array(nodeCount);
    const baseY = new Float32Array(nodeCount);
    const position = new Float32Array(nodeCount * 3);
    const velocity = new Float32Array(nodeCount * 3);
    const acceleration = new Float32Array(nodeCount * 3);
    let aspect = 1;

    const refreshBase = () => {
      for (let index = 0; index < nodeCount; index += 1) {
        baseX[index] = (grid[index * 2] * 2 - 1) * aspect;
        baseY[index] = 1 - grid[index * 2 + 1] * 2;
      }
    };
    const resize = () => {
      const width = container.offsetWidth || 1;
      const height = container.offsetHeight || 1;
      renderer.setSize(width, height);
      aspect = width / height;
      program.uniforms.uAspect.value = aspect;
      program.uniforms.uSurfaceAspect.value = aspect;
      program.uniforms.uRes.value = [width, height];
      refreshBase();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const attachSource = () => {
      if (!source.videoWidth || !source.videoHeight) return;
      texture.image = source;
      texture.needsUpdate = true;
      program.uniforms.uTextureAspect.value = source.videoWidth / source.videoHeight;
      program.uniforms.uReady.value = 1;
    };
    source.addEventListener('loadeddata', attachSource);
    source.addEventListener('loadedmetadata', attachSource);
    attachSource();

    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, active: false };
    const movePointer = (event: PointerEvent) => {
      const rect = target.getBoundingClientRect();
      const normalizedX = (event.clientX - rect.left) / rect.width;
      const normalizedY = (event.clientY - rect.top) / rect.height;
      pointer.targetX = (normalizedX * 2 - 1) * aspect;
      pointer.targetY = 1 - normalizedY * 2;
      pointer.active = true;
    };
    const leavePointer = () => { pointer.active = false; };
    target.addEventListener('pointermove', movePointer);
    target.addEventListener('pointerenter', movePointer);
    target.addEventListener('pointerleave', leavePointer);

    const step = () => {
      const coupling = 0.06 + wobble * 0.032;
      const radius = Math.max(0.08, grabRadius) * 1.4;
      const force = pull * 0.009;
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const index = y * size + x;
          const offsetIndex = index * 3;
          const ox = position[offsetIndex];
          const oy = position[offsetIndex + 1];
          const oz = position[offsetIndex + 2];
          let ax = -stiffness * ox;
          let ay = -stiffness * oy;
          let az = -stiffness * oz;
          let sumX = 0;
          let sumY = 0;
          let sumZ = 0;
          let neighbors = 0;
          const collect = (neighborIndex: number) => {
            const neighborOffset = neighborIndex * 3;
            sumX += position[neighborOffset];
            sumY += position[neighborOffset + 1];
            sumZ += position[neighborOffset + 2];
            neighbors += 1;
          };
          if (x > 0) collect(index - 1);
          if (x < size - 1) collect(index + 1);
          if (y > 0) collect(index - size);
          if (y < size - 1) collect(index + size);
          ax += coupling * (sumX - neighbors * ox);
          ay += coupling * (sumY - neighbors * oy);
          az += coupling * (sumZ - neighbors * oz);
          if (pointer.active && !reduceMotion) {
            const dx = pointer.x - (baseX[index] + ox);
            const dy = pointer.y - (baseY[index] + oy);
            const distance = Math.hypot(dx, dy);
            const normalizedDistance = distance / radius;
            if (normalizedDistance < 1) {
              const bump = 1 - normalizedDistance * normalizedDistance;
              az += force * bump * bump * 6;
              if (distance > 0.0001) {
                const pinch = normalizedDistance * (1 - normalizedDistance) * (1 - normalizedDistance) * 6.75;
                const direction = (force * pinch * 1.6) / distance;
                ax += dx * direction;
                ay += dy * direction;
              }
            }
          }
          acceleration[offsetIndex] = ax;
          acceleration[offsetIndex + 1] = ay;
          acceleration[offsetIndex + 2] = az;
        }
      }
      const retention = 1 - damping;
      for (let index = 0; index < nodeCount * 3; index += 1) {
        velocity[index] = (velocity[index] + acceleration[index]) * retention;
        position[index] = Math.max(-1.2, Math.min(1.2, position[index] + velocity[index]));
      }
    };

    const commit = () => {
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const index = y * size + x;
          const offsetIndex = index * 3;
          const left = (x > 0 ? index - 1 : index) * 3;
          const right = (x < size - 1 ? index + 1 : index) * 3;
          const down = (y > 0 ? index - size : index) * 3;
          const up = (y < size - 1 ? index + size : index) * 3;
          const tx = [baseX[right / 3] + position[right] - baseX[left / 3] - position[left], baseY[right / 3] + position[right + 1] - baseY[left / 3] - position[left + 1], position[right + 2] - position[left + 2]];
          const ty = [baseX[up / 3] + position[up] - baseX[down / 3] - position[down], baseY[up / 3] + position[up + 1] - baseY[down / 3] - position[down + 1], position[up + 2] - position[down + 2]];
          let nx = tx[1] * ty[2] - tx[2] * ty[1];
          let ny = tx[2] * ty[0] - tx[0] * ty[2];
          let nz = tx[0] * ty[1] - tx[1] * ty[0];
          if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
          const length = Math.hypot(nx, ny, nz) || 1;
          normal[offsetIndex] = nx / length;
          normal[offsetIndex + 1] = ny / length;
          normal[offsetIndex + 2] = nz / length;
          offset[offsetIndex] = position[offsetIndex];
          offset[offsetIndex + 1] = position[offsetIndex + 1];
          offset[offsetIndex + 2] = position[offsetIndex + 2];
        }
      }
      geometry.attributes.aOffset.needsUpdate = true;
      geometry.attributes.aNormal.needsUpdate = true;
    };

    let animationFrame = 0;
    let last = performance.now();
    let accumulator = 0;
    const animate = (now: number) => {
      animationFrame = window.requestAnimationFrame(animate);
      const delta = Math.min((now - last) / 1000, 0.25);
      last = now;
      const lerp = 1 - Math.exp(-Math.max(delta, 0.0001) / 0.06);
      pointer.x += (pointer.targetX - pointer.x) * lerp;
      pointer.y += (pointer.targetY - pointer.y) * lerp;
      accumulator += delta;
      let substeps = 0;
      while (accumulator >= 1 / 120 && substeps < 5) {
        step();
        accumulator -= 1 / 120;
        substeps += 1;
      }
      if (accumulator > 1 / 120) accumulator = 0;
      commit();
      if (program.uniforms.uReady.value > 0.5) texture.needsUpdate = true;
      renderer.render({ scene: mesh });
    };
    container.appendChild(gl.canvas);
    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      source.removeEventListener('loadeddata', attachSource);
      source.removeEventListener('loadedmetadata', attachSource);
      target.removeEventListener('pointermove', movePointer);
      target.removeEventListener('pointerenter', movePointer);
      target.removeEventListener('pointerleave', leavePointer);
      if (gl.canvas.parentElement === container) container.removeChild(gl.canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [borderRadius, damping, grabRadius, pull, resolution, shading, sourceSelector, stiffness, wobble]);

  return <div ref={containerRef} className={`elastic-mesh${className ? ` ${className}` : ''}`} aria-hidden="true" />;
}
