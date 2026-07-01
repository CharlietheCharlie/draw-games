import { ImageResponse } from 'next/og';

// Route-based OG image (Next auto-wires og:image + twitter:image from this file).
// Text is kept Latin-only so it renders with ImageResponse's bundled default font
// — no CJK webfont to ship, no tofu boxes.
export const alt = 'Race Draw — a fair lottery decided by a track race';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          gap: 34,
          background: 'linear-gradient(135deg, #0d1220 0%, #17233f 55%, #123a4a 100%)',
          color: '#eef3fb',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 320,
            height: 176,
            borderRadius: 999,
            border: '16px solid #e0a04a',
          }}
        />
        <div style={{ display: 'flex', fontSize: 96, fontWeight: 800, letterSpacing: 4 }}>
          RACE DRAW
        </div>
        <div style={{ display: 'flex', fontSize: 36, color: '#9fb0c6' }}>
          A fair lottery, decided by a race
        </div>
      </div>
    ),
    size,
  );
}
