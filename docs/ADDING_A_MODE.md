# Adding a new draw mode

Every draw mechanism — the race, and future ones like **roulette** or **ladder
(鬼腳圖 / Amidakuji)** — is a plugin that implements one interface,
[`GameMode<TState>`](../src/core/mode/GameMode.ts). The shell (participant input,
seed, Canvas, camera rig, results, avatars) is shared and needs **no changes**.

The golden rule: **a mode never decides the winner.** The fair result is already
computed by [`drawResult`](../src/core/lottery/draw.ts) and handed to your
`createState`. Your job is only to *animate toward it*.

## 1. Copy the template

Copy [`src/modes/_template/`](../src/modes/_template/index.tsx) to
`src/modes/<your-mode>/`. It is a compiling, unregistered starting point.

## 2. Implement the contract

```ts
export interface GameMode<TState> {
  id: string;                 // 'roulette'
  label: string;              // '幸運輪盤 · Roulette'
  maxParticipants: number;

  // The winner is already chosen; build an animation that CONVERGES to it.
  createState(args: { participants; result; seed }): TState;
  step(state: TState, fixedDtSec: number): void;   // fixed-timestep, deterministic
  isFinished(state: TState): boolean;
  getRanking(state: TState): string[];             // MUST equal result.rankedIds when finished

  Scene: React.ComponentType<ModeSceneProps<TState>>;  // your r3f subtree
  camera: CameraDirector<TState>;                       // named shots + auto framing
}
```

Guidance:

- **Determinism.** Only randomness comes from the seed via
  `deriveStream(seed, 'viz:...')` (cosmetic). Never `Math.random()`, and never the
  `'outcome'` salt — that firewall is what keeps the lottery fair.
- **Fixed timestep.** `step(state, dt)` is called with a constant `dt` by the
  shell's accumulator, so behaviour is identical at any refresh rate. Do all
  motion math off `state`, not off `performance.now()`.
- **Converge to the result.** However lively the animation, `getRanking` at
  `isFinished` must equal `result.rankedIds`. The race does this by ordering each
  runner's finish time by rank; a roulette would spin so the wheel *lands* on
  `rankedIds[0]`; a ladder would route the top rail to the winner's foot.
- **Reuse characters.** Import `generateAvatar` + `<Avatar/>` so the same people
  look identical across modes.

## 3. Camera

Return plain `{ position, target, smoothTime }` tuples from your
`CameraDirector`. The shell's [`CameraRig`](../src/shell/CameraRig.tsx) damps to
them. Provide `namedShots` for the angle switcher and make `getShot` frame the
podium on the `'result'` phase.

## 4. Register it

One line in [`src/modes/registerAll.ts`](../src/modes/registerAll.ts):

```ts
import { rouletteMode } from './roulette';
const ALL_MODES = [raceMode, rouletteMode];
```

It now appears in the mode picker automatically. Replace the matching
"即將推出" placeholder in [`ModePicker`](../src/shell/ModePicker.tsx).

## 5. Test the invariant

Add a `*.test.ts` next to your sim (see
[`raceState.test.ts`](../src/modes/race/raceState.test.ts)) asserting that
stepping to completion yields `getRanking === result.rankedIds`. That single test
protects fairness for your mode.
