'use client';

/** The result card: winner front-and-centre; the full order is collapsed by
 *  default and expands on tap. */
import { useState } from 'react';
import { useDrawStore } from '@/store/useDrawStore';

const MEDALS = ['🥇', '🥈', '🥉'];

export function ResultOverlay() {
  const phase = useDrawStore((s) => s.phase);
  const ranking = useDrawStore((s) => s.ranking);

  if (phase !== 'result' || !ranking) return null;
  // Key by the finishing order so each new race starts collapsed again.
  return <ResultCard key={ranking.join('-')} ranking={ranking} />;
}

function ResultCard({ ranking }: { ranking: string[] }) {
  const participants = useDrawStore((s) => s.participants);
  const replay = useDrawStore((s) => s.replay);
  const reset = useDrawStore((s) => s.reset);
  const [expanded, setExpanded] = useState(false);

  const nameOf = (id: string) => participants.find((p) => p.id === id)?.name ?? id;
  const winner = ranking[0];
  const others = ranking.length - 1;

  return (
    <div className="hud">
      <div className="result-card" role="dialog" aria-label="抽籤結果">
        <div className="winner-badge">
          <div className="crown">🏆</div>
          <div className="label">中籤者 WINNER</div>
          <div className="name">{winner ? nameOf(winner) : '—'}</div>
        </div>

        {others > 0 && (
          <>
            <button
              className="rank-toggle"
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={expanded}
            >
              {expanded ? '收合名次 ▴' : `完整名次（${ranking.length} 人）▾`}
            </button>
            {expanded && (
              <ol className="rank-list">
                {ranking.map((id, i) => (
                  <li key={id} className={i === 0 ? 'top' : ''}>
                    <span className="rank-num">{i + 1}</span>
                    <span style={{ flex: 1 }}>{nameOf(id)}</span>
                    {i < 3 && <span>{MEDALS[i]}</span>}
                  </li>
                ))}
              </ol>
            )}
          </>
        )}

        <div className="result-actions">
          <button className="btn btn-primary btn-block" onClick={replay}>
            🎲 再抽一次
          </button>
          <button className="btn btn-block" onClick={reset}>
            ✏️ 重新設定
          </button>
        </div>
      </div>
    </div>
  );
}
