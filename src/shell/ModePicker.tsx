'use client';

/**
 * Lists the registered game modes and lets the user pick one. New modes appear
 * here automatically (from the registry) with no code change. The two greyed
 * entries advertise the planned roulette / ladder modes.
 */
import { listModes } from '@/core/mode/registry';
import { useDrawStore } from '@/store/useDrawStore';

export function ModePicker() {
  const activeModeId = useDrawStore((s) => s.activeModeId);
  const phase = useDrawStore((s) => s.phase);
  const setMode = useDrawStore((s) => s.setMode);
  const modes = listModes();

  return (
    <section>
      <p className="section-title">玩法 Mode</p>
      <div className="mode-list">
        {modes.map((m) => (
          <button
            key={m.id}
            className={`mode-btn ${m.id === activeModeId ? 'active' : ''}`}
            disabled={phase !== 'setup'}
            onClick={() => setMode(m.id)}
          >
            {m.label}
            <small>最多 {m.maxParticipants} 人</small>
          </button>
        ))}
        <div className="mode-btn" aria-disabled style={{ opacity: 0.45 }}>
          🎡 幸運輪盤 · Roulette
          <small>即將推出</small>
        </div>
        <div className="mode-btn" aria-disabled style={{ opacity: 0.45 }}>
          🪜 鬼腳圖 · Ladder
          <small>即將推出</small>
        </div>
      </div>
    </section>
  );
}
