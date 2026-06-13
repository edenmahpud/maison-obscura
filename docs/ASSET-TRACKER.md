# Asset Tracker

This tracker records all planned and approved assets by scene ID.

## Path Convention
- Scene-bound assets: `public/assets/<scene-id>/...`
- Shared assets: `public/assets/shared/...` with explicit scene usage list
- Archived visual references: `public/assets/archive/...`

## Status Vocabulary
- `Not Created`
- `In Progress`
- `Selected`
- `Added to Website`

## Phase 1 Asset List (2D-First Prototype)

| Scene ID | Required Asset | Planned Path | File Type | Status | Mode | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| S00 | White flash plate + afterimage texture | `public/assets/s00/` | PNG/WebP | Not Created | 2D | Code-driven flash with optional texture overlays |
| S01 | `women-hiding-hero.jpg` (selected opening photograph) | `public/assets/S01-photograph/` | JPG (2D still image) | Selected, Added to Website | 2D | Usage: full-screen archival photograph revealed after the opening flash; scoped only to S01 |
| S02 | Typography lockup (question card) | `public/assets/s02/` | SVG/PNG (optional) | Not Created | 2D | Can be rendered purely in code |
| S03 | Time-descent transition layers (grain/scratches/light leaks/depth plates/optional year markers) | `public/assets/s03/` | PNG/SVG layered plates | Not Created | 2D | Planned for scroll-controlled pinned layered motion (GSAP ScrollTrigger), reversible on back scroll |
| S04 | Wide polished 1950s America atmosphere placeholder image | `public/assets/s04/` | JPG/WebP | Not Created (Needed for prototype) | 2D | Future bright idealized arrival scene; temporary wide still required before final art selection |
| S05 | Surveillance/doc overlay set | `public/assets/s05/` | PNG/JPG | Not Created | 2D | Dark reality through layered evidence |
| S06 | Hide/surveillance layer stack | `public/assets/s06/` | PNG/JPG | Not Created | 2D | Mouse parallax before any 3D evaluation |
| S07 | Founders portrait + archival documents | `public/assets/s07/` | JPG/PNG | Not Created | 2D | Documentary stills and ephemera |
| S08 | Wide Newark street panorama (prototype) | `public/assets/s08/` | JPG/WebP | Not Created | Panoramic | Phase 1 can be still panorama + mouse movement |
| S09 | Shop-entry transition plate/clip | `public/assets/s09/` | JPG/MP4 | Not Created | 2D or Video | Still or short video transition acceptable |
| S10 | Shimmering garment hero still/loop | `public/assets/s10/` | JPG/MP4 | Not Created | 2D or Video | Start as still or subtle loop |
| S11 | Fabric detail reference pack | `public/assets/s11/` | JPG/PNG/MP4 | Not Created | Potential 3D | Primary candidate for future true 3D |
| S12 | Collection investigation gallery assets | `public/assets/s12/` | JPG/PNG | Not Created | 2D | Evidence-board/gallery interaction |
| S13 | Brand artifacts (box, letter, label, symbol) | `public/assets/s13/` | PNG/SVG/JPG | Not Created | 2D | 2D object animation strategy |
| S14 | Search-prompt end card visuals | `public/assets/s14/` | JPG/PNG | Not Created | 2D | Ambiguous ending prompt |
| S15 | Reveal-button state assets | `public/assets/s15/` | PNG/SVG | Not Created | 2D | Transition trigger UI and atmosphere |
| R00 | Interface break transition assets | `public/assets/r00/` | PNG/JPG | Not Created | 2D | Visual break into ACT II |
| R01 | Revisited photograph treatment | `public/assets/r01/` | JPG/PNG | Not Created | 2D | Same source, changed interpretation |
| R02 | Reframed timeline visuals | `public/assets/r02/` | JPG/PNG | Not Created | 2D | Recontextualized historical cues |
| R03 | Revisited street clue overlays | `public/assets/r03/` | PNG/JPG | Not Created | Panoramic | Can reuse S08 base with added clues |
| R04 | Revisited garment interpretation assets | `public/assets/r04/` | JPG/PNG/MP4 | Not Created | 2D or Video | Optional continuation from S10/S11 assets |
| R05 | Brand reveal evidence set | `public/assets/r05/` | JPG/PNG/SVG | Not Created | 2D | Final meaning communication assets |
| R06 | Final ending visual set | `public/assets/r06/` | JPG/PNG | Not Created | 2D | Closing beat with open question |
| ARCHIVE-V01 | Existing Opening Title Screen reference assets | `public/assets/archive/archive-v01/` | Image/Reference | Selected | 2D | Preserve exactly as current; optional reuse in S13, S15, ACT II reveal state |

## Usage Rules
- Every production asset must map to at least one scene ID or `ARCHIVE-V01`.
- Shared effect assets must list all current and candidate scene IDs.
- No asset should be added to implementation without tracker entry.
- Real 3D is reserved for evaluation in later phases, primarily around `S08` and `S11`.
