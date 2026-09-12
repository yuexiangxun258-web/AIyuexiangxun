'use client';

import { type CSSProperties, type RefObject, type VideoHTMLAttributes, useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { orderItems, TIMELINE_ORDER_KEY, TimelineOrder, timelineAdminCatalog } from './timeline-order';
import CircularGallery from './CircularGallery';
import GlassSurface from './components/GlassSurface';
import FluidGlass from './components/FluidGlass';
import SpecularFrames from './components/SpecularFrames';
import WarpText from './components/WarpText';
import AgencyMotion from './components/AgencyMotion';

const RippleDistortion = dynamic(() => import('./components/RippleDistortion'), { ssr: false });
const Balatro = dynamic(() => import('./components/Balatro'), { ssr: false });
const Iridescence = dynamic(() => import('./components/Iridescence'), { ssr: false });

const Lanyard = dynamic(() => import('./components/Lanyard/Lanyard'), {
  ssr: false,
  loading: () => <div className="download-lanyard-loading" aria-hidden="true" />,
});

type GalleryImage = { src: string; alt: string };
const videoPreview = (src: string) => src;
const R2_VIDEO_BASE_URL = 'https://pub-9b96ac52d99f4c28a93088ba636ccac8.r2.dev/videos';
const r2Video = (filename: string) => `${R2_VIDEO_BASE_URL}/${filename}`;
const MOBILE_PAGE_MEDIA = '(max-width: 760px)';
const NATIVE_TOUCH_SCROLL_MEDIA = '(hover: none), (pointer: coarse), (max-width: 760px)';

type DeferredVideoProps = Omit<VideoHTMLAttributes<HTMLVideoElement>, 'src'> & {
  src: string;
};

function DeferredVideo({ src, className = '', preload = 'metadata', style, onLoadedMetadata, onContextMenu, onDragStart, ...props }: DeferredVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [resolvedAspectRatio, setResolvedAspectRatio] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || shouldLoad) return;
    if (!('IntersectionObserver' in window)) {
      const frame = window.requestAnimationFrame(() => setShouldLoad(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setShouldLoad(true);
      observer.disconnect();
    }, { rootMargin: '240px 0px' });

    observer.observe(video);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <video
      {...props}
      ref={videoRef}
      className={`${className} deferred-video`.trim()}
      controlsList="nodownload noremoteplayback"
      disablePictureInPicture
      disableRemotePlayback
      preload={shouldLoad ? (typeof window !== 'undefined' && window.matchMedia(MOBILE_PAGE_MEDIA).matches ? 'auto' : preload) : 'none'}
      src={shouldLoad ? src : undefined}
      style={{ ...style, ...(resolvedAspectRatio ? { aspectRatio: resolvedAspectRatio } : {}) }}
      data-deferred-src={src}
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenu?.(event);
      }}
      onDragStart={(event) => {
        event.preventDefault();
        onDragStart?.(event);
      }}
      onLoadedMetadata={(event) => {
        const video = event.currentTarget;
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          setResolvedAspectRatio(`${video.videoWidth} / ${video.videoHeight}`);
        }
        video.currentTime = window.matchMedia(MOBILE_PAGE_MEDIA).matches
          ? Math.min(.12, Number.isFinite(video.duration) ? video.duration : .12)
          : 0;
        onLoadedMetadata?.(event);
      }}
    />
  );
}
const heroGlassSurfaceProps = {
  width: '100%',
  height: '100%',
  borderRadius: 24,
  displace: 15,
  distortionScale: 270,
  redOffset: 50,
  greenOffset: 50,
  blueOffset: 50,
  brightness: 85,
  opacity: 0.8,
  mixBlendMode: 'screen' as const,
  frameOnly: true,
};
type InteractiveGalleryProps = {
  group: {
    label: string;
    note: string;
    className: string;
    images: GalleryImage[];
    copy?: string;
  };
};

function InteractiveGallery({ group }: InteractiveGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isThumbnailHovered, setIsThumbnailHovered] = useState(false);

  useEffect(() => {
    if (isThumbnailHovered) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % group.images.length);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [group.images.length, isThumbnailHovered]);

  return (
    <section className={`timeline-gallery-group timeline-gallery-group--interactive ${group.className}`}>
      <div className="timeline-gallery-heading">
        <p>{group.label}</p>
      </div>
      {group.copy ? <p className="timeline-gallery-copy">{group.copy}</p> : null}
      <div className="timeline-gallery-stage">
        {group.images.map((image, imageIndex) => (
          <div
            className={`timeline-gallery-slide${imageIndex === activeIndex ? ' is-active' : ''}`}
            key={image.src}
            aria-hidden={imageIndex !== activeIndex}
          >
            <img className="timeline-gallery-backdrop" src={image.src} alt="" aria-hidden="true" loading="lazy" decoding="async" />
            <img className="timeline-image" src={image.src} alt={image.alt} loading="lazy" decoding="async" />
          </div>
        ))}
      </div>
      <div
        className="timeline-gallery-thumbnails"
        aria-label={`${group.label}画面选择`}
        onMouseLeave={() => setIsThumbnailHovered(false)}
      >
        {group.images.map((image, imageIndex) => (
          <button
            className={`timeline-gallery-thumbnail${imageIndex === activeIndex ? ' is-active' : ''}`}
            type="button"
            key={image.src}
            onMouseEnter={() => {
              setActiveIndex(imageIndex);
              setIsThumbnailHovered(true);
            }}
            onFocus={() => {
              setActiveIndex(imageIndex);
              setIsThumbnailHovered(true);
            }}
            onBlur={() => setIsThumbnailHovered(false)}
            onClick={() => {
              setActiveIndex(imageIndex);
              setIsThumbnailHovered(true);
            }}
            aria-label={`展示${group.label}第 ${imageIndex + 1} 张画面`}
            aria-pressed={imageIndex === activeIndex}
          >
            <img src={image.src} alt="" aria-hidden="true" loading="lazy" decoding="async" />
          </button>
        ))}
      </div>
    </section>
  );
}

const aiToolGroups = [
  { label: '文字 AI', tools: ['豆包', 'ChatGPT', 'Claude'] },
  {
    label: '图片 AI',
    tools: ['Midjourney', 'Stable Diffusion', 'Nano Banana 2', 'GPT Image 2', 'Seedream 5.0'],
  },
  {
    label: '视频 AI',
    tools: ['Seedance 2.0', 'Seedance 2.5', 'MiniMax H3 · 海螺', 'HappyHorse'],
  },
];

const recentWorks = [
  {
    title: '复刻经典电影',
    meta: 'VIDEO · 2026',
    description: '用生成式影像重新组织经典电影的光线、人物关系与叙事节奏，在熟悉的情绪里加入新的镜头表达。',
    src: r2Video('timeline-2026-big-fish-ai-remake.mp4'),
    className: 'work-card work-card--landscape',
  },
  {
    title: '3D 动漫 demo',
    meta: 'VIDEO · 2026',
    description: '围绕三维角色、空间调度和镜头运动完成的动漫短片实验，重点测试画面连续性与角色表现。',
    src: r2Video('recent-work-03.mp4'),
    className: 'work-card work-card--landscape',
  },
  {
    title: 'seedance2.0刚上线时的测试',
    meta: 'VIDEO · 2026',
    description: '根据最初2.0模型制作个人创意短片对AI模型进行测试',
    src: r2Video('timeline-2026-gundam-godzilla-test.mp4'),
    className: 'work-card work-card--portrait',
  },
  {
    title: '武打戏',
    meta: 'VIDEO · 2026',
    description: '通过动作节奏、运镜和环境反馈完成武打场面的生成测试，让连续动作保持力量与方向。',
    src: r2Video('recent-work-01.mp4'),
    className: 'work-card work-card--landscape',
  },
  {
    title: '公司动漫剧制作',
    meta: 'VIDEO · 2026',
    description: '参与公司动漫剧从角色与场景资产到分镜、视频生成、声音和剪辑的完整制作流程。',
    src: r2Video('timeline-2026-animation-drama-preview.mp4'),
    className: 'work-card work-card--landscape',
  },
];

const openingHeroWork = {
  title: '人物微表情的尝试',
  meta: 'SEEDANCE 2.5 · VIDEO',
  description: '以眼神、呼吸和细微表情为核心进行人物动态测试，让静态人物在短镜头中呈现自然、克制的情绪变化。',
  src: r2Video('timeline-2026-seedance-2-5-micro-expression-web.mp4'),
  className: 'work-card work-card--landscape',
};

const heroWorks = [openingHeroWork, ...recentWorks];

type HeroTurn = 'idle' | 'forward' | 'backward';

const formatHeroTime = (seconds: number) => {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${String(Math.floor(safeSeconds % 60)).padStart(2, '0')}`;
};

const startHeroVideoPlayback = (video: HTMLVideoElement) => {
  if (!video.isConnected || video.closest('.section-is-paused')) {
    video.dataset.playbackRequested = 'false';
    video.pause();
    video.muted = true;
    return;
  }
  video.dataset.playbackRequested = 'true';
  video.volume = 1;
  video.defaultMuted = false;
  video.removeAttribute('muted');
  video.muted = false;

  const playWithSound = (attempt = 0) => {
    const playback = video.play();
    if (!playback) return;
    void playback.catch((error: unknown) => {
      if (video.dataset.playbackRequested !== 'true' || !video.isConnected || video.closest('.section-is-paused')) return;
      const errorName = error instanceof DOMException ? error.name : '';
      if (errorName === 'AbortError' && attempt < 2) {
        window.requestAnimationFrame(() => playWithSound(attempt + 1));
        return;
      }
      video.muted = true;
      void video.play().catch(() => undefined);
    });
  };

  playWithSound();
};

type LedVideoRegion = {
  id: number;
  left: number;
  top: number;
  width: number;
  height: number;
  src: string;
};

type LedVideoTrack = {
  src: string;
  startAt: number;
  startedAt: number;
};

type LedVideoBurst = {
  id: number;
  mode: 'ambient' | 'carousel';
  turn: HeroTurn;
  regions: LedVideoRegion[];
  previousRegions?: LedVideoRegion[];
  tracks: LedVideoTrack[];
  previousSrc?: string;
  transitionStartedAt: number;
};

const openingAmbientTrack: LedVideoTrack = {
  src: openingHeroWork.src,
  startAt: 0,
  startedAt: 0,
};

const openingAmbientBurst: LedVideoBurst = {
  id: 0,
  mode: 'ambient',
  turn: 'idle',
  regions: [{
    id: -1,
    left: 0,
    top: 0,
    width: 100,
    height: 100,
    src: openingHeroWork.src,
  }],
  tracks: [openingAmbientTrack],
  transitionStartedAt: 0,
};

function CurvedLedVideo({
  burst,
  syncSourceRef,
  active,
}: {
  burst: LedVideoBurst;
  syncSourceRef: RefObject<HTMLVideoElement | null>;
  active: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!active) {
      Object.values(videoRefs.current).forEach((video) => {
        if (!video) return;
        video.pause();
        video.muted = true;
      });
      return;
    }
    const context = canvas.getContext('2d');
    if (!context) return;
    const isMobileRenderer = window.matchMedia(MOBILE_PAGE_MEDIA).matches;

    // Match the backing canvas to the displayed aspect ratio. Keeping the
    // longer edge capped preserves the video proportions on portrait phones
    // without increasing the number of pixels rendered on desktop.
    let width = 960;
    let height = 540;
    const resizeCanvas = () => {
      const bounds = canvas.parentElement?.getBoundingClientRect();
      const aspect = Math.max(0.35, Math.min(3, (bounds?.width ?? 960) / Math.max(1, bounds?.height ?? 540)));
      const renderEdge = isMobileRenderer ? 640 : 960;
      const minimumEdge = isMobileRenderer ? 224 : 336;
      const nextWidth = aspect >= 1 ? renderEdge : Math.max(minimumEdge, Math.round(renderEdge * aspect));
      const nextHeight = aspect >= 1 ? Math.max(minimumEdge, Math.round(renderEdge / aspect)) : renderEdge;
      width = nextWidth;
      height = nextHeight;
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
    };
    resizeCanvas();
    let frame = 0;

    const warpY = (y: number, x: number) => {
      const distance = (x - width / 2) / (width / 2);
      return height / 2 + (y - height / 2) * (1 + .34 * distance * distance);
    };

    const addRegionPath = (region: LedVideoRegion) => {
      const left = region.left / 100 * width;
      const right = (region.left + region.width) / 100 * width;
      const top = region.top / 100 * height;
      const bottom = (region.top + region.height) / 100 * height;
      const samples = 8;
      for (let step = 0; step <= samples; step += 1) {
        const x = left + (right - left) * step / samples;
        const y = warpY(top, x);
        if (step === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      for (let step = samples; step >= 0; step -= 1) {
        const x = left + (right - left) * step / samples;
        context.lineTo(x, warpY(bottom, x));
      }
      context.closePath();
    };

    const drawWarpedVideo = (video: HTMLVideoElement, regions: LedVideoRegion[], opacity = 1) => {
      if (video.readyState < 2 || video.videoWidth <= 0 || regions.length === 0) return;
      const targetAspect = width / Math.max(1, height);
      const sourceAspect = video.videoWidth / Math.max(1, video.videoHeight);
      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = video.videoWidth;
      let sourceHeight = video.videoHeight;
      if (sourceAspect > targetAspect) {
        sourceWidth = video.videoHeight * targetAspect;
        sourceX = (video.videoWidth - sourceWidth) / 2;
      } else if (sourceAspect < targetAspect) {
        sourceHeight = video.videoWidth / targetAspect;
        sourceY = (video.videoHeight - sourceHeight) / 2;
      }
      context.save();
      context.globalAlpha = opacity;
      context.beginPath();
      regions.forEach(addRegionPath);
      context.clip();
      const strips = isMobileRenderer ? 20 : 40;
      const sourceStrip = sourceWidth / strips;
      const destinationStrip = width / strips;
      for (let strip = 0; strip < strips; strip += 1) {
        const x = strip * destinationStrip;
        const centerX = x + destinationStrip / 2;
        const distance = (centerX - width / 2) / (width / 2);
        const scaleY = 1 + .34 * distance * distance;
        const destinationHeight = height * scaleY;
        const destinationY = (height - destinationHeight) / 2;
        context.drawImage(video, sourceX + strip * sourceStrip, sourceY, sourceStrip + 1, sourceHeight, x, destinationY, destinationStrip + 1, destinationHeight);
      }
      context.restore();
    };

    const fullRegion = (src: string, left = 0, regionWidth = 100): LedVideoRegion => ({
      id: -1,
      left,
      top: 0,
      width: regionWidth,
      height: 100,
      src,
    });

    let previousDrawTime = 0;
    const draw = (now: number) => {
      frame = window.requestAnimationFrame(draw);
      if (now - previousDrawTime < 1000 / (isMobileRenderer ? 24 : 30)) return;
      previousDrawTime = now;
      const source = syncSourceRef.current;
      const currentTrack = burst.tracks[0];
      const sourceMatchesCurrent = Boolean(
        source
        && currentTrack
        && source.getAttribute('src') === currentTrack.src
        && source.readyState >= 2
        && !source.paused,
      );
      const proxyVideo = currentTrack ? videoRefs.current[currentTrack.src] : null;
      if (sourceMatchesCurrent && proxyVideo && !proxyVideo.paused) proxyVideo.pause();
      const currentVideo = sourceMatchesCurrent ? source : proxyVideo;
      if (burst.mode === 'carousel' && source?.readyState && !source.paused && currentVideo?.readyState) {
        if (Math.abs(currentVideo.currentTime - source.currentTime) > .08) currentVideo.currentTime = source.currentTime;
        if (currentVideo.paused) {
          void currentVideo.play().catch(() => undefined);
        }
      }

      context.clearRect(0, 0, width, height);
      if (burst.mode === 'ambient') {
        const previousRegions = burst.previousRegions;
        const elapsed = performance.now() - burst.transitionStartedAt;
        const progress = Math.min(1, Math.max(0, elapsed / 1150));
        const previousByCell = new Map(previousRegions?.map((region) => [region.id, region]) ?? []);
        const currentByCell = new Map(burst.regions.map((region) => [region.id, region]));
        const stable = burst.regions.filter((region) => previousByCell.get(region.id)?.src === region.src);
        const leaving = previousRegions?.filter((region) => currentByCell.get(region.id)?.src !== region.src) ?? [];
        const entering = burst.regions.filter((region) => previousByCell.get(region.id)?.src !== region.src);
        const fadeOut = progress < .48 ? 1 - progress / .48 : 0;
        const fadeIn = progress <= .48 ? 0 : Math.min(1, (progress - .48) / .52);

        const drawGrouped = (regions: LedVideoRegion[], opacity: number) => {
          burst.tracks.forEach((track) => {
            const video = videoRefs.current[track.src];
            if (!video) return;
            drawWarpedVideo(video, regions.filter((region) => region.src === track.src), opacity);
          });
        };

        if (!previousRegions) drawGrouped(burst.regions, 1);
        else {
          drawGrouped(stable, 1);
          drawGrouped(leaving, fadeOut);
          drawGrouped(entering, fadeIn);
        }
      } else if (currentTrack && currentVideo) {
        const previousVideo = burst.previousSrc ? videoRefs.current[burst.previousSrc] : null;
        const elapsed = performance.now() - burst.transitionStartedAt;
        const progress = Math.min(1, Math.max(0, elapsed / 1080));
        const eased = 1 - Math.pow(1 - progress, 3);

        if (previousVideo && burst.turn !== 'idle' && progress < 1) {
          drawWarpedVideo(previousVideo, [fullRegion(burst.previousSrc ?? currentTrack.src)], 1 - eased);
          drawWarpedVideo(currentVideo, [fullRegion(currentTrack.src)], eased);
        } else {
          drawWarpedVideo(currentVideo, [fullRegion(currentTrack.src)]);
        }
      }
    };

    const cleanups = burst.tracks.map((track) => {
      const video = videoRefs.current[track.src];
      if (!video) return () => undefined;
      const startPlayback = () => {
        const elapsed = track.startedAt > 0
          ? Math.max(0, (Date.now() - track.startedAt) / 1000)
          : 0;
        const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
        video.currentTime = (track.startAt + elapsed) % duration;
        void video.play().catch(() => undefined);
      };
      video.addEventListener('loadedmetadata', startPlayback);
      if (video.readyState >= 1) startPlayback();
      return () => video.removeEventListener('loadedmetadata', startPlayback);
    });
    const resizeObserver = new ResizeObserver(resizeCanvas);
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);
    frame = window.requestAnimationFrame(draw);
    const mountedVideos = burst.tracks
      .map((track) => videoRefs.current[track.src])
      .filter((video): video is HTMLVideoElement => Boolean(video));
    return () => {
      cleanups.forEach((cleanup) => cleanup());
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mountedVideos.forEach((video) => {
        video.pause();
        video.muted = true;
      });
    };
  }, [active, burst, syncSourceRef]);

  return (
    <div className="hero-led-video-screen">
      <canvas ref={canvasRef} />
      {burst.tracks.map((track) => (
        <video
          key={track.src}
          ref={(video) => { videoRefs.current[track.src] = video; }}
          data-playback-proxy="true"
          muted
          playsInline
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          disableRemotePlayback
          preload="auto"
          loop
          src={track.src}
        />
      ))}
    </div>
  );
}

const timeline = [
  {
    year: '2023',
    phase: '初识对话',
    title: '从一次 AI 对话开始',
    copy: '首次接触 ChatGPT，通过持续对话理解生成式 AI 的表达方式，也由此打开了对人工智能创作的最初想象。',
    tag: '文本探索',
    images: [
      {
        src: '/images/timeline-2023.webp',
        alt: '2023 年首次使用 ChatGPT 进行 AI 对话的截图',
      },
    ],
    galleries: [],
    storyboard: null,
    videoCases: [],
  },
  {
    year: '2024',
    phase: '图像设计',
    title: '把想法转译成视觉画面',
    copy: '开始使用 Midjourney 进行图片设计，在提示词、构图和风格实验中建立对 AI 图像生成的基础认识。',
    tag: 'Midjourney',
    images: [],
    galleries: [
      {
        label: '横构图作品',
        note: '3 张轮播 · 完整画面',
        className: 'timeline-gallery-group--landscape',
        images: [
          { src: '/images/timeline-2024-07.webp', alt: '2024 年 Midjourney 横构图作品 01' },
          { src: '/images/timeline-2024-08.webp', alt: '2024 年 Midjourney 横构图作品 02' },
          { src: '/images/timeline-2024-09.webp', alt: '2024 年 Midjourney 横构图作品 03' },
        ],
      },
      {
        label: '竖构图作品',
        note: '6 张轮播 · 完整画面',
        className: 'timeline-gallery-group--portrait',
        images: [
          { src: '/images/timeline-2024-01.webp', alt: '2024 年 Midjourney 竖构图作品 01' },
          { src: '/images/timeline-2024-02.webp', alt: '2024 年 Midjourney 竖构图作品 02' },
          { src: '/images/timeline-2024-03.webp', alt: '2024 年 Midjourney 竖构图作品 03' },
          { src: '/images/timeline-2024-04.webp', alt: '2024 年 Midjourney 竖构图作品 04' },
          { src: '/images/timeline-2024-05.webp', alt: '2024 年 Midjourney 竖构图作品 05' },
          { src: '/images/timeline-2024-06.webp', alt: '2024 年 Midjourney 竖构图作品 06' },
        ],
      },
      {
        label: 'MJ 场景创作',
        note: '4 张轮播 · 完整画面',
        copy: '尝试使用 MJ 进行场景创作。',
        className: 'timeline-gallery-group--four-landscape',
        images: [
          { src: '/images/timeline-2024-mj-scene-01.webp', alt: '2024 年 Midjourney 场景创作 01' },
          { src: '/images/timeline-2024-mj-scene-02.webp', alt: '2024 年 Midjourney 场景创作 02' },
          { src: '/images/timeline-2024-mj-scene-03.webp', alt: '2024 年 Midjourney 场景创作 03' },
          { src: '/images/timeline-2024-mj-scene-04.webp', alt: '2024 年 Midjourney 场景创作 04' },
        ],
      },
    ],
    storyboard: null,
    videoCases: [],
  },
  {
    year: '2025',
    phase: '进入行业',
    title: '从本地部署走向完整制作',
    copy: '本地部署 Stable Diffusion，系统学习 WebUI 与 ComfyUI；同年进入 AI 行业，开始全流程制作 AI 漫剧，参与剧本拆解、人物与场景道具资产创作、分镜制作、视频生成、配音和剪辑。',
    tag: 'AI 漫剧全流程',
    images: [],
    galleries: [],
    storyboard: {
      title: 'AI 漫剧连续分镜',
      note: '4 张分镜 · 剧情连续展示',
      frames: [
        { src: '/images/timeline-2025-storyboard-01.webp', alt: '2025 年 AI 漫剧分镜 01' },
        { src: '/images/timeline-2025-storyboard-02.webp', alt: '2025 年 AI 漫剧分镜 02' },
        { src: '/images/timeline-2025-storyboard-03.webp', alt: '2025 年 AI 漫剧分镜 03' },
        { src: '/images/timeline-2025-storyboard-04.webp', alt: '2025 年 AI 漫剧分镜 04' },
      ],
      video: r2Video('timeline-2025-generated.mp4'),
    },
    processAssets: {
      copy: '保留的一部分制作流程资产。',
      characters: [
        {
          src: '/images/timeline-2025-process-character-female.webp',
          alt: '2025 年制作流程女主角色资产',
          title: '女主角色资产',
        },
        {
          src: '/images/timeline-2025-process-character-male.webp',
          alt: '2025 年制作流程男主角色资产',
          title: '男主角色资产',
        },
      ],
      scenes: [
        {
          src: '/images/timeline-2025-process-scene-night-town.webp',
          alt: '2025 年制作流程古风夜景场景资产',
          title: '古风夜景场景资产',
        },
      ],
      storyboards: [
        { src: '/images/timeline-2025-process-storyboard-00.webp', alt: '2025 年制作流程分镜 00' },
        { src: '/images/timeline-2025-process-storyboard-01.webp', alt: '2025 年制作流程分镜 01' },
        { src: '/images/timeline-2025-process-storyboard-02.webp', alt: '2025 年制作流程分镜 02' },
        { src: '/images/timeline-2025-process-storyboard-03.webp', alt: '2025 年制作流程分镜 03' },
        { src: '/images/timeline-2025-process-storyboard-04.webp', alt: '2025 年制作流程分镜 04' },
        { src: '/images/timeline-2025-process-storyboard-05.webp', alt: '2025 年制作流程分镜 05' },
        { src: '/images/timeline-2025-process-storyboard-06.webp', alt: '2025 年制作流程分镜 06' },
        { src: '/images/timeline-2025-process-storyboard-07.webp', alt: '2025 年制作流程分镜 07' },
      ],
    },
    videoCases: [],
  },
  {
    year: '2026',
    phase: '模型跃迁',
    title: '建立稳定的主力模型组合',
    copy: 'Seedance 2.0 将视频提高到一个高度。',
    tag: '多模态工作流',
    images: [],
    galleries: [],
    storyboard: null,
    videoCases: [
      {
        title: '武侠风格的尝试',
        note: 'SEEDANCE 2.0 · VIDEO REFERENCE · 02',
        copy: '使用 Seedance 2.0 的视频参考功能，通过白膜生成视频。',
        format: 'landscape',
        assets: null,
        src: r2Video('recent-work-01.mp4'),
      },
      {
        title: '思考如何将镜头感写进提示词',
        note: 'SEEDANCE 2.0 · CAMERA LANGUAGE · 03',
        copy: '考虑怎么将 Seedance 2.0 的模型功能优点进行放大。',
        format: 'portrait',
        assets: null,
        src: r2Video('timeline-2026-camera-language-prompt.mp4'),
      },
      {
        title: '第一次使用seedance2.0进行仿真人的短剧的制作',
        note: 'SEEDANCE 2.0 · PHOTOREAL DRAMA · 04',
        copy: '开始根据标准的 AI 短剧流程做资产和视频。',
        format: 'portrait',
        assets: {
          characters: [
            {
              src: '/images/timeline-2026-photoreal-character-su-qingyan.webp',
              alt: '苏清妍常服人物多角度资产图',
              title: '苏清妍 · 常服三视图',
            },
            {
              src: '/images/timeline-2026-photoreal-character-lin-xubai.webp',
              alt: '林序白人物多角度资产图',
              title: '林序白 · 人物三视图',
            },
          ],
          scenes: [
            {
              src: '/images/timeline-2026-photoreal-scene-cafe.webp',
              alt: 'AI 短剧咖啡馆场景资产',
              title: '咖啡馆',
            },
            {
              src: '/images/timeline-2026-photoreal-scene-restaurant.webp',
              alt: 'AI 短剧餐厅场景资产',
              title: '餐厅',
            },
            {
              src: '/images/timeline-2026-photoreal-scene-classroom.webp',
              alt: 'AI 短剧教室场景资产',
              title: '教室',
            },
          ],
          props: [],
        },
        src: r2Video('timeline-2026-photoreal-drama-first.mp4'),
      },
      {
        title: '动漫短剧制作',
        note: 'AI ANIMATION DRAMA · ASSET PIPELINE · 05',
        copy: '开始思考将运镜和画面效果加入视频创作。',
        format: 'landscape',
        assets: {
          characters: [
            {
              src: '/images/timeline-2026-animation-character-jiang-chen.webp',
              alt: '动漫短剧角色江辰多角度人物资产图',
              title: '江辰 · 人物设定',
            },
            {
              src: '/images/timeline-2026-animation-character-tribesman-yi.webp',
              alt: '动漫短剧角色部落乙多角度人物资产图',
              title: '部落乙 · 人物设定',
            },
            {
              src: '/images/timeline-2026-animation-character-ling.webp',
              alt: '动漫短剧角色灵多角度人物资产图',
              title: '灵 · 人物设定',
            },
          ],
          props: [
            {
              src: '/images/timeline-2026-animation-prop-ov-console.webp',
              alt: '动漫短剧 OV 恐龙驾驶器合成台道具资产',
              title: 'OV 驾驶台',
            },
            {
              src: '/images/timeline-2026-animation-prop-ov-interface.webp',
              alt: '动漫短剧 OV 系统公告界面道具资产',
              title: 'OV 界面',
            },
            {
              src: '/images/timeline-2026-animation-prop-ov-furniture.webp',
              alt: '动漫短剧 OV 家具合成工作台道具资产',
              title: 'OV 家具',
            },
          ],
          scenes: [
            {
              src: '/images/timeline-2026-animation-scene-coastal-rocks-day.webp',
              alt: '动漫短剧海边礁石白天场景资产',
              title: '海边礁石 · 日',
            },
            {
              src: '/images/timeline-2026-animation-scene-immortal-tribe-square-day.webp',
              alt: '动漫短剧不朽部落广场白天场景资产',
              title: '不朽部落广场 · 日',
            },
            {
              src: '/images/timeline-2026-animation-scene-coastal-camp-day.webp',
              alt: '动漫短剧海边营地白天场景资产',
              title: '海边营地 · 日',
            },
          ],
        },
        src: r2Video('timeline-2026-animation-drama-preview.mp4'),
      },
      {
        title: '古风类 3D 漫全流程制作',
        note: 'ANCIENT STYLE 3D DRAMA · ASSET PIPELINE · 06',
        copy: '开始尝试不同的运镜和表达方式。',
        format: 'landscape',
        assets: {
          characters: [
            {
              src: '/images/timeline-2026-ancient-3d-character-empress.webp',
              alt: '古风 3D 漫女帝多角度人物资产图',
              title: '女帝 · 人物设定',
            },
            {
              src: '/images/timeline-2026-ancient-3d-character-duangen-cultivator.webp',
              alt: '古风 3D 漫断根修士多角度人物资产图',
              title: '断根修士 · 人物设定',
            },
            {
              src: '/images/timeline-2026-ancient-3d-character-ling-xuanchen.webp',
              alt: '古风 3D 漫凌玄宸多角度人物资产图',
              title: '凌玄宸 · 人物设定',
            },
          ],
          props: [
            {
              src: '/images/timeline-2026-ancient-3d-prop-giant-sword.webp',
              alt: '古风 3D 漫巨剑道具资产图',
              title: '巨剑 · 道具设定',
            },
          ],
          scenes: [
            {
              src: '/images/timeline-2026-ancient-3d-scene-platform-overlook.webp',
              alt: '古风 3D 漫高台俯视场景资产',
              title: '高台俯视',
            },
            {
              src: '/images/timeline-2026-ancient-3d-scene-demon-throne.webp',
              alt: '古风 3D 漫魔王王座场景资产',
              title: '魔王王座',
            },
            {
              src: '/images/timeline-2026-ancient-3d-scene-alliance-hall.webp',
              alt: '古风 3D 漫真联盟大殿场景资产',
              title: '真联盟 · 大殿',
            },
          ],
        },
        src: r2Video('timeline-2026-ancient-3d-drama-preview-01.mp4'),
        additionalVideos: [
          {
            src: r2Video('timeline-2026-ancient-3d-drama-preview-02.mp4'),
            format: 'portrait',
          },
          {
            src: r2Video('timeline-2026-ancient-3d-drama-opening-hook.mp4'),
            format: 'portrait',
          },
        ],
      },
      {
        title: '人物微表情的尝试',
        note: 'SEEDANCE 2.5 · MICRO EXPRESSION · 07',
        copy: 'Seedance 2.5 的发布，开始尝试让人物拥有微表情。',
        format: 'landscape',
        assets: null,
        src: r2Video('timeline-2026-seedance-2-5-micro-expression.mp4'),
      },
      {
        title: '第一人称视角的尝试',
        note: 'SEEDANCE · FIRST PERSON VIEW · 08',
        copy: '开始尝试第一人称视角的提示词撰写。',
        format: 'landscape',
        assets: null,
        src: r2Video('timeline-2026-first-person-prompt.mp4'),
        additionalVideos: [
          {
            src: r2Video('timeline-2026-first-person-full-film.mp4'),
            format: 'landscape',
            copy: '第一人称下的全片效果',
          },
        ],
      },
      {
        title: '运镜学习的尝试',
        note: 'CAMERA MOVEMENT · STUDY · 09',
        copy: '尝试学习运镜。',
        format: 'landscape',
        assets: null,
        src: r2Video('timeline-2026-camera-movement-study.mp4'),
      },
      {
        title: '视频模型测试',
        note: 'MODEL TEST · PRE-SEEDANCE 2.0 · 10',
        copy: 'Seedance 2.0 发布之前测试的各个视频模型展示。',
        format: 'landscape',
        assets: null,
        src: null,
        modelTestVideos: [
          r2Video('timeline-2026-model-test-01.mp4'),
          r2Video('timeline-2026-model-test-02.mp4'),
          r2Video('timeline-2026-model-test-03.mp4'),
          r2Video('timeline-2026-model-test-04.mp4'),
          r2Video('timeline-2026-model-test-05.mp4'),
          r2Video('timeline-2026-model-test-06.mp4'),
        ],
      },
      {
        title: '机甲怪兽对决测试',
        note: 'SEEDANCE 2.0 · TEST VIDEO · 11',
        copy: 'Seedance 2.0 上线制作的第二支测试视频。',
        format: 'landscape',
        assets: {
          characters: [
            {
              src: '/images/timeline-2026-gundam-test-character-gundam.webp',
              alt: '机甲怪兽对决测试中的高达人物资产',
              title: '高达 · 人物设定',
            },
            {
              src: '/images/timeline-2026-gundam-test-character-godzilla.webp',
              alt: '机甲怪兽对决测试中的哥斯拉人物资产',
              title: '哥斯拉 · 人物设定',
            },
          ],
          props: [],
          scenes: [
            { src: '/images/timeline-2026-gundam-test-scene-01.webp', alt: '机甲怪兽对决测试工厂场景 01', title: '机甲工厂 · 全景' },
            { src: '/images/timeline-2026-gundam-test-scene-02.webp', alt: '机甲怪兽对决测试工厂场景 02', title: '机甲工厂 · 仰视' },
            { src: '/images/timeline-2026-gundam-test-scene-03.webp', alt: '机甲怪兽对决测试工厂场景 03', title: '机甲工厂 · 俯视' },
            { src: '/images/timeline-2026-gundam-test-scene-04.webp', alt: '机甲怪兽对决测试废墟道路场景', title: '废墟道路' },
            { src: '/images/timeline-2026-gundam-test-scene-05.webp', alt: '机甲怪兽对决测试坍塌城市场景', title: '坍塌城市' },
            { src: '/images/timeline-2026-gundam-test-scene-06.webp', alt: '机甲怪兽对决测试废墟战场场景', title: '废墟战场' },
            { src: '/images/timeline-2026-gundam-test-scene-07.webp', alt: '机甲怪兽对决测试高达工厂画面 01', title: '高达装配 · 01' },
            { src: '/images/timeline-2026-gundam-test-scene-08.webp', alt: '机甲怪兽对决测试高达工厂画面 02', title: '高达装配 · 02' },
            { src: '/images/timeline-2026-gundam-test-scene-09.webp', alt: '机甲怪兽对决测试高达工厂画面 03', title: '高达装配 · 03' },
          ],
          storyboards: [
            { src: '/images/timeline-2026-gundam-test-storyboard-03.webp', alt: '机甲怪兽对决测试分镜 03', title: '高达登场' },
            { src: '/images/timeline-2026-gundam-test-storyboard-06.webp', alt: '机甲怪兽对决测试分镜 06', title: '高达启动' },
            { src: '/images/timeline-2026-gundam-test-storyboard-04.webp', alt: '机甲怪兽对决测试分镜 04', title: '工厂中的高达' },
            { src: '/images/timeline-2026-gundam-test-storyboard-01.webp', alt: '机甲怪兽对决测试分镜 01', title: '末日道路' },
            { src: '/images/timeline-2026-gundam-test-storyboard-05.webp', alt: '机甲怪兽对决测试分镜 05', title: '城市废墟' },
            { src: '/images/timeline-2026-gundam-test-storyboard-02.webp', alt: '机甲怪兽对决测试分镜 02', title: '机甲与怪兽对峙' },
          ],
        },
        src: r2Video('timeline-2026-gundam-godzilla-test.mp4'),
      },
      {
        title: '公司 Logo 与宣传片制作',
        note: 'SEEDANCE 2.0 · BRAND MOTION · 12',
        copy: '使用 Seedance 2.0 为公司制定 Logo 和宣传片。',
        format: 'landscape',
        assets: null,
        logoVideos: [
          { src: r2Video('timeline-2026-company-logo-01.mp4'), title: '公司 Logo 动效 · 01' },
          { src: r2Video('timeline-2026-company-logo-02.mp4'), title: '漫剧 Logo 动效 · 02' },
          { src: r2Video('timeline-2026-company-logo-03.mp4'), title: '漫剧 Logo 动效 · 03' },
        ],
        src: r2Video('timeline-2026-company-promo-film.mp4'),
      },
      {
        title: '3D 漫的制作',
        note: '3D ANIMATION · FINISHED FILM · 13',
        copy: '3D 漫的制作。',
        format: 'landscape',
        assets: null,
        src: r2Video('timeline-2026-3d-animation-production.mp4'),
      },
      {
        title: '人物微表情的测试',
        note: 'MICRO EXPRESSION · PERFORMANCE TEST · 14',
        copy: '人物微表情的测试。',
        format: 'landscape',
        assets: null,
        src: r2Video('timeline-2026-micro-expression-test-01.mp4'),
        additionalVideos: [
          {
            src: r2Video('timeline-2026-micro-expression-test-02.mp4'),
            format: 'landscape',
          },
        ],
      },
      {
        title: '抖音热点素材制作',
        note: 'DOUYIN TREND · CONTENT CREATION · 15',
        copy: '以及制作各类抖音热点素材。',
        format: 'landscape',
        assets: null,
        src: null,
        horizontalVideos: [
          { src: r2Video('timeline-2026-douyin-trend-03.mp4'), title: '热点素材 · 03' },
          { src: r2Video('timeline-2026-douyin-trend-09.mp4'), title: '热点素材 · 09' },
          { src: r2Video('timeline-2026-douyin-trend-01.mp4'), title: '热点素材 · 01' },
          { src: r2Video('timeline-2026-douyin-trend-02.mp4'), title: '热点素材 · 02' },
          { src: r2Video('timeline-2026-douyin-trend-04.mp4'), title: '热点素材 · 04' },
          { src: r2Video('timeline-2026-douyin-trend-05.mp4'), title: '热点素材 · 05' },
          { src: r2Video('timeline-2026-douyin-trend-06.mp4'), title: '热点素材 · 06' },
          { src: r2Video('timeline-2026-douyin-trend-07.mp4'), title: '热点素材 · 07' },
          { src: r2Video('timeline-2026-douyin-trend-08.mp4'), title: '热点素材 · 08' },
        ],
      },
      {
        title: '抖音教程视频制作',
        note: 'DOUYIN TUTORIAL · CONTENT CREATION · 16',
        copy: '制作抖音教程视频。',
        format: 'portrait',
        assets: null,
        src: r2Video('timeline-2026-douyin-tutorial-01.mp4'),
        additionalVideos: [
          {
            src: r2Video('timeline-2026-douyin-tutorial-02.mp4'),
            format: 'portrait',
          },
        ],
      },
      {
        title: '海外剧 demo',
        note: 'OVERSEAS DRAMA · VIDEO · 17',
        copy: '面向海外短剧风格完成的人物、场景和情绪片段测试，强化故事钩子与电影化氛围。',
        format: 'landscape',
        assets: {
          characters: [
            {
              src: '/images/timeline-2026-overseas-drama/dominic-character.webp',
              alt: '海外剧 demo 角色多米尼克人物资产图',
              title: '多米尼克 · 人物设定',
            },
            {
              src: '/images/timeline-2026-overseas-drama/nadia-character.webp',
              alt: '海外剧 demo 角色娜迪亚人物资产图',
              title: '娜迪亚 · 人物设定',
            },
            {
              src: '/images/timeline-2026-overseas-drama/elena-character.webp',
              alt: '海外剧 demo 角色埃琳娜人物资产图',
              title: '埃琳娜 · 人物设定',
            },
          ],
          props: [],
          scenes: [
            {
              src: '/images/timeline-2026-overseas-drama/elizabeth-baroque-tea-room.webp',
              alt: '海外剧 demo 伊丽莎白巴洛克风格茶室场景资产',
              title: '伊丽莎白巴洛克茶室',
            },
            {
              src: '/images/timeline-2026-overseas-drama/elizabeth-baroque-villa-hall.webp',
              alt: '海外剧 demo 伊丽莎白巴洛克风格别墅大厅场景资产',
              title: '伊丽莎白巴洛克别墅大厅',
            },
            {
              src: '/images/timeline-2026-overseas-drama/vance-manor-rainy-night.webp',
              alt: '海外剧 demo 凡斯庄园大门正庭雨夜场景资产',
              title: '凡斯庄园大门正庭 · 雨夜',
            },
          ],
        },
        src: r2Video('recent-work-02.mp4'),
      },
    ],
  },
  {
    year: 'NOW',
    phase: '全流程整合',
    title: '将一份剧本完整制作成片',
    copy: '结合前期对 AI 影视全流程的实践，以及后期对 Codex Skill 的编写与应用，现已具备从剧本理解、资产与分镜设计、视频生成到声音剪辑的完整成片能力。',
    tag: '剧本到成片',
    images: [],
    galleries: [
      {
        label: '主要角色',
        note: '4 张人设图',
        className: 'timeline-gallery-group--project-main',
        images: [
          { src: '/images/project15-characters/main-bulaina.webp', alt: '主要角色：布莱娜（女主）四视角人设' },
          { src: '/images/project15-characters/main-zefier.webp', alt: '主要角色：泽菲尔四视角人设' },
          { src: '/images/project15-characters/main-aofeiliya.webp', alt: '主要角色：奥菲莉亚四视角人设' },
          { src: '/images/project15-characters/main-first-person.webp', alt: '主要角色：第一人称视角人设' },
        ],
      },
      {
        label: '配角',
        note: '35 张白底人设图',
        className: 'timeline-gallery-group--project-supporting',
        images: [
          { src: '/images/project15-characters/secondary-01-barnaby.webp', alt: '配角：巴纳比' },
          { src: '/images/project15-characters/secondary-02-brandon.webp', alt: '配角：布兰登' },
          { src: '/images/project15-characters/secondary-03-newspaper-cat.webp', alt: '配角：看报纸的猫' },
          { src: '/images/project15-characters/secondary-04-lizard-beastman.webp', alt: '配角：蜥蜴半兽人' },
          { src: '/images/project15-characters/secondary-05-dwarf.webp', alt: '配角：矮人' },
          { src: '/images/project15-characters/secondary-06-orc.webp', alt: '配角：半兽人' },
          { src: '/images/project15-characters/secondary-07-orc-miner.webp', alt: '配角：半兽人矿工' },
          { src: '/images/project15-characters/secondary-08-greatsword-knight.webp', alt: '配角：大剑剑士' },
          { src: '/images/project15-characters/secondary-09-crocodile-beastman.webp', alt: '配角：鳄鱼半兽人' },
          { src: '/images/project15-characters/secondary-10-mage.webp', alt: '配角：法师' },
          { src: '/images/project15-characters/secondary-11-mage-and-swordsman.webp', alt: '配角：法师与剑士' },
          { src: '/images/project15-characters/secondary-12-goblin.webp', alt: '配角：哥布林' },
          { src: '/images/project15-characters/secondary-13-king.webp', alt: '配角：国王' },
          { src: '/images/project15-characters/secondary-14-skeleton-soldier.webp', alt: '配角：骷髅兵' },
          { src: '/images/project15-characters/secondary-15-two-dwarves.webp', alt: '配角：两个矮人' },
          { src: '/images/project15-characters/secondary-16-traveler.webp', alt: '配角：旅人' },
          { src: '/images/project15-characters/secondary-17-adventurer.webp', alt: '配角：冒险者' },
          { src: '/images/project15-characters/secondary-18-succubus.webp', alt: '配角：魅魔' },
          { src: '/images/project15-characters/secondary-19-minotaur.webp', alt: '配角：牛头人' },
          { src: '/images/project15-characters/secondary-20-shop-clerk.webp', alt: '配角：女店员' },
          { src: '/images/project15-characters/secondary-21-shop-clerk-2.webp', alt: '配角：女店员2' },
          { src: '/images/project15-characters/secondary-22-female-mage.webp', alt: '配角：女法师' },
          { src: '/images/project15-characters/secondary-23-witch.webp', alt: '配角：女巫' },
          { src: '/images/project15-characters/secondary-24-human-knight.webp', alt: '配角：人类骑士' },
          { src: '/images/project15-characters/secondary-25-saint.webp', alt: '配角：圣女' },
          { src: '/images/project15-characters/secondary-26-slime.webp', alt: '配角：史莱姆' },
          { src: '/images/project15-characters/secondary-27-guard.webp', alt: '配角：守卫' },
          { src: '/images/project15-characters/secondary-28-vendor.webp', alt: '配角：摊贩' },
          { src: '/images/project15-characters/secondary-29-vampire.webp', alt: '配角：吸血鬼' },
          { src: '/images/project15-characters/secondary-30-12.webp', alt: '配角：12' },
          { src: '/images/project15-characters/secondary-31-white-robed-mage.webp', alt: '配角：白袍法师' },
          { src: '/images/project15-characters/secondary-32-gremlin.webp', alt: '配角：地精' },
          { src: '/images/project15-characters/secondary-33-cyclops.webp', alt: '配角：独眼巨人' },
          { src: '/images/project15-characters/secondary-34-team-member.webp', alt: '配角：队员' },
          { src: '/images/project15-characters/secondary-35-troll.webp', alt: '配角：巨魔' },
        ],
      },
      {
        label: '场景',
        note: '16 张场景图',
        className: 'timeline-gallery-group--project-scenes',
        images: [
          { src: '/images/project15-scenes/scene-01.webp', alt: '场景：山间木屋' },
          { src: '/images/project15-scenes/scene-02.webp', alt: '场景：山巅王城' },
          { src: '/images/project15-scenes/scene-03.webp', alt: '场景：浮空环形城' },
          { src: '/images/project15-scenes/scene-04.webp', alt: '场景：云海浮空城' },
          { src: '/images/project15-scenes/scene-05.webp', alt: '场景：山间城堡' },
          { src: '/images/project15-scenes/scene-06.webp', alt: '场景：公会大厅' },
          { src: '/images/project15-scenes/scene-07.webp', alt: '场景：云海浮岛' },
          { src: '/images/project15-scenes/scene-08.webp', alt: '场景：巨剑山谷' },
          { src: '/images/project15-scenes/scene-09.webp', alt: '场景：矿区集市' },
          { src: '/images/project15-scenes/scene-10.webp', alt: '场景：小镇上空' },
          { src: '/images/project15-scenes/scene-11.webp', alt: '场景：城镇集市' },
          { src: '/images/project15-scenes/scene-13.webp', alt: '场景：云端长桥与宫殿' },
          { src: '/images/project15-scenes/scene-14.webp', alt: '场景：草原小镇全景' },
          { src: '/images/project15-scenes/scene-15.webp', alt: '场景：云涡王城' },
          { src: '/images/project15-scenes/scene-16.webp', alt: '场景：云端悬浮建筑' },
          { src: '/images/project15-scenes/scene-17.webp', alt: '场景：王城集市' },
        ],
      },
    ],
    resultVideo: {
      title: '成片效果',
      note: 'FINAL VIDEO · 01',
      src: r2Video('timeline-2026-first-person-full-film.mp4'),
    },
    storyboard: null,
    videoCases: [],
  },
];

const workflow = [
  {
    number: '01',
    title: '剧本理解',
    en: 'ANALYZE',
    image: '/images/workflow/process-01-analyze-hospital.webp',
    imageAlt: '剧本理解流程示意：以第 18-3 场医院门口剧本和车内画面为例，分析人物关系、场景与道具，梳理观察、预警和判断的叙事脉络。',
    copy: '先将剧本交给 AI 熟读，使其深入理解故事内容，以及人物、场景和道具之间的关系。',
  },
  {
    number: '02',
    title: '制定方案',
    en: 'DEFINE',
    image: '/images/workflow/process-02-define-hospital.webp',
    imageAlt: '制定方案流程示意：以 16:9 横屏仿真人短剧的医院门口车内观察和对话画面为例，确定导演思路、夜景风格与镜头节奏，再经人工筛选确认。',
    copy: '与 AI 对话，补全已明确要求之外的制作数据。以 16:9 横屏仿真人漫剧为例，继续确定导演思路、画面风格与镜头节奏，并对 AI 建议进行筛选、修改和采用。',
  },
  {
    number: '03',
    title: '资产生成',
    en: 'ASSETS',
    image: '/images/workflow/process-03-assets-hospital.webp',
    imageAlt: '资产生成介绍图：沈微与 MK马 的多角度人物设定、医院正门夜景主视图及完整场景九宫格，按人物资产到场景资产排列。AI 排版流程示意。',
    copy: '使用 Codex 搭建的捏脸 Skill 与场景风格 Skill，输出人物、场景资产提示词；先用 Midjourney 生成人物五官白底特写，再用 GPT Image 2 完成多角度人物资产。',
  },
  {
    number: '04',
    title: '分镜提示词',
    en: 'DIRECT',
    image: '/images/workflow/process-04-direct-hospital.webp',
    imageAlt: 'Codex 导演 Skill 流程示意：输入医院门口剧本，拆分车内全景和人物对话镜头，生成 16:9 横屏视频提示词，再经人工修订进入生成。AI 生成示意图，非实际软件截图。',
    copy: '使用本地搭建的导演 Skill，根据剧本剧情生成视频输出提示词；再依照项目预算与精细化要求，选择人工修订或直接投入生成。',
  },
  {
    number: '05',
    title: '剪辑与声音',
    en: 'FINISH',
    image: '/images/workflow/process-05-finish-hospital.webp',
    imageAlt: '剪辑与声音介绍图：基于两张用户提供的剪辑截图，展示车内对话镜头衔接、多轨剪辑时间线及声音层次编排。AI 排版流程示意。',
    copy: '完成成片剪辑，并使用 AI 进行角色配音与配乐，统一画面节奏、声音层次和最终输出效果。',
  },
  {
    number: '06',
    title: '成片输出',
    en: 'DELIVER',
    video: r2Video('workflow-06-final-hospital.mp4'),
    copy: '根据发布平台与项目需求，输出对应画幅、分辨率和编码版本；完成最终质量检查、文件整理与项目归档。',
  },
];

const pauseInactiveSections = (activeId: string) => {
  document.querySelectorAll<HTMLElement>('main > section').forEach((section) => {
    const isActive = section.id === activeId;
    section.classList.toggle('section-is-paused', !isActive);
    if (isActive) return;
    section.querySelectorAll<HTMLMediaElement>('video, audio').forEach((media) => {
      media.dataset.playbackRequested = 'false';
      media.pause();
      media.muted = true;
    });
  });
};

const timelineYearHoverLabels: Record<string, string> = {
  '2023': '接触',
  '2024': '学习',
  '2025': '部署',
  '2026': '发展',
  NOW: '整合',
};

const gooeyParticleColors = ['#7dfff0', '#ffffff', '#ff8bd8', '#8aa8ff', '#dfff79'];

export default function Home() {
  const heroIntroRef = useRef<HTMLDivElement | null>(null);
  const siteNavRef = useRef<HTMLElement | null>(null);
  const siteNavPillRef = useRef<HTMLSpanElement | null>(null);
  const siteNavPillLabelRef = useRef<HTMLSpanElement | null>(null);
  const siteNavLinkRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const heroMainVideoRef = useRef<HTMLVideoElement | null>(null);
  const heroCarouselVideoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const heroTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const heroExitStepRef = useRef(0);
  const ledBurstIdRef = useRef(0);
  const ambientRegionsRef = useRef<LedVideoRegion[]>(openingAmbientBurst.regions);
  const ambientTracksRef = useRef<Record<string, LedVideoTrack>>({
    [openingHeroWork.src]: openingAmbientTrack,
  });
  const heroStageRef = useRef(0);
  const heroWorkIndexRef = useRef(0);
  const lastHeroStepRef = useRef(0);
  const heroGateUnlockedRef = useRef(false);
  const previousScrollYRef = useRef(0);
  const boundarySnapInProgressRef = useRef(false);
  const activeSectionIdRef = useRef('top');
  const lastSectionTransitionAtRef = useRef(0);
  const sectionBoundaryIntentRef = useRef({ key: '', armedAt: 0 });
  const timelineReturnArmedRef = useRef(false);
  const timelineExitArmedRef = useRef(false);
  const processReturnArmedRef = useRef(false);
  const processExitArmedRef = useRef(false);
  const downloadsReturnArmedRef = useRef(false);
  const [savedTimelineOrder, setSavedTimelineOrder] = useState<TimelineOrder>({});
  const [ledVideoBurst, setLedVideoBurst] = useState<LedVideoBurst>(openingAmbientBurst);
  const [heroStage, setHeroStage] = useState(0);
  const [activeHeroWorkIndex, setActiveHeroWorkIndex] = useState(0);
  const [heroTurn, setHeroTurn] = useState<HeroTurn>('idle');
  const [heroPlayback, setHeroPlayback] = useState({ currentTime: 0, duration: 0, paused: true, muted: false });
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMobileHeroEngaged, setIsMobileHeroEngaged] = useState(false);
  const [isHeroSurfaceActive, setIsHeroSurfaceActive] = useState(true);
  const [activeTimelineYear, setActiveTimelineYear] = useState(timeline[0].year);
  const [isTimelineYearRailVisible, setIsTimelineYearRailVisible] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState('top');
  const [sectionStretchKey, setSectionStretchKey] = useState(0);
  const [railBurst, setRailBurst] = useState<{ year: string; id: number } | null>(null);

  useEffect(() => {
    const mobileViewport = window.matchMedia(MOBILE_PAGE_MEDIA);
    const updateMobileViewport = () => setIsMobileViewport(mobileViewport.matches);
    updateMobileViewport();
    mobileViewport.addEventListener('change', updateMobileViewport);
    return () => mobileViewport.removeEventListener('change', updateMobileViewport);
  }, []);

  const moveSiteNavPill = useCallback((index: number, showEnglish = false) => {
    const nav = siteNavRef.current;
    const pill = siteNavPillRef.current;
    const pillLabel = siteNavPillLabelRef.current;
    const target = siteNavLinkRefs.current[index];
    if (!nav || !pill || !target) return;
    const navRect = nav.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    pill.style.setProperty('--site-nav-pill-x', `${targetRect.left - navRect.left - 18}px`);
    pill.style.width = `${targetRect.width + 36}px`;
    pill.classList.add('is-visible');
    if (pillLabel) {
      pillLabel.textContent = (showEnglish
        ? ['HOME', 'PORTFOLIO', 'PROCESS', 'CONTACT']
        : ['首页', '作品集', '流程及创新', '和我联系'])[index] ?? '';
      pillLabel.classList.toggle('is-english', showEnglish);
      pillLabel.classList.remove('is-switching');
      void pillLabel.offsetWidth;
      pillLabel.classList.add('is-switching');
    }
  }, []);

  useEffect(() => {
    const sectionIds = ['top', 'timeline', 'process', 'downloads'];
    const activeIndex = Math.max(0, sectionIds.indexOf(activeSectionId));
    const frame = window.requestAnimationFrame(() => moveSiteNavPill(activeIndex, false));
    const handleResize = () => moveSiteNavPill(activeIndex, false);
    window.addEventListener('resize', handleResize);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeSectionId, moveSiteNavPill]);

  const activateSection = useCallback((activeId: string) => {
    if (activeSectionIdRef.current !== activeId) {
      lastSectionTransitionAtRef.current = performance.now();
    }
    activeSectionIdRef.current = activeId;
    setActiveSectionId(activeId);
    pauseInactiveSections(activeId);
    setIsHeroSurfaceActive(activeId === 'top');
    if (activeId === 'top') {
      ledBurstIdRef.current += 1;
      const track: LedVideoTrack = {
        src: openingHeroWork.src,
        startAt: 0,
        startedAt: Date.now(),
      };
      ambientRegionsRef.current = openingAmbientBurst.regions;
      ambientTracksRef.current = { [openingHeroWork.src]: track };
      setLedVideoBurst({
        ...openingAmbientBurst,
        id: ledBurstIdRef.current,
        tracks: [track],
        transitionStartedAt: performance.now(),
      });
    }
  }, []);

  const transitionToSection = useCallback((targetId: string) => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const isHero = targetId === 'top';
    if (activeSectionIdRef.current !== targetId) {
      setSectionStretchKey((current) => current + 1);
    }
    activateSection(targetId);
    if (isHero) {
      if (window.matchMedia(MOBILE_PAGE_MEDIA).matches) setIsMobileHeroEngaged(false);
      timelineReturnArmedRef.current = false;
      heroStageRef.current = 2;
      heroWorkIndexRef.current = 0;
      heroExitStepRef.current = 0;
      lastHeroStepRef.current = 0;
      setHeroTurn('idle');
      setHeroStage(2);
      setActiveHeroWorkIndex(0);
      const firstVideo = heroCarouselVideoRefs.current[0];
      if (firstVideo) {
        if (!firstVideo.getAttribute('src')) firstVideo.src = heroWorks[0].src;
        firstVideo.currentTime = 0;
        startHeroVideoPlayback(firstVideo);
      }
    }
    timelineExitArmedRef.current = false;
    processReturnArmedRef.current = false;
    processExitArmedRef.current = false;
    downloadsReturnArmedRef.current = false;
    heroGateUnlockedRef.current = !isHero;
    window.history.replaceState(null, '', `#${targetId}`);
    const top = window.matchMedia(MOBILE_PAGE_MEDIA).matches
      ? 0
      : target.getBoundingClientRect().top + window.scrollY;
    boundarySnapInProgressRef.current = true;
    previousScrollYRef.current = top;
    window.scrollTo({ top, behavior: 'auto' });
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        boundarySnapInProgressRef.current = false;
      });
    });
  }, [activateSection]);

  useEffect(() => {
    const mobilePages = window.matchMedia(MOBILE_PAGE_MEDIA);
    if (!mobilePages.matches) return;
    const sectionIds = ['top', 'timeline', 'process', 'downloads'];
    const activateHashPage = () => {
      const requestedId = location.hash.replace('#', '');
      const targetId = sectionIds.includes(requestedId) ? requestedId : 'top';
      activateSection(targetId);
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
    };
    activateHashPage();
    window.addEventListener('hashchange', activateHashPage);
    return () => window.removeEventListener('hashchange', activateHashPage);
  }, [activateSection]);

  useEffect(() => {
    const unlockHeroSound = () => {
      if (heroStageRef.current !== 2 || window.scrollY > 4 || location.hash === '#timeline') return;
      if (window.matchMedia(MOBILE_PAGE_MEDIA).matches) return;
      const video = heroCarouselVideoRefs.current[heroWorkIndexRef.current];
      if (video) startHeroVideoPlayback(video);
    };

    window.addEventListener('pointerdown', unlockHeroSound, true);
    window.addEventListener('touchstart', unlockHeroSound, true);
    window.addEventListener('keydown', unlockHeroSound, true);
    return () => {
      window.removeEventListener('pointerdown', unlockHeroSound, true);
      window.removeEventListener('touchstart', unlockHeroSound, true);
      window.removeEventListener('keydown', unlockHeroSound, true);
    };
  }, []);

  useEffect(() => {
    const isManagedVideo = (video: HTMLVideoElement) => video.dataset.playbackProxy !== 'true';
    const observedVideos = new Set<HTMLVideoElement>();

    const pauseOtherVideos = (event: Event) => {
      const activeVideo = event.target;
      if (!(activeVideo instanceof HTMLVideoElement) || !isManagedVideo(activeVideo)) return;

      document.querySelectorAll<HTMLVideoElement>('video').forEach((video) => {
        if (video === activeVideo || !isManagedVideo(video) || video.paused) return;
        video.dataset.playbackRequested = 'false';
        video.pause();
      });
    };

    const visibilityObserver = 'IntersectionObserver' in window
      ? new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            const video = entry.target as HTMLVideoElement;
            if (entry.isIntersecting || video.paused) return;
            video.dataset.playbackRequested = 'false';
            video.pause();
          });
        }, { threshold: 0 })
      : null;

    const observeVideo = (video: HTMLVideoElement) => {
      if (!isManagedVideo(video) || observedVideos.has(video)) return;
      observedVideos.add(video);
      visibilityObserver?.observe(video);
    };

    const visitVideos = (node: Node, callback: (video: HTMLVideoElement) => void) => {
      if (node instanceof HTMLVideoElement) callback(node);
      if (node instanceof Element) {
        node.querySelectorAll<HTMLVideoElement>('video').forEach(callback);
      }
    };

    document.querySelectorAll<HTMLVideoElement>('video').forEach(observeVideo);
    document.addEventListener('play', pauseOtherVideos, true);

    const mutationObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => visitVideos(node, observeVideo));
        record.removedNodes.forEach((node) => visitVideos(node, (video) => {
          visibilityObserver?.unobserve(video);
          observedVideos.delete(video);
        }));
      });
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('play', pauseOtherVideos, true);
      mutationObserver.disconnect();
      visibilityObserver?.disconnect();
      observedVideos.clear();
    };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(TIMELINE_ORDER_KEY);
    if (stored) setSavedTimelineOrder(JSON.parse(stored));
  }, []);

  useEffect(() => {
    let frame = 0;
    const updateTimelineYearRail = () => {
      frame = 0;
      const timelineSection = document.getElementById('timeline');
      const yearArchive = document.querySelector<HTMLElement>('.timeline-year-archive');
      if (!timelineSection || !yearArchive) return;
      const timelineRect = timelineSection.getBoundingClientRect();
      const archiveRect = yearArchive.getBoundingClientRect();
      const mobilePages = window.matchMedia(MOBILE_PAGE_MEDIA).matches;
      const shouldShow = location.hash === '#timeline'
        && (mobilePages || archiveRect.bottom <= 76)
        && timelineRect.bottom > 80
        && timelineRect.top < window.innerHeight;
      setIsTimelineYearRailVisible(shouldShow);
    };
    const scheduleTimelineYearRailUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateTimelineYearRail);
    };

    updateTimelineYearRail();
    window.addEventListener('scroll', scheduleTimelineYearRailUpdate, { passive: true });
    window.addEventListener('resize', scheduleTimelineYearRailUpdate);
    window.addEventListener('hashchange', scheduleTimelineYearRailUpdate);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scheduleTimelineYearRailUpdate);
      window.removeEventListener('resize', scheduleTimelineYearRailUpdate);
      window.removeEventListener('hashchange', scheduleTimelineYearRailUpdate);
    };
  }, []);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('main > section'));
    let frame = 0;

    const updateActiveSection = () => {
      frame = 0;
      const visibleSection = sections
        .map((section) => {
          const rect = section.getBoundingClientRect();
          const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
          return { section, visibleHeight };
        })
        .sort((a, b) => b.visibleHeight - a.visibleHeight)[0];
      if (!visibleSection || visibleSection.visibleHeight <= 0) return;
      const activeId = visibleSection.section.id;
      if (activeSectionIdRef.current === activeId) return;
      activateSection(activeId);
    };

    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [activateSection]);

  useEffect(() => {
    const beginHeroVideo = (index: number) => {
      const video = heroCarouselVideoRefs.current[index];
      if (!video) return;
      heroMainVideoRef.current = video;
      video.currentTime = 0;
      startHeroVideoPlayback(video);
    };

    const showLedVideoBurst = (
      mode: 'ambient' | 'carousel',
      requestedIndex?: number,
      turn: HeroTurn = 'idle',
      previousIndex?: number,
    ) => {
      const hero = heroIntroRef.current;
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;

      // The LED wall starts once on the first wheel step and then remains an
      // independent, looping projection of the opening work.
      if (mode !== 'ambient' || ambientTracksRef.current[openingHeroWork.src]) return;

      ledBurstIdRef.current += 1;
      ambientRegionsRef.current = [{
        id: -1,
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        src: openingHeroWork.src,
      }];
      const track: LedVideoTrack = {
        src: openingHeroWork.src,
        startAt: 0,
        startedAt: Date.now(),
      };
      ambientTracksRef.current = { [openingHeroWork.src]: track };
      setLedVideoBurst({
        id: ledBurstIdRef.current,
        mode: 'ambient',
        turn,
        regions: ambientRegionsRef.current,
        tracks: [track],
        transitionStartedAt: performance.now(),
      });
    };

    const primeSectionBoundary = (key: string) => {
      const now = performance.now();
      const intent = sectionBoundaryIntentRef.current;
      if (intent.key !== key || now - intent.armedAt > 2400) {
        sectionBoundaryIntentRef.current = { key, armedAt: now };
        if (key !== 'timeline:up') setSectionStretchKey((current) => current + 1);
        return false;
      }
      if (now - intent.armedAt < 720) return false;
      sectionBoundaryIntentRef.current = { key: '', armedAt: 0 };
      return true;
    };

    // Touch devices use native continuous scrolling. The desktop experience
    // deliberately requires a second wheel gesture at section boundaries,
    // which would otherwise trap a phone at the end of the timeline.
    const usesNativeTouchScroll = window.matchMedia(NATIVE_TOUCH_SCROLL_MEDIA).matches;
    if (usesNativeTouchScroll) {
      heroGateUnlockedRef.current = true;
      heroStageRef.current = 2;
      heroWorkIndexRef.current = 0;
      heroExitStepRef.current = 0;
      setHeroTurn('idle');
      setHeroStage(2);
      setActiveHeroWorkIndex(0);
      const isMobilePage = window.matchMedia(MOBILE_PAGE_MEDIA).matches;
      if (isMobilePage) setIsMobileHeroEngaged(false);
      const frame = window.requestAnimationFrame(() => {
        if (!isMobilePage) {
          beginHeroVideo(0);
          return;
        }
        const video = heroCarouselVideoRefs.current[0];
        if (!video) return;
        heroMainVideoRef.current = video;
        video.dataset.playbackRequested = 'false';
        video.pause();
        video.muted = true;
        setHeroPlayback({
          currentTime: video.currentTime,
          duration: Number.isFinite(video.duration) ? video.duration : 0,
          paused: true,
          muted: true,
        });
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const handleHeroWheel = (event: WheelEvent) => {
      const hero = heroIntroRef.current;
      const timelineSection = document.getElementById('timeline');
      const processSection = document.getElementById('process');
      const downloadsSection = document.getElementById('downloads');

      if (performance.now() - lastSectionTransitionAtRef.current < 680) {
        event.preventDefault();
        return;
      }

      if (location.hash === '#downloads' && event.deltaY < 0 && downloadsSection && processSection) {
        event.preventDefault();
        const downloadsTop = window.scrollY + downloadsSection.getBoundingClientRect().top;
        const wheelUnit = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? window.innerHeight : 1;
        const acceleratedDelta = event.deltaY * wheelUnit * 3.6;

        if (window.scrollY <= downloadsTop + 1) {
          window.scrollTo({ top: downloadsTop, behavior: 'auto' });
          if (!downloadsReturnArmedRef.current) {
            downloadsReturnArmedRef.current = true;
            primeSectionBoundary('downloads:up');
            return;
          }

          if (!primeSectionBoundary('downloads:up')) return;

          downloadsReturnArmedRef.current = false;
          activateSection('process');
          window.history.replaceState(null, '', '#process');
          const processRect = processSection.getBoundingClientRect();
          const processBottomTop = window.scrollY + processRect.bottom - window.innerHeight;
          window.scrollTo({ top: Math.max(0, processBottomTop), behavior: 'auto' });
          return;
        }

        const nextScrollTop = Math.max(downloadsTop, window.scrollY + acceleratedDelta);
        downloadsReturnArmedRef.current = nextScrollTop <= downloadsTop + 1;
        if (downloadsReturnArmedRef.current) primeSectionBoundary('downloads:up');
        window.scrollTo({ top: nextScrollTop, behavior: 'auto' });
        return;
      }

      if (event.deltaY > 0 && downloadsReturnArmedRef.current) {
        downloadsReturnArmedRef.current = false;
      }

      if (location.hash === '#process' && processSection && timelineSection) {
        event.preventDefault();
        const processRect = processSection.getBoundingClientRect();
        const processTop = window.scrollY + processRect.top;
        const processBottomTop = Math.max(processTop, window.scrollY + processRect.bottom - window.innerHeight);
        const wheelUnit = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? window.innerHeight : 1;
        const acceleratedDelta = event.deltaY * wheelUnit * 3.6;

        if (window.scrollY < processTop - 1) {
          processReturnArmedRef.current = true;
          processExitArmedRef.current = false;
          primeSectionBoundary('process:up');
          window.scrollTo({ top: processTop, behavior: 'auto' });
          return;
        }

        if (window.scrollY > processBottomTop + 1) {
          processExitArmedRef.current = true;
          processReturnArmedRef.current = false;
          primeSectionBoundary('process:down');
          window.scrollTo({ top: processBottomTop, behavior: 'auto' });
          return;
        }

        if (event.deltaY < 0) {
          processExitArmedRef.current = false;
          if (window.scrollY <= processTop + 1) {
            processReturnArmedRef.current = true;
            if (!primeSectionBoundary('process:up')) return;
            processReturnArmedRef.current = false;
            activateSection('timeline');
            window.history.replaceState(null, '', '#timeline');
            const timelineRect = timelineSection.getBoundingClientRect();
            const timelineBottomTop = window.scrollY + timelineRect.bottom - window.innerHeight;
            window.scrollTo({ top: Math.max(0, timelineBottomTop), behavior: 'auto' });
            return;
          }

          const nextScrollTop = Math.max(processTop, window.scrollY + acceleratedDelta);
          processReturnArmedRef.current = nextScrollTop <= processTop + 1;
          if (processReturnArmedRef.current) primeSectionBoundary('process:up');
          window.scrollTo({ top: nextScrollTop, behavior: 'auto' });
          return;
        }

        if (event.deltaY > 0) {
          processReturnArmedRef.current = false;
          if (downloadsSection && window.scrollY >= processBottomTop - 1) {
            processExitArmedRef.current = true;
            if (!primeSectionBoundary('process:down')) return;
            processExitArmedRef.current = false;
            activateSection('downloads');
            window.history.replaceState(null, '', '#downloads');
            const downloadsTop = downloadsSection.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({ top: downloadsTop, behavior: 'auto' });
            return;
          }

          const nextScrollTop = Math.min(processBottomTop, window.scrollY + acceleratedDelta);
          processExitArmedRef.current = nextScrollTop >= processBottomTop - 1;
          if (processExitArmedRef.current) primeSectionBoundary('process:down');
          window.scrollTo({ top: nextScrollTop, behavior: 'auto' });
          return;
        }
      }

      if (location.hash === '#timeline' && timelineSection) {
        const timelineRect = timelineSection.getBoundingClientRect();
        const timelineTop = window.scrollY + timelineRect.top;
        const timelineBottomTop = Math.max(timelineTop, window.scrollY + timelineRect.bottom - window.innerHeight);

        if (window.scrollY < timelineTop - 1) {
          event.preventDefault();
          timelineReturnArmedRef.current = true;
          timelineExitArmedRef.current = false;
          primeSectionBoundary('timeline:up');
          window.scrollTo({ top: timelineTop, behavior: 'auto' });
          return;
        }

        if (window.scrollY > timelineBottomTop + 1) {
          event.preventDefault();
          timelineExitArmedRef.current = true;
          timelineReturnArmedRef.current = false;
          primeSectionBoundary('timeline:down');
          window.scrollTo({ top: timelineBottomTop, behavior: 'auto' });
          return;
        }

        if (event.deltaY < 0) {
          timelineExitArmedRef.current = false;
          if (window.scrollY <= timelineTop + 1) {
            event.preventDefault();
            timelineReturnArmedRef.current = true;
            if (!primeSectionBoundary('timeline:up')) return;
            timelineReturnArmedRef.current = false;
            activateSection('top');
            window.history.replaceState(null, '', '#top');
            window.scrollTo({ top: 0, behavior: 'auto' });
            return;
          }
          timelineReturnArmedRef.current = false;
          return;
        }

        if (event.deltaY > 0) {
          timelineReturnArmedRef.current = false;
          if (window.scrollY >= timelineBottomTop - 1) {
            event.preventDefault();
            if (!timelineExitArmedRef.current) {
              timelineExitArmedRef.current = true;
              setSectionStretchKey((current) => current + 1);
              return;
            }
            timelineExitArmedRef.current = false;
            activateSection('process');
            window.history.replaceState(null, '', '#process');
            if (processSection) {
              const top = processSection.getBoundingClientRect().top + window.scrollY;
              window.scrollTo({ top, behavior: 'auto' });
            }
            return;
          }
          timelineExitArmedRef.current = false;
          return;
        }
      }
      if (!hero || window.scrollY > 4 || heroGateUnlockedRef.current) return;

      event.preventDefault();
      const now = performance.now();
      if (now - lastHeroStepRef.current < 1440) return;
      lastHeroStepRef.current = now;

      if (event.deltaY < 0) {
        heroExitStepRef.current = 0;
        if (heroStageRef.current === 2 && heroWorkIndexRef.current > 0) {
          const previousIndex = heroWorkIndexRef.current;
          heroWorkIndexRef.current -= 1;
          setHeroTurn('backward');
          setActiveHeroWorkIndex(heroWorkIndexRef.current);
          showLedVideoBurst('carousel', heroWorkIndexRef.current, 'backward', previousIndex);
          beginHeroVideo(heroWorkIndexRef.current);
          return;
        }

        if (heroStageRef.current === 2) {
          heroStageRef.current = 0;
          setHeroTurn('backward');
          setHeroStage(0);
        }
        return;
      }

      if (heroStageRef.current === 0) {
        heroStageRef.current = 2;
        heroWorkIndexRef.current = 0;
        heroExitStepRef.current = 0;
        setHeroTurn('forward');
        setHeroStage(2);
        setActiveHeroWorkIndex(0);
        beginHeroVideo(0);
        return;
      }

      const nextIndex = heroWorkIndexRef.current + 1;
      if (nextIndex < heroWorks.length) {
        const previousIndex = heroWorkIndexRef.current;
        heroWorkIndexRef.current = nextIndex;
        setHeroTurn('forward');
        setActiveHeroWorkIndex(nextIndex);
        showLedVideoBurst('carousel', nextIndex, 'forward', previousIndex);
        beginHeroVideo(nextIndex);
        heroExitStepRef.current = 0;
        return;
      }

      if (heroWorkIndexRef.current === heroWorks.length - 1) {
        if (heroExitStepRef.current === 0) {
          heroExitStepRef.current = 1;
          setSectionStretchKey((current) => current + 1);
          return;
        }
        heroGateUnlockedRef.current = true;
        activateSection('timeline');
        window.history.replaceState(null, '', '#timeline');
        const timeline = document.getElementById('timeline');
        if (timeline) {
          const top = timeline.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top, behavior: 'auto' });
        }
      }
    };

    const resetHeroGateAtTop = () => {
      const currentScrollY = window.scrollY;
      const previousScrollY = previousScrollYRef.current;

      if (!boundarySnapInProgressRef.current) {
        const timelineSection = document.getElementById('timeline');
        const processSection = document.getElementById('process');
        const downloadsSection = document.getElementById('downloads');

        if (currentScrollY < previousScrollY - 1 && location.hash === '#downloads' && downloadsSection) {
          const downloadsRect = downloadsSection.getBoundingClientRect();
          if (downloadsRect.top > 1) {
            downloadsReturnArmedRef.current = true;
            const downloadsTop = currentScrollY + downloadsRect.top;
            boundarySnapInProgressRef.current = true;
            previousScrollYRef.current = downloadsTop;
            window.scrollTo({ top: downloadsTop, behavior: 'auto' });
            window.setTimeout(() => { boundarySnapInProgressRef.current = false; }, 0);
            return;
          }
        }

        if (currentScrollY < previousScrollY - 1 && location.hash === '#process' && processSection) {
          const processRect = processSection.getBoundingClientRect();
          if (processRect.top > 1) {
            processReturnArmedRef.current = true;
            const processTop = currentScrollY + processRect.top;
            boundarySnapInProgressRef.current = true;
            previousScrollYRef.current = processTop;
            window.scrollTo({ top: processTop, behavior: 'auto' });
            window.setTimeout(() => { boundarySnapInProgressRef.current = false; }, 0);
            return;
          }
        }

        if (currentScrollY < previousScrollY - 1 && location.hash === '#timeline' && timelineSection) {
          const timelineRect = timelineSection.getBoundingClientRect();
          if (timelineRect.top > 1) {
            timelineReturnArmedRef.current = true;
            const timelineTop = currentScrollY + timelineRect.top;
            boundarySnapInProgressRef.current = true;
            previousScrollYRef.current = timelineTop;
            window.scrollTo({ top: timelineTop, behavior: 'auto' });
            window.setTimeout(() => { boundarySnapInProgressRef.current = false; }, 0);
            return;
          }
        }

        if (currentScrollY > previousScrollY + 1 && location.hash === '#timeline' && timelineSection) {
          const timelineRect = timelineSection.getBoundingClientRect();
          if (timelineRect.bottom < window.innerHeight - 1) {
            timelineExitArmedRef.current = true;
            const timelineBottomTop = currentScrollY + timelineRect.bottom - window.innerHeight;
            boundarySnapInProgressRef.current = true;
            previousScrollYRef.current = timelineBottomTop;
            window.scrollTo({ top: Math.max(0, timelineBottomTop), behavior: 'auto' });
            window.setTimeout(() => { boundarySnapInProgressRef.current = false; }, 0);
            return;
          }
        }

        if (currentScrollY > previousScrollY + 1 && location.hash === '#process' && processSection) {
          const processRect = processSection.getBoundingClientRect();
          if (processRect.bottom < window.innerHeight - 1) {
            processExitArmedRef.current = true;
            const processBottomTop = currentScrollY + processRect.bottom - window.innerHeight;
            boundarySnapInProgressRef.current = true;
            previousScrollYRef.current = processBottomTop;
            window.scrollTo({ top: Math.max(0, processBottomTop), behavior: 'auto' });
            window.setTimeout(() => { boundarySnapInProgressRef.current = false; }, 0);
            return;
          }
        }
      }

      if (currentScrollY <= 2 && previousScrollY > 2 && heroGateUnlockedRef.current) {
        heroGateUnlockedRef.current = false;
        heroStageRef.current = 2;
        heroWorkIndexRef.current = 0;
        heroExitStepRef.current = 0;
        lastHeroStepRef.current = 0;
        setHeroTurn('idle');
        setHeroStage(2);
        setActiveHeroWorkIndex(0);
        showLedVideoBurst('carousel', 0);
      }
      previousScrollYRef.current = currentScrollY;
    };

    let heroScrollFrame = 0;
    const scheduleHeroGateReset = () => {
      if (heroScrollFrame) return;
      heroScrollFrame = window.requestAnimationFrame(() => {
        heroScrollFrame = 0;
        resetHeroGateAtTop();
      });
    };

    window.addEventListener('wheel', handleHeroWheel, { passive: false });
    window.addEventListener('scroll', scheduleHeroGateReset, { passive: true });
    return () => {
      window.cancelAnimationFrame(heroScrollFrame);
      window.removeEventListener('wheel', handleHeroWheel);
      window.removeEventListener('scroll', scheduleHeroGateReset);
    };
  }, [activateSection]);

  useEffect(() => {
    const activeVideo = heroCarouselVideoRefs.current[activeHeroWorkIndex];
    heroMainVideoRef.current = activeVideo ?? null;
    Object.entries(heroCarouselVideoRefs.current).forEach(([index, video]) => {
      if (!video) return;
      if (!isHeroSurfaceActive) {
        video.dataset.playbackRequested = 'false';
        video.pause();
        video.muted = true;
      } else if (heroStage === 2 && Number(index) === activeHeroWorkIndex) {
        const waitForMobilePlay = window.matchMedia(MOBILE_PAGE_MEDIA).matches && !isMobileHeroEngaged;
        if (waitForMobilePlay) {
          video.dataset.playbackRequested = 'false';
          video.pause();
          video.muted = true;
        } else {
          startHeroVideoPlayback(video);
        }
        setHeroPlayback({
          currentTime: video.currentTime,
          duration: Number.isFinite(video.duration) ? video.duration : 0,
          paused: video.paused,
          muted: video.muted,
        });
      } else if (heroStage === 0 && Number(index) === 0) {
        video.muted = true;
        void video.play().catch(() => undefined);
      } else {
        video.dataset.playbackRequested = 'false';
        video.pause();
        video.muted = true;
      }
    });
  }, [activeHeroWorkIndex, heroStage, isHeroSurfaceActive, isMobileHeroEngaged]);

  const pauseOtherModelVideos = (activeVideo: HTMLVideoElement) => {
    document.querySelectorAll<HTMLVideoElement>('.timeline-model-video-strip video').forEach((video) => {
      if (video !== activeVideo && !video.paused) {
        video.pause();
      }
    });
  };

  const showTimelineYear = (year: string) => {
    timelineReturnArmedRef.current = false;
    timelineExitArmedRef.current = false;
    processReturnArmedRef.current = false;
    processExitArmedRef.current = false;
    downloadsReturnArmedRef.current = false;
    const timelineSection = document.getElementById('timeline');
    if (timelineSection) {
      const top = timelineSection.getBoundingClientRect().top + window.scrollY;
      window.history.replaceState(null, '', '#timeline');
      window.scrollTo({ top, behavior: 'auto' });
    }
    if (year === activeTimelineYear) return;
    document.querySelectorAll<HTMLMediaElement>('#timeline .timeline-item video, #timeline .timeline-item audio')
      .forEach((media) => media.pause());
    setActiveTimelineYear(year);
  };

  const heroCardPosition = (index: number) => {
    if (heroStage === 0) return index === 0 ? 'opening' : 'hidden';
    if (index === activeHeroWorkIndex) return 'active';
    if (activeHeroWorkIndex > 0 && index === activeHeroWorkIndex - 1) return 'previous';
    const previewIndices: number[] = [];
    const previewLimit = 2;
    for (let candidate = activeHeroWorkIndex + 1; candidate < heroWorks.length && previewIndices.length < previewLimit; candidate += 1) {
      previewIndices.push(candidate);
    }
    if (index === previewIndices[0]) return 'preview-first';
    if (index === previewIndices[1]) return 'preview-second';
    return index < activeHeroWorkIndex ? 'offstage-left' : 'offstage-right';
  };

  const selectHeroWork = (index: number) => {
    if (heroStageRef.current !== 2 || index === heroWorkIndexRef.current) return;
    if (window.matchMedia(MOBILE_PAGE_MEDIA).matches) setIsMobileHeroEngaged(true);
    const previousIndex = heroWorkIndexRef.current;
    heroWorkIndexRef.current = index;
    heroExitStepRef.current = 0;
    setHeroTurn(index > previousIndex ? 'forward' : 'backward');
    setActiveHeroWorkIndex(index);
    const video = heroCarouselVideoRefs.current[index];
    if (video) {
      heroMainVideoRef.current = video;
      video.currentTime = 0;
      startHeroVideoPlayback(video);
    }
  };

  const stepHeroWork = (direction: -1 | 1) => {
    const nextIndex = Math.max(0, Math.min(heroWorks.length - 1, heroWorkIndexRef.current + direction));
    if (nextIndex !== heroWorkIndexRef.current) selectHeroWork(nextIndex);
  };

  return (
    <main
      className="portfolio-page"
      onContextMenu={(event) => {
        const target = event.target;
        if (target instanceof HTMLImageElement || target instanceof HTMLVideoElement) event.preventDefault();
      }}
      onDragStart={(event) => {
        const target = event.target;
        if (target instanceof HTMLImageElement || target instanceof HTMLVideoElement) event.preventDefault();
      }}
    >
      <AgencyMotion timelineKey={activeTimelineYear} />
      <SpecularFrames />
      {sectionStretchKey > 0 ? <div className="section-transition-stretch" key={sectionStretchKey} aria-hidden="true" /> : null}
      <header className="site-header">
        <FluidGlass
          className="site-header-fluid"
          mode="bar"
          barProps={{
            ior: 1.65,
            thickness: 11,
            roughness: 0.2,
            chromaticAberration: 0.24,
            anisotropy: 0.1,
          }}
        />
        <nav
          className="site-nav"
          aria-label="主导航"
          ref={siteNavRef}
          onPointerLeave={() => moveSiteNavPill(Math.max(0, ['top', 'timeline', 'process', 'downloads'].indexOf(activeSectionId)), false)}
        >
          <span className="site-nav-slider" ref={siteNavPillRef} aria-hidden="true">
            <span ref={siteNavPillLabelRef} />
          </span>
          <a ref={(node) => { siteNavLinkRefs.current[0] = node; }} onPointerEnter={() => moveSiteNavPill(0, true)} className={activeSectionId === 'top' ? 'is-active' : ''} data-label="首页" href="#top" onClick={(event) => { event.preventDefault(); transitionToSection('top'); }}><span>首页</span></a>
          <a ref={(node) => { siteNavLinkRefs.current[1] = node; }} onPointerEnter={() => moveSiteNavPill(1, true)} className={activeSectionId === 'timeline' ? 'is-active' : ''} data-label="作品集" href="#timeline" onClick={(event) => { event.preventDefault(); transitionToSection('timeline'); }}><span>作品集</span></a>
          <a ref={(node) => { siteNavLinkRefs.current[2] = node; }} onPointerEnter={() => moveSiteNavPill(2, true)} className={activeSectionId === 'process' ? 'is-active' : ''} data-label="流程及创新" href="#process" onClick={(event) => { event.preventDefault(); transitionToSection('process'); }}><span>流程及创新</span></a>
          <a ref={(node) => { siteNavLinkRefs.current[3] = node; }} onPointerEnter={() => moveSiteNavPill(3, true)} className={activeSectionId === 'downloads' ? 'is-active' : ''} data-label="和我联系" href="#downloads" onClick={(event) => { event.preventDefault(); transitionToSection('downloads'); }}><span>和我联系</span></a>
        </nav>
      </header>

      <section className="hero section-shell" id="top">
        <div
          className={`hero-intro hero-intro--stage-${heroStage} hero-intro--turn-${heroTurn}${isMobileHeroEngaged ? ' hero-intro--mobile-engaged' : ''}`}
          ref={heroIntroRef}
          onPointerDown={(event) => {
            if (!window.matchMedia(MOBILE_PAGE_MEDIA).matches) return;
            if (event.pointerType !== 'mouse') return;
            if (!(event.target instanceof Element) || !event.target.closest('.hero-carousel-card--active')) return;
            if (event.target instanceof Element && event.target.closest('button, input, a')) return;
            heroTouchStartRef.current = { x: event.clientX, y: event.clientY };
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }}
          onPointerUp={(event) => {
            if (!window.matchMedia(MOBILE_PAGE_MEDIA).matches) return;
            if (event.pointerType !== 'mouse' || !heroTouchStartRef.current || heroStageRef.current !== 2) return;
            const deltaX = event.clientX - heroTouchStartRef.current.x;
            const deltaY = event.clientY - heroTouchStartRef.current.y;
            heroTouchStartRef.current = null;
            if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
            stepHeroWork(deltaX < 0 ? 1 : -1);
          }}
          onPointerCancel={() => { heroTouchStartRef.current = null; }}
          onTouchStart={(event) => {
            if (!window.matchMedia(MOBILE_PAGE_MEDIA).matches || !isMobileHeroEngaged) return;
            if (!(event.target instanceof Element) || !event.target.closest('.hero-carousel-card--active')) return;
            if (event.target.closest('button, input, a')) return;
            const touch = event.touches[0];
            if (touch) heroTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
          }}
          onTouchEnd={(event) => {
            if (!window.matchMedia(MOBILE_PAGE_MEDIA).matches || !heroTouchStartRef.current || heroStageRef.current !== 2) return;
            const touch = event.changedTouches[0];
            if (!touch) return;
            const deltaX = touch.clientX - heroTouchStartRef.current.x;
            const deltaY = touch.clientY - heroTouchStartRef.current.y;
            heroTouchStartRef.current = null;
            if (Math.abs(deltaX) < 42 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
            stepHeroWork(deltaX < 0 ? 1 : -1);
          }}
          onTouchCancel={() => { heroTouchStartRef.current = null; }}
        >
          {!isMobileViewport ? (
            <div className="hero-ripple-layer" aria-hidden="true">
              <RippleDistortion
                src="/images/hero-curved-grid.svg?v=3"
                brushSize={38}
                strength={0.1}
                swirl={0.45}
                rings={2}
                spread={1.8}
                fade={1.35}
                spacing={16}
                dispersion={0.025}
                glint={0.28}
                tint="#6688ff"
                tintAmount={0.12}
                highlightColor="#c9efff"
                grayscale
                overlayOnly
                trigger="both"
                quality="low"
                enabled={isHeroSurfaceActive}
              />
            </div>
          ) : null}
          <div
            className={`hero-led-video-burst hero-led-video-burst--${ledVideoBurst.mode} hero-led-video-burst--turn-${ledVideoBurst.turn}`}
            key={ledVideoBurst.mode === 'carousel' ? ledVideoBurst.id : 'ambient'}
            aria-hidden="true"
          >
            <CurvedLedVideo
              active={isHeroSurfaceActive}
              burst={ledVideoBurst}
              syncSourceRef={heroMainVideoRef}
            />
          </div>
          <div className="hero-title-block">
            <div className="hero-wordmark-line">
              <WarpText as="span" className="hero-wordmark" text="李浩栋" strength={1.15} radius={0.68} refraction={0.018} />
              <span className="hero-wordmark-sparkles" aria-hidden="true"><b>✦</b><i>✦</i></span>
            </div>
            <div className="hero-portfolio-line">
              <WarpText as="span" text="个人作品站" strength={1.05} radius={0.62} refraction={0.016} />
              <em>yuexiangxun</em>
            </div>
            <div className="hero-title-tools">
              {aiToolGroups.map((group) => (
                <div className="hero-tool-row" key={group.label}>
                  <strong>
                    <GlassSurface {...heroGlassSurfaceProps} className="hero-glass-frame hero-tool-glass" />
                    <span className="hero-tool-label">{group.label}</span>
                  </strong>
                  <WarpText
                    as="span"
                    className="hero-text-sheen"
                    text={group.tools.join(' · ')}
                    strength={2}
                    radius={2.2}
                    refraction={0.035}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="hero-media-slot">
            <CircularGallery
              className="hero-carousel"
              bend={0}
              textColor="#ffffff"
              borderRadius={0.08}
              scrollEase={0.02}
              font="bold 30px Orbitron, Inter, sans-serif"
            >
              {heroWorks.map((work, index) => {
                const position = heroCardPosition(index);
                const isActive = position === 'active';
                const isOpening = position === 'opening';
                const isPreview = position === 'previous' || position === 'preview-first' || position === 'preview-second';
                const isVisible = isActive || isOpening || isPreview;
                const shouldLoadVideo = heroStage === 0
                  ? index === 0
                  : isMobileViewport
                    ? Math.abs(index - activeHeroWorkIndex) <= 1 || index === activeHeroWorkIndex + 2
                    : index <= activeHeroWorkIndex + 2;
                return (
                  <div
                    className={`hero-carousel-card hero-carousel-card--${position}`}
                    key={work.src}
                    aria-hidden={!isVisible}
                    role={isPreview ? 'button' : undefined}
                    tabIndex={isPreview ? 0 : undefined}
                    aria-label={isPreview ? `切换到视频：${work.title}` : undefined}
                    onClick={isPreview ? () => selectHeroWork(index) : isActive ? (event) => {
                      if (!window.matchMedia(MOBILE_PAGE_MEDIA).matches || isMobileHeroEngaged) return;
                      if (event.target instanceof Element && event.target.closest('button, input, a')) return;
                      setIsMobileHeroEngaged(true);
                      const video = heroCarouselVideoRefs.current[index];
                      if (video) {
                        video.currentTime = 0;
                        startHeroVideoPlayback(video);
                      }
                    } : undefined}
                    onKeyDown={isPreview ? (event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      selectHeroWork(index);
                    } : undefined}
                  >
                    <video
                      ref={(video) => { heroCarouselVideoRefs.current[index] = video; }}
                      autoPlay={isOpening || (isActive && isMobileHeroEngaged)}
                      muted={isOpening || !isActive || heroStage !== 2}
                      playsInline
                      controlsList="nodownload noremoteplayback"
                      disablePictureInPicture
                      disableRemotePlayback
                      poster={index === 0 ? '/images/hero-video-poster.jpg' : undefined}
                      preload={(isActive && heroStage === 2) || isOpening || (isMobileViewport && position === 'preview-first')
                        ? 'auto'
                        : isVisible ? 'metadata' : 'none'}
                      src={shouldLoadVideo ? work.src : undefined}
                      data-hero-video-index={index}
                      aria-label={isVisible ? work.title : undefined}
                      onLoadedMetadata={(event) => {
                        const video = event.currentTarget;
                        if (video.closest('.section-is-paused')) {
                          video.dataset.playbackRequested = 'false';
                          video.pause();
                          video.muted = true;
                          return;
                        }
                        if (heroStageRef.current === 2 && index === heroWorkIndexRef.current) {
                          heroMainVideoRef.current = video;
                          if (window.matchMedia(MOBILE_PAGE_MEDIA).matches && !isMobileHeroEngaged) {
                            video.dataset.playbackRequested = 'false';
                            video.pause();
                            video.muted = true;
                          } else {
                            startHeroVideoPlayback(video);
                          }
                        } else if (heroStageRef.current === 0 && index === 0) {
                          video.muted = true;
                          void video.play().catch(() => undefined);
                        } else {
                          video.currentTime = window.matchMedia(MOBILE_PAGE_MEDIA).matches && isVisible
                            ? Math.min(.12, Number.isFinite(video.duration) ? video.duration : .12)
                            : 0;
                          video.pause();
                        }
                      }}
                      onTimeUpdate={(event) => {
                        if (!isActive || heroStage !== 2) return;
                        const video = event.currentTarget;
                        setHeroPlayback((current) => ({
                          ...current,
                          currentTime: video.currentTime,
                          duration: Number.isFinite(video.duration) ? video.duration : current.duration,
                          paused: video.paused,
                          muted: video.muted,
                        }));
                      }}
                      onPlay={() => {
                        if (isActive) setHeroPlayback((current) => ({ ...current, paused: false }));
                      }}
                      onPause={() => {
                        if (isActive) setHeroPlayback((current) => ({ ...current, paused: true }));
                      }}
                      onVolumeChange={(event) => {
                        const muted = event.currentTarget.muted;
                        if (isActive) setHeroPlayback((current) => ({ ...current, muted }));
                      }}
                    />
                    <GlassSurface {...heroGlassSurfaceProps} className="hero-glass-frame hero-screen-glass" />
                    {isActive && heroStage === 2 && !isMobileHeroEngaged ? (
                      <button
                        className="hero-mobile-preview-trigger"
                        type="button"
                        aria-label={`播放并展开视频：${work.title}`}
                        onClick={(event) => {
                          event.stopPropagation();
                      if (!window.matchMedia(MOBILE_PAGE_MEDIA).matches) return;
                      setIsMobileHeroEngaged(true);
                      const video = heroCarouselVideoRefs.current[index];
                      if (video) {
                        video.currentTime = 0;
                        startHeroVideoPlayback(video);
                      }
                        }}
                      >
                        <span aria-hidden="true">▶</span>
                      </button>
                    ) : null}
                    {isActive && heroStage === 2 ? (
                      <div className="hero-video-controls" aria-label={`${work.title} 播放控制`}>
                        <button
                          type="button"
                          onClick={() => {
                            const video = heroCarouselVideoRefs.current[index];
                            if (!video) return;
                            if (video.paused) {
                              if (window.matchMedia(MOBILE_PAGE_MEDIA).matches) setIsMobileHeroEngaged(true);
                              startHeroVideoPlayback(video);
                            }
                            else video.pause();
                          }}
                          aria-label={heroPlayback.paused ? '播放视频' : '暂停视频'}
                        >
                          {heroPlayback.paused ? '▶' : 'Ⅱ'}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max={Math.max(heroPlayback.duration, .01)}
                          step="0.01"
                          value={Math.min(heroPlayback.currentTime, Math.max(heroPlayback.duration, .01))}
                          onChange={(event) => {
                            const video = heroCarouselVideoRefs.current[index];
                            if (!video) return;
                            video.currentTime = Number(event.currentTarget.value);
                            setHeroPlayback((current) => ({ ...current, currentTime: video.currentTime }));
                          }}
                          aria-label="视频播放进度"
                        />
                        <span>{formatHeroTime(heroPlayback.currentTime)} / {formatHeroTime(heroPlayback.duration)}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const video = heroCarouselVideoRefs.current[index];
                            if (!video) return;
                            if (video.muted) {
                              video.muted = false;
                              startHeroVideoPlayback(video);
                            } else {
                              video.muted = true;
                            }
                            setHeroPlayback((current) => ({ ...current, muted: video.muted }));
                          }}
                          aria-label={heroPlayback.muted ? '打开声音' : '关闭声音'}
                        >
                          {heroPlayback.muted ? '开启声音' : '声音'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </CircularGallery>
          </div>

          {heroStage === 2 ? (
            <aside className="hero-work-intro" key={activeHeroWorkIndex} aria-live="polite">
              <GlassSurface {...heroGlassSurfaceProps} className="hero-glass-frame hero-intro-glass" />
              <WarpText as="h2" text={heroWorks[activeHeroWorkIndex].title} strength={0.92} radius={0.56} refraction={0.014} />
              <p className="hero-text-sheen">{heroWorks[activeHeroWorkIndex].description}</p>
            </aside>
          ) : null}

          {heroStage === 2 ? (
            <div className="hero-mobile-carousel-nav" aria-label="首页作品切换">
              <button type="button" onClick={() => stepHeroWork(-1)} disabled={activeHeroWorkIndex === 0} aria-label="上一个作品">←</button>
              <span>{activeHeroWorkIndex + 1} / {heroWorks.length} · 左右滑动</span>
              <button type="button" onClick={() => stepHeroWork(1)} disabled={activeHeroWorkIndex === heroWorks.length - 1} aria-label="下一个作品">→</button>
            </div>
          ) : null}

          <button
            className="hero-skip-button"
            type="button"
            onClick={() => transitionToSection('timeline')}
          >
            <GlassSurface {...heroGlassSurfaceProps} className="hero-glass-frame hero-skip-glass" />
            <span className="hero-skip-label">进入作品集 <span aria-hidden="true">↓</span></span>
          </button>

        </div>
      </section>

      <section className="timeline-section" id="timeline">
        <nav
          className={`timeline-year-rail${isTimelineYearRailVisible ? ' is-visible' : ''}`}
          aria-label="年份快捷导航"
          aria-hidden={!isTimelineYearRailVisible}
        >
          <svg className="timeline-gooey-filter" aria-hidden="true">
            <defs>
              <filter id="timeline-gooey-particles">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" result="goo" />
                <feBlend in="SourceGraphic" in2="goo" />
              </filter>
            </defs>
          </svg>
          <span className="timeline-year-rail-title">年份</span>
          {timeline.map((item) => (
            <button
              className={activeTimelineYear === item.year ? 'is-active' : ''}
              type="button"
              aria-current={activeTimelineYear === item.year ? 'page' : undefined}
              tabIndex={isTimelineYearRailVisible ? 0 : -1}
              key={item.year}
              onClick={() => {
                setRailBurst({ year: item.year, id: Date.now() });
                showTimelineYear(item.year);
              }}
            >
              <strong>{item.year}</strong>
              {railBurst?.year === item.year ? (
                <span className="gooey-click-burst" key={railBurst.id} aria-hidden="true">
                  {Array.from({ length: 19 }, (_, particleIndex) => (
                    <i
                      key={particleIndex}
                      style={{
                        '--gooey-angle': `${(360 / 19) * particleIndex}deg`,
                        '--gooey-distance': `${10 + (particleIndex % 4) * 7}px`,
                        '--gooey-color': gooeyParticleColors[particleIndex % gooeyParticleColors.length],
                        '--gooey-delay': `${(particleIndex % 5) * 14}ms`,
                      } as CSSProperties}
                    />
                  ))}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="portfolio-balatro-background" aria-hidden="true">
          <Balatro
            spinRotation={-1.65}
            spinSpeed={2.45}
            color1="#22e6e9"
            color2="#ff4fc6"
            color3="#10162c"
            contrast={3.6}
            lighting={0.22}
            spinAmount={0.18}
            pixelFilter={2800}
            spinEase={0.8}
            isRotate={false}
            mouseInteraction
          />
        </div>
        <div className="section-shell">
          <div className="section-heading timeline-section-heading">
            <h2>AI 创作时间线</h2>
            <p className="section-lead">从文本对话、图像设计和本地工作流，到 AI 漫剧制作与 Codex Skill 编写，记录创作能力如何逐年扩展为完整的成片流程。</p>
          </div>

          <div className="timeline-year-archive" role="tablist" aria-label="按年份查看作品">
            <CircularGallery
              className="timeline-year-gallery"
              bend={0}
              textColor="#ffffff"
              borderRadius={0.05}
              scrollEase={0.02}
              fontUrl="https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap"
              font="bold 30px Orbitron, Inter, sans-serif"
            >
              {timeline.map((item) => (
                <button
                  className={`timeline-year-button${activeTimelineYear === item.year ? ' is-active' : ''}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTimelineYear === item.year}
                  aria-controls={`timeline-panel-${item.year.toLowerCase()}`}
                  key={item.year}
                  onClick={() => showTimelineYear(item.year)}
                >
                  <span>{item.year}</span>
                  <span className="timeline-year-hover-content" aria-hidden="true">
                    {timelineYearHoverLabels[item.year] ? <small>{timelineYearHoverLabels[item.year]}</small> : null}
                  </span>
                </button>
              ))}
            </CircularGallery>
          </div>

          <div className="timeline-list timeline-list--archive" aria-live="polite">
            {timeline.filter((item) => item.year === activeTimelineYear).map((item) => {
              const index = timeline.findIndex((entry) => entry.year === item.year);
              const effectiveTimelineOrder = item.year === '2026'
                ? timelineAdminCatalog[item.year]
                : savedTimelineOrder[item.year];
              const orderedVideoCases = orderItems(item.videoCases, effectiveTimelineOrder, (entry) => entry.title);
              const orderedGalleries = orderItems(item.galleries, effectiveTimelineOrder, (entry) => entry.label);
              const sectionPosition = (label: string, fallback: number) => {
                const position = effectiveTimelineOrder?.indexOf(label) ?? -1;
                return position >= 0 ? position : fallback;
              };
              return (
              <article
                className={`timeline-item timeline-item--expanded${item.galleries.length > 0 || item.storyboard || item.videoCases.length > 0 ? ' timeline-item--gallery' : ''}`}
                id={`timeline-panel-${item.year.toLowerCase()}`}
                role="tabpanel"
                aria-label={`${item.year} ${item.phase}`}
                key={item.year}
              >
                <div className="timeline-year">
                  <span>{item.year}</span>
                </div>
                <div className={`timeline-visual timeline-visual--${index + 1}`}>
                  {item.videoCases.length > 0 ? (
                    <div className="timeline-video-cases">
                      {orderedVideoCases.map((videoCase) => (
                        <section className={`timeline-storyboard-panel timeline-video-case${videoCase.format === 'portrait' ? ' timeline-video-case--portrait' : ''}${videoCase.title === '古风类 3D 漫全流程制作' ? ' timeline-video-case--ancient-3d' : ''}${videoCase.title === '视频模型测试' ? ' timeline-video-case--model-test' : ''}${videoCase.title === '抖音热点素材制作' ? ' timeline-video-case--douyin-trend' : ''}${videoCase.title === '第一人称视角的尝试' || videoCase.title === '人物微表情的测试' ? ' timeline-video-case--stacked-videos' : ''}`} key={videoCase.title}>
                          <div className="timeline-gallery-heading">
                            <p>{videoCase.title}</p>
                          </div>
                          {videoCase.copy ? <p className="timeline-video-case-copy">{videoCase.copy}</p> : null}
                          {videoCase.assets ? (
                            <div className="timeline-case-assets">
                              <section className="timeline-case-asset-group timeline-case-asset-group--characters">
                                <div className="timeline-case-asset-heading">
                                  <h4>人物资产</h4>
                                </div>
                                <div className="timeline-case-asset-grid timeline-case-asset-grid--characters">
                                  {videoCase.assets.characters.map((asset) => (
                                    <figure className="timeline-case-asset-card" key={asset.src}>
                                      <img src={asset.src} alt={asset.alt} loading="lazy" />
                                      <figcaption>{asset.title}</figcaption>
                                    </figure>
                                  ))}
                                </div>
                              </section>
                              {videoCase.assets.props.length > 0 ? (
                                <section className="timeline-case-asset-group timeline-case-asset-group--props">
                                  <div className="timeline-case-asset-heading">
                                    <h4>道具资产</h4>
                                  </div>
                                  <div className="timeline-case-asset-grid timeline-case-asset-grid--props">
                                    {videoCase.assets.props.map((asset) => (
                                      <figure className="timeline-case-asset-card" key={asset.src}>
                                        <img src={asset.src} alt={asset.alt} loading="lazy" />
                                        <figcaption>{asset.title}</figcaption>
                                      </figure>
                                    ))}
                                  </div>
                                </section>
                              ) : null}
                              <section className="timeline-case-asset-group timeline-case-asset-group--scenes">
                                <div className="timeline-case-asset-heading">
                                  <h4>场景资产</h4>
                                </div>
                                <div className="timeline-case-asset-grid timeline-case-asset-grid--scenes">
                                  {videoCase.assets.scenes.map((asset) => (
                                    <figure className="timeline-case-asset-card" key={asset.src}>
                                      <img src={asset.src} alt={asset.alt} loading="lazy" />
                                      <figcaption>{asset.title}</figcaption>
                                    </figure>
                                  ))}
                                </div>
                              </section>
                              {'storyboards' in videoCase.assets && videoCase.assets.storyboards.length > 0 ? (
                                <section className="timeline-case-asset-group">
                                  <div className="timeline-case-asset-heading">
                                    <h4>分镜画面</h4>
                                  </div>
                                  <div className="timeline-case-asset-grid timeline-case-asset-grid--storyboards">
                                    {videoCase.assets.storyboards.map((asset) => (
                                      <figure className="timeline-case-asset-card" key={asset.src}>
                                        <img src={asset.src} alt={asset.alt} loading="lazy" />
                                        <figcaption>{asset.title}</figcaption>
                                      </figure>
                                    ))}
                                  </div>
                                </section>
                              ) : null}
                            </div>
                          ) : null}
                          {'logoVideos' in videoCase ? (
                            <section className="timeline-logo-videos" aria-label="Logo 动效展示">
                              <div className="timeline-case-asset-heading">
                                <h4>Logo 动效</h4>
                              </div>
                              <div className="timeline-logo-video-grid">
                                {videoCase.logoVideos.map((video) => (
                                  <figure className="timeline-logo-video-card" key={video.src}>
                                    <DeferredVideo controls playsInline preload="metadata" src={videoPreview(video.src)} aria-label={video.title} />
                                    <figcaption>{video.title}</figcaption>
                                  </figure>
                                ))}
                              </div>
                            </section>
                          ) : null}
                          {'horizontalVideos' in videoCase ? (
                            <div className="timeline-model-video-strip" aria-label="抖音热点素材横向展示">
                              {videoCase.horizontalVideos.map((video) => (
                                <figure className="timeline-model-video-card" key={video.src}>
                                  <DeferredVideo
                                    controls
                                    playsInline
                                    preload="metadata"
                                    src={videoPreview(video.src)}
                                    aria-label={video.title}
                                    onPlay={(event) => pauseOtherModelVideos(event.currentTarget)}
                                    onClick={(event) => {
                                      if (event.currentTarget.paused) {
                                        event.currentTarget.play().catch(() => undefined);
                                      }
                                    }}
                                  />
                                </figure>
                              ))}
                            </div>
                          ) : 'modelTestVideos' in videoCase ? (
                            <div className="timeline-model-video-strip" aria-label="视频模型测试横向展示">
                              {videoCase.modelTestVideos.map((source, videoIndex) => (
                                <figure className="timeline-model-video-card" key={source}>
                                  <DeferredVideo
                                    controls
                                    playsInline
                                    preload="metadata"
                                    src={videoPreview(source)}
                                    aria-label={`视频模型测试 ${videoIndex + 1}`}
                                    onPlay={(event) => pauseOtherModelVideos(event.currentTarget)}
                                    onClick={(event) => {
                                      if (event.currentTarget.paused) {
                                        event.currentTarget.play().catch(() => undefined);
                                      }
                                    }}
                                  />
                                </figure>
                              ))}
                            </div>
                          ) : (
                            <div className={`timeline-result-video-group${'additionalVideos' in videoCase ? ' timeline-result-video-group--paired' : ''}`}>
                              {videoCase.src ? (
                                <DeferredVideo
                                  className="timeline-result-video"
                                  controls
                                  playsInline
                                  preload="metadata"
                                  src={videoPreview(videoCase.src)}
                                  aria-label={videoCase.title}
                                />
                              ) : null}
                              {'additionalVideos' in videoCase ? videoCase.additionalVideos.map((video, videoIndex) => (
                                <div key={video.src}>
                                  {'copy' in video && video.copy ? <p className="timeline-video-case-copy">{video.copy}</p> : null}
                                  <DeferredVideo
                                    className={`timeline-result-video timeline-result-video--additional${video.format === 'portrait' ? ' timeline-result-video--portrait' : ''}`}
                                    controls
                                    playsInline
                                    preload="metadata"
                                    src={videoPreview(video.src)}
                                    aria-label={`${videoCase.title} 视频 ${videoIndex + 2}`}
                                  />
                                </div>
                              )) : null}
                            </div>
                          )}
                        </section>
                      ))}
                    </div>
                  ) : item.storyboard ? (
                    <div className="timeline-storyboard">
                      <div className="timeline-storyboard-production">
                        <section className="timeline-storyboard-panel">
                          <div className="timeline-gallery-heading">
                            <p>{item.storyboard.title}</p>
                          </div>
                          <div className="timeline-storyboard-grid">
                            {item.storyboard.frames.map((frame, frameIndex) => (
                              <figure className="timeline-storyboard-frame" key={frame.src}>
                                <img src={frame.src} alt={frame.alt} loading="lazy" />
                              </figure>
                            ))}
                          </div>
                        </section>
                        <section className="timeline-storyboard-panel timeline-video-result">
                          <div className="timeline-gallery-heading">
                            <p>对应生成视频效果</p>
                          </div>
                          <DeferredVideo
                            className="timeline-result-video"
                            controls
                            playsInline
                            preload="metadata"
                            src={videoPreview(item.storyboard.video)}
                            aria-label="2025 年 AI 漫剧分镜对应生成视频"
                          />
                        </section>
                      </div>
                      {'processAssets' in item ? (
                        <section className="timeline-storyboard-panel timeline-process-assets" style={{ order: sectionPosition('保留的制作流程资产', 2) }}>
                          <div className="timeline-gallery-heading">
                            <p>保留的制作流程资产</p>
                          </div>
                          <p className="timeline-video-case-copy">{item.processAssets.copy}</p>
                          <div className="timeline-case-assets">
                            <section className="timeline-case-asset-group timeline-process-asset-group timeline-process-asset-group--characters">
                              <div className="timeline-case-asset-heading">
                                <h4>人物资产</h4>
                              </div>
                              <div className="timeline-case-asset-grid timeline-case-asset-grid--characters">
                                {item.processAssets.characters.map((asset) => (
                                  <figure className="timeline-case-asset-card timeline-process-character-card" key={asset.src}>
                                    <img src={asset.src} alt={asset.alt} loading="lazy" />
                                    <figcaption>{asset.title}</figcaption>
                                  </figure>
                                ))}
                              </div>
                            </section>
                            <section className="timeline-case-asset-group timeline-process-asset-group timeline-process-asset-group--scene">
                              <div className="timeline-case-asset-heading">
                                <h4>场景资产</h4>
                              </div>
                              <div className="timeline-case-asset-grid timeline-case-asset-grid--single">
                                {item.processAssets.scenes.map((asset) => (
                                  <figure className="timeline-case-asset-card" key={asset.src}>
                                    <img src={asset.src} alt={asset.alt} loading="lazy" />
                                    <figcaption>{asset.title}</figcaption>
                                  </figure>
                                ))}
                              </div>
                            </section>
                            <section className="timeline-case-asset-group timeline-process-asset-group--storyboards">
                              <div className="timeline-case-asset-heading">
                                <h4>分镜画面</h4>
                              </div>
                              <div className="timeline-case-asset-grid timeline-case-asset-grid--storyboards">
                                {item.processAssets.storyboards.map((asset, assetIndex) => (
                                  <figure className="timeline-case-asset-card" key={asset.src}>
                                    <img src={asset.src} alt={asset.alt} loading="lazy" />
                                    <figcaption>镜头 {String(assetIndex + 1).padStart(2, '0')}</figcaption>
                                  </figure>
                                ))}
                              </div>
                            </section>
                          </div>
                        </section>
                      ) : null}
                    </div>
                  ) : item.galleries.length > 0 ? (
                    <div className="timeline-gallery">
                      {orderedGalleries.map((group) => (
                        group.className === 'timeline-gallery-group--landscape' || group.className === 'timeline-gallery-group--portrait' || group.className === 'timeline-gallery-group--four-landscape' ? (
                          <InteractiveGallery group={group} key={group.label} />
                        ) : <section className={`timeline-gallery-group ${group.className}`} key={group.label}>
                          <div className="timeline-gallery-heading">
                            <p>{group.label}</p>
                          </div>
                          {'copy' in group && group.copy ? <p className="timeline-gallery-copy">{group.copy}</p> : null}
                          <div className="timeline-gallery-stage">
                            {group.images.map((image, imageIndex) => (
                              <div
                                className="timeline-gallery-slide"
                                key={image.src}
                                style={{ animationDelay: `${imageIndex * 5}s` }}
                              >
                                <img
                                  className="timeline-gallery-backdrop"
                                  src={image.src}
                                  alt=""
                                  aria-hidden="true"
                                />
                                <img className="timeline-image" src={image.src} alt={image.alt} loading="lazy" decoding="async" />
                              </div>
                            ))}
                          </div>
                        </section>
                      ))}
                      {'resultVideo' in item && item.resultVideo ? (
                        <section className="timeline-storyboard-panel timeline-video-result">
                          <div className="timeline-gallery-heading">
                            <p>{item.resultVideo.title}</p>
                          </div>
                          <DeferredVideo
                            className="timeline-result-video"
                            controls
                            playsInline
                            preload="metadata"
                            src={videoPreview(item.resultVideo.src)}
                            aria-label={item.resultVideo.title}
                          />
                        </section>
                      ) : null}
                    </div>
                  ) : item.images.length > 0 ? (
                    <div className={`timeline-slideshow${item.images.length === 1 ? ' is-single' : ''}`}>
                      {item.images.map((image) => (
                        <img className="timeline-image" src={image.src} alt={image.alt} key={image.src} loading="lazy" decoding="async" />
                      ))}
                    </div>
                  ) : (
                    <div className="timeline-placeholder">
                      <span>REPRESENTATIVE WORK</span>
                      <strong>0{index + 1}</strong>
                    </div>
                  )}
                </div>
                <div className="timeline-copy">
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </div>
              </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="innovation-page" id="process" aria-labelledby="innovation-page-title">
        <div className="innovation-page-background" aria-hidden="true">
          <Iridescence
            color={[1, 1, 1]}
            mouseReact={false}
            amplitude={0.1}
            speed={1.0}
          />
        </div>
        <section className="process-section section-shell">
          <div className="section-heading">
            <div>
              <h2 id="innovation-page-title">当前制作流程及创新</h2>
            </div>
            <p className="section-lead">以 AI 协作贯穿剧本理解、制作决策、资产生成、导演分镜与后期声音，将一份剧本逐步推进为完整成片。</p>
          </div>

          <div className="process-track">
            {workflow.map((step, index) => (
              <article className="process-card" key={step.number}>
                <div className="process-topline">
                  <span>{step.number}</span>
                </div>
                {step.image ? (
                  <div className="process-image">
                    <img src={step.image} alt={step.imageAlt} width={1080} height={1920} loading="lazy" decoding="async" />
                  </div>
                ) : step.video ? (
                  <div className="process-film">
                    <div className="process-film-heading">
                      <span>06</span>
                      <div><strong>成片输出</strong><small>FINAL FILM</small></div>
                    </div>
                    <div className="process-film-player">
                      <DeferredVideo controls playsInline preload="metadata" width={1280} height={720} src={step.video} aria-label="成片输出：医院场景最终视频，约14秒">
                        您的浏览器不支持视频播放。
                      </DeferredVideo>
                      <div className="process-film-meta"><span>16:9 横屏</span><span>1280 × 720 · 14 秒</span></div>
                    </div>
                    <div className="process-film-footer"><span>乐湘浔 · AI 创作档案</span><span>成片展示</span></div>
                  </div>
                ) : (
                  <div className={`process-symbol process-symbol--${index + 1}`} aria-hidden="true"><i /></div>
                )}
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="latest-section">
          <div className="section-shell latest-grid">
            <div className="latest-copy">
              <h2>影视级 AI<br />创作系统</h2>
              <p>面向政府项目宣传片与海外剧本创作，为了更高效、更专业地输出影视级视频，持续迭代并反复修改 Agent 与 Skill，尽可能发挥 AI 在创意分析、资产设计、分镜规划与视频制作中的最大作用。</p>
              <div className="latest-meta">
                <div><span>类型</span><strong>政府宣传片 · 海外剧本</strong></div>
                <div><span>方向</span><strong>Agent · Skill · AI 全流程制作</strong></div>
                <div><span>状态</span><strong>持续测试与迭代</strong></div>
              </div>
            </div>
            <div className="latest-visual">
              <img src="/images/latest-ai-filmmaking-system.webp" alt="影视级 AI 创作系统介绍：Agent 与 Skill 串联创意分析、资产设计、分镜规划和视频制作。深色电影风格的 AI 生成流程概念示意图。" width={1920} height={1200} loading="lazy" decoding="async" />
            </div>
          </div>
        </section>
      </section>

      <section className="download-section section-shell" id="downloads">
        <div className="download-lanyard" aria-label="可拖动的乐湘浔作品资料卡，卡面包含个人简历入口">
          {activeSectionId === 'downloads' ? (
            <Lanyard
              position={[0, 0, 14.5]}
              gravity={[0, -40, 0]}
              fov={18}
              frontImage="/assets/lanyard/portfolio-card-front.svg?v=6"
              backImage="/assets/lanyard/portfolio-card-back.jpg"
              imageFit="cover"
              lanyardImage="/assets/lanyard/lanyard.png"
              lanyardWidth={1.2}
              downloadHref="/documents/ai-designer-resume.png"
              downloadFilename="AI设计师简历.png"
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}

