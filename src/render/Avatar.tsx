'use client';

/**
 * Reusable procedural, cel-shaded voxel character. Given an
 * {@link AvatarDescriptor} it renders a rounded, expressive blocky humanoid and
 * animates a natural, JOINTED run cycle (thigh+shin flex, arm+forearm swing,
 * forward lean, vertical bob) by rotating pivot groups each frame. Gait
 * intensity is read from a ref (0 = idle, 1 = full sprint) so per-frame speed
 * changes never re-render React. Pass `cheer` to play a victory pose.
 * Mode-agnostic: the race uses it now; roulette/ladder podiums reuse it later.
 */
import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AvatarDescriptor } from '@/core/character/descriptor';
import { buildAvatar, type Cube } from './avatarParts';
import { UNIT_BOX, UNIT_ROUNDED, getToonMaterial } from './sharedGeometry';

const STRIDES_PER_SEC = 2.6;
const THIGH_SWING = 0.9;
const KNEE_MAX = 1.15;
const ARM_SWING = 0.75;
const ELBOW_BASE = 0.4;
const ELBOW_FLEX = 0.5;
const LEAN = 0.12;

export interface AvatarProps {
  descriptor: AvatarDescriptor;
  /** Live gait source in [0,1]; read each frame, no re-render. Preferred. */
  gaitRef?: RefObject<number>;
  /** Static gait when no ref is supplied (e.g. a showcase/podium pose). */
  gait?: number;
  /** Play a celebratory victory pose (winner on the podium). */
  cheer?: boolean;
}

/** One static cube using the shared geometry + cached toon material. */
function StaticCube({ c }: { c: Cube }) {
  return (
    <mesh
      geometry={c.sharp ? UNIT_BOX : UNIT_ROUNDED}
      material={getToonMaterial(c.color)}
      position={c.pos}
      scale={c.size}
      rotation={c.rot}
      dispose={null}
      castShadow
    />
  );
}

function Limb({ segment }: { segment: { len: number; w: number; d: number; color: string } }) {
  return (
    <mesh
      geometry={UNIT_ROUNDED}
      material={getToonMaterial(segment.color)}
      position={[0, -segment.len / 2, 0]}
      scale={[segment.w, segment.len, segment.d]}
      dispose={null}
      castShadow
    />
  );
}

export function Avatar({ descriptor, gaitRef, gait = 0, cheer = false }: AvatarProps) {
  const build = useMemo(() => buildAvatar(descriptor), [descriptor]);

  const body = useRef<THREE.Group>(null);
  const hipL = useRef<THREE.Group>(null);
  const hipR = useRef<THREE.Group>(null);
  const kneeL = useRef<THREE.Group>(null);
  const kneeR = useRef<THREE.Group>(null);
  const shoulderL = useRef<THREE.Group>(null);
  const shoulderR = useRef<THREE.Group>(null);
  const elbowL = useRef<THREE.Group>(null);
  const elbowR = useRef<THREE.Group>(null);
  const phase = useRef(0);

  useFrame((st, delta) => {
    const g = THREE.MathUtils.clamp(gaitRef?.current ?? gait, 0, 1);

    if (cheer) {
      // Victory: arms up, waving, little hops.
      const t = st.clock.elapsedTime;
      const wave = Math.sin(t * 9) * 0.25;
      if (shoulderL.current) shoulderL.current.rotation.set(-2.5 + wave, 0, 0.4);
      if (shoulderR.current) shoulderR.current.rotation.set(-2.5 - wave, 0, -0.4);
      if (elbowL.current) elbowL.current.rotation.x = -0.3;
      if (elbowR.current) elbowR.current.rotation.x = -0.3;
      if (hipL.current) hipL.current.rotation.x = 0.2;
      if (hipR.current) hipR.current.rotation.x = 0.2;
      if (kneeL.current) kneeL.current.rotation.x = 0.3;
      if (kneeR.current) kneeR.current.rotation.x = 0.3;
      if (body.current) {
        body.current.position.y = Math.abs(Math.sin(t * 6)) * 0.14;
        body.current.rotation.x = 0;
      }
      return;
    }

    phase.current += delta * STRIDES_PER_SEC * Math.PI * 2 * g;
    const p = phase.current;
    const s = Math.sin(p);

    if (hipL.current) hipL.current.rotation.x = s * THIGH_SWING * g;
    if (hipR.current) hipR.current.rotation.x = -s * THIGH_SWING * g;
    if (kneeL.current) kneeL.current.rotation.x = KNEE_MAX * Math.max(0, -s) * g;
    if (kneeR.current) kneeR.current.rotation.x = KNEE_MAX * Math.max(0, s) * g;

    if (shoulderL.current) shoulderL.current.rotation.set(-s * ARM_SWING * g, 0, 0.06);
    if (shoulderR.current) shoulderR.current.rotation.set(s * ARM_SWING * g, 0, -0.06);
    if (elbowL.current) elbowL.current.rotation.x = -(ELBOW_BASE + ELBOW_FLEX * Math.max(0, -s)) * g;
    if (elbowR.current) elbowR.current.rotation.x = -(ELBOW_BASE + ELBOW_FLEX * Math.max(0, s)) * g;

    if (body.current) {
      body.current.position.y = Math.abs(s) * 0.05 * g;
      body.current.rotation.x = LEAN * g;
    }
  });

  return (
    <group ref={body}>
      {build.staticCubes.map((c, i) => (
        <StaticCube key={i} c={c} />
      ))}

      {/* Legs: hip → knee (thigh + shin + foot). */}
      <group ref={hipL} position={[-build.legSpacingX, build.hipY, 0]}>
        <Limb segment={build.thigh} />
        <group ref={kneeL} position={[0, -build.thigh.len, 0]}>
          <Limb segment={build.shin} />
          <mesh
            geometry={UNIT_ROUNDED}
            material={getToonMaterial(build.foot.color)}
            position={[0, -build.shin.len - build.foot.h / 2, build.foot.len / 2 - build.shin.d / 2]}
            scale={[build.foot.w, build.foot.h, build.foot.len]}
            dispose={null}
            castShadow
          />
        </group>
      </group>
      <group ref={hipR} position={[build.legSpacingX, build.hipY, 0]}>
        <Limb segment={build.thigh} />
        <group ref={kneeR} position={[0, -build.thigh.len, 0]}>
          <Limb segment={build.shin} />
          <mesh
            geometry={UNIT_ROUNDED}
            material={getToonMaterial(build.foot.color)}
            position={[0, -build.shin.len - build.foot.h / 2, build.foot.len / 2 - build.shin.d / 2]}
            scale={[build.foot.w, build.foot.h, build.foot.len]}
            dispose={null}
            castShadow
          />
        </group>
      </group>

      {/* Arms: shoulder → elbow (upper arm + forearm). */}
      <group ref={shoulderL} position={[-build.armX, build.shoulderY, 0]}>
        <Limb segment={build.upperArm} />
        <group ref={elbowL} position={[0, -build.upperArm.len, 0]}>
          <Limb segment={build.foreArm} />
        </group>
      </group>
      <group ref={shoulderR} position={[build.armX, build.shoulderY, 0]}>
        <Limb segment={build.upperArm} />
        <group ref={elbowR} position={[0, -build.upperArm.len, 0]}>
          <Limb segment={build.foreArm} />
        </group>
      </group>
    </group>
  );
}
