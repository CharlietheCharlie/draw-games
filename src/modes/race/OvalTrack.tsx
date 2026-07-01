'use client';

/**
 * Procedural, cel-shaded oval running track: a clay track ring (ShapeGeometry
 * with a hole), white lane lines, a checkered start/finish line under a finish
 * arch, a grass infield/ground, and a few decorative bushes. Everything derives
 * from the shared stadium geometry so runners line up exactly with their lanes.
 */
import { useEffect, useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { type StadiumDims, laneRadius, outlinePoints } from '@/core/geometry/stadium';
import { getToonMaterial } from '@/render/sharedGeometry';

export interface OvalTrackProps {
  dims: StadiumDims;
  laneCount: number;
}

const OUTLINE_SEGMENTS = 140;

const GRASS = '#6fae52';
const CLAY = '#c8694a';
const KERB = '#f4f1e8';
const ARCH = '#e5623c';
const BUSH = '#57993f';

const BUSHES: Array<[number, number]> = [
  [-9, 3],
  [8, -4],
  [11, 1.5],
  [-3, -4.5],
  [2, 5],
];

export function OvalTrack({ dims, laneCount }: OvalTrackProps) {
  const innerR = laneRadius(dims, 0) - dims.laneWidth / 2;
  const outerR = laneRadius(dims, laneCount - 1) + dims.laneWidth / 2;

  const trackGeo = useMemo(() => {
    const outer = outlinePoints(dims.straight, outerR, OUTLINE_SEGMENTS);
    const inner = outlinePoints(dims.straight, innerR, OUTLINE_SEGMENTS);
    const shape = new THREE.Shape(outer.map(([x, z]) => new THREE.Vector2(x, z)));
    const hole = new THREE.Path(inner.map(([x, z]) => new THREE.Vector2(x, z)));
    shape.holes.push(hole);
    return new THREE.ShapeGeometry(shape);
  }, [dims, innerR, outerR]);

  useEffect(() => () => trackGeo.dispose(), [trackGeo]);

  const laneLines = useMemo(() => {
    const base = laneRadius(dims, 0) - dims.laneWidth / 2;
    const loops: Array<Array<[number, number, number]>> = [];
    for (let l = 0; l <= laneCount; l++) {
      const r = base + l * dims.laneWidth;
      const pts = outlinePoints(dims.straight, r, OUTLINE_SEGMENTS).map(
        ([x, z]) => [x, 0.05, z] as [number, number, number],
      );
      pts.push(pts[0]!);
      loops.push(pts);
    }
    return loops;
  }, [dims, laneCount]);

  const startX = -dims.straight / 2;
  const startZ = -(innerR + outerR) / 2;
  const trackWidth = outerR - innerR;

  // Checkered start/finish line.
  const checkers = useMemo(() => {
    const cells: Array<{ z: number; light: boolean }> = [];
    const cell = dims.laneWidth / 2;
    const n = Math.ceil(trackWidth / cell);
    for (let i = 0; i < n; i++) {
      cells.push({ z: -innerR - i * cell - cell / 2, light: i % 2 === 0 });
    }
    return { cells, cell };
  }, [dims.laneWidth, innerR, trackWidth]);

  return (
    <group>
      {/* Grass ground / infield. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={getToonMaterial(GRASS)} dispose={null}>
        <planeGeometry args={[600, 600]} />
      </mesh>

      {/* Track surface. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
        geometry={trackGeo}
        receiveShadow
        material={getToonMaterial(CLAY)}
        dispose={null}
      />

      {/* Lane divider lines. */}
      {laneLines.map((pts, i) => (
        <Line key={i} points={pts} color="#f6f4ec" lineWidth={2} transparent opacity={0.85} />
      ))}

      {/* Checkered start / finish line. */}
      {checkers.cells.map((c, i) => (
        <mesh
          key={i}
          position={[startX, 0.06, c.z]}
          material={getToonMaterial(c.light ? '#f6f4ec' : '#2b2b31')}
          dispose={null}
        >
          <boxGeometry args={[0.5, 0.02, checkers.cell]} />
        </mesh>
      ))}

      {/* Finish arch. */}
      <group>
        {[-innerR + 0.2, -outerR - 0.2].map((z, i) => (
          <mesh key={i} position={[startX, 1.9, z]} material={getToonMaterial(KERB)} castShadow dispose={null}>
            <boxGeometry args={[0.3, 3.8, 0.3]} />
          </mesh>
        ))}
        <mesh position={[startX, 3.55, startZ]} material={getToonMaterial(ARCH)} castShadow dispose={null}>
          <boxGeometry args={[0.42, 0.6, trackWidth + 0.8]} />
        </mesh>
        <mesh position={[startX, 3.05, startZ]} material={getToonMaterial(KERB)} dispose={null}>
          <boxGeometry args={[0.3, 0.12, trackWidth + 0.4]} />
        </mesh>
      </group>

      {/* Decorative bushes on the infield. */}
      {BUSHES.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.75, 0]} scale={[1.3, 1.05, 1.3]} material={getToonMaterial(BUSH)} castShadow dispose={null}>
            <sphereGeometry args={[1, 12, 10]} />
          </mesh>
          <mesh position={[0.7, 0.5, 0.2]} scale={0.7} material={getToonMaterial(BUSH)} castShadow dispose={null}>
            <sphereGeometry args={[1, 10, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
