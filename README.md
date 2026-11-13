# Deliveer

A procedural 3D isometric "pastel toy city" parcel-delivery game. You drive a courier van
through canal islands, wooden bridges and rush-hour hazards, hitting drop bullseyes before
the shift clock runs out.

Built with **React 19 + TypeScript + Three.js**, bundled by **Vite 8**, package-managed by **Bun**.

---

## Quick start

```bash
bun install
bun run dev        # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `bun run dev` | Vite dev server on `:3000` |
| `bun run build` | Production bundle into `dist/` |
| `bun run preview` | Serve the built bundle |
| `bun run typecheck` | `tsc --noEmit` (also exposed as `lint`) |
| `bun test` | Unit tests (`src/game/rules.test.ts`, 13 suites) |
| `bun run clean` | Remove `dist/` (cross-platform, no `rm -rf`) |
| `bun run verify` | typecheck + test + build — the same gate CI runs |

CI (`.github/workflows/ci.yml`) runs `typecheck · test · build` on every push and PR.

---

## Architecture

```
src/
├─ App.tsx                 # shell: phase machine + modals
├─ components/
│  ├─ GameCanvas.tsx       # Three.js engine: scene, physics, render, input  (largest file)
│  ├─ GameHud.tsx          # HUD overlay, driven by HudState
│  ├─ TitleOverlay.tsx     # title / results screen
│  └─ *Modal.tsx           # garage, quests, status, custom-city, ...
├─ config/
│  └─ balance.ts           # ALL gameplay tuning numbers (single source of truth)
└─ game/
   ├─ types.ts             # domain model (city, truck, parcels, HUD state)
   ├─ rules.ts             # simulation: physics, traffic law, scoring, delivery
   ├─ proceduralCity.ts    # procedural city generation + level config curve
   ├─ progression.ts       # coins, fleet, toppers, quests, persistence
   ├─ meshes.ts            # Three.js mesh/material factories
   ├─ customCity.ts        # user-authored city import
   ├─ demoDirector.ts      # 45s autopilot showcase
   ├─ audio.ts             # WebAudio engine
   ├─ i18n.ts              # zh / en strings
   └─ rules.test.ts        # headless simulation tests (node:test, run by Bun)
```

### Tuning values live in `src/config/balance.ts`

Never hard-code a magic number inside the simulation. Add it to `balance.ts`, import it,
and cover it with a test in `rules.test.ts`. Modules such as `game/rules.ts` and
`game/types.ts` re-export the values they historically owned, so older imports keep working.

### Tests are headless

`rules.test.ts` drives the real simulation with no renderer: city generation, pedestrian
and vehicle collision, traffic signals and tickets, parcel types, combo fever, ramp jumps,
roof-rack physics, the rocket-start state machine and the demo director. They are fast
(~2.5 s) and deterministic — keep them that way.

---

## Known debt

- `GameCanvas.tsx` and `rules.ts` are monolithic (100 KB+). They are being split by
  responsibility (`update` / `render` / `input` / `collision` / `audio`, and
  `traffic` / `collision` / `delivery` / `scoring` respectively).
- `metadata.json` declares `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`, but the repo has no
  server entry point yet. Do not ship `GEMINI_API_KEY` into the client bundle: the key
  must be read server-side only.
- No licence file yet.
