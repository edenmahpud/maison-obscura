# Maison Obscura

Immersive cinematic scrollytelling experience with two narrative states:
- **ACT I — Enter the Story**
- **ACT II — Reveal the Truth**

The project is currently in documentation and planning mode for scene architecture and interaction systems.

## Archived Visual Direction

The existing black opening title screen is preserved as:
- `ARCHIVE-V01 — Existing Opening Title Screen`

It may later be repurposed in `S13`, `S15`, or the ACT II reveal state.

## Documentation Index

- `docs/PROJECT-BIBLE.md`
- `docs/SCENE-MAP.md`
- `docs/ASSET-TRACKER.md`
- `docs/INTERACTION-PLAN.md`
- `docs/UNRESOLVED-DECISIONS.md`

## Working Protocol

- Scene-specific requests must begin with:
  - `Target Scene ID(s): ...`
- Non-scene requests must begin with:
  - `Target System: Documentation / Shared Effects / Global Styles / Asset Structure / Interaction Infrastructure`
- Any request touching multiple scenes must list every affected scene ID.
- Structural changes should list affected files before implementation.

## Development

Run locally:

```bash
npm run dev
```

Build:

```bash
npm run build
```
