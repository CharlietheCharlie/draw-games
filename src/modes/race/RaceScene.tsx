'use client';

/**
 * Renders the race: the oval track plus one voxel avatar per participant. Each
 * runner is a small component that owns its refs and, every frame, reads its
 * simulation view — INTERPOLATED between fixed steps by `state.alpha` — to place
 * itself smoothly along its lane. This decoupling of the fixed-timestep sim from
 * the render frame is what removes the judder/tremble.
 */
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { ModeSceneProps } from '@/core/mode/GameMode';
import { pointAtU, laneRadius } from '@/core/geometry/stadium';
import { generateAvatar, type AvatarDescriptor } from '@/core/character/descriptor';
import { LANE_COLORS } from '@/core/character/palettes';
import { hashSeed } from '@/core/rng/prng';
import { useDrawStore } from '@/store/useDrawStore';
import { Avatar, type AvatarAction } from '@/render/Avatar';
import { NameTag } from '@/render/NameTag';
import { Confetti } from '@/render/Confetti';
import { StadiumEnv } from '@/shell/StadiumEnv';
import { Jumbotron } from '@/shell/Jumbotron';
import { OvalTrack } from './OvalTrack';
import { STADIUM } from './raceTuning';
import type { RaceState, RunnerViz } from './raceState';

interface AvatarData {
  id: string;
  name: string;
  descriptor: AvatarDescriptor;
  color: string;
}

const WINNER_ACTIONS: AvatarAction[] = ['cheer', 'dance', 'robot'];
const LOSER_ACTIONS: AvatarAction[] = ['sad', 'kneel', 'facepalm'];

/** Which animation a runner plays, by phase + finishing rank (0-based). */
function runnerAction(phase: string, rank: number, id: string): AvatarAction {
  if (phase === 'setup') return 'idle';
  if (phase === 'running' || phase === 'countdown') return 'run';
  if (rank === 0) return WINNER_ACTIONS[hashSeed(id) % WINNER_ACTIONS.length]!;
  if (rank <= 2) return 'clap'; // podium runners-up applaud
  return LOSER_ACTIONS[hashSeed(id) % LOSER_ACTIONS.length]!;
}

function Runner({
  view,
  state,
  descriptor,
  name,
  color,
  rank,
  action,
  showTag,
  paused,
  emphasize,
}: {
  view: RunnerViz;
  state: RaceState;
  descriptor: AvatarDescriptor;
  name: string;
  color: string;
  rank?: number;
  action: AvatarAction;
  showTag: boolean;
  paused: boolean;
  emphasize?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const gait = useRef(0);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    // Interpolate between the last two fixed steps for buttery motion.
    const u = view.prevPosition + (view.position - view.prevPosition) * state.alpha;
    const pt = pointAtU(STADIUM, view.lane, u);
    g.position.set(pt.x, 0, pt.z);
    g.rotation.y = pt.heading;
    gait.current = view.gait;
  });

  return (
    <group ref={group} scale={emphasize ? 1.24 : 1}>
      <Avatar descriptor={descriptor} action={action} gaitRef={gait} paused={paused} />
      {showTag && <NameTag name={name} color={color} y={2.35} rank={rank} />}
    </group>
  );
}

// Scratch objects reused across frames (module scope → never re-allocated).
const _ray = new THREE.Raycaster();
const _camPos = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _tgt = new THREE.Vector3();

/**
 * Fades any object tagged `userData.occluder` (the grandstand & roofs) to
 * semi-transparent whenever it sits between the camera and a runner, so the
 * runners are always visible. Smoothly restores opacity when it no longer blocks.
 */
function OcclusionFader({ state }: { state: RaceState }) {
  const { scene, camera } = useThree();
  const occluders = useRef<THREE.Object3D[]>([]);
  const materials = useRef<THREE.Material[]>([]);
  const frame = useRef(0);

  useFrame(() => {
    if (frame.current % 45 === 0) {
      const objs: THREE.Object3D[] = [];
      const mats = new Set<THREE.Material>();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && o.userData?.occluder) {
          objs.push(o);
          const mm = m.material;
          (Array.isArray(mm) ? mm : [mm]).forEach((x) => mats.add(x));
        }
      });
      occluders.current = objs;
      materials.current = [...mats];
    }
    frame.current++;
    if (materials.current.length === 0) return;

    camera.getWorldPosition(_camPos);
    const blocking = new Set<THREE.Material>();
    for (const r of state.runners) {
      const u = r.prevPosition + (r.position - r.prevPosition) * state.alpha;
      const pt = pointAtU(STADIUM, r.lane, u);
      _tgt.set(pt.x, 1.1, pt.z);
      _dir.subVectors(_tgt, _camPos);
      const dist = _dir.length();
      _dir.normalize();
      _ray.set(_camPos, _dir);
      _ray.far = Math.max(0.1, dist - 1.2);
      for (const h of _ray.intersectObjects(occluders.current, false)) {
        const mm = (h.object as THREE.Mesh).material;
        (Array.isArray(mm) ? mm : [mm]).forEach((x) => blocking.add(x));
      }
    }

    for (const mm of materials.current) {
      const mat = mm as THREE.MeshToonMaterial;
      const target = blocking.has(mm) ? 0.16 : 1;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, target, 0.12);
      mat.depthWrite = mat.opacity > 0.92;
    }
  });

  return null;
}

/** Highlights the winner: a glowing ground ring, a translucent light beam, and
 *  a warm point light — so the champion clearly stands out at the result. */
function WinnerHighlight({ pos }: { pos: [number, number, number] }) {
  const ring = useRef<THREE.Mesh>(null);
  const beam = useRef<THREE.Mesh>(null);
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    if (ring.current) {
      const s = 1 + Math.sin(t * 3.5) * 0.12;
      ring.current.scale.set(s, s, 1);
    }
    if (beam.current) beam.current.rotation.y = t * 0.4;
  });
  return (
    <group position={pos}>
      <pointLight position={[0, 5, 0]} intensity={1.7} distance={16} decay={0} color="#fff2cf" />
      <mesh ref={ring} position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.95, 1.4, 48]} />
        <meshBasicMaterial color="#ffd34d" transparent opacity={0.75} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={beam} position={[0, 5, 0]}>
        <coneGeometry args={[2.2, 10, 28, 1, true]} />
        <meshBasicMaterial
          color="#ffe9a8"
          transparent
          opacity={0.14}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

export function RaceScene({ state, participants, phase }: ModeSceneProps<RaceState>) {
  const night = useDrawStore((s) => s.timeOfDay === 'night');
  const paused = useDrawStore((s) => s.paused);
  const outerR = laneRadius(STADIUM, state.displayLanes - 1) + STADIUM.laneWidth / 2;
  const jumboPos: [number, number, number] = [STADIUM.straight / 2 + outerR + 6, 13, 0];

  // Winner position (for the result-screen highlight).
  const winner = phase === 'result' ? state.runners.find((r) => r.id === state.rankedIds[0]) : undefined;
  const winnerPt = winner ? pointAtU(STADIUM, winner.lane, winner.position) : null;

  const avatars = useMemo<AvatarData[]>(
    () =>
      participants.map((p) => {
        const color = LANE_COLORS[p.lane % LANE_COLORS.length]!;
        return {
          id: p.id,
          name: p.name,
          // Clothing follows the lane colour; skin/hair/face stay random.
          descriptor: generateAvatar(p.id, state.seed, color),
          color,
        };
      }),
    [participants, state.seed],
  );

  const viewById = useMemo(() => {
    const m = new Map<string, RunnerViz>();
    for (const r of state.runners) m.set(r.id, r);
    return m;
  }, [state]);

  const rankIndex = (id: string) => state.rankedIds.indexOf(id);

  return (
    <group>
      <OvalTrack dims={STADIUM} laneCount={state.displayLanes} />
      <StadiumEnv dims={STADIUM} laneCount={state.displayLanes} night={night} />
      <Jumbotron state={state} position={jumboPos} />
      <OcclusionFader state={state} />
      {winnerPt && <WinnerHighlight pos={[winnerPt.x, 0, winnerPt.z]} />}
      {winnerPt && <Confetti origin={[winnerPt.x, 0, winnerPt.z]} />}
      {avatars.map((a) => {
        const view = viewById.get(a.id);
        if (!view) return null;
        const rank = rankIndex(a.id);
        return (
          <Runner
            key={a.id}
            view={view}
            state={state}
            descriptor={a.descriptor}
            name={a.name}
            color={a.color}
            rank={phase === 'result' ? rank + 1 : undefined}
            action={runnerAction(phase, rank, a.id)}
            showTag={phase !== 'result'}
            paused={paused}
            emphasize={phase === 'result' && rank === 0}
          />
        );
      })}
    </group>
  );
}
