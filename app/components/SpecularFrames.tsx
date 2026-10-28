'use client';

import { useEffect } from 'react';

const SPECULAR_TARGETS = [
  '.hero-tool-row strong',
  '.hero-carousel-card',
  '.hero-work-intro',
  '.hero-skip-button',
  '.timeline-year-button',
  '.timeline-year-rail button',
  '.timeline-item',
  '.timeline-gallery-group',
  '.timeline-storyboard-panel',
  '.timeline-video-result',
  '.timeline-storyboard-production',
  '.timeline-case-asset-group',
  '.timeline-logo-videos',
  '.process-card',
  '.latest-grid',
].join(',');

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export default function SpecularFrames({ activeSectionId, timelineKey }: { activeSectionId: string; timelineKey: string }) {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 761px)').matches) return;
    let targets: HTMLElement[] = [];
    const visibleTargets = new Set<HTMLElement>();
    let frame = 0;
    let syncFrame = 0;
    let pointerX = window.innerWidth * 0.5;
    let pointerY = window.innerHeight * 0.5;
    const root = document.getElementById(activeSectionId);
    if (!root) return;
    const visibilityObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const target = entry.target as HTMLElement;
        if (entry.isIntersecting) visibleTargets.add(target);
        else visibleTargets.delete(target);
      });
      schedulePaint();
    }, { rootMargin: '100px' });

    const syncTargets = () => {
      const nextTargets = Array.from(root.querySelectorAll<HTMLElement>(SPECULAR_TARGETS));
      const previousTargets = new Set(targets);
      targets.filter((target) => !nextTargets.includes(target)).forEach((target) => {
        visibilityObserver.unobserve(target);
        visibleTargets.delete(target);
      });
      nextTargets.filter((target) => !previousTargets.has(target)).forEach((target) => {
        target.dataset.specular = 'true';
        target.style.setProperty('--specular-x', '18%');
        target.style.setProperty('--specular-y', '12%');
        target.style.setProperty('--specular-angle', '135deg');
        visibilityObserver.observe(target);
      });
      targets = nextTargets;
    };

    const paint = () => {
      frame = 0;
      // Finish layout reads before writing CSS variables. Interleaving them
      // forces a fresh style/layout pass for every reflective card.
      const measurements = Array.from(visibleTargets, (target) => ({ target, rect: target.getBoundingClientRect() }));
      measurements.forEach(({ target, rect }) => {
        if (rect.width === 0 || rect.height === 0 || rect.bottom < -280 || rect.top > window.innerHeight + 280) return;

        const dx = Math.max(rect.left - pointerX, 0, pointerX - rect.right);
        const dy = Math.max(rect.top - pointerY, 0, pointerY - rect.bottom);
        const distance = Math.hypot(dx, dy);
        const proximity = Math.max(220, Math.min(420, Math.max(rect.width, rect.height) * 0.5));
        const amount = clamp(1 - distance / proximity, 0, 1);
        const eased = amount * amount * (3 - 2 * amount);
        const x = clamp(((pointerX - rect.left) / rect.width) * 100, -15, 115);
        const y = clamp(((pointerY - rect.top) / rect.height) * 100, -20, 120);
        const angle = Math.atan2(pointerY - (rect.top + rect.height / 2), pointerX - (rect.left + rect.width / 2)) * (180 / Math.PI) + 90;

        target.style.setProperty('--specular-x', `${x.toFixed(2)}%`);
        target.style.setProperty('--specular-y', `${y.toFixed(2)}%`);
        target.style.setProperty('--specular-angle', `${angle.toFixed(2)}deg`);
        target.style.setProperty('--specular-strength', String(eased));
      });
    };

    function schedulePaint() {
      if (!frame) frame = window.requestAnimationFrame(paint);
    }

    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      schedulePaint();
    };

    const scheduleSync = () => {
      if (syncFrame) return;
      syncFrame = window.requestAnimationFrame(() => {
        syncFrame = 0;
        syncTargets();
        schedulePaint();
      });
    };

    syncTargets();
    const observer = new MutationObserver((records) => {
      if (records.some((record) => [...record.addedNodes, ...record.removedNodes].some((node) =>
        node instanceof Element && (node.matches(SPECULAR_TARGETS) || node.querySelector(SPECULAR_TARGETS)),
      ))) scheduleSync();
    });
    observer.observe(root, { childList: true, subtree: true });
    const supportsPointerEffects = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (supportsPointerEffects) window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('resize', schedulePaint, { passive: true });
    window.addEventListener('scroll', schedulePaint, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      if (syncFrame) window.cancelAnimationFrame(syncFrame);
      observer.disconnect();
      visibilityObserver.disconnect();
      if (supportsPointerEffects) window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', schedulePaint);
      window.removeEventListener('scroll', schedulePaint);
      targets.forEach((target) => {
        delete target.dataset.specular;
        target.style.removeProperty('--specular-x');
        target.style.removeProperty('--specular-y');
        target.style.removeProperty('--specular-angle');
        target.style.removeProperty('--specular-strength');
      });
    };
  }, [activeSectionId, timelineKey]);

  return null;
}
