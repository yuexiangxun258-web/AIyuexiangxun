'use client';

import { memo, useEffect, useRef, useState, type RefObject } from 'react';

const formatTime = (time: number) => `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`;

// Playback ticks belong to the controls, never to the page/background tree.
const HeroVideoControls = memo(function HeroVideoControls({ videos, index, title, onRequestPlay, onInteraction }: {
  videos: RefObject<Record<number, HTMLVideoElement | null>>;
  index: number;
  title: string;
  onRequestPlay: (video: HTMLVideoElement) => void;
  onInteraction: (autoHide: boolean) => void;
}) {
  const [playback, setPlayback] = useState({ time: 0, duration: 0, paused: true, muted: false });
  const seeking = useRef(false);
  const pendingSeek = useRef(0);

  useEffect(() => {
    const video = videos.current[index];
    if (!video) return;
    const sync = () => setPlayback((current) => ({
      time: seeking.current ? current.time : video.currentTime,
      duration: Number.isFinite(video.duration) ? video.duration : 0,
      paused: video.paused,
      muted: video.muted,
    }));
    const events = ['timeupdate', 'loadedmetadata', 'durationchange', 'play', 'pause', 'ended', 'volumechange', 'emptied'];
    events.forEach((event) => video.addEventListener(event, sync));
    sync();
    return () => events.forEach((event) => video.removeEventListener(event, sync));
  }, [videos, index]);

  const commitSeek = () => {
    if (!seeking.current) return;
    seeking.current = false;
    const video = videos.current[index];
    if (video && Number.isFinite(video.duration)) video.currentTime = Math.min(pendingSeek.current, video.duration);
  };

  return <div className="hero-video-controls" aria-label={`${title} 播放控制`}
    onPointerDown={() => onInteraction(false)}
    onPointerUp={() => onInteraction(!videos.current[index]?.paused)}
    onPointerCancel={() => onInteraction(!videos.current[index]?.paused)}
    onFocusCapture={() => onInteraction(false)}
    onBlurCapture={() => onInteraction(!videos.current[index]?.paused)}>
    <button type="button" onClick={() => {
      const video = videos.current[index];
      if (!video) return;
      if (video.paused) onRequestPlay(video);
      else video.pause();
    }} aria-label={playback.paused ? '播放视频' : '暂停视频'}>{playback.paused ? '▶' : 'Ⅱ'}</button>
    <input type="range" min="0" max={Math.max(playback.duration, .01)} step="0.01"
      value={Math.min(playback.time, Math.max(playback.duration, .01))}
      onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
      onChange={(event) => {
        seeking.current = true;
        pendingSeek.current = Number(event.currentTarget.value);
        setPlayback((current) => ({ ...current, time: pendingSeek.current }));
      }}
      onPointerUp={commitSeek} onPointerCancel={commitSeek} onKeyUp={commitSeek} onBlur={commitSeek}
      aria-label="视频播放进度" />
    <span>{formatTime(playback.time)} / {formatTime(playback.duration)}</span>
    <button type="button" onClick={() => {
      const video = videos.current[index];
      if (video) video.muted = !video.muted;
    }} aria-label={playback.muted ? '打开声音' : '关闭声音'}>{playback.muted ? '开启声音' : '声音'}</button>
  </div>;
});

export default HeroVideoControls;
