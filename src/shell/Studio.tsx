'use client';

/**
 * The main app layout: a control sidebar (mode picker + participant editor) and
 * the 3D stage with its HUD and result overlay. Also drives the countdown timer.
 * Importing registerAll here (first) guarantees every game mode is registered
 * before any store action or scene render runs.
 */
import '@/modes/registerAll';
import { useEffect } from 'react';
import { useDrawStore } from '@/store/useDrawStore';
import { Stage } from './Stage';
import { ParticipantPanel } from './ParticipantPanel';
import { HUD } from './HUD';
import { ResultOverlay } from './ResultOverlay';

const COUNTDOWN_MS = 750;

export function Studio() {
  const phase = useDrawStore((s) => s.phase);
  const countdown = useDrawStore((s) => s.countdown);
  const tickCountdown = useDrawStore((s) => s.tickCountdown);
  const rebuildPreview = useDrawStore((s) => s.rebuildPreview);

  // Build the initial on-track preview once modes are registered.
  useEffect(() => {
    rebuildPreview();
  }, [rebuildPreview]);

  // Countdown 3 → 2 → 1 → go.
  useEffect(() => {
    if (phase !== 'countdown') return;
    const t = setTimeout(tickCountdown, COUNTDOWN_MS);
    return () => clearTimeout(t);
  }, [phase, countdown, tickCountdown]);

  return (
    <div className="studio">
      <main className="stage-area">
        <Stage />
        <HUD />
        <ResultOverlay />
      </main>
      <aside className={`panel-card${phase === 'setup' ? '' : ' collapsed'}`}>
        <div className="brand">
          <div className="logo">🏟️</div>
          <div>
            <h1>賽跑抽籤</h1>
            <p>一場公平的操場賽跑，跑第一的就是中籤者</p>
          </div>
        </div>
        <ParticipantPanel />
      </aside>
    </div>
  );
}
