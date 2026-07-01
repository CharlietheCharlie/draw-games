'use client';

/**
 * Sky (scene background), fog, stars and lighting, driven by day/night. Reads
 * the store *inside* the Canvas so toggling time-of-day reliably re-renders.
 *
 * We set the three.js scene background COLOR directly (rather than a skydome
 * mesh) so it always fills the frame — no reliance on render order and no
 * bleed-through of the page background — which makes the night switch reliable.
 */
import { Stars } from '@react-three/drei';
import { useDrawStore } from '@/store/useDrawStore';
import { Lighting } from './Lighting';

const SKY_DAY = '#a9d8f5';
const SKY_NIGHT = '#0b1636';
const FOG_DAY = '#dcecf5';
const FOG_NIGHT = '#12203f';

export function SceneBackdrop() {
  const night = useDrawStore((s) => s.timeOfDay === 'night');

  return (
    <>
      <color attach="background" args={[night ? SKY_NIGHT : SKY_DAY]} />
      <fog attach="fog" args={[night ? FOG_NIGHT : FOG_DAY, 170, 420]} />
      {night && <Stars radius={340} depth={70} count={1600} factor={4} saturation={0} fade speed={0.4} />}
      <Lighting night={night} />
    </>
  );
}
