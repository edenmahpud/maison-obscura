# Scene Map

This file is the canonical scene registry for active narrative flow.

## ACT I — Enter the Story

| Scene ID | Working Title | Narrative Purpose | Interaction Mode | Status |
| --- | --- | --- | --- | --- |
| S00 | The Flash | Open in white-out camera flash and disorient perception | Scroll-triggered white flash | Prototype Implemented (2D) |
| S01 | The Photograph Appears | Reveal archival image emerging from white flash | Scroll reveal to full-screen still | Prototype Implemented (2D) |
| S02 | The Question | Introduce central mystery question (provisional wording) | Typography reveal on scroll | Prototype Implemented (2D) |
| S03 | Time Descent | Pull visitor from dark evidence into temporal depth toward 1957 | Planned pinned scroll-controlled layered 2D transition | Planned (Prototype Next) |
| S04 | America in the 1950s | Arrive in a bright, polished, idealized social atmosphere | Planned bright arrival tableau (2D still first) | Planned (Prototype Next) |
| S05 | Beneath the Surface | Reveal suspicion, surveillance, and fear under the surface | Contrast transition + scroll | Planned |
| S06 | Cold War / Hide | Make visitor feel watched and compelled to hide | Spatial / potentially 3D | Planned |
| S07 | The Founders | Introduce founding couple and hidden operation origin | Story sequence | Planned |
| S08 | The Street | Let visitor search Newark street environment | Interactive 360 + mouse | Planned |
| S09 | Enter the Tailoring Shop | Move from street into hidden tailoring interior | Transitional scene | Planned |
| S10 | The Shimmering Garment | Reveal garment as key piece of evidence | Staged reveal | Planned |
| S11 | Fabric Investigation | Explore material properties and clues | Close interactive / potentially 3D | Planned |
| S12 | Collection Investigation | Analyze clothes and associated women | Investigation flow | Planned |
| S13 | Brand Investigation | Decode brand language through artifacts | Object-led investigation | Planned |
| S14 | The Search Prompt | Trigger doubt and urge to verify online | Reflective end prompt | Planned |
| S15 | Reveal Button | Trigger transformation to second narrative state | Explicit interaction trigger | Planned |

## ACT II — Reveal the Truth

| Scene ID | Working Title | Narrative Purpose | Interaction Mode | Status |
| --- | --- | --- | --- | --- |
| R00 | Interface Break | Signal immediate system-level shift after reveal | Transform transition | Planned |
| R01 | The Image Revisited | Recontextualize opening image | Reframed visual recall | Planned |
| R02 | The Timeline Revisited | Revisit 1950s context with changed lens | Reinterpreted timeline | Planned |
| R03 | The Street Revisited | Reveal hidden/misread clues in Newark environment | Interactive revisit | Planned |
| R04 | The Garment Revisited | Reassign meaning of central garment evidence | Reframed object narrative | Planned |
| R05 | The Brand Revealed | Communicate what Maison Obscura actually represents | Narrative reveal | Planned |
| R06 | Final Ending | Complete reveal while leaving a final question | Closing sequence | Planned |

## Scene Notes
- `S02` line (“Why were these women hiding in plain sight?”) is provisional and editable.
- The canonical state switch is `S15 -> R00`.
- Any request touching multiple scenes must list every affected scene ID before implementation.
- `S01` selected asset: `public/assets/S01-photograph/women-hiding-hero.jpg`.
- First prototype currently includes only `S00 -> S01 -> S02`.
- Next planned prototype chain: `S02 -> S03 -> S04`.
- `S03` is planned as reversible scroll-scrub transition (no video-only sequence, no real 3D in first prototype).

## Archived Visual Directions
- `ARCHIVE-V01 — Existing Opening Title Screen`
  - Preserved from current implementation.
  - Not active in the current scene sequence.
  - Potential future reuse: `S13`, `S15`, ACT II reveal state.
