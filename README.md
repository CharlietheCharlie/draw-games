# 🏟️ 賽跑抽籤 · Race Draw

A 3D lottery / random-draw app. Instead of a spinning wheel, the participants
**race around an athletics track** — whoever wins the race is the person drawn.
Built with **Next.js (App Router) + React Three Fiber + three.js**, architected so
new draw mechanisms (roulette, ladder / 鬼腳圖) plug in without touching the shell.

![modes: race (now), roulette + ladder (planned)]

## Highlights

- **Up to 12 lanes.** Add / rename / remove participants; edit a seed.
- **Procedural voxel characters.** Each runner is a blocky Minecraft/Pokémon-style
  avatar, randomly generated from the seed, visibly male/female, with a running
  animation. No downloaded models — pure cubes.
- **Cinematic camera.** Overview, leader-follow, and trackside angles you can
  switch live; automatic **podium framing** of the top 3 at the finish. Free-orbit
  while setting up or admiring the result.
- **Provably fair & reproducible.** The winner is decided by a seeded, uniform
  shuffle *before* the animation; the race is choreographed to land on that
  result. Same seed → identical, auditable draw.
- **Extensible by design.** One `GameMode` plugin contract + registry.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts: `npm run build`, `npm start`, `npm run typecheck`, `npm run lint`,
`npm test`.

Requires Node 18+ and a WebGL-capable browser (a graceful fallback shows otherwise).

## How fairness works

This is the load-bearing idea, so it lives in a pure, framework-free,
unit-tested layer with **no three.js**:

1. **Decide (pure).** [`drawResult(participants, seed)`](src/core/lottery/draw.ts)
   runs a Fisher–Yates shuffle over a dedicated `'outcome'` random stream. Every
   ordering is equally likely, so each participant has probability exactly `1/n`
   of winning — independent of name, lane, or entry order.
2. **Firewall.** Cosmetic randomness (lead-change wobble, avatar looks) draws from
   *separate* seed-derived streams (`'viz'`, `'avatar:<id>'`). They can never
   influence the outcome. See [`src/core/rng/hash.ts`](src/core/rng/hash.ts).
3. **Animate to it.** [`choreograph`](src/modes/race/choreograph.ts) gives each
   runner a monotonic, wobbling distance curve whose finish time is ordered by
   rank — dramatic mid-race overtakes, guaranteed correct final order. Runs on a
   [fixed timestep](src/core/sim/fixedStep.ts) so it's identical at 30/60/144 Hz.

The tests in [`draw.test.ts`](src/core/lottery/draw.test.ts) verify uniformity at
*every* finishing position (chi-square), and
[`raceState.test.ts`](src/modes/race/raceState.test.ts) verifies the animation's
final order always equals the fair result.

## Architecture

```
src/
  app/            Next.js App Router entry (globals, layout, page)
  shell/          Mode-agnostic UI + 3D host
    AppRoot         one ssr:false boundary → all WebGL is client-only
    Studio          layout, countdown driver
    Stage           the <Canvas> (lighting, active mode, camera rig)
    ActiveMode      fixed-timestep sim loop; renders the mode's Scene
    CameraRig       single drei CameraControls, damped to director shots
    ParticipantPanel / ModePicker / HUD / ResultOverlay   DOM UI
  store/          zustand store (discrete state only; never per-frame)
  core/           PURE domain — no three.js, unit-testable
    rng/            seeded PRNG + the outcome/cosmetic firewall
    lottery/        drawResult — the fairness core
    character/      seeded, gendered AvatarDescriptor generator
    geometry/       stadium/oval math (shared by sim, camera, track mesh)
    mode/           GameMode contract, CameraDirector, registry
    sim/            fixed-timestep accumulator
  render/         reusable voxel <Avatar/> (shared geometry/materials) + name tags
  modes/
    race/           the race GameMode (sim + scene + camera)
    _template/      copy-me skeleton for new modes
    registerAll.ts  the one place modes are registered
```

**Layers:** a pure domain core (fairness, characters, geometry, sim) has zero
rendering deps and is fully testable; the r3f **shell** is mode-agnostic; each
**mode** is a plugin. Per-frame updates mutate refs/opaque state — never React
state — so the DOM UI doesn't re-render at 60 fps.

## Add a new mode

See [docs/ADDING_A_MODE.md](docs/ADDING_A_MODE.md). Short version: copy
`src/modes/_template/`, implement `GameMode`, add one line to `registerAll.ts`.
The roulette and ladder modes are stubbed as "即將推出" in the picker.

For a full tour of every system (sim, camera, characters/emotes, stadium,
jumbotron, occlusion fade, day/night, store) and a "what to tweak where" table,
see [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md).

## Tech

Next.js 16 · React 19 · three 0.185 · @react-three/fiber 9 · @react-three/drei 10
· zustand 5 · TypeScript (strict) · Vitest.
