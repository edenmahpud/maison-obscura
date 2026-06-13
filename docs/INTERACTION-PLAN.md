# Interaction Plan

This file defines interaction behavior and infrastructure planning without prescribing final visual implementation.

## Production Interaction Strategy (Phased)

### Phase 1: 2D Narrative Prototype
- Build the full story flow first using still imagery, layered composition, typography, and scroll transitions.
- Prioritize pacing, narrative clarity, and emotional progression over technical complexity.
- Use video loops only where they materially improve scene readability (for example `S09` or `S10`).
- Current implementation scope: `S00`, `S01`, `S02` only.
- Next planned scope: scroll-controlled transition from `S02` into `S03` and arrival in `S04`.

### Phase 2: Mouse-Based Depth and Parallax
- Add mouse-reactive depth and parallax to selected scenes after Phase 1 flow is validated.
- Primary candidates: `S06` and `S08`, plus subtle accents where useful.
- Keep interactions lightweight and performance-safe.

### Phase 3: Evaluate Panoramic Street and 3D Fabric
- Evaluate advanced rendering only after story flow works end-to-end.
- `S08`: decide between panoramic/360 approach vs parallax-only approach.
- `S11`: evaluate true 3D garment/material study vs non-3D alternatives.
- No assumption that full 3D is required across the project.

## Global Interaction Model
- Primary navigation mode remains scroll-driven cinematic progression.
- Transitions should preserve continuity between scenes and avoid abrupt style breaks unless narratively intended.
- Pacing should alternate between observation, discovery, and interpretation.
- Real 3D is not a baseline requirement for Phase 1.

## Scene-Level Interaction Contracts (Planning)

| Scene ID | Interaction Contract | Notes |
| --- | --- | --- |
| S00 | High-impact white flash and afterimage | Implemented in prototype as full-screen white opening, no text |
| S01 | Progressive visual emergence | Implemented with selected still: `public/assets/S01-photograph/women-hiding-hero.jpg` |
| S02 | Typography question reveal on scroll | Implemented with provisional question text |
| S03 | Time-descent transition | Planned pinned scrub sequence with layered 2D depth, blur, exposure, grain, optional backward year markers toward 1957 |
| S04 | Bright atmosphere arrival | Planned idealized 1950s tableau using wide temporary still until final image is selected |
| S05 | Tonal shift transition | Still imagery and document layers |
| S06 | Spatial tension interaction | Start with layered imagery + mouse parallax |
| S07 | Narrative sequence | Founder story progression |
| S08 | Street exploration | Start with wide still + mouse movement; panoramic/360 is future evaluation |
| S09 | Entry transition | Still image or short video transition first |
| S10 | Cinematic reveal | Still image or short loop video first |
| S11 | Investigative close interaction | Strongest candidate for future true 3D |
| S12 | Guided investigation | Interactive image gallery/evidence board |
| S13 | Artifact interaction sequence | 2D object animations (envelope/letter/label/box) |
| S14 | Reflective prompt state | Encourage real-world verification impulse |
| S15 | Explicit CTA interaction | Reveal trigger into ACT II |
| R00 | Interface break | Visual/system reset after reveal press |
| R01 | Reframed image review | New interpretation of opening evidence |
| R02 | Reframed timeline review | Changed historical lens |
| R03 | Revisited 360/scene clues | Hidden details now legible |
| R04 | Reinterpreted garment interaction | Different narrative meaning |
| R05 | Reveal comprehension state | Clarify Maison Obscura’s true role |
| R06 | Final ending interaction | Closure with deliberate unresolved echo |

## Narrative State Switch
- Trigger point: `S15 -> R00`.
- The reveal action is a system transition, not a simple scene advance.
- ACT II should feel visually related but emotionally distinct.

## Shared Interaction Infrastructure
Potential shared systems (to be built later, not now):
- Scroll progression orchestration
- Transition/effect timing controller
- Scene enter/exit lifecycle hooks
- Pointer/mouse interaction primitives
- Optional panoramic interaction wrapper (candidate `S08`)
- Optional 3D interaction wrapper (candidate `S11`)

## Planned S02 -> S03 -> S04 Transition Direction
- Implementation approach (future): GSAP `ScrollTrigger` with pinned section and scrub-controlled timeline.
- Transition feeling: from dark unclear evidence toward a brighter, idealized world through layered 2D motion.
- Key S03 beats: question fade/blur, intensified grain/photographic damage textures, scale/depth pull, light/exposure streaking.
- Optional timeline detail: historical year markers moving backward toward `1957`.
- Reversible behavior required on reverse scroll.
- First prototype constraints: no pre-rendered video transition, no real 3D.

## Accessibility Planning Constraints
- Provide reduced-motion alternatives for high-intensity transitions.
- Keep essential narrative comprehension available without advanced interaction.
- Ensure interactions degrade gracefully when 3D capability is unavailable.
