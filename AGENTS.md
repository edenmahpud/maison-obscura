<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Maison Obscura Working Rules

## Targeting Protocol
- For scene-specific visual or narrative edits, prompts must start with:
  - `Target Scene ID(s): S00 / S01 / R00 / ...`
- For non-scene edits, prompts must start with:
  - `Target System: Documentation / Shared Effects / Global Styles / Asset Structure / Interaction Infrastructure`

## Scope and Safety Rules
- Any request affecting multiple scenes must explicitly list every affected scene ID.
- Shared effects must identify which scenes currently use or may use them.
- No unrelated scene may be visually modified without explicit approval.
- Structural changes must list affected files before implementation.

## Scene and Component Organization Rules
- ACT I scene components belong in `components/scenes/act-one/`.
- ACT II scene components belong in `components/scenes/act-two/`.
- Reusable cinematic effects belong in `components/effects/`.
- Interactive or 3D modules belong in `components/interactive/`.
- Visual assets should be grouped by scene ID under `public/assets/<scene-id>/`.

## Archived Visual Direction
- Preserve current opening implementation as:
  - `ARCHIVE-V01 — Existing Opening Title Screen`
- `ARCHIVE-V01` is an archived visual direction, not the active `S00`.
- Potential future reuse: `S13`, `S15`, ACT II reveal state.
