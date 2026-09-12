'use client';

import { useEffect, useLayoutEffect, useState } from 'react';

type AgencyMotionProps = {
  timelineKey: string;
};

const cinematicEase = 'cubic-bezier(0.16, 1, 0.3, 1)';

const revealElement = (element: HTMLElement, delay = 0, distance = 84) => {
  const animation = element.animate([
    { opacity: 0, transform: `translate3d(0, ${distance}px, 0) scale(.965)`, clipPath: 'inset(0 0 18% 0 round 24px)' },
    { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)', clipPath: 'inset(0 0 0 0 round 0)' },
  ], {
    duration: 1250,
    delay,
    easing: cinematicEase,
    fill: 'backwards',
  });
  window.setTimeout(() => animation.cancel(), delay + 1350);
  return animation;
};

export default function AgencyMotion({ timelineKey }: AgencyMotionProps) {
  const [showOpening, setShowOpening] = useState(true);

  useLayoutEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animations: Animation[] = [];
    const observers: IntersectionObserver[] = [];
    const timers: number[] = [];

    document.documentElement.classList.add('agency-motion-enabled');

    if (reduceMotion) {
      setShowOpening(false);
      document.documentElement.classList.add('agency-motion-reduced');
      return () => {
        document.documentElement.classList.remove('agency-motion-enabled', 'agency-motion-reduced');
      };
    }

    const animateHero = () => {
      const heroRipple = document.querySelector<HTMLElement>('#top .hero-ripple-layer');
      const siteHeader = document.querySelector<HTMLElement>('.site-header');
      const heroLines = Array.from(document.querySelectorAll<HTMLElement>(
        '#top .hero-wordmark-line, #top .hero-portfolio-line',
      ));
      const heroToolRows = Array.from(document.querySelectorAll<HTMLElement>('#top .hero-title-tools .hero-tool-row'));
      const heroMedia = document.querySelector<HTMLElement>('#top .hero-media-slot');

      if (heroRipple) {
        heroRipple.style.opacity = '0';
        animations.push(heroRipple.animate([
          { opacity: 0, transform: 'scale(1.08)' },
          { opacity: 1, transform: 'scale(1)' },
        ], {
          duration: 1500,
          delay: 3680,
          easing: cinematicEase,
          fill: 'forwards',
        }));
      }

      if (siteHeader) {
        siteHeader.style.opacity = '0';
        animations.push(siteHeader.animate([
          { opacity: 0, transform: 'translate3d(-50%, -110px, 0) scaleX(.78)' },
          { opacity: 1, offset: .78, transform: 'translate3d(-50%, 4px, 0) scaleX(1.018)' },
          { opacity: 1, transform: 'translate3d(-50%, 0, 0) scaleX(1)' },
        ], {
          duration: 1350,
          delay: 3540,
          easing: cinematicEase,
          fill: 'forwards',
        }));
      }

      heroLines.forEach((line, index) => {
        line.style.opacity = '0';
        animations.push(line.animate([
          { opacity: 0, transform: 'translate3d(0, 128px, 0) scaleX(.68) scaleY(.52)', clipPath: 'inset(0 0 100% 0)' },
          { opacity: 1, offset: .72, transform: 'translate3d(0, -7px, 0) scaleX(1.025) scaleY(1.02)', clipPath: 'inset(0 0 0 0)' },
          { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)', clipPath: 'inset(0 0 0 0)' },
        ], {
          duration: 1450,
          delay: 3820 + index * 190,
          easing: cinematicEase,
          fill: 'forwards',
        }));
      });

      heroToolRows.forEach((row, index) => {
        row.style.opacity = '0';
        animations.push(row.animate([
          { opacity: 0, transform: 'translate3d(72px, 28px, 0) scaleX(.78)', clipPath: 'inset(0 100% 0 0)' },
          { opacity: 1, transform: 'translate3d(0, 0, 0) scaleX(1)', clipPath: 'inset(0 0 0 0)' },
        ], {
          duration: 1150,
          delay: 4300 + index * 145,
          easing: cinematicEase,
          fill: 'forwards',
        }));
      });

      if (heroMedia) {
        heroMedia.style.opacity = '0';
        animations.push(heroMedia.animate([
          { opacity: 0, transform: 'translate3d(110px, 64px, 0) scale(.82)', clipPath: 'inset(12% 100% 12% 0 round 34px)' },
          { opacity: 1, offset: .76, transform: 'translate3d(-5px, -3px, 0) scale(1.012)', clipPath: 'inset(0 0 0 0 round 0)' },
          { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)', clipPath: 'inset(0 0 0 0 round 0)' },
        ], {
          duration: 1650,
          delay: 4520,
          easing: cinematicEase,
          fill: 'forwards',
        }));
      }
    };

    const shouldPlayOpening = location.hash === '' || location.hash === '#top';
    if (shouldPlayOpening) {
      animateHero();
      timers.push(window.setTimeout(() => setShowOpening(false), 3400));
    } else {
      setShowOpening(false);
    }

    const sectionSetups = [
      {
        selector: '#timeline',
        heading: '.timeline-section-heading',
        cards: '.timeline-year-button',
      },
      {
        selector: '#process',
        heading: '.process-section > .section-heading',
        cards: '.process-card',
      },
      {
        selector: '#downloads',
        heading: '',
        cards: '.download-lanyard',
      },
    ];

    sectionSetups.forEach((setup) => {
      const section = document.querySelector<HTMLElement>(setup.selector);
      if (!section) return;

      const heading = setup.heading ? section.querySelector<HTMLElement>(setup.heading) : null;
      const headingTitle = heading?.querySelector<HTMLElement>('h2') ?? null;
      const headingCopy = heading?.querySelector<HTMLElement>('.section-lead') ?? null;
      const cards = Array.from(section.querySelectorAll<HTMLElement>(setup.cards));

      const observer = new IntersectionObserver(([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();

        if (headingTitle) {
          animations.push(headingTitle.animate([
            { opacity: 0, transform: 'translate3d(0, 82px, 0) scaleX(.72) scaleY(.72)', clipPath: 'inset(0 0 100% 0)' },
            { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)', clipPath: 'inset(0 0 0 0)' },
          ], { duration: 1350, delay: 640, easing: cinematicEase, fill: 'forwards' }));
        }

        if (headingCopy) {
          animations.push(headingCopy.animate([
            { opacity: 0, transform: 'translate3d(0, 44px, 0)', clipPath: 'inset(0 0 100% 0)' },
            { opacity: 1, transform: 'translate3d(0, 0, 0)', clipPath: 'inset(0 0 0 0)' },
          ], { duration: 1100, delay: 860, easing: cinematicEase, fill: 'forwards' }));
        }

        cards.forEach((card, index) => {
          animations.push(revealElement(card, 1020 + index * 145, 92));
        });
      }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });

      observer.observe(heading ?? section);
      observers.push(observer);
    });

    const latest = document.querySelector<HTMLElement>('#process .latest-grid');
    if (latest) {
      const observer = new IntersectionObserver(([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        animations.push(revealElement(latest, 80, 110));
        const parts = Array.from(latest.querySelectorAll<HTMLElement>('.latest-copy > *, .latest-visual'));
        parts.forEach((part, index) => {
          animations.push(revealElement(part, 460 + index * 120, 58));
        });
      }, { threshold: .18, rootMargin: '0px 0px -8% 0px' });
      observer.observe(latest);
      observers.push(observer);
    }

    return () => {
      timers.forEach(window.clearTimeout);
      observers.forEach((observer) => observer.disconnect());
      animations.forEach((animation) => animation.cancel());
      document.documentElement.classList.remove('agency-motion-enabled');
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timers: number[] = [];
    const animations: Animation[] = [];
    const observers: IntersectionObserver[] = [];

    timers.push(window.setTimeout(() => {
      const panel = document.querySelector<HTMLElement>('#timeline .timeline-item');
      if (!panel) return;
      animations.push(revealElement(panel, 180, 105));

      const nestedCards = Array.from(panel.querySelectorAll<HTMLElement>(
        '.timeline-video-case, .timeline-gallery-group, .timeline-storyboard-panel, .timeline-case-asset-group',
      ));
      nestedCards.forEach((card) => {
        const observer = new IntersectionObserver(([entry]) => {
          if (!entry?.isIntersecting) return;
          observer.disconnect();
          const siblings = nestedCards.filter((candidate) => Math.abs(candidate.offsetTop - card.offsetTop) < 80);
          const index = Math.max(0, siblings.indexOf(card));
          animations.push(revealElement(card, index * 115, 72));
        }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
        observer.observe(card);
        observers.push(observer);
      });

      const media = Array.from(panel.querySelectorAll<HTMLElement>(
        '.timeline-slideshow, .timeline-gallery-stage, .timeline-storyboard-frame, .timeline-case-asset-card',
      ));
      media.forEach((item) => {
        const observer = new IntersectionObserver(([entry]) => {
          if (!entry?.isIntersecting) return;
          observer.disconnect();
          const animation = item.animate([
            { opacity: 0, clipPath: 'inset(0 0 100% 0)', transform: 'translate3d(0, 30px, 0) scale(.985)' },
            { opacity: 1, clipPath: 'inset(0 0 0 0)', transform: 'translate3d(0, 0, 0) scale(1)' },
          ], { duration: 1450, easing: cinematicEase, fill: 'backwards' });
          window.setTimeout(() => animation.cancel(), 1550);
          animations.push(animation);
        }, { threshold: .1, rootMargin: '80px 0px -5% 0px' });
        observer.observe(item);
        observers.push(observer);
      });
    }, 40));

    return () => {
      timers.forEach(window.clearTimeout);
      observers.forEach((observer) => observer.disconnect());
      animations.forEach((animation) => animation.cancel());
    };
  }, [timelineKey]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const media = Array.from(document.querySelectorAll<HTMLElement>(
      '#process .process-image img, #process .latest-visual img',
    ));
    const visible = new Set<HTMLElement>();
    let frame = 0;

    const update = () => {
      frame = 0;
      visible.forEach((item) => {
        const rect = item.parentElement?.getBoundingClientRect() ?? item.getBoundingClientRect();
        const progress = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
        const offset = Math.max(-18, Math.min(18, progress * -28));
        item.style.setProperty('--agency-parallax-y', `${offset.toFixed(2)}px`);
      });
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const item = entry.target as HTMLElement;
        if (entry.isIntersecting) visible.add(item);
        else visible.delete(item);
      });
      schedule();
    }, { rootMargin: '120px 0px' });

    media.forEach((item) => {
      item.classList.add('agency-parallax-media');
      observer.observe(item);
    });
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      media.forEach((item) => item.classList.remove('agency-parallax-media'));
    };
  }, []);

  if (!showOpening) return null;

  return (
    <div className="agency-opening" aria-hidden="true">
      <div className="agency-opening-panel agency-opening-panel--top" />
      <div className="agency-opening-panel agency-opening-panel--bottom" />
      <div className="agency-opening-mark">
        <span>Li HaoDong</span>
        <strong>AIGC内容创作-Agent</strong>
        <i />
      </div>
    </div>
  );
}
