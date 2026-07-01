import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '賽跑抽籤 · Race Draw',
  description: '3D 操場賽跑抽籤 — 用一場公平的賽跑決定中籤者，可擴充輪盤、爬梯子等玩法。',
};

export const viewport: Viewport = {
  themeColor: '#0d1220',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
