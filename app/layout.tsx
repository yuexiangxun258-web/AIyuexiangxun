import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '乐湘浔｜AI 创作档案',
  description: '乐湘浔的 AI 影视与视觉创作档案，记录代表作品、创作时间线与个人工作流程。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://pub-9b96ac52d99f4c28a93088ba636ccac8.r2.dev" />
        <link rel="dns-prefetch" href="https://pub-9b96ac52d99f4c28a93088ba636ccac8.r2.dev" />
        <link rel="preload" as="image" href="/images/opening-red-blue-liquid-4k.webp" fetchPriority="high" />
      </head>
      <body>{children}</body>
    </html>
  );
}
