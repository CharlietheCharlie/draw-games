'use client';

/**
 * A stadium big-screen that plays the race live. Each frame a second
 * "broadcast" camera (smoothly chasing the front-runner) renders the whole scene
 * into an off-screen texture, mapped onto the screen. The ENTIRE board is hidden
 * during the off-screen pass so it can never film itself (no feedback flicker),
 * and the camera position is damped so the feed doesn't jitter.
 */
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { pointAtU } from '@/core/geometry/stadium';
import { STADIUM } from '@/modes/race/raceTuning';
import type { RaceState } from '@/modes/race/raceState';

export interface JumbotronProps {
  state: RaceState;
  position: [number, number, number];
  width?: number;
}

export function Jumbotron({ state, position, width = 22 }: JumbotronProps) {
  const height = (width * 9) / 16;
  const fbo = useFBO(896, 504);
  const cam = useRef<THREE.PerspectiveCamera>(null);
  const board = useRef<THREE.Group>(null);
  const inited = useRef(false);
  const { gl, scene } = useThree();

  const desired = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const yaw = Math.atan2(-position[0], -position[2]); // face the field centre
  const py = position[1];

  useFrame((_, delta) => {
    const c = cam.current;
    const g = board.current;
    if (!c || !g) return;

    // Front-runner (interpolated) → a smooth chase pose.
    let frontU = 0;
    for (const r of state.runners) {
      const u = r.prevPosition + (r.position - r.prevPosition) * state.alpha;
      if (u > frontU) frontU = u;
    }
    const mid = (state.displayLanes - 1) / 2;
    const pt = pointAtU(STADIUM, mid, frontU);
    const fx = Math.sin(pt.heading);
    const fz = Math.cos(pt.heading);
    desired.set(pt.x - fx * 12 + 3, 6.5, pt.z - fz * 12);
    look.set(pt.x + fx * 4, 1.2, pt.z + fz * 4);

    if (!inited.current) {
      c.position.copy(desired);
      inited.current = true;
    } else {
      c.position.lerp(desired, 1 - Math.exp(-5 * delta));
    }
    c.lookAt(look);
    c.aspect = 16 / 9;
    c.updateProjectionMatrix();

    // Render the feed with the whole board hidden (no self-filming).
    g.visible = false;
    gl.setRenderTarget(fbo);
    gl.render(scene, c);
    gl.setRenderTarget(null);
    g.visible = true;
  });

  return (
    <>
      <perspectiveCamera ref={cam} fov={40} near={0.5} far={700} />
      <group ref={board} position={position} rotation={[0, yaw, 0]}>
        {[-width / 2 + 1.5, width / 2 - 1.5].map((x, i) => (
          <mesh key={i} position={[x, -py / 2, -0.6]} userData={{ occluder: true }}>
            <boxGeometry args={[1.3, py, 1.3]} />
            <meshStandardMaterial color="#3a4048" transparent />
          </mesh>
        ))}
        <mesh position={[0, 0, -0.35]} userData={{ occluder: true }}>
          <boxGeometry args={[width + 1.8, height + 1.8, 0.7]} />
          <meshStandardMaterial color="#12151b" transparent />
        </mesh>
        <mesh userData={{ occluder: true }}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial map={fbo.texture} toneMapped={false} transparent />
        </mesh>
      </group>
    </>
  );
}
