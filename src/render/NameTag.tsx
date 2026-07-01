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
    <Html position={[0, y, 0]} center distanceFactor={17} zIndexRange={[20, 0]} prepend>
      <div
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '6px 14px 6px 11px',
          borderRadius: 999,
          fontFamily: 'system-ui, sans-serif',
          fontSize: 22,
          fontWeight: 800,
          color: '#0b0b0f',
          background: 'rgba(255,255,255,0.96)',
          borderLeft: `7px solid ${color}`,
          boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
          transform: 'translateY(-50%)',
        }}
      >
        {rank != null && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 28,
              height: 28,
              borderRadius: 999,
              background: color,
              color: '#fff',
              fontSize: 16,
              fontWeight: 800,
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
