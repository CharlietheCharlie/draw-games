'use client';

/** Add / rename / remove participants (up to the mode's max) and set the seed. */
import { useDrawStore } from '@/store/useDrawStore';
import { getMode } from '@/core/mode/registry';
import { LANE_COLORS } from '@/core/character/palettes';

export function ParticipantPanel() {
  const participants = useDrawStore((s) => s.participants);
  const phase = useDrawStore((s) => s.phase);
  const activeModeId = useDrawStore((s) => s.activeModeId);
  const add = useDrawStore((s) => s.addParticipant);
  const remove = useDrawStore((s) => s.removeParticipant);
  const rename = useDrawStore((s) => s.renameParticipant);
  const clear = useDrawStore((s) => s.clearParticipants);

  const editable = phase === 'setup';
  const max = getMode(activeModeId).maxParticipants;

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <p className="section-title">參賽者 {participants.length}/{max}</p>
          <button
            className="btn btn-ghost"
            style={{ padding: '4px 10px', fontSize: 12 }}
            disabled={!editable || participants.length === 0}
            onClick={clear}
          >
            清空
          </button>
        </div>

        <div className="participants">
          {participants.map((p, i) => (
            <div className="participant-row" key={p.id}>
              <span className="lane-dot" style={{ background: LANE_COLORS[i % LANE_COLORS.length] }} />
              <input
                type="text"
                value={p.name}
                disabled={!editable}
                maxLength={16}
                onChange={(e) => rename(p.id, e.target.value)}
                aria-label={`參賽者 ${i + 1} 名稱`}
              />
              <button className="icon-btn" disabled={!editable} onClick={() => remove(p.id)} title="移除">
                ✕
              </button>
            </div>
          ))}
          {participants.length === 0 && <p className="count-hint">尚無參賽者，請新增。</p>}
        </div>

        <button
          className="btn btn-block"
          style={{ marginTop: 10 }}
          disabled={!editable || participants.length >= max}
          onClick={() => add()}
        >
          ＋ 新增參賽者
        </button>
      </div>
    </section>
  );
}
