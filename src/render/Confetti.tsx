'use client';

/**
 * Falling confetti — a single InstancedMesh of small coloured flakes that drift
 * down, sway, and tumble, respawning at the top so it keeps raining. Cheap
 * (one draw call). Rendered over the winner on the result screen.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const COLORS = [
  '#ff5a5a', '#ff8a3d', '#ffb43d', '#ffe14d', '#b6e64d',
  '#5adf6b', '#3dd0a0', '#4ab8ff', '#4a7bff', '#8a6bff',
  '#c06bff', '#ff6bd0', '#ff5aa0', '#ffffff', '#f6c445',
];

// Module-scope scratch objects (reused; only one Confetti is on screen at once).
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

interface Flake {
  x: number;
  y: number;
  z: number;
  vy: number;
  sway: number;
  swayAmp: number;
  drift: number;
  rx: number;
  ry: number;
  rz: number;
  sx: number;
  sy: number;
  sz: number;
}

function spawn(radius: number, height: number): Flake {
  const a = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * radius;
  return {
    x: Math.cos(a) * r,
    z: Math.sin(a) * r,
    y: height * (0.35 + Math.random() * 0.95),
    vy: 1.4 + Math.random() * 2.1,
    sway: Math.random() * Math.PI * 2,
    swayAmp: 0.5 + Math.random() * 1.2,
    drift: (Math.random() - 0.5) * 0.6,
    rx: Math.random() * Math.PI,
    ry: Math.random() * Math.PI,
    rz: Math.random() * Math.PI,
    sx: (Math.random() - 0.5) * 6,
    sy: (Math.random() - 0.5) * 6,
    sz: (Math.random() - 0.5) * 6,
  };
}

export interface ConfettiProps {
  origin: [number, number, number];
  count?: number;
  radius?: number;
  height?: number;
}

export function Confetti({ origin, count = 260, radius = 9, height = 13 }: ConfettiProps) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const flakes = useRef<Flake[] | null>(null);

  const geometry = useMemo(() => new THREE.PlaneGeometry(0.16, 0.26), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), []);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  // Per-flake colour, set once.
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    for (let i = 0; i < count; i++) {
      _color.set(COLORS[(Math.random() * COLORS.length) | 0]!);
      m.setColorAt(i, _color);
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [count]);

  useFrame((_, delta) => {
    const m = mesh.current;
    if (!m) return;
    if (!flakes.current || flakes.current.length !== count) {
      flakes.current = Array.from({ length: count }, () => spawn(radius, height));
    }
    const list = flakes.current;
    const dt = Math.min(delta, 0.05);
    for (let i = 0; i < list.length; i++) {
      const p = list[i]!;
      p.y -= p.vy * dt;
      p.sway += dt * 3;
      p.x += Math.sin(p.sway) * p.swayAmp * dt + p.drift * dt;
      p.rx += p.sx * dt;
      p.ry += p.sy * dt;
      p.rz += p.sz * dt;
      if (p.y < 0.05) Object.assign(p, spawn(radius, height));
      _dummy.position.set(origin[0] + p.x, origin[1] + p.y, origin[2] + p.z);
      _dummy.rotation.set(p.rx, p.ry, p.rz);
      _dummy.updateMatrix();
      m.setMatrixAt(i, _dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geometry, material, count]} frustumCulled={false} />;
}
