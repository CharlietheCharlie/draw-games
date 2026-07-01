'use client';

/**
 * Stylised athletics-stadium surroundings (original low-poly geometry): a tiered
 * grandstand bowl with seated crowd, white cantilever roofs over BOTH straights
 * (main + a smaller back roof), floodlight towers, and a distant city skyline
 * with one tall tower. Reacts to day/night — at night the floodlights cast warm
 * pools on the field (spotlights) and the lamp heads / windows glow.
 */
import { useEffect, useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { type StadiumDims, laneRadius, pathPoint, outlinePoints, pathLength } from '@/core/geometry/stadium';
import { UNIT_BOX, TOON_GRADIENT } from '@/render/sharedGeometry';
import { makeBowlGeometry } from '@/render/stadiumBuild';
import { generateAvatar, type AvatarDescriptor } from '@/core/character/descriptor';
import { Avatar } from '@/render/Avatar';

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface StadiumEnvProps {
  dims: StadiumDims;
  laneCount: number;
  night: boolean;
}

export function StadiumEnv({ dims, laneCount, night }: StadiumEnvProps) {
  const outerR = laneRadius(dims, laneCount - 1) + dims.laneWidth / 2;
  const S = dims.straight;

  // ---- Materials ----
  // seat/roof are tagged as occluders and can fade — start transparent-capable so
  // toggling opacity never triggers a shader recompile.
  const seatMat = useMemo(() => new THREE.MeshToonMaterial({ color: '#41628c', gradientMap: TOON_GRADIENT, side: THREE.DoubleSide, transparent: true }), []);
  const roofMat = useMemo(() => new THREE.MeshToonMaterial({ color: '#eef2f6', gradientMap: TOON_GRADIENT, side: THREE.DoubleSide, transparent: true }), []);
  const concreteMat = useMemo(() => new THREE.MeshToonMaterial({ color: '#b9c0c9', gradientMap: TOON_GRADIENT }), []);
  const lampMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#dfe6ef', emissive: new THREE.Color('#fff4d0'), emissiveIntensity: night ? 3 : 0.1 }),
    [night],
  );
  const buildingMat = useMemo(
    () =>
      new THREE.MeshToonMaterial({
        color: night ? '#222c46' : '#9fb0c6',
        gradientMap: TOON_GRADIENT,
        emissive: new THREE.Color(night ? '#4658a0' : '#000000'),
      }),
    [night],
  );

  useEffect(() => () => { seatMat.dispose(); roofMat.dispose(); concreteMat.dispose(); }, [seatMat, roofMat, concreteMat]);
  useEffect(() => () => lampMat.dispose(), [lampMat]);
  useEffect(() => () => buildingMat.dispose(), [buildingMat]);

  // ---- Grandstand bowl (full ring) + front wall ----
  const bowlGeo = useMemo(() => makeBowlGeometry(S, outerR + 2, 1.2, outerR + 16, 11, 0, 1, 200), [S, outerR]);
  const frontWallGeo = useMemo(() => makeBowlGeometry(S, outerR + 1.9, 0, outerR + 2.1, 1.3, 0, 1, 180), [S, outerR]);
  const seatRows = useMemo(() => {
    const rows: Array<Array<[number, number, number]>> = [];
    for (let k = 1; k <= 6; k++) {
      const tt = k / 7;
      const r = outerR + 2 + (outerR + 16 - (outerR + 2)) * tt;
      const y = 1.2 + (11 - 1.2) * tt;
      const pts = outlinePoints(S, r, 120).map(([x, z]) => [x, y + 0.05, z] as [number, number, number]);
      pts.push(pts[0]!);
      rows.push(pts);
    }
    return rows;
  }, [S, outerR]);

  // ---- Seated crowd on the rake (real avatar-style characters, sparse) ----
  const crowd = useMemo(() => {
    const rnd = lcg(99173);
    const arr: Array<{ id: string; pos: [number, number, number]; yaw: number; descriptor: AvatarDescriptor }> = [];
    const N = 36;
    for (let i = 0; i < N; i++) {
      const u = rnd();
      const tt = 0.18 + rnd() * 0.66;
      const r = outerR + 2 + (outerR + 16 - (outerR + 2)) * tt;
      const y = 1.2 + (11 - 1.2) * tt;
      const p = pathPoint(S, r, u);
      arr.push({ id: `spec-${i}`, pos: [p.x, y - 0.15, p.z], yaw: Math.atan2(-p.x, -p.z), descriptor: generateAvatar(`spectator-${i}`, 'crowd') });
    }
    return arr;
  }, [S, outerR]);

  // ---- Roofs over both straights (main + smaller back) ----
  const rr = outerR + 10;
  const total = pathLength(S, rr);
  const uFront = S / 2 / total;
  const uBack = (1.5 * S + Math.PI * rr) / total;
  const roofMainGeo = useMemo(() => makeBowlGeometry(S, outerR + 3, 12.5, outerR + 17, 16.5, uFront - 0.17, uFront + 0.17, 64), [S, outerR, uFront]);
  const roofBackGeo = useMemo(() => makeBowlGeometry(S, outerR + 3, 9.5, outerR + 12, 12, uBack - 0.1, uBack + 0.1, 48), [S, outerR, uBack]);
  const roofColumns = useMemo(() => {
    const cols: Array<{ pos: [number, number, number]; h: number }> = [];
    for (let i = 0; i <= 4; i++) {
      const p = pathPoint(S, outerR + 17, uFront - 0.15 + 0.3 * (i / 4));
      cols.push({ pos: [p.x, 8.25, p.z], h: 16.5 });
    }
    for (let i = 0; i <= 2; i++) {
      const p = pathPoint(S, outerR + 12, uBack - 0.08 + 0.16 * (i / 2));
      cols.push({ pos: [p.x, 6, p.z], h: 12 });
    }
    return cols;
  }, [S, outerR, uFront, uBack]);

  useEffect(() => () => { bowlGeo.dispose(); frontWallGeo.dispose(); roofMainGeo.dispose(); roofBackGeo.dispose(); }, [bowlGeo, frontWallGeo, roofMainGeo, roofBackGeo]);

  // ---- Floodlight towers ----
  const towers = useMemo(
    () => [0.13, 0.37, 0.63, 0.87].map((u) => {
      const p = pathPoint(S, outerR + 17, u);
      return { x: p.x, z: p.z, yaw: Math.atan2(-p.x, -p.z) };
    }),
    [S, outerR],
  );
  const TOWER_H = 20;

  // ---- Distant skyline ----
  const buildings = useMemo(() => {
    const rnd = lcg(20260701);
    const out: Array<{ x: number; z: number; w: number; h: number }> = [];
    const count = 34;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + rnd() * 0.1;
      const rad = 135 + rnd() * 55;
      const h = 16 + rnd() * rnd() * 70;
      const w = 7 + rnd() * 9;
      out.push({ x: Math.cos(ang) * rad, z: Math.sin(ang) * rad, w, h });
    }
    return out;
  }, []);
  const tower = useMemo(() => ({ x: Math.cos(Math.PI * 0.28) * 165, z: Math.sin(Math.PI * 0.28) * 165 }), []);

  return (
    <group>
      {/* Grandstand + rows (occluder: fades when it blocks a runner) */}
      <mesh geometry={bowlGeo} material={seatMat} receiveShadow dispose={null} userData={{ occluder: true }} />
      <mesh geometry={frontWallGeo} material={concreteMat} dispose={null} />
      {seatRows.map((pts, i) => (
        <Line key={i} points={pts} color="#33507a" lineWidth={1.5} transparent opacity={0.5} />
      ))}

      {/* Crowd (seated avatar-style spectators) */}
      {crowd.map((c) => (
        <group key={c.id} position={c.pos} rotation={[0, c.yaw, 0]}>
          <Avatar descriptor={c.descriptor} seated castShadow={false} />
        </group>
      ))}

      {/* Roofs + columns (occluders) */}
      <mesh geometry={roofMainGeo} material={roofMat} castShadow dispose={null} userData={{ occluder: true }} />
      <mesh geometry={roofBackGeo} material={roofMat} castShadow dispose={null} userData={{ occluder: true }} />
      {roofColumns.map((c, i) => (
        <mesh key={i} position={c.pos} material={roofMat} dispose={null} userData={{ occluder: true }}>
          <boxGeometry args={[0.5, c.h, 0.5]} />
        </mesh>
      ))}

      {/* Floodlight towers */}
      {towers.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} rotation={[0, t.yaw, 0]}>
          <mesh position={[0, TOWER_H / 2, 0]} material={concreteMat} castShadow dispose={null}>
            <boxGeometry args={[0.7, TOWER_H, 0.7]} />
          </mesh>
          <mesh position={[0, TOWER_H + 0.8, 0.6]} material={concreteMat} dispose={null}>
            <boxGeometry args={[4.4, 2.4, 0.5]} />
          </mesh>
          {[-1.5, 0, 1.5].map((lx) =>
            [-0.65, 0.65].map((ly) => (
              <mesh key={`${lx}-${ly}`} position={[lx, TOWER_H + 0.8 + ly, 0.9]} material={lampMat} dispose={null}>
                <boxGeometry args={[1.2, 1, 0.25]} />
              </mesh>
            )),
          )}
        </group>
      ))}

      {/* Skyline */}
      {buildings.map((b, i) => (
        <mesh key={i} geometry={UNIT_BOX} material={buildingMat} position={[b.x, b.h / 2, b.z]} scale={[b.w, b.h, b.w]} dispose={null} />
      ))}
      <group position={[tower.x, 0, tower.z]}>
        {[0, 1, 2, 3, 4].map((k) => {
          const h = 16 - k * 1.5;
          const w = 11 - k * 1.7;
          return <mesh key={k} geometry={UNIT_BOX} material={buildingMat} position={[0, k * 14 + h / 2, 0]} scale={[w, h, w]} dispose={null} />;
        })}
        <mesh geometry={UNIT_BOX} material={buildingMat} position={[0, 82, 0]} scale={[1, 14, 1]} dispose={null} />
      </group>
    </group>
  );
}
