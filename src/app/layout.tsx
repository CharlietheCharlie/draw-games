import type { Metadata, Viewport } from 'next';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const TITLE = '賽跑抽籤 · Race Draw';
const DESCRIPTION =
  '3D 操場賽跑抽籤 — 用一場公平的賽跑決定中籤者，可擴充輪盤、爬梯子等玩法。';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: 'Race Draw',
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
    locale: 'zh_TW',
    siteName: 'Race Draw',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
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
