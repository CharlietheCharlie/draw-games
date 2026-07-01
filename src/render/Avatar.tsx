'use client';

/**
 * Reusable procedural voxel character. Given an {@link AvatarDescriptor} it
 * renders a blocky humanoid from shared cubes and animates a running gait by
 * rotating arm/leg pivot groups every frame. Gait intensity is read from a ref
 * (0 = idle, 1 = full sprint) so per-frame speed changes never re-render React.
 * Mode-agnostic: the race uses it now; roulette/ladder podiums reuse it later.
 */
import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AvatarDescriptor } from '@/core/character/descriptor';
import { buildAvatar } from './avatarParts';
import { UNIT_BOX, getStandardMaterial } from './sharedGeometry';

const STRIDES_PER_SEC = 2.4;
const MAX_SWING = 0.95; // radians

export interface AvatarProps {
  descriptor: AvatarDescriptor;
  /** Live gait source in [0,1]; read each frame, no re-render. Preferred. */
  gaitRef?: RefObject<number>;
  /** Static gait when no ref is supplied (e.g. a showcase/podium pose). */
  gait?: number;
}

export function Avatar({ descriptor, gaitRef, gait = 0 }: AvatarProps) {
  const build = useMemo(() => buildAvatar(descriptor), [descriptor]);

  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const bob = useRef<THREE.Group>(null);
  const phase = useRef(0);

  useFrame((_, delta) => {
    const g = THREE.MathUtils.clamp(gaitRef?.current ?? gait, 0, 1);
    phase.current += delta * STRIDES_PER_SEC * Math.PI * 2 * g;
    const swing = Math.sin(phase.current) * MAX_SWING * g;
    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;
    if (armL.current) armL.current.rotation.x = -swing;
    if (armR.current) armR.current.rotation.x = swing;
    // Subtle vertical bob at twice the stride frequency.
    if (bob.current) bob.current.position.y = Math.abs(Math.sin(phase.current)) * 0.06 * g;
  });

  const [lw, ll, ld] = build.leg.size;
  const [aw, al, ad] = build.arm.size;
  const legMat = getStandardMaterial(build.leg.color);
  const armMat = getStandardMaterial(build.arm.color);

  return (
    <group ref={bob}>
      {build.staticCubes.map((c, i) => (
        <mesh
          key={i}
          geometry={UNIT_BOX}
          material={getStandardMaterial(c.color)}
          position={c.pos}
          scale={c.size}
          dispose={null}
          castShadow
        />
      ))}

      <group ref={legL} position={[-build.legSpacingX, build.hipY, 0]}>
        <mesh geometry={UNIT_BOX} material={legMat} position={[0, -ll / 2, 0]} scale={[lw, ll, ld]} dispose={null} castShadow />
      </group>
      <group ref={legR} position={[build.legSpacingX, build.hipY, 0]}>
        <mesh geometry={UNIT_BOX} material={legMat} position={[0, -ll / 2, 0]} scale={[lw, ll, ld]} dispose={null} castShadow />
      </group>

      <group ref={armL} position={[-build.armX, build.shoulderY, 0]}>
        <mesh geometry={UNIT_BOX} material={armMat} position={[0, -al / 2, 0]} scale={[aw, al, ad]} dispose={null} castShadow />
      </group>
      <group ref={armR} position={[build.armX, build.shoulderY, 0]}>
        <mesh geometry={UNIT_BOX} material={armMat} position={[0, -al / 2, 0]} scale={[aw, al, ad]} dispose={null} castShadow />
      </group>
    </group>
  );
}
