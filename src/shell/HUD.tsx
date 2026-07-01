'use client';

/** In-scene overlay: start button, countdown, camera switcher, pause/stop. */
import { useDrawStore } from '@/store/useDrawStore';

const CAM_OPTIONS: Array<{ key: string | null; label: string }> = [
  { key: null, label: '自動' },
  { key: 'overview', label: '全景' },
  { key: 'leader', label: '領先者' },
  { key: 'trackside', label: '場邊' },
];

export function HUD() {
  const phase = useDrawStore((s) => s.phase);
  const countdown = useDrawStore((s) => s.countdown);
  const participants = useDrawStore((s) => s.participants);
  const paused = useDrawStore((s) => s.paused);
  const start = useDrawStore((s) => s.start);
  const reset = useDrawStore((s) => s.reset);
  const togglePause = useDrawStore((s) => s.togglePause);
  const cameraShotKey = useDrawStore((s) => s.cameraShotKey);
  const setCameraShot = useDrawStore((s) => s.setCameraShot);

  const canStart = participants.length >= 2;

  return (
    <div className="hud">
      <div className="hud-top">
        {phase === 'countdown' && countdown != null && <div className="countdown">{countdown}</div>}
        {phase === 'running' && paused && <div className="paused-badge">⏸ 已暫停</div>}
        {phase === 'running' && !paused && (
          <div className="cam-btns" role="group" aria-label="鏡頭視角">
            {CAM_OPTIONS.map((o) => (
              <button
                key={o.label}
                className={cameraShotKey === o.key ? 'active' : ''}
                onClick={() => setCameraShot(o.key)}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="hud-bottom">
        {phase === 'setup' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <button className="start-pill" disabled={!canStart} onClick={start}>
              🚦 開始抽籤
            </button>
            {!canStart && <span className="count-hint">至少需要 2 位參賽者</span>}
          </div>
        )}
        {phase === 'running' && (
          <>
            <button className="btn btn-primary" onClick={togglePause}>
              {paused ? '▶︎ 繼續' : '⏸ 暫停'}
            </button>
            <button className="btn btn-ghost" onClick={reset}>
              停止
            </button>
          </>
        )}
      </div>
    </div>
  );
}
