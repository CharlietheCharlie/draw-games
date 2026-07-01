'use client';

/**
 * Procedural oval running track: a red track ring (ShapeGeometry with a hole),
 * white lane lines, a start/finish line, and a grass infield/ground plane.
 * Everything derives from the shared stadium geometry so runners line up exactly
 * with their painted lanes.
 */
import { useEffect, useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { type StadiumDims, laneRadius, outlinePoints } from '@/core/geometry/stadium';

export interface OvalTrackProps {
  dims: StadiumDims;
  laneCount: number;
}

const OUTLINE_SEGMENTS = 140;

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

  // Dispose the imperatively-created geometry when it changes / unmounts.
  useEffect(() => () => trackGeo.dispose(), [trackGeo]);

  // Lane divider loops (one more than the number of lanes).
  const laneLines = useMemo(() => {
    const base = laneRadius(dims, 0) - dims.laneWidth / 2;
    const loops: Array<Array<[number, number, number]>> = [];
    for (let l = 0; l <= laneCount; l++) {
      const r = base + l * dims.laneWidth;
      const pts = outlinePoints(dims.straight, r, OUTLINE_SEGMENTS).map(
        ([x, z]) => [x, 0.04, z] as [number, number, number],
      );
      pts.push(pts[0]!); // close the loop
      loops.push(pts);
    }
    return loops;
  }, [dims, laneCount]);

  // Start/finish line: a white band across the lanes at u = 0 (front straight).
  const startZ = -(innerR + outerR) / 2;
  const startDepth = outerR - innerR;

  return (
    <group>
      {/* Grass ground / infield. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#3f7d3a" roughness={1} />
      </mesh>

      {/* Track surface. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} geometry={trackGeo} receiveShadow>
        <meshStandardMaterial color="#b5462f" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>

      {/* Lane divider lines. */}
      {laneLines.map((pts, i) => (
        <Line key={i} points={pts} color="#f3f3f3" lineWidth={2} transparent opacity={0.85} />
      ))}

      {/* Start / finish line. */}
      <mesh position={[-dims.straight / 2, 0.05, startZ]}>
        <boxGeometry args={[0.4, 0.02, startDepth]} />
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </mesh>
    </group>
  );
}
