# 實作細節與調整指南（Implementation Notes）

這份文件記錄目前這個 3D 賽跑抽籤 app 的內部設計、各系統怎麼運作、以及**「想改什麼要去哪裡改」**，方便之後擴充或微調。程式路徑一律以專案根目錄為基準。

- 高層介紹看 [README.md](../README.md)
- 新增玩法（輪盤／鬼腳圖）看 [ADDING_A_MODE.md](./ADDING_A_MODE.md)

---

## 1. 技術棧與整體架構

- **Next.js 16（App Router）+ React 19**，3D 用 **React Three Fiber v9 + drei v10 + three 0.185**，狀態用 **zustand v5**，全 TypeScript（strict）。
- 分層：
  - `src/core/**` — **純邏輯**（不 import three.js），可單元測試：公平抽籤、種子 RNG、角色外貌資料、賽道幾何、模式契約、固定步長。
  - `src/render/**` — 可重用的 three.js 呈現元件（Avatar、共用幾何/材質）。
  - `src/modes/race/**` — 賽跑這個「玩法」的模擬 + 場景 + 鏡頭。
  - `src/shell/**` — 與玩法無關的外殼：Canvas、燈光、天空、鏡頭、場館、大螢幕、DOM 介面。
  - `src/store/**` — zustand 狀態，DOM 與 3D 共用。
- **關鍵慣例**：每幀變動（跑者位置、動畫）都用 ref/可變物件直接改，不進 React state，避免每幀重繪；DOM 介面只放「離散狀態」。

### 客戶端邊界（很重要）
整個 3D 樹透過**單一 `ssr:false` 動態載入**掛載：`app/page.tsx → shell/AppRoot.tsx（dynamic(ssr:false)）→ shell/Studio.tsx`。所以 three/drei/WebGL 永遠不會在伺服器端執行。**在 Canvas 裡要拿反應式狀態，請在 Canvas 內部用 `useDrawStore(...)`**（例如 `SceneBackdrop`），不要從 Canvas 外把 props 傳進來——跨 Canvas 邊界傳 props 不保證更新（這是 dark mode 曾經失靈的原因）。

---

## 2. 目錄地圖

```
src/
  app/            layout / page / globals.css（介面主題）
  shell/          AppRoot, Studio, Stage, SceneBackdrop, Lighting,
                  CameraRig, StadiumEnv, Jumbotron, ActiveMode,
                  ParticipantPanel, HUD, ResultOverlay, ModePicker(未使用), WebGLFallback
  store/          useDrawStore.ts
  core/
    rng/          prng.ts（mulberry32/hashSeed）, hash.ts（deriveStream 防火牆）
    lottery/      draw.ts（公平抽籤核心）+ draw.test.ts
    character/    descriptor.ts（外貌生成）, palettes.ts（顏色）
    geometry/     stadium.ts（橢圓賽道數學）
    mode/         GameMode.ts, CameraDirector.ts, registry.ts
    sim/          fixedStep.ts（固定步長累加器）
  render/         Avatar.tsx, avatarParts.ts, sharedGeometry.ts,
                  stadiumBuild.ts, NameTag.tsx
  modes/
    race/         index.ts, raceTuning.ts, choreograph.ts, raceState.ts,
                  raceCamera.ts, OvalTrack.tsx, RaceScene.tsx, raceState.test.ts
    _template/    複製用的空白模式骨架
    registerAll.ts
  lib/            types.ts, webgl.ts, useReducedMotion.ts
```

---

## 3. 公平性（抽籤核心）

- 勝負在動畫**開始前**就用種子化 Fisher–Yates 洗牌決定，每人剛好 `1/N`：[`core/lottery/draw.ts`](../src/core/lottery/draw.ts) 的 `drawResult(participants, seed)` → `DrawResult.rankedIds`（第 0 名 = 冠軍）。
- **RNG 防火牆**：一個種子衍生多條獨立串流，`outcome` 決定勝負、`viz`/`avatar:<id>` 只做外觀與動畫抖動，彼此互不影響：[`core/rng/hash.ts`](../src/core/rng/hash.ts)。
- 動畫只是把預定結果「演出來」；`raceRanking(state)` 在結束時保證等於 `rankedIds`。
- 驗證：[`draw.test.ts`](../src/core/lottery/draw.test.ts)（卡方均勻性）、[`raceState.test.ts`](../src/modes/race/raceState.test.ts)（收斂不變式）。

---

## 4. 賽跑模擬

- **配速曲線**：[`choreograph.ts`](../src/modes/race/choreograph.ts) — 每位跑者一條正值速度曲線（起跑衝刺 `burst` + 有機抖動 `wobble` + 終點衝刺 `kick`），數值積分成單調距離曲線 `positionAt(t)`，在 `finishAt` 正好到終點；`finishAt` 依名次排序 → 保證最終順序正確。終點後 `overrun` 讓前段選手多滑一點，方便頒獎鏡頭把人拉開。
- **固定步長 + 插值防抖**：模擬用固定 dt 前進（[`core/sim/fixedStep.ts`](../src/core/sim/fixedStep.ts)），畫面用 `state.alpha` 在上一步與這一步之間**內插**（`RunnerViz.prevPosition`）→ 不再顫抖，任何更新率都平滑。位置更新在 [`ActiveMode.tsx`](../src/shell/ActiveMode.tsx) 一處驅動，`RaceScene` 只讀取。
- **暫停**只凍結「模擬」（`ActiveMode` 見 `paused` 就不 step、`Avatar` 見 `paused` 直接 return 定格），畫面與鏡頭照常 → 暫停時仍可拖曳/切鏡頭。

---

## 5. 鏡頭系統

- 契約：[`core/mode/CameraDirector.ts`](../src/core/mode/CameraDirector.ts)（回傳純 tuple 的 `getShot` / `namedShots`）。外殼 [`CameraRig.tsx`](../src/shell/CameraRig.tsx) 用 drei `CameraControls` 平滑阻尼過去。
- 賽跑鏡位在 [`raceCamera.ts`](../src/modes/race/raceCamera.ts)：`overview`(全景) / `broadcast`(自動，追隊伍前緣) / `leader`(領先者) / `trackside`(場邊) / `startLine`(倒數) / `winnerCloseup`(冠軍特寫)。
- **只有在 `running`/`countdown` 且未暫停時鏡頭才被腳本接管**；`setup`/`result`/暫停時使用者可自由環繞，且按鏡位鈕會套用一次再交還控制。
- 追蹤用「隊伍前緣的弧長」而非某個特定跑者 → 領先者交替時不會跳。

---

## 6. 角色系統（Avatar）

- 幾何：[`avatarParts.ts`](../src/render/avatarParts.ts) 把 `AvatarDescriptor` 變成方塊清單（頭/身/髮/衣/臉/配件）+ 關節四肢尺寸；[`Avatar.tsx`](../src/render/Avatar.tsx) 用共用圓角方塊 + toon 材質渲染並做**關節動畫**。共用資源在 [`sharedGeometry.ts`](../src/render/sharedGeometry.ts)（`UNIT_ROUNDED`/`UNIT_BOX`/`TOON_GRADIENT`/`getToonMaterial`）。
- 外貌生成（純資料、可重現）：[`descriptor.ts`](../src/core/character/descriptor.ts) `generateAvatar(id, seed)`；顏色在 [`palettes.ts`](../src/core/character/palettes.ts)。性別、表情（happy/cool/determined/sweet）都在這裡。
- **動作 / emote 系統**（重點）：`Avatar` 的 `action` prop（型別 `AvatarAction`）在 `useFrame` 用 switch 驅動關節：
  - `run`（步態驅動，用 `gaitRef`）、`idle`
  - `cheer` 歡呼、`clap` 拍手、`wave` 揮手
  - `dance` 跳舞、`robot` 機器舞（硬切四拍、大幅度）
  - `kneel` 跪地、`sad` 沮喪、`facepalm` 抱頭
  - `seated`（觀眾）：腿保持坐姿、手照做上面的動作；`offset` 讓每人動作不同步。

---

## 7. 觀眾 / 場館 / 大螢幕 / 遮蔽 / 冠軍強調（都在 shell + RaceScene）

- **觀眾**：[`StadiumEnv.tsx`](../src/shell/StadiumEnv.tsx) 用 `Avatar seated` 放約 36 位坐姿觀眾（`SPECTATOR_ACTIONS` = cheer/clap/wave，隨機、不投影、不同步）。
- **場館**：看台（三角帶狀 rake，[`stadiumBuild.ts`](../src/render/stadiumBuild.ts) 的 `makeBowlGeometry`）、**兩側屋頂**（主看台大 + 對面小）、四座燈塔、天際線（~34 棟 + 一座高塔）、藍色跑道 + 綠色足球內場線（[`OvalTrack.tsx`](../src/modes/race/OvalTrack.tsx)）。
- **日夜**：[`SceneBackdrop.tsx`](../src/shell/SceneBackdrop.tsx)（天空底色/霧/星星）+ [`Lighting.tsx`](../src/shell/Lighting.tsx)（白天暖陽；夜晚極暗環境光 + 由上打下的場地聚光燈，形成場亮看台暗的對比）。切換用 store 的 `timeOfDay`。
- **大螢幕直播**：[`Jumbotron.tsx`](../src/shell/Jumbotron.tsx) 用第二顆「轉播鏡頭」把整個場景 render 到貼圖（`useFBO`）貼在螢幕上，鏡頭平滑追前緣；擷取那一刻**整塊螢幕隱藏**避免自拍回饋閃爍。
- **遮蔽淡化**：`RaceScene` 的 `OcclusionFader` 每幀從鏡頭朝每位跑者射線，凡標記 `userData.occluder` 的物件（看台、屋頂、大螢幕）擋在中間就平滑淡化到 ~16% 不透明並關深度寫入，離開後恢復。要讓新物件也能淡化：材質設 `transparent`，mesh 加 `userData={{ occluder: true }}`。
- **冠軍強調**：`RaceScene` 的 `WinnerHighlight`（地面金色光環脈動 + 半透明旋轉光柱 + 暖色點光）＋ 冠軍放大 1.24 倍 ＋ `winnerCloseup` 特寫鏡頭。

---

## 8. 狀態（zustand）與流程

[`store/useDrawStore.ts`](../src/store/useDrawStore.ts)：
- 資料：`participants`（≤12，lane=index）、`seed`、`phase`（setup/countdown/running/result）、`result`、`state`（模式的活狀態，opaque）、`ranking`、`paused`、`timeOfDay`、`cameraShotKey`、`lastRanking`。
- 每次 `start()`/`replay()` 走 `beginFreshRace()`：**自動換新種子**，並與上一場名次比對，不同才採用 → 每場保證不一樣。種子欄位已隱藏（自動化）。
- `togglePause()`、`toggleTimeOfDay()`、`setCameraShot()`。倒數計時由 [`Studio.tsx`](../src/shell/Studio.tsx) 的 effect 驅動。

---

## 9. 常用可調參數速查（想改什麼 → 去哪）

| 想調整 | 檔案 / 常數 |
| --- | --- |
| 賽道大小、車道寬、車道數下限 | `modes/race/raceTuning.ts` → `STADIUM`, `MIN_DISPLAY_LANES` |
| 比賽長度、名次間距、終點滑行、步態換算 | `modes/race/raceTuning.ts` → `RACE_DURATION`, `FINISH_SPREAD`, `OVERRUN_MAX`, `REF_GAIT_SPEED` |
| 起跑衝刺／抖動／終點衝刺曲線 | `modes/race/choreograph.ts`（`burst`/`amp`/`kick`/`SAMPLES`） |
| 跑步擺動幅度、步頻、前傾 | `render/Avatar.tsx` 頂部常數（`STRIDES_PER_SEC`, `THIGH_SWING`, ...） |
| 各種動作（歡呼/跳舞/機器舞/跪地…）的幅度 | `render/Avatar.tsx` `useFrame` 的 action switch |
| 冠軍/亞季/落敗分別做什麼動作 | `modes/race/RaceScene.tsx` → `WINNER_ACTIONS`, `LOSER_ACTIONS`, `runnerAction()` |
| 觀眾人數、動作種類 | `shell/StadiumEnv.tsx` → `N = 36`, `SPECTATOR_ACTIONS` |
| 冠軍聚焦（光環/光柱/放大/鏡頭距離） | `RaceScene.tsx` `WinnerHighlight` + `Runner scale` + `raceCamera.ts` `winnerCloseup` |
| 各鏡位角度/距離 | `modes/race/raceCamera.ts` |
| 日/夜天空、霧、星星 | `shell/SceneBackdrop.tsx`（`SKY_DAY/NIGHT`, `FOG_*`） |
| 日/夜燈光強度、場地聚光燈 | `shell/Lighting.tsx` |
| 看台/屋頂/燈塔/天際線 | `shell/StadiumEnv.tsx` |
| 跑道與內場顏色、場地線 | `modes/race/OvalTrack.tsx`（`TRACK`, `GRASS`, ...） |
| 大螢幕解析度/位置/鏡頭 | `shell/Jumbotron.tsx`（`useFBO(...)`, `jumboPos` 在 `RaceScene.tsx`） |
| 遮蔽淡化不透明度/更新頻率 | `RaceScene.tsx` `OcclusionFader`（`0.16`, `frame % 45`） |
| 名牌大小/樣式 | `render/NameTag.tsx`（`distanceFactor`, `fontSize`） |
| 角色膚色/髮色/服裝色、車道色 | `core/character/palettes.ts` |
| 介面主題（顏色/圓角/卡片） | `app/globals.css`（CSS 變數在 `:root`） |
| 參賽者上限 | `lib/types.ts` → `MAX_PARTICIPANTS`（目前 12，UI 與 race 都吃這個） |

---

## 10. 已知限制 / 踩過的坑

- **不要用 drei `<SoftShadows>`**：它的 PCSS 著色器用到 three 0.185 已移除的 `unpackRGBAToDepth`，會讓所有受陰影材質編譯失敗、整個場景跑不出來。改用 Canvas `shadows="percentage"`（three 內建 PCF）。
- **套件管理用 npm**（本機 corepack 壞掉，pnpm/yarn 不能用）；**ESLint 固定 v9**（v10 會和 `eslint-config-next@16` 衝突）。
- React 19 的 `react-hooks` 規則很嚴：**不要改 `useMemo`/`useState` 回傳值、不要在 effect 裡同步 setState**（用 ref 或 `getState()`）。
- 觀眾與跑者共用材質快取，所以觀眾本身不參與遮蔽淡化（只有看台結構會透明）；但觀眾很稀疏，實務上幾乎不擋人。
- 大螢幕會讓每幀 render 兩次（主畫面＋轉播），12 人規模沒問題；若要省效能可調低 `useFBO` 解析度或做開關。

---

## 11. 如何擴充

- **加新玩法（輪盤/鬼腳圖）**：見 [ADDING_A_MODE.md](./ADDING_A_MODE.md)，複製 `modes/_template/`，實作 `GameMode`，在 `modes/registerAll.ts` 加一行，並在 `ModePicker` 顯示（目前 ModePicker 已隱藏，要恢復就在 `Studio.tsx` 放回 `<ModePicker/>`）。
- **加一個角色動作**：在 `render/Avatar.tsx` 的 `AvatarAction` 型別加名字，在 `useFrame` 的 switch 加一個 case，然後在 `RaceScene.tsx`（跑者）或 `StadiumEnv.tsx`（觀眾）指派它。
- **加一個鏡位**：在 `raceCamera.ts` 寫一個回傳 `CameraShot` 的函式，放進 `namedShots`，再到 `HUD.tsx` 的 `CAM_OPTIONS` 加按鈕。
- **改參賽者上限**：改 `MAX_PARTICIPANTS`（注意車道視覺與擁擠度）。

---

## 12. 驗證指令

```bash
npm run dev        # 本機開發 http://localhost:3000
npm run build      # 生產建置
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm test           # vitest（公平性 / 決定性 / 收斂不變式）
```

開發時我也用過**無頭瀏覽器（Playwright + SwiftShader）**截圖 + 量測日/夜亮度來驗證視覺（例如確認 dark mode 真的變暗、遮蔽真的透明）——那些腳本放在 session 暫存區、非專案的一部分，需要時可再建立。

---

## 13. 目前 commit 摘要

- `9fa78db` 初始：3D 賽跑抽籤（Next.js + R3F），公平核心 + 賽跑模式 + 可擴充架構
- `51f4847` cel-shading 視覺翻新、關節跑步、插值防抖、自然配速
- `200d3b2` 修 SoftShadows 崩潰 + 真正日夜、場館/大螢幕/暫停/介面
- `c1ea8d5` 觀眾改像素小人 + 看台/屋頂遮蔽淡化
- `ef54a7e` 名牌加大、大螢幕淡化、角色動作系統（觀賽/獲勝/落敗）
- `2e83b97` 機器舞加大
- `6e3454c` 冠軍聚焦強化（特寫鏡頭 + 光環/光柱 + 放大）
