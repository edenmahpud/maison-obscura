"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { playSfx } from "@/lib/audio";
import { RED_INK_COLOR, RED_INK_STROKE_WIDTH } from "@/components/effects/redInk";

gsap.registerPlugin(ScrollTrigger);

// ── entry-bg canvas dimensions ────────────────────────────────────────────────
const BG_W = 3852;
const BG_H = 2181;

// ── "The Place" text overlay — Figma node 801:973, frame 1940×1092 ───────────
// (matches interior-preview.png's own aspect ratio, so vw/vh below line up
// with the phase-2 interior image at the reference viewport.)
const TEXT_FRAME_W = 1940;
const TEXT_FRAME_H = 1092;
function tvw(px: number): string { return `${((px / TEXT_FRAME_W) * 100).toFixed(3)}vw`; }
function tvh(px: number): string { return `${((px / TEXT_FRAME_H) * 100).toFixed(3)}vh`; }

// Red guide lines (Figma nodes 1099:154 "Line 3" / 1099:155 "Line 2"):
//   horizontal enters from the frame's left edge (x=0) and stops just short
//   of "the place" title, at y=449 — same technique as S07/S09's red-ink
//   guide lines. Vertical drops from the paragraph's own left edge (x=508,
//   matching its "left" below) down to the bottom of the frame (y=1092).
const LINE_H_Y     = 449;
const LINE_H_END_X = 614;
const LINE_V_X       = 508;
const LINE_V_START_Y = 643;
const LINE_V_END_Y   = 1092;

// Darkening isn't in the static Figma frame (which already bakes in the
// image's own moodiness) — this is the added "begin to darken" treatment,
// kept modest so the interior stays readable under the text.
const DARKEN_MAX = 0.5;

// ── Doorway void (from brightness scan of entry-bg.png) ──────────────────────
//   x: 44% → 59%   |   y: 34% → 85.8%
// Used as clip-path for the phase-1 interior.
// inset(top right bottom left) = inset(34% 41% 14.2% 44%)
const DOORWAY_CLIP = "inset(34% 41% 14.2% 44%)";

// Zoom / perspective anchor — centre of the void (where camera pushes toward)
const ZOOM_ORIGIN = "51.5% 59.9%";

// ── Door CSS variables (Figma node 787-72) ────────────────────────────────────
// Frame: portrait 1101×1957, content rotated 90° CW inside.
// Mapping: x_vis = y_frame/H   y_vis = (W − x_frame)/W
//   door-left  (787:82): frame left=93.26 top=791.66 w=635.84 h=228.998
//   door-right (787:81): frame left=99.62 top=973.69 w=605.497 h=216.279
//
// CSS vars — set on the cover shell, referenced by both door panels:
//   --door-x / --door-y / --door-width / --door-height  → left-door anchor
//   Right door: left = calc(var(--door-x) + var(--door-width) − 2.4%)
//   (2.4% = the shared centre-frame overlap matching the Figma layout)
const DOOR_VARS: Record<string, string> = {
  "--door-x":      "40.5%",  // left edge of left door
  "--door-y":      "33.8%",  // top of both doors
  "--door-width":  "11.7%",  // each panel width (approx equal)
  "--door-height": "57.8%",  // panel height
};

// ── Scroll phases (0–1 over 560vh) ───────────────────────────────────────────
//
//  0.00 → 0.04   Intro overlay clears
//  0.04 → 0.30   Street video zooms in (1.0 → 1.28, no blur)
//  0.20 → 0.38   Crossfade: video fades out / entry scene fades in simultaneously
//                (no black gap — at p=0.29: video=0.5, entry=0.5, total=1)
//  0.38 → 0.56   Doors open (rotateY 0 → 78°)
//  0.38 → 0.58   Entry scene zooms toward void (1.0 → 1.22)
//  0.44 → 0.56   Phase-1 interior appears through doorway clip (inside entry)
//  0.50 → 0.60   Doors fade out
//  0.54 → 0.65   Phase-2 interior (full-screen, z=3) fades in, 18 px blur
//  0.60 → 0.74   Entry layer fades out (interior has taken over)
//  0.62 → 0.86   Phase-2 blur clears
//  0.64 → 0.88   Phase-2 subtle zoom (1.0 → 1.06, into the room)
//  0.88 → 0.92   Stage 2: text + red lines reveal, image begins to darken
//                (starts only once stage 1 — the image itself — has
//                fully settled; driven purely by continued scroll, not a
//                timer)
//  0.84 → 1.00   Exit overlay fades in
const PHASE = {
  INTRO_CLEAR:      0.04,
  VID_ZOOM_START:   0.04,
  VID_ZOOM_END:     0.30,
  VID_FADE_START:   0.20,
  VID_FADE_END:     0.38,
  ENTRY_IN_START:   0.20,
  ENTRY_IN_END:     0.38,
  DOOR_OPEN_START:  0.38,
  DOOR_OPEN_END:    0.56,
  ENTRY_ZOOM_START: 0.38,
  ENTRY_ZOOM_END:   0.58,
  DOOR_FADE_START:  0.50,
  DOOR_FADE_END:    0.60,
  P1_INT_START:     0.44,
  P1_INT_END:       0.56,
  P2_INT_START:     0.54,
  P2_INT_END:       0.65,
  ENTRY_OUT_START:  0.60,
  ENTRY_OUT_END:    0.74,
  P2_BLUR_START:    0.54,
  P2_BLUR_END:      0.86,
  P2_ZOOM_START:    0.64,
  P2_ZOOM_END:      0.88,
  STAGE2_START:     0.88,  // = P2_ZOOM_END — stage 1 (the image) must settle first
  STAGE2_END:       0.92,
  EXIT_START:       0.95,
};

function lerp01(p: number, lo: number, hi: number): number {
  return Math.min(1, Math.max(0, (p - lo) / (hi - lo)));
}

function eio(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function S10PlaceSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRef   = useRef<HTMLVideoElement | null>(null);
  const streetRef  = useRef<HTMLDivElement | null>(null);
  const entryRef   = useRef<HTMLDivElement | null>(null);
  const p1IntRef   = useRef<HTMLDivElement | null>(null);
  const doorsRef   = useRef<HTMLDivElement | null>(null);
  const doorLRef   = useRef<HTMLDivElement | null>(null);
  const doorRRef   = useRef<HTMLDivElement | null>(null);
  const p2IntRef   = useRef<HTMLDivElement | null>(null);
  const introRef   = useRef<HTMLDivElement | null>(null);
  const exitRef    = useRef<HTMLDivElement | null>(null);
  const doorSoundPlayed = useRef(false);

  // "The Place" stage-2 reveal — text, red guide lines, darken overlay
  // (see PHASE.STAGE2_START/END and the effect below; pure scroll-driven)
  const placeTextRef  = useRef<HTMLDivElement | null>(null);
  const placeDarkRef  = useRef<HTMLDivElement | null>(null);
  const lineHRef      = useRef<HTMLDivElement | null>(null);
  const lineVRef      = useRef<HTMLDivElement | null>(null);

  // ── Video: autoplay loop via IntersectionObserver ─────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) video.play().catch(() => {}); else video.pause(); },
      { threshold: 0.1 }
    );
    obs.observe(video);
    return () => obs.disconnect();
  }, []);

  // ── Scroll-driven sequence ─────────────────────────────────────────────────
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start:   "top top",
        end:     "bottom bottom",
        scrub:   1.2,
        invalidateOnRefresh: true,
        onUpdate: ({ progress: p }) => {

          // Intro overlay
          if (introRef.current)
            introRef.current.style.opacity = String(1 - lerp01(p, 0, PHASE.INTRO_CLEAR));

          // Street video — smooth zoom, NO blur or heavy fade-to-black
          if (streetRef.current) {
            const scale   = 1 + eio(lerp01(p, PHASE.VID_ZOOM_START, PHASE.VID_ZOOM_END)) * 0.28;
            const opacity = 1 - lerp01(p, PHASE.VID_FADE_START, PHASE.VID_FADE_END);
            streetRef.current.style.transform = `scale(${scale.toFixed(4)})`;
            streetRef.current.style.opacity   = String(opacity);
          }

          // Entry layer: crossfade in → zoom → crossfade out
          // Opacity is fadeIn × (1 − fadeOut) so transitions are simultaneous with
          // video (no black gap) and with phase-2 interior.
          if (entryRef.current) {
            const fadeIn  = lerp01(p, PHASE.ENTRY_IN_START,  PHASE.ENTRY_IN_END);
            const fadeOut = lerp01(p, PHASE.ENTRY_OUT_START, PHASE.ENTRY_OUT_END);
            const scale   = 1 + eio(lerp01(p, PHASE.ENTRY_ZOOM_START, PHASE.ENTRY_ZOOM_END)) * 0.22;
            entryRef.current.style.opacity   = String(fadeIn * (1 - fadeOut));
            entryRef.current.style.transform = `scale(${scale.toFixed(4)})`;
          }

          // Phase-1 interior — inside entry layer, only visible through doorway clip
          if (p1IntRef.current)
            p1IntRef.current.style.opacity = String(lerp01(p, PHASE.P1_INT_START, PHASE.P1_INT_END));

          // Doors — open, then fade out before interior takes full control
          if (p >= PHASE.DOOR_OPEN_START && !doorSoundPlayed.current) {
            doorSoundPlayed.current = true;
            playSfx("door");
          } else if (p < PHASE.DOOR_OPEN_START && doorSoundPlayed.current) {
            doorSoundPlayed.current = false;
          }

          const doorOp = 1 - lerp01(p, PHASE.DOOR_FADE_START, PHASE.DOOR_FADE_END);
          const angle  = eio(lerp01(p, PHASE.DOOR_OPEN_START, PHASE.DOOR_OPEN_END)) * 78;
          if (doorsRef.current)
            doorsRef.current.style.opacity  = String(doorOp);
          if (doorLRef.current)
            doorLRef.current.style.transform = `rotateY(-${angle.toFixed(2)}deg)`;
          if (doorRRef.current)
            doorRRef.current.style.transform = `rotateY(${angle.toFixed(2)}deg)`;

          // Phase-2 interior — standalone full-screen layer
          // Fades in as entry fades out; blur clears as camera zooms deeper.
          if (p2IntRef.current) {
            const opacity = lerp01(p, PHASE.P2_INT_START,  PHASE.P2_INT_END);
            const blurPx  = (1 - lerp01(p, PHASE.P2_BLUR_START, PHASE.P2_BLUR_END)) * 18;
            const scale   = 1 + eio(lerp01(p, PHASE.P2_ZOOM_START, PHASE.P2_ZOOM_END)) * 0.06;
            p2IntRef.current.style.opacity   = String(opacity);
            p2IntRef.current.style.filter    = `blur(${blurPx.toFixed(1)}px)`;
            p2IntRef.current.style.transform = `scale(${scale.toFixed(4)})`;
          }

          // Exit overlay
          if (exitRef.current)
            exitRef.current.style.opacity = String(lerp01(p, PHASE.EXIT_START, 1));

          // "The Place" stage 2 — text, red guide lines, and the darken
          // treatment all ride the SAME scroll-driven value, so they
          // literally cannot appear before stage 1 (the image) has finished
          // settling at PHASE.STAGE2_START (= PHASE.P2_ZOOM_END), and they
          // retreat smoothly (not a hard cut) if the user scrolls back out —
          // this is a pure function of scroll progress, no timers involved.
          const stage2 = lerp01(p, PHASE.STAGE2_START, PHASE.STAGE2_END);
          if (placeTextRef.current)
            placeTextRef.current.style.opacity = String(stage2);
          if (placeDarkRef.current)
            placeDarkRef.current.style.opacity = String(stage2 * DARKEN_MAX);
          if (lineHRef.current)
            lineHRef.current.style.width = tvw(LINE_H_END_X * stage2);
          if (lineVRef.current)
            lineVRef.current.style.height = tvh((LINE_V_END_Y - LINE_V_START_Y) * stage2);
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  // Aspect-ratio-preserving cover shell — ensures door % positions stay
  // pixel-aligned with entry-bg.png at every viewport size
  const coverShell: React.CSSProperties = {
    position: "absolute",
    top: "50%", left: "50%",
    transform: "translate(-50%, -50%)",
    width:  `max(100%, calc(${(BG_W / BG_H).toFixed(4)} * 100vh))`,
    height: `max(100%, calc(${(BG_H / BG_W).toFixed(4)} * 100vw))`,
    overflow: "hidden",
  };

  return (
    <section
      ref={sectionRef}
      aria-label="S10 Place — The Tailor Shop"
      style={{ position: "relative", height: "560vh", background: "#181818" }}
    >
      <div style={{
        position: "sticky", top: 0,
        height: "100vh", width: "100%",
        overflow: "hidden", background: "#181818",
      }}>

        {/* ════════════════════════════════════════════════════════════════════
            LAYER 1 — Street video
            Full-screen, loops, no blur. Scroll-zoom pushes toward shop entrance.
            Crossfades out as entry scene crossfades in (total brightness = 1).
        ════════════════════════════════════════════════════════════════════ */}
        <div
          ref={streetRef}
          style={{ position: "absolute", inset: 0, zIndex: 1, transformOrigin: "center center" }}
        >
          <video
            ref={videoRef}
            src="/assets/Place/place.mp4"
            muted loop playsInline preload="auto"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            LAYER 2 — Entry scene (facade + phase-1 interior peek + doors)
            Crossfades in over the street video (simultaneously, no black gap).
            Zooms toward the void as doors open.
            Crossfades out as phase-2 interior (layer 3) takes over.
            All children share this layer's opacity:
              • doors appear the moment the facade appears
              • phase-1 interior appears through its own clip while doors open
        ════════════════════════════════════════════════════════════════════ */}
        <div
          ref={entryRef}
          style={{
            position: "absolute", inset: 0, zIndex: 2,
            opacity: 0,
            transformOrigin: ZOOM_ORIGIN,
          }}
        >
          {/* Cover shell sets CSS variables for door positioning */}
          <div style={{ ...coverShell, ...(DOOR_VARS as React.CSSProperties) }}>

            {/* 2a. Building facade (bottom of stack) */}
            <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
              <Image
                src="/assets/Place/entry-bg.png"
                alt="Tailor shop entrance"
                fill sizes="100vw"
                style={{ objectFit: "fill" }}
              />
            </div>

            {/* 2b. Phase-1 interior — at z=2 (ABOVE facade) so it is visible.
                clip-path pins the reveal to the doorway void only.
                Fades in while doors open; carried out with entry layer. */}
            <div
              ref={p1IntRef}
              style={{
                position: "absolute", inset: 0, zIndex: 2,
                opacity: 0,
                clipPath: DOORWAY_CLIP,
              }}
            >
              <Image
                src="/assets/Place/interior-preview.png"
                alt="" aria-hidden fill sizes="100vw"
                style={{ objectFit: "fill" }}
              />
            </div>

            {/* 2c. Door panels
                Left door  — hinge on left, opens left  (rotateY negative)
                Right door — hinge on right, opens right (rotateY positive)

                CSS variables control position so the placement can be tuned
                without touching the animation code:
                  --door-x / --door-y / --door-width / --door-height (left panel)
                  Right panel: left = calc(--door-x + --door-width − 2.4%)
                  The 2.4% is the shared centre-frame overlap from the Figma layout.
            */}
            <div
              ref={doorsRef}
              style={{
                position: "absolute", inset: 0, zIndex: 3,
                perspective: "1200px",
                perspectiveOrigin: ZOOM_ORIGIN,
              }}
            >
              <div
                ref={doorLRef}
                style={{
                  position: "absolute",
                  left:            "var(--door-x)",
                  top:             "var(--door-y)",
                  width:           "var(--door-width)",
                  height:          "var(--door-height)",
                  transformOrigin: "left center",
                }}
              >
                <Image
                  src="/assets/Place/door-left.png"
                  alt="" aria-hidden fill sizes="15vw"
                  style={{ objectFit: "cover", objectPosition: "center" }}
                />
              </div>
              <div
                ref={doorRRef}
                style={{
                  position: "absolute",
                  left:            "calc(var(--door-x) + var(--door-width) - 2.4%)",
                  top:             "36%",
                  width:           "11.1%",
                  height:          "55%",
                  transformOrigin: "right center",
                }}
              >
                <Image
                  src="/assets/Place/door-right.png"
                  alt="" aria-hidden fill sizes="15vw"
                  style={{ objectFit: "cover", objectPosition: "center" }}
                />
              </div>
            </div>

          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            LAYER 3 — Phase-2 interior (full-screen standalone)
            Separate from the entry layer so it outlives it.
            Fades in as the entry layer fades out — no black gap between them.
            Starts blurry (18 px) to evoke stepping through a door.
            Blur clears and a subtle zoom carries the camera deeper into the room.
            objectFit:cover fills the viewport like a natural full scene.
        ════════════════════════════════════════════════════════════════════ */}
        <div
          ref={p2IntRef}
          style={{
            position: "absolute", inset: 0, zIndex: 3,
            opacity: 0,
            transformOrigin: ZOOM_ORIGIN,
          }}
        >
          <Image
            src="/assets/Place/interior-preview.png"
            alt="Maison Obscura interior"
            fill sizes="100vw"
            style={{ objectFit: "cover" }}
          />

          {/* ── Stage-2 darken treatment ───────────────────────────────────────
              Plain black scrim over interior-preview.png, scoped to this same
              div. Opacity is driven by `stage2` above — gradual, not a hard
              cut, and only ever active once stage 1 (the image itself) has
              fully appeared. */}
          <div
            ref={placeDarkRef}
            aria-hidden="true"
            style={{ position: "absolute", inset: 0, background: "#000", opacity: 0, pointerEvents: "none" }}
          />

          {/* ── Red guide lines (Figma nodes 1099:154 / 1099:155) ─────────────
              Fixed-thickness (non-scaling) bars rather than SVG, since both
              are pure axis-aligned segments. Their length is driven by the
              same `stage2` value as the text, so they draw in together with
              it — see LINE_H_* / LINE_V_* constants above for placement. */}
          <div
            ref={lineHRef}
            aria-hidden="true"
            style={{
              position: "absolute", left: 0,
              top: `calc(${tvh(LINE_H_Y)} - ${RED_INK_STROKE_WIDTH / 2}px)`,
              width: 0, height: `${RED_INK_STROKE_WIDTH}px`,
              background: RED_INK_COLOR, pointerEvents: "none",
            }}
          />
          <div
            ref={lineVRef}
            aria-hidden="true"
            style={{
              position: "absolute", top: tvh(LINE_V_START_Y),
              left: `calc(${tvw(LINE_V_X)} - ${RED_INK_STROKE_WIDTH / 2}px)`,
              width: `${RED_INK_STROKE_WIDTH}px`, height: 0,
              background: RED_INK_COLOR, pointerEvents: "none",
            }}
          />

          {/* ── "The Place" text overlay (Figma node 801:973) ─────────────────
              Scoped as a child of the phase-2 interior-preview.png element
              itself (not the section) — it shares this div's stacking
              context, so it only ever renders on top of this exact image and
              moves/scales with it. Opacity is `stage2` (see effect above):
              this is stage 2 of this view, appearing only after stage 1 (the
              image) has fully settled and the user keeps scrolling. */}
          <div
            ref={placeTextRef}
            aria-hidden="true"
            style={{
              position: "absolute", inset: 0,
              opacity: 0,
              pointerEvents: "none",
            }}
          >
            <p
              className="font-cormorant"
              style={{
                position: "absolute",
                left: `calc(50% - ${tvw(310)})`, top: tvh(387),
                margin: 0,
                fontStyle: "italic", fontWeight: 700,
                fontSize: `clamp(28px, ${tvw(80)}, 80px)`,
                lineHeight: 1.53, letterSpacing: "-1.6px",
                color: "#ffffff", textTransform: "capitalize", whiteSpace: "nowrap",
              }}
            >
              the place
            </p>
            <p
              className="font-cormorant"
              style={{
                position: "absolute",
                left: `calc(50% - ${tvw(462)})`, top: tvh(509), width: tvw(840),
                margin: 0,
                fontWeight: 600,
                fontSize: `clamp(16px, ${tvw(40)}, 40px)`,
                lineHeight: 1.32, letterSpacing: "-0.8px",
                color: "#ffffff",
              }}
            >
              Hidden behind an elegant storefront, Maison Obscura operated as both a fashion house and a shelter
            </p>
          </div>
        </div>

        {/* ── Intro overlay ─────────────────────────────────────────────────── */}
        <div ref={introRef} aria-hidden="true"
          style={{ position: "absolute", inset: 0, zIndex: 8, background: "#181818", pointerEvents: "none" }}
        />

        {/* ── Exit overlay ──────────────────────────────────────────────────── */}
        <div ref={exitRef} aria-hidden="true"
          style={{ position: "absolute", inset: 0, zIndex: 9, background: "#181818", opacity: 0, pointerEvents: "none" }}
        />

        {/* Film grain + vignette */}
        <div aria-hidden="true" className="mo-archival-grain" style={{ zIndex: 200 }} />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.45) 100%)",
            zIndex: 201,
          }}
        />

      </div>
    </section>
  );
}
