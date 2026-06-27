# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start local dev server
npm run build    # production build
npm run lint     # eslint across the project
```

No test suite exists yet.

## Stack

- **Next.js 16.2.7** — read `node_modules/next/dist/docs/` before writing Next.js code; this version has breaking changes from older releases
- **React 19.2.4**, **TypeScript**, **Tailwind CSS v4**
- **GSAP 3.15.0** — planned for `ScrollTrigger`-based transitions (S03 onward); not yet wired to scroll in the current prototype

## Architecture

The entry point is `app/page.tsx`, which renders `ActOnePrototype` — the only orchestrator component at present.

**Scroll model**: `ActOnePrototype` tracks a single `introProgress` value (0–1) from a pinned `<section>` that is `min-h-[320vh]`. It passes this scalar to child scene components as a `progress` prop. Each scene owns its own visual logic based on that value.

**Current scene chain** (prototype): `S00 → S01 → S02` share the sticky viewport; `S03` follows outside the sticky block. Scenes S04–S15 and all ACT II (R00–R06) are planned but not yet implemented.

**Component layout** (from AGENTS.md):
- `components/scenes/act-one/` — ACT I scene components
- `components/scenes/act-two/` — ACT II scene components (none yet)
- `components/effects/` — reusable cinematic effects (none yet)
- `components/interactive/` — interactive/3D modules (none yet)
- `public/assets/<scene-id>/` — visual assets per scene

## Documentation

All narrative decisions, scene specs, and open questions live in `docs/`:
- `docs/PROJECT-BIBLE.md` — project premise, tone, canonical constraints
- `docs/SCENE-MAP.md` — canonical scene registry (IDs, status, purpose)
- `docs/INTERACTION-PLAN.md` — phased interaction strategy and scene-level contracts
- `docs/ASSET-TRACKER.md` — asset status per scene
- `docs/UNRESOLVED-DECISIONS.md` — open story/design questions

Consult `docs/SCENE-MAP.md` before any scene work to confirm scene IDs and current status.
