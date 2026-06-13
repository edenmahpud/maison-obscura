# Maison Obscura Project Bible

## Project Premise
Maison Obscura is an immersive cinematic scrollytelling website. It presents a believable archival mystery set around a secret fashion house in Newark, New Jersey in 1957, then reframes that story through a second narrative state.

## Narrative States

### ACT I — Enter the Story
The visitor is drawn into the world as if Maison Obscura were a real hidden institution documented through archival evidence.

### ACT II — Reveal the Truth
After the reveal trigger, the same narrative world is revisited through a changed interpretation.

## Core Tone and Aesthetic Pillars
- Archival documentary atmosphere
- Cinematic transitions and emotional pacing
- Elegant editorial restraint (not marketing tone)
- Mysterious and slightly unsettling undercurrent
- Emotional contrast between ACT I and ACT II

## Canonical Narrative Constraints
- Scene sequencing and IDs are defined in `docs/SCENE-MAP.md`.
- Scene-specific implementation work must target explicit scene IDs.
- Interactive and infrastructure requirements are defined in `docs/INTERACTION-PLAN.md`.
- Assets are tracked in `docs/ASSET-TRACKER.md`.
- Open story questions are tracked in `docs/UNRESOLVED-DECISIONS.md`.

## Archived Visual Direction
The existing black opening screen with large title is preserved as:

- `ARCHIVE-V01 — Existing Opening Title Screen`

This is not an active scene in the current map. It may later be repurposed in:
- `S13 — Brand Investigation`
- `S15 — Reveal Button`
- ACT II reveal state

## Unresolved Canon
The exact truth revealed in ACT II is intentionally unresolved and must remain open until explicitly decided and recorded in `docs/UNRESOLVED-DECISIONS.md`.

## Out of Scope for Current Build Phase
- Building new scene components
- Redesigning current visible hero
- Defining final ACT II truth details as fixed canon
