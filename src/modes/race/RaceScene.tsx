'use client';

/**
 * Renders the race: the oval track plus one voxel avatar per participant. Each
 * runner is a small component that owns its refs and, every frame, reads its
 * (already-advanced) simulation view to place itself along its lane — so
 * per-frame motion never triggers React re-renders.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ModeSceneProps } from '@/core/mode/GameMode';
import { pointAtU } from '@/core/geometry/stadium';
import { generateAvatar, type AvatarDescriptor } from '@/core/character/descriptor';
import { LANE_COLORS } from '@/core/character/palettes';
import { Avatar } from '@/render/Avatar';
import { NameTag } from '@/render/NameTag';
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
  descriptor,
  name,
  color,
  rank,
}: {
  view: RunnerViz;
  descriptor: AvatarDescriptor;
  name: string;
  color: string;
  rank?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const gait = useRef(0);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const pt = pointAtU(STADIUM, view.lane, view.position);
    g.position.set(pt.x, 0, pt.z);
    g.rotation.y = pt.heading;
    gait.current = view.gait;
  });

  return (
    <group ref={group}>
      <Avatar descriptor={descriptor} gaitRef={gait} />
      <NameTag name={name} color={color} y={2.2} rank={rank} />
    </group>
  );
}

export function RaceScene({ state, participants, phase }: ModeSceneProps<RaceState>) {
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
      {avatars.map((a) => {
        const view = viewById.get(a.id);
        if (!view) return null;
        return (
          <Runner
            key={a.id}
            view={view}
            descriptor={a.descriptor}
            name={a.name}
            color={a.color}
            rank={phase === 'result' ? rankIndex(a.id) + 1 : undefined}
          />
        );
      })}
    </group>
  );
}
