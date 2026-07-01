'use client';

/** The result card shown once the race resolves: winner, full order, replay. */
import { useDrawStore } from '@/store/useDrawStore';

const MEDALS = ['🥇', '🥈', '🥉'];

export function ResultOverlay() {
  const phase = useDrawStore((s) => s.phase);
  const ranking = useDrawStore((s) => s.ranking);
  const participants = useDrawStore((s) => s.participants);
  const replay = useDrawStore((s) => s.replay);
  const reset = useDrawStore((s) => s.reset);

  if (phase !== 'result' || !ranking) return null;

  const nameOf = (id: string) => participants.find((p) => p.id === id)?.name ?? id;
  const winner = ranking[0];

  return (
    <div className="hud">
      <div className="result-card" role="dialog" aria-label="抽籤結果">
        <div className="winner-badge">
          <div className="label">🏆 中籤者 WINNER</div>
          <div className="name">{winner ? nameOf(winner) : '—'}</div>
        </div>

        <ol className="rank-list">
          {ranking.map((id, i) => (
            <li key={id} className={i === 0 ? 'top' : ''}>
              <span className="rank-num">{i + 1}</span>
              <span style={{ flex: 1 }}>{nameOf(id)}</span>
              {i < 3 && <span>{MEDALS[i]}</span>}
            </li>
          ))}
        </ol>

        <div className="result-actions">
          <button className="btn btn-primary btn-block" onClick={replay}>
            🔁 重播這場
          </button>
          <button className="btn btn-block" onClick={reset}>
            ✏️ 重新設定
          </button>
        </div>
      </div>
    </div>
  );
}
