'use client';

/**
 * A floating, always-legible label above a character, rendered as a DOM overlay
 * via drei <Html>. Using DOM (rather than 3D text) keeps names crisp at any
 * distance and avoids bundling/fetching a font.
 */
import { Html } from '@react-three/drei';

export interface NameTagProps {
  name: string;
  /** Accent colour (usually the runner's lane colour). */
  color: string;
  /** Local height to float at. */
  y: number;
  /** Optional rank badge (1-based) shown once finished. */
  rank?: number;
}

export function NameTag({ name, color, y, rank }: NameTagProps) {
  return (
    <Html position={[0, y, 0]} center distanceFactor={11} zIndexRange={[20, 0]} prepend>
      <div
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 999,
          fontFamily: 'system-ui, sans-serif',
          fontSize: 14,
          fontWeight: 600,
          color: '#0b0b0f',
          background: 'rgba(255,255,255,0.9)',
          borderLeft: `4px solid ${color}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          transform: 'translateY(-50%)',
        }}
      >
        {rank != null && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 18,
              height: 18,
              borderRadius: 999,
              background: color,
              color: '#fff',
              fontSize: 11,
            }}
          >
            {rank}
          </span>
        )}
        {name}
      </div>
    </Html>
  );
}
