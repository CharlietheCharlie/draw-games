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

/**
 * A character animation. `run` is gait-driven; the rest are looping emotes for
 * spectating, celebrating, or losing.
 */
export type AvatarAction =
  | 'run'
  | 'idle'
  | 'cheer' // arms up, waving, hops
  | 'clap' // clapping
  | 'wave' // one-arm wave
  | 'dance' // groovy sway
  | 'robot' // stiff robot moves
  | 'kneel' // drop to knees, head down
  | 'sad' // slumped, dejected
  | 'facepalm'; // hands to head

export interface AvatarProps {
  descriptor: AvatarDescriptor;
  /** Current animation. Defaults to `run`. */
  action?: AvatarAction;
  /** Live gait source in [0,1] for `run`; read each frame, no re-render. */
  gaitRef?: RefObject<number>;
  /** Static gait when no ref is supplied. */
  gait?: number;
  /** Per-character time offset (seconds) so a crowd's emotes desync. */
  offset?: number;
  /** Freeze the current pose (race paused). */
  paused?: boolean;
  /** Seated pose (a spectator): legs stay folded; arms still emote. */
  seated?: boolean;
  /** Whether the avatar casts shadows (spectators skip this for performance). */
  castShadow?: boolean;
}

/** One static cube using the shared geometry + cached toon material. */
function StaticCube({ c, shadow }: { c: Cube; shadow: boolean }) {
  return (
    <mesh
      geometry={c.sharp ? UNIT_BOX : UNIT_ROUNDED}
      material={getToonMaterial(c.color)}
      position={c.pos}
      scale={c.size}
      rotation={c.rot}
      dispose={null}
      castShadow={shadow}
    />
  );
}

function Limb({ segment, shadow }: { segment: { len: number; w: number; d: number; color: string }; shadow: boolean }) {
  return (
    <mesh
      geometry={UNIT_ROUNDED}
      material={getToonMaterial(segment.color)}
      position={[0, -segment.len / 2, 0]}
      scale={[segment.w, segment.len, segment.d]}
      dispose={null}
      castShadow={shadow}
    />
  );
}

export function Avatar({
  descriptor,
  action = 'run',
  gaitRef,
  gait = 0,
  offset = 0,
  paused = false,
  seated = false,
  castShadow = true,
}: AvatarProps) {
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
    if (paused) return; // hold the current pose

    const rot = (ref: RefObject<THREE.Group | null>, x: number, y = 0, z = 0) => {
      if (ref.current) ref.current.rotation.set(x, y, z);
    };
    const bodyPose = (rx: number, ry: number, rz: number, py: number) => {
      if (body.current) {
        body.current.rotation.set(rx, ry, rz);
        body.current.position.y = py;
      }
    };

    // Gait-driven run (only meaningful while standing).
    if (action === 'run' && !seated) {
      const g = THREE.MathUtils.clamp(gaitRef?.current ?? gait, 0, 1);
      phase.current += delta * STRIDES_PER_SEC * Math.PI * 2 * g;
      const s = Math.sin(phase.current);
      rot(hipL, s * THIGH_SWING * g);
      rot(hipR, -s * THIGH_SWING * g);
      rot(kneeL, KNEE_MAX * Math.max(0, -s) * g);
      rot(kneeR, KNEE_MAX * Math.max(0, s) * g);
      rot(shoulderL, -s * ARM_SWING * g, 0, 0.06);
      rot(shoulderR, s * ARM_SWING * g, 0, -0.06);
      rot(elbowL, -(ELBOW_BASE + ELBOW_FLEX * Math.max(0, -s)) * g);
      rot(elbowR, -(ELBOW_BASE + ELBOW_FLEX * Math.max(0, s)) * g);
      bodyPose(LEAN * g, 0, 0, Math.abs(s) * 0.05 * g);
      return;
    }

    const t = st.clock.elapsedTime + offset;

    // Legs (seated avatars keep their folded JSX pose — don't touch them).
    if (!seated) {
      if (action === 'kneel') {
        rot(hipL, 0.15, 0, 0.05);
        rot(hipR, 0.15, 0, -0.05);
        rot(kneeL, 1.9);
        rot(kneeR, 1.9);
      } else if (action === 'dance') {
        const d = Math.sin(t * 3.2);
        rot(hipL, Math.max(0, d) * 0.35);
        rot(hipR, Math.max(0, -d) * 0.35);
        rot(kneeL, Math.max(0, d) * 0.55);
        rot(kneeR, Math.max(0, -d) * 0.55);
      } else if (action === 'robot') {
        // Marching knee-lift synced to the arm punches.
        const beat = Math.floor(t * 2.4) % 4;
        rot(hipL, beat === 0 ? 0.5 : 0);
        rot(kneeL, beat === 0 ? 0.9 : 0);
        rot(hipR, beat === 2 ? 0.5 : 0);
        rot(kneeR, beat === 2 ? 0.9 : 0);
      } else {
        rot(hipL, 0);
        rot(hipR, 0);
        rot(kneeL, 0);
        rot(kneeR, 0);
      }
    }

    // Arms + body.
    const hop = seated ? 0 : 1;
    switch (action) {
      case 'idle': {
        const b = Math.sin(t * 1.6);
        rot(shoulderL, b * 0.04, 0, 0.08);
        rot(shoulderR, Math.sin(t * 1.6 + 1) * 0.04, 0, -0.08);
        rot(elbowL, -0.12);
        rot(elbowR, -0.12);
        bodyPose(0, 0, 0, Math.abs(b) * 0.015 * hop);
        break;
      }
      case 'cheer': {
        const w = Math.sin(t * 9) * 0.35;
        rot(shoulderL, -2.5 + w, 0, 0.4);
        rot(shoulderR, -2.5 - w, 0, -0.4);
        rot(elbowL, -0.3);
        rot(elbowR, -0.3);
        bodyPose(0, 0, 0, Math.abs(Math.sin(t * 6)) * 0.14 * hop);
        break;
      }
      case 'clap': {
        const c = Math.max(0, Math.sin(t * 11)) * 0.3;
        rot(shoulderL, -1.15, 0, 0.34 + c);
        rot(shoulderR, -1.15, 0, -0.34 - c);
        rot(elbowL, -1.5);
        rot(elbowR, -1.5);
        bodyPose(0, 0, 0, Math.abs(Math.sin(t * 5)) * 0.03 * hop);
        break;
      }
      case 'wave': {
        const w = Math.sin(t * 7) * 0.45;
        rot(shoulderR, -2.6, 0, -0.25 + w);
        rot(elbowR, -0.2);
        rot(shoulderL, 0.1, 0, 0.12);
        rot(elbowL, -0.25);
        bodyPose(0, 0, 0, Math.abs(Math.sin(t * 3)) * 0.02 * hop);
        break;
      }
      case 'dance': {
        const s3 = Math.sin(t * 3.2);
        rot(shoulderL, s3 * 0.9 - 0.2, 0, 0.25);
        rot(shoulderR, -s3 * 0.9 - 0.2, 0, -0.25);
        rot(elbowL, -0.9);
        rot(elbowR, -0.9);
        bodyPose(0, s3 * 0.2, Math.sin(t * 1.6) * 0.14, Math.abs(Math.sin(t * 6.4)) * 0.05 * hop);
        break;
      }
      case 'robot': {
        // Big, hard-stepped robotic moves — a 4-pose cycle with wide arm angles.
        const beat = Math.floor(t * 2.4) % 4;
        let sl = -0.2;
        let sr = -0.2;
        let slz = 0.12;
        let srz = -0.12;
        let el = -1.55;
        let er = -1.55;
        let twist = 0;
        let lean = 0;
        if (beat === 0) {
          sl = -2.75; // left arm punches straight up
          slz = 0.05;
          el = -0.2;
          twist = 0.45;
        } else if (beat === 1) {
          slz = 1.45; // both arms thrown out to the sides
          srz = -1.45;
          el = -0.15;
          er = -0.15;
        } else if (beat === 2) {
          sr = -2.75; // right arm punches straight up
          srz = -0.05;
          er = -0.2;
          twist = -0.45;
        } else {
          sl = -1.65; // both arms forward, sharply bent
          sr = -1.65;
          el = -1.8;
          er = -1.8;
          lean = 0.1;
        }
        rot(shoulderL, sl, 0, slz);
        rot(shoulderR, sr, 0, srz);
        rot(elbowL, el);
        rot(elbowR, er);
        bodyPose(lean, twist, 0, 0);
        break;
      }
      case 'kneel': {
        rot(shoulderL, 0.25, 0, 0.12);
        rot(shoulderR, 0.25, 0, -0.12);
        rot(elbowL, -0.25);
        rot(elbowR, -0.25);
        bodyPose(0.5, 0, 0, seated ? 0 : -0.35);
        break;
      }
      case 'sad': {
        rot(shoulderL, 0.12, 0, 0.04);
        rot(shoulderR, 0.12, 0, -0.04);
        rot(elbowL, -0.1);
        rot(elbowR, -0.1);
        bodyPose(0.28, Math.sin(t * 1.1) * 0.05, 0, 0);
        break;
      }
      case 'facepalm': {
        rot(shoulderL, -2.55, 0, 0.55);
        rot(shoulderR, -2.55, 0, -0.55);
        rot(elbowL, -2.2);
        rot(elbowR, -2.2);
        bodyPose(0.14, 0, 0, 0);
        break;
      }
      default: {
        rot(shoulderL, 0, 0, 0.06);
        rot(shoulderR, 0, 0, -0.06);
        rot(elbowL, -0.1);
        rot(elbowR, -0.1);
        bodyPose(0, 0, 0, 0);
      }
    }
  });

  return (
    <group ref={body}>
      {build.staticCubes.map((c, i) => (
        <StaticCube key={i} c={c} shadow={castShadow} />
      ))}

      {/* Legs: hip → knee (thigh + shin + foot). */}
      <group ref={hipL} position={[-build.legSpacingX, build.hipY, 0]} rotation={seated ? [-1.4, 0, 0.05] : undefined}>
        <Limb segment={build.thigh} shadow={castShadow} />
        <group ref={kneeL} position={[0, -build.thigh.len, 0]} rotation={seated ? [1.5, 0, 0] : undefined}>
          <Limb segment={build.shin} shadow={castShadow} />
          <mesh
            geometry={UNIT_ROUNDED}
            material={getToonMaterial(build.foot.color)}
            position={[0, -build.shin.len - build.foot.h / 2, build.foot.len / 2 - build.shin.d / 2]}
            scale={[build.foot.w, build.foot.h, build.foot.len]}
            dispose={null}
            castShadow={castShadow}
          />
        </group>
      </group>
      <group ref={hipR} position={[build.legSpacingX, build.hipY, 0]} rotation={seated ? [-1.4, 0, -0.05] : undefined}>
        <Limb segment={build.thigh} shadow={castShadow} />
        <group ref={kneeR} position={[0, -build.thigh.len, 0]} rotation={seated ? [1.5, 0, 0] : undefined}>
          <Limb segment={build.shin} shadow={castShadow} />
          <mesh
            geometry={UNIT_ROUNDED}
            material={getToonMaterial(build.foot.color)}
            position={[0, -build.shin.len - build.foot.h / 2, build.foot.len / 2 - build.shin.d / 2]}
            scale={[build.foot.w, build.foot.h, build.foot.len]}
            dispose={null}
            castShadow={castShadow}
          />
        </group>
      </group>

      {/* Arms: shoulder → elbow (upper arm + forearm). */}
      <group ref={shoulderL} position={[-build.armX, build.shoulderY, 0]}>
        <Limb segment={build.upperArm} shadow={castShadow} />
        <group ref={elbowL} position={[0, -build.upperArm.len, 0]}>
          <Limb segment={build.foreArm} shadow={castShadow} />
        </group>
      </group>
      <group ref={shoulderR} position={[build.armX, build.shoulderY, 0]}>
        <Limb segment={build.upperArm} shadow={castShadow} />
        <group ref={elbowR} position={[0, -build.upperArm.len, 0]}>
          <Limb segment={build.foreArm} shadow={castShadow} />
        </group>
      </group>
    </group>
  );
}
