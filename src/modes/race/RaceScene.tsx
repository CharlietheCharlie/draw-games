'use client';

/**
 * Renders the race: the oval track plus one voxel avatar per participant. Each
 * runner is a small component that owns its refs and, every frame, reads its
 * simulation view — INTERPOLATED between fixed steps by `state.alpha` — to place
 * itself smoothly along its lane. This decoupling of the fixed-timestep sim from
 * the render frame is what removes the judder/tremble.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ModeSceneProps } from '@/core/mode/GameMode';
import { pointAtU, laneRadius } from '@/core/geometry/stadium';
import { generateAvatar, type AvatarDescriptor } from '@/core/character/descriptor';
import { LANE_COLORS } from '@/core/character/palettes';
import { useDrawStore } from '@/store/useDrawStore';
import { Avatar } from '@/render/Avatar';
import { NameTag } from '@/render/NameTag';
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

function Runner({
  view,
  state,
  descriptor,
  name,
  color,
  rank,
  cheer,
  showTag,
  paused,
}: {
  view: RunnerViz;
  state: RaceState;
  descriptor: AvatarDescriptor;
  name: string;
  color: string;
  rank?: number;
  cheer?: boolean;
  showTag: boolean;
  paused: boolean;
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
    <group ref={group}>
      <Avatar descriptor={descriptor} gaitRef={gait} cheer={cheer} paused={paused} />
      {showTag && <NameTag name={name} color={color} y={2.35} rank={rank} />}
    </group>
  );
}

export function RaceScene({ state, participants, phase }: ModeSceneProps<RaceState>) {
  const night = useDrawStore((s) => s.timeOfDay === 'night');
  const paused = useDrawStore((s) => s.paused);
  const outerR = laneRadius(STADIUM, state.displayLanes - 1) + STADIUM.laneWidth / 2;
  const jumboPos: [number, number, number] = [STADIUM.straight / 2 + outerR + 6, 13, 0];

  const avatars = useMemo<AvatarData[]>(
    () =>
      participants.map((p) => ({
        id: p.id,
        name: p.name,
        descriptor: generateAvatar(p.id, state.seed),
        color: LANE_COLORS[p.lane % LANE_COLORS.length]!,
      })),
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
            cheer={phase === 'result' && rank === 0}
            showTag={phase !== 'result'}
            paused={paused}
          />
        );
      })}
    </group>
  );
}
