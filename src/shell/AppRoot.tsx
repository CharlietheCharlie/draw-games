'use client';

/**
 * The single client boundary. The whole studio (and therefore the entire
 * three.js / drei / WebGL graph) is dynamically imported with ssr:false, so
 * nothing 3D is ever evaluated or rendered on the server — the standard,
 * hydration-safe way to host React Three Fiber in the Next.js App Router.
 */
import dynamic from 'next/dynamic';

const Studio = dynamic(() => import('./Studio').then((m) => m.Studio), {
  ssr: false,
  loading: () => (
    <div className="boot">
      <div className="spinner" />
      <div>載入 3D 賽場中…</div>
    </div>
  ),
});

export function AppRoot() {
  return <Studio />;
}
