"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SectionOverlayTitle } from "@/components/effects/SectionOverlayTitle";
import { duckMusic, restoreMusic } from "@/lib/audio";

gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────────────────────────────────────
// S04 — "The Perfect Decade" (1950s America) horizontal collage
// Canvas: 2800 × 1080 (Figma node 801-709)
// x positions: fixed px on the 2800 px canvas
// y positions: % of viewport height (Figma y / 1080 × 100)
//
// Z-order within track stacking context:
//   dark bg (implicit 0) → banner (1) → thread (2) → happy11 (3) →
//   bg photos (4-5) → fg images (6) → c2/note1 (8) →
//   happy1 (9) → happy2/note2 (10-11) → TV (16)
// ─────────────────────────────────────────────────────────────────────────────

const TOTAL_SCROLL = 9500;

// ── ENTRY TRANSITION ─────────────────────────────────────────────────────────
const ENTRY_FADE_END = 0.01;
const MAX_BLUR_PX   = 20;
const MAX_BRIGHT    = 2;
const DEBLUR_END    = 0.025;

// ── ZOOM-OUT PHASE ───────────────────────────────────────────────────────────
const ZOOM_START       = 0.24;
const ZOOM_END         = 0.45;
const CROSSFADE_END    = 0.52;
const TARGET_SCALE     = 0.28;
const TARGET_X_PERCENT = -22;
const TARGET_Y_PERCENT = -16;

// ── HORIZONTAL SCROLL ────────────────────────────────────────────────────────
const TRACK_WIDTH    = "2800px";
const PARALLAX_SCALE = 0.55;

function clamp01(v: number) { return Math.min(1, Math.max(0, v)); }

// Per-element parallax config.
// speed: horizontal px-per-vw at full travel (+ lags, − leads)
// drift: vertical px at full horizontal travel
// z:    z-index within the track stacking context
//
// Thread SVG lives at z:2. All images must be ≥ z:3 so thread passes behind them.
// happy11 is explicitly at z:3 per design requirement.
type Cfg = { speed: number; drift: number; z: number };
const CFG: Record<string, Cfg> = {
  // bg photos — above thread (z:2), below foreground
  happy10L: { speed: -5, drift: -2, z: 4 },
  happy10R: { speed:  7, drift:  2, z: 4 },
  happy12:  { speed:  7, drift:  3, z: 4 },
  happy8:   { speed: -4, drift: -1, z: 5 },
  happy11:  { speed:  3, drift:  2, z: 20 }, // front-most element per design requirement
  // foreground images
  happy6:   { speed: -3, drift:  1, z: 6 },
  happy7:   { speed:  3, drift:  2, z: 6 },
  happy3:   { speed:  3, drift:  1, z: 17 }, // above commercial TV (z:16); labels embedded inside
  happy5:   { speed:  5, drift:  3, z: 6 },
  c2:       { speed: -2, drift:  1, z: 8 }, // commercial2
  note1:    { speed: -2, drift:  2, z: 10 }, // typewriter note above happy1
  happy1:   { speed: -2, drift:  2, z: 9 },
  happy2:   { speed:  5, drift:  3, z: 10 },
  note2:    { speed:  5, drift:  3, z: 11 }, // typewriter note above happy2
  tv:       { speed:  4, drift:  2, z: 16 },
};

export function S04America1950s() {
  const sectionRef      = useRef<HTMLElement | null>(null);
  const entryOverlayRef = useRef<HTMLDivElement | null>(null);
  const imgWrapRef      = useRef<HTMLDivElement | null>(null);
  const titleRef        = useRef<HTMLDivElement | null>(null);
  const trackRef        = useRef<HTMLDivElement | null>(null);
  const threadSvgRef    = useRef<SVGSVGElement | null>(null);
  const threadAnimated  = useRef(false);

  // Parallax refs
  const r_happy10L = useRef<HTMLDivElement | null>(null);
  const r_happy10R = useRef<HTMLDivElement | null>(null);
  const r_happy12  = useRef<HTMLDivElement | null>(null);
  const r_happy8   = useRef<HTMLDivElement | null>(null);
  const r_happy11  = useRef<HTMLDivElement | null>(null);
  const r_happy6   = useRef<HTMLDivElement | null>(null);
  const r_happy7   = useRef<HTMLDivElement | null>(null);
  const r_happy3   = useRef<HTMLDivElement | null>(null);
  const r_happy5   = useRef<HTMLDivElement | null>(null);
  const r_c2       = useRef<HTMLDivElement | null>(null);
  const r_note1    = useRef<HTMLDivElement | null>(null);
  const r_happy1   = useRef<HTMLDivElement | null>(null);
  const r_happy2   = useRef<HTMLDivElement | null>(null);
  const r_note2    = useRef<HTMLDivElement | null>(null);
  const r_tvWrap   = useRef<HTMLDivElement | null>(null);

  // Commercial 1 — autoplay, sound on first gesture
  const tvVideoRef    = useRef<HTMLVideoElement | null>(null);
  const tvUnlockedRef = useRef(false);
  // True only while this section is the pinned/active one — the TV commercial
  // must not unmute (and duck the site-wide music) from a gesture made while
  // the user is somewhere else entirely, e.g. still on the opening flash.
  const sectionActiveRef = useRef(false);

  // Commercial 2 — autoplay muted; click toggles sound (not play/pause)
  const c2VideoRef    = useRef<HTMLVideoElement | null>(null);
  const [c2Unmuted, setC2Unmuted] = useState(false);
  const c2UnmutedRef  = useRef(false); // mirrors c2Unmuted for use inside GSAP closures

  // ── TV sound unlock ───────────────────────────────────────────────────────
  useEffect(() => {
    const unlock = () => {
      if (tvUnlockedRef.current) return;
      if (!sectionActiveRef.current) return;
      const v = tvVideoRef.current;
      if (!v) return;
      tvUnlockedRef.current = true;
      v.muted  = false;
      v.volume = 0.55;
      duckMusic("video:tv");
      if (v.paused) v.play().catch(() => {});
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown",     unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown",     unlock);
    };
  }, []);

  // ── Thread setup — hide entirely on mount; draw-in fires via GSAP ───────────
  // Using SVG-level opacity (not just dashoffset) so both paths AND pin circles
  // stay invisible until the draw animation starts. This prevents red lines/dots
  // appearing as "stripes" in the collage before the animation triggers.
  useEffect(() => {
    const svg = threadSvgRef.current;
    if (!svg) return;
    // Hide the whole SVG — GSAP will reveal it when crossFadeP > 0.02
    gsap.set(svg, { opacity: 0 });
    // Set up stroke-dashoffset for path draw animation
    svg.querySelectorAll<SVGPathElement>("path").forEach(path => {
      const len = Math.ceil(path.getTotalLength()) || 3000;
      path.style.setProperty("stroke-dasharray",  String(len));
      path.style.setProperty("stroke-dashoffset", String(len));
    });
  }, []);

  // ── GSAP ScrollTrigger ────────────────────────────────────────────────────
  useEffect(() => {
    const section = sectionRef.current;
    const imgWrap = imgWrapRef.current;
    const track   = trackRef.current;
    if (!section || !imgWrap || !track) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: `+=${TOTAL_SCROLL}`,
        pin: true,
        scrub: 1.2,
        onEnter: () => {
          sectionActiveRef.current = true;
        },
        onLeave: () => {
          sectionActiveRef.current = false;
          tvVideoRef.current?.pause();
          restoreMusic("video:tv");
          const c2 = c2VideoRef.current;
          if (c2) {
            c2.pause();
            c2.muted = true;
            c2UnmutedRef.current = false;
            setC2Unmuted(false);
            restoreMusic("video:c2");
          }
        },
        onEnterBack: () => {
          sectionActiveRef.current = true;
          tvVideoRef.current?.play().catch(() => {});
          if (tvUnlockedRef.current) duckMusic("video:tv");
          // commercial2 resumes muted — user must click again for sound
          const c2 = c2VideoRef.current;
          if (c2) {
            c2.muted = true;
            c2.play().catch(() => {});
          }
        },
        onLeaveBack: () => {
          sectionActiveRef.current = false;
        },
        onUpdate: (self) => {
          const p    = self.progress;
          const vwPx = window.innerWidth / 100;

          // Entry cream overlay
          if (entryOverlayRef.current) {
            entryOverlayRef.current.style.opacity = String(1 - clamp01(p / ENTRY_FADE_END));
          }

          // Blur + brightness dissolve (tunnel-exit warmth)
          const deblurP = clamp01(p / DEBLUR_END);
          imgWrap.style.filter = [
            `blur(${MAX_BLUR_PX * (1 - deblurP)}px)`,
            `brightness(${MAX_BRIGHT - (MAX_BRIGHT - 1) * deblurP})`,
          ].join(" ");

          // Zoom-out
          const zoomP      = clamp01((p - ZOOM_START) / (ZOOM_END      - ZOOM_START));
          const crossFadeP = clamp01((p - ZOOM_END)   / (CROSSFADE_END - ZOOM_END));

          gsap.set(imgWrap, {
            scale:    1 - zoomP * (1 - TARGET_SCALE),
            xPercent: zoomP * TARGET_X_PERCENT,
            yPercent: zoomP * TARGET_Y_PERCENT,
            opacity:  1 - crossFadeP,
          });

          if (titleRef.current) {
            titleRef.current.style.opacity = String(1 - zoomP);
          }

          // Horizontal scroll
          const hP       = clamp01((p - ZOOM_END) / (1 - ZOOM_END));
          const travelPx = track.scrollWidth - window.innerWidth;

          gsap.set(track, { x: -(hP * travelPx), opacity: crossFadeP });

          // Thread draw — fires once when collage fades in.
          // Fades the whole SVG to opacity:1 first (reveals pins + paths),
          // then strokes each path in with stagger.
          if (!threadAnimated.current && crossFadeP > 0.02) {
            threadAnimated.current = true;
            const svg = threadSvgRef.current;
            if (svg) {
              gsap.to(svg, { opacity: 1, duration: 0.4, ease: "none" });
              const paths = Array.from(svg.querySelectorAll<SVGPathElement>("path"));
              gsap.to(paths, {
                strokeDashoffset: 0,
                duration: 1.4,
                stagger: 0.07,
                ease: "power2.inOut",
                delay: 0.1,
              });
            }
          }

          // Per-element parallax
          const par = (r: { current: HTMLDivElement | null }, key: string) => {
            if (!r.current) return;
            gsap.set(r.current, {
              x: hP * CFG[key].speed * PARALLAX_SCALE * vwPx,
              y: hP * CFG[key].drift,
            });
          };

          par(r_happy10L, "happy10L");
          par(r_happy10R, "happy10R");
          par(r_happy12,  "happy12");
          par(r_happy8,   "happy8");
          par(r_happy11,  "happy11");
          par(r_happy6,   "happy6");
          par(r_happy7,   "happy7");
          par(r_happy3,   "happy3");
          par(r_happy5,   "happy5");
          par(r_c2,       "c2");
          par(r_note1,    "note1");
          par(r_happy1,   "happy1");
          par(r_happy2,   "happy2");
          par(r_note2,    "note2");
          par(r_tvWrap,   "tv");

          // Pause commercial2 when horizontally scrolled off-screen left
          const c2 = c2VideoRef.current;
          if (c2) {
            const c2ScreenX = 501 - hP * travelPx;
            if (c2ScreenX < -600 && !c2.paused) {
              c2.pause();
              c2.muted = true;
              c2UnmutedRef.current = false;
              setC2Unmuted(false);
              restoreMusic("video:c2");
            } else if (c2ScreenX >= -600 && c2.paused && crossFadeP > 0.1) {
              // Resume muted when scrolled back into view
              c2.play().catch(() => {});
            }
          }
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  const courier = "var(--font-courier-prime, 'Courier Prime', 'Courier New', monospace)";

  // Sound toggle handler for commercial2
  const handleC2SoundToggle = () => {
    const v = c2VideoRef.current;
    if (!v) return;
    const newUnmuted = !c2UnmutedRef.current;
    c2UnmutedRef.current = newUnmuted;
    setC2Unmuted(newUnmuted);
    v.muted = !newUnmuted;
    if (newUnmuted) {
      v.volume = 0.6;
      duckMusic("video:c2");
    } else {
      restoreMusic("video:c2");
    }
  };

  return (
    <section
      ref={sectionRef}
      aria-label="S04 The Perfect Decade"
      className="relative h-screen w-full overflow-hidden"
      style={{ background: "#0d0d0d" }}
    >

      {/* ══════════════════════════════════════════════════════════════════════
          TRACK — 2800 px horizontal canvas (Figma node 801-709)
          ══════════════════════════════════════════════════════════════════════ */}
      <div
        ref={trackRef}
        style={{
          position: "absolute", top: 0, left: 0,
          height: "100%", width: TRACK_WIDTH,
          willChange: "transform", opacity: 0, zIndex: 0,
        }}
      >

        {/* ════ BANNER + TITLE (z:1, z:3) ════ */}

        {/* happy.png — decorative banner texture */}
        {/* Figma: left 51, top 93 (8.61%), w 733, h 159 */}
        <div
          aria-hidden="true"
          style={{ position: "absolute", left: "51px", top: "8.61%", zIndex: 2, pointerEvents: "none" }}
        >
          <Image
            src="/assets/happy/happy.png" alt="" aria-hidden="true"
            width={733} height={159}
            style={{ width: "733px", height: "auto", display: "block" }}
          />
        </div>

        {/* "The Perfect Decade" — Cormorant SemiBold 80 px */}
        {/* Figma: left 124, top 120 (11.11%), color #414141 */}
        <div style={{ position: "absolute", left: "124px", top: "11.11%", zIndex: 3, pointerEvents: "none" }}>
          <h2
            className="font-cormorant"
            style={{
              fontSize: "80px", fontWeight: 600,
              lineHeight: 1.32, letterSpacing: "-0.02em",
              color: "#414141", whiteSpace: "nowrap", margin: 0,
            }}
          >
            The Perfect Decade
          </h2>
        </div>

        {/* ════ RED THREAD (z:2) ════ */}
        {/* Sits at z:2 — above banner/bg color, BELOW all photos and cards.
            Paths draw in via stroke-dashoffset animation when collage fades in. */}
        <svg
          ref={threadSvgRef}
          aria-hidden="true"
          viewBox="0 0 2800 1080"
          preserveAspectRatio="none"
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            zIndex: 1, pointerEvents: "none",
            opacity: 0, // hidden until GSAP draw animation fires
          }}
        >
          <g
            stroke="#b71c1c" strokeWidth="1.5" fill="none"
            opacity="0.82" strokeLinecap="round" strokeLinejoin="round"
          >
            {/* Main horizontal spine: title area → happy6 → happy7 → TV */}
            <path d="M 360,130 C 520,155 680,215 800,265 C 900,305 980,285 1100,275 C 1250,263 1380,255 1510,250 C 1650,244 1790,238 1960,222" />
            {/* Title area → happy1 polaroid */}
            <path d="M 360,130 L 680,348" />
            {/* happy1 → happy6 (upper connection) */}
            <path d="M 680,348 L 870,200 L 982,168" />
            {/* happy1 → commercial2 (down) */}
            <path d="M 680,348 L 702,829" />
            {/* Left anchor down to happy8 */}
            <path d="M 190,272 L 210,568" />
            {/* happy6 → happy7 mid-spine join */}
            <path d="M 982,168 L 1100,275 L 1395,262" />
            {/* happy7 → commercial TV */}
            <path d="M 1395,262 L 1960,222" />
            {/* happy7 → happy11 (down-left) */}
            <path d="M 1100,275 L 1196,622" />
            {/* happy7 → happy3 note (right) */}
            <path d="M 1395,262 L 1692,356" />
            {/* happy3 note → commercial TV (triangle) */}
            <path d="M 1692,356 L 1960,222" />
            {/* happy3 note → happy2 polaroid (down) */}
            <path d="M 1692,356 L 1592,812" />
            {/* happy2 → happy5 (right) */}
            <path d="M 1592,812 L 1998,752" />
            {/* happy5 → far-right */}
            <path d="M 1998,752 L 2262,558" />
          </g>
          {/* Pin marks at junction points */}
          <g fill="#b71c1c" stroke="none">
            <circle cx="360"  cy="130" r="4.5" />
            <circle cx="680"  cy="348" r="4"   />
            <circle cx="982"  cy="168" r="4.5" />
            <circle cx="702"  cy="829" r="4.5" />
            <circle cx="210"  cy="568" r="4.5" />
            <circle cx="1100" cy="275" r="4"   />
            <circle cx="1395" cy="262" r="4"   />
            <circle cx="1960" cy="222" r="4.5" />
            <circle cx="1196" cy="622" r="4.5" />
            <circle cx="1692" cy="356" r="4.5" />
            <circle cx="1592" cy="812" r="4"   />
            <circle cx="1998" cy="752" r="4.5" />
            <circle cx="2262" cy="558" r="4.5" />
          </g>
        </svg>

        {/* ════ BACKGROUND PHOTOS (z:3-5) ════ */}

        {/* happy11 — center portrait, z:3 (per design requirement) */}
        {/* Figma: left 1012, top 428 (39.63%), w 369, h 492 */}
        <div
          ref={r_happy11}
          style={{
            position: "absolute", left: "1012px", top: "39.63%",
            zIndex: CFG.happy11.z, willChange: "transform",
          }}
        >
          <Image
            src="/assets/happy/happy11.png" alt="" aria-hidden="true"
            width={369} height={492}
            style={{ width: "369px", height: "auto", display: "block" }}
          />
        </div>

        {/* happy10 left — wide landscape, far background */}
        {/* Figma: left 74, top 275 (25.46%), w 522 */}
        <div
          ref={r_happy10L}
          style={{
            position: "absolute", left: "74px", top: "25.46%",
            zIndex: CFG.happy10L.z, willChange: "transform",
          }}
        >
          <Image
            src="/assets/happy/happy10.png" alt="" aria-hidden="true"
            width={522} height={391}
            style={{ width: "522px", height: "auto", display: "block" }}
          />
        </div>

        {/* happy10 right — far-right landscape */}
        {/* Figma: left 2252, top 170 (15.74%), w 522 */}
        <div
          ref={r_happy10R}
          style={{
            position: "absolute", left: "2252px", top: "15.74%",
            zIndex: CFG.happy10R.z, willChange: "transform",
          }}
        >
          <Image
            src="/assets/happy/happy10.png" alt="" aria-hidden="true"
            width={522} height={391}
            style={{ width: "522px", height: "auto", display: "block" }}
          />
        </div>

        {/* happy12 — far-right lower */}
        {/* Figma: left 2252, top 561 (51.94%), w 394 */}
        <div
          ref={r_happy12}
          style={{
            position: "absolute", left: "2252px", top: "51.94%",
            zIndex: CFG.happy12.z, willChange: "transform",
          }}
        >
          <Image
            src="/assets/happy/happy12.png" alt="" aria-hidden="true"
            width={394} height={502}
            style={{ width: "394px", height: "auto", display: "block" }}
          />
        </div>

        {/* happy8 — tall portrait, overflow-clipped */}
        {/* Figma: left 134, top 596 (55.19%), w 367, h 431, overflow hidden */}
        <div
          ref={r_happy8}
          style={{
            position: "absolute", left: "134px", top: "55.19%",
            width: "367px", height: "431px",
            overflow: "hidden", zIndex: CFG.happy8.z, willChange: "transform",
          }}
        >
          <Image
            src="/assets/happy/happy8.png" alt="" aria-hidden="true"
            width={367} height={550}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>

        {/* ════ FOREGROUND IMAGES (z:6) ════ */}

        {/* happy6 — rounded portrait */}
        {/* Figma: left 799, top 73 (6.76%), w 366, h 455, rounded 34 px */}
        <div
          ref={r_happy6}
          style={{
            position: "absolute", left: "799px", top: "6.76%",
            width: "366px", height: "455px",
            borderRadius: "34px", overflow: "hidden",
            zIndex: CFG.happy6.z, willChange: "transform",
          }}
        >
          <Image
            src="/assets/happy/happy6.png" alt="" aria-hidden="true"
            fill sizes="366px" style={{ objectFit: "cover" }}
          />
        </div>

        {/* happy7 — portrait, slight CW tilt, no border */}
        {/* Figma: flex outer left 1211, top 61 (5.65%), w 402.576, h 543.95 (50.37%) */}
        {/* Inner: rotate +5.96°, content 351 × 510, rounded 6.8 px */}
        <div
          style={{
            position: "absolute", left: "1211px", top: "5.65%",
            width: "402.576px", height: "50.37%",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: CFG.happy7.z,
          }}
        >
          <div ref={r_happy7} style={{ flexShrink: 0, willChange: "transform" }}>
            <div style={{ transform: "rotate(5.96deg)", transformOrigin: "center" }}>
              <div style={{
                width: "351px", height: "510px",
                overflow: "hidden", borderRadius: "6.8px", position: "relative",
              }}>
                <Image
                  src="/assets/happy/happy7.png" alt="" aria-hidden="true"
                  fill sizes="351px" style={{ objectFit: "cover" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* happy3 + labels — note card with annotations, scaled to 80% (z:17) */}
        {/* Figma outer: left 1475, top 28.54%, w 447.559, h 31.11%.            */}
        {/* Content: 397 × 230 rotated -16.98° then uniformly scaled 0.8.       */}
        {/* Labels in card-local coords (un-rotated from the -16.98° tilt).     */}
        <div
          style={{
            position: "absolute", left: "1475px", top: "28.54%",
            width: "447.559px", height: "31.11%",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: CFG.happy3.z,
          }}
        >
          <div ref={r_happy3} style={{ flexShrink: 0, willChange: "transform" }}>
            <div style={{
              transform: "scale(0.8) rotate(-16.98deg)", transformOrigin: "center",
              position: "relative",
            }}>
              {/* Note card image — layout 397 × 230 */}
              <div style={{ width: "397px", height: "230px", overflow: "hidden", position: "relative" }}>
                <Image
                  src="/assets/happy/happy3.png" alt="" aria-hidden="true"
                  fill sizes="397px" style={{ objectFit: "cover", objectPosition: "center top" }}
                />
              </div>
              {/* Labels in card-local coords (0–397 × 0–230).                          */}
              {/* Effective rotation = global -18.24° − card -16.98° = -1.26° relative. */}
              <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                {/* "America" — card-local center (233, 51), container 95 × 56 */}
                <div style={{
                  position: "absolute", left: "186px", top: "23px",
                  width: "95px", height: "56px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <p style={{
                    transform: "rotate(-1.26deg)", transformOrigin: "center",
                    fontFamily: courier, fontSize: "22px",
                    letterSpacing: "-0.02em", color: "#414141",
                    margin: 0, whiteSpace: "nowrap",
                  }}>America</p>
                </div>
                {/* "Famous Commercial" — card-local center (252, 122), container 216 × 96 */}
                <div style={{
                  position: "absolute", left: "144px", top: "74px",
                  width: "216px", height: "96px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <p style={{
                    transform: "rotate(-1.26deg)", transformOrigin: "center",
                    fontFamily: courier, fontSize: "22px",
                    letterSpacing: "-0.02em", color: "#414141",
                    margin: 0, whiteSpace: "nowrap",
                  }}>Famous Commercial</p>
                </div>
                {/* "1953" — card-local center (161, 88), container 58 × 44 */}
                <div style={{
                  position: "absolute", left: "132px", top: "66px",
                  width: "58px", height: "44px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <p style={{
                    transform: "rotate(-1.26deg)", transformOrigin: "center",
                    fontFamily: courier, fontSize: "22px",
                    letterSpacing: "-0.02em", color: "#414141",
                    margin: 0, whiteSpace: "nowrap",
                  }}>1953</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* happy5 — portrait, slight CCW tilt */}
        {/* Figma: flex outer left 1830, top 532 (49.26%), w 394, h 499 (46.23%) */}
        {/* Inner: rotate -5.24°, content 353 × 469 */}
        <div
          style={{
            position: "absolute", left: "1830px", top: "49.26%",
            width: "394.321px", height: "46.23%",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: CFG.happy5.z,
          }}
        >
          <div ref={r_happy5} style={{ flexShrink: 0, willChange: "transform" }}>
            <div style={{ transform: "rotate(-5.24deg)", transformOrigin: "center" }}>
              <Image
                src="/assets/happy/happy5.png" alt="" aria-hidden="true"
                width={353} height={469}
                style={{ width: "353px", height: "auto", display: "block" }}
              />
            </div>
          </div>
        </div>

        {/* ════ COMMERCIAL 2 — autoplay muted, click for sound (z:8) ════ */}
        {/* Figma: flex outer left 501, top 689 (63.80%), w 512.452, h 307.786 (28.50%) */}
        {/* Inner: rotate -3.29°, video 497 × 280                                       */}
        {/* Behavior: loops silently by default. Click sound icon to toggle audio.       */}
        <div
          style={{
            position: "absolute", left: "501px", top: "63.80%",
            width: "512.452px", height: "28.50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: CFG.c2.z,
          }}
        >
          <div ref={r_c2} style={{ flexShrink: 0, willChange: "transform" }}>
            <div style={{ position: "relative", transform: "rotate(-3.29deg)", transformOrigin: "center" }}>
              <video
                ref={c2VideoRef}
                src="/assets/happy/commercial2.mp4"
                autoPlay playsInline muted loop
                style={{ width: "497px", height: "280px", objectFit: "cover", display: "block" }}
              />
              {/* Sound toggle — small icon button in corner */}
              <button
                aria-label={c2Unmuted ? "Mute video" : "Unmute video"}
                onClick={handleC2SoundToggle}
                style={{
                  position: "absolute", bottom: "10px", right: "10px",
                  width: "36px", height: "36px", borderRadius: "50%",
                  background: "rgba(0, 0, 0, 0.55)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {c2Unmuted ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ════ HAPPY1 POLAROID (z:9) ════ */}
        {/* Figma: flex outer left 614.7, top 343.59 (31.81%), w 338, h 302 (27.99%) */}
        {/* Inner: rotate -14.25°, content 288 × 239 */}
        <div
          style={{
            position: "absolute", left: "614.7px", top: "31.81%",
            width: "338.126px", height: "27.99%",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: CFG.happy1.z,
          }}
        >
          <div ref={r_happy1} style={{ flexShrink: 0, willChange: "transform" }}>
            <div style={{ transform: "rotate(-14.25deg)", transformOrigin: "center" }}>
              <Image
                src="/assets/happy/happy1.png" alt="" aria-hidden="true"
                width={288} height={239}
                style={{ width: "288px", height: "auto", display: "block" }}
              />
            </div>
          </div>
        </div>

        {/* ════ TYPEWRITER NOTE 1 (z:10, above happy1 at z:9) ════ */}
        {/* Figma: flex outer left 665, top 412 (38.15%), w 238.751, h 170.335 (15.77%) */}
        {/* Cream paper card with dark ink — feels printed on paper.                      */}
        {/* Rotates at -15.83° matching the collage tilt. z:10 sits on top of polaroid.   */}
        <div
          style={{
            position: "absolute", left: "665px", top: "38.15%",
            width: "238.751px", height: "15.77%",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: CFG.note1.z, pointerEvents: "none",
          }}
        >
          <div ref={r_note1} style={{ willChange: "transform" }}>
            <p style={{
              transform: "rotate(-15.83deg)", transformOrigin: "center",
              fontFamily: courier, fontSize: "22px",
              lineHeight: 1.32, letterSpacing: "-0.02em",
              color: "#414141",
              margin: 0, width: "215px",
            }}>
              The 1950s looked like a dream polished to perfection.
            </p>
          </div>
        </div>

        {/* ════ HAPPY2 POLAROID (z:10) ════ */}
        {/* Figma: flex outer left 1381, top 666 (61.67%), w 426, h 396 (36.71%) */}
        {/* Inner: rotate +24.08°, content 340 × 282 */}
        <div
          style={{
            position: "absolute", left: "1381px", top: "61.67%",
            width: "426px", height: "36.71%",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: CFG.happy2.z,
          }}
        >
          <div ref={r_happy2} style={{ flexShrink: 0, willChange: "transform" }}>
            <div style={{ transform: "rotate(24.08deg)", transformOrigin: "center" }}>
              <Image
                src="/assets/happy/happy2.png" alt="" aria-hidden="true"
                width={340} height={282}
                style={{ width: "340px", height: "auto", display: "block" }}
              />
            </div>
          </div>
        </div>

        {/* ════ TYPEWRITER NOTE 2 (z:11, above happy2 at z:10) ════ */}
        {/* Figma: flex outer left 1451.75, top 756 (70%), w 288.771, h 231.518 (21.44%) */}
        {/* Same cream-card treatment as note 1. Rotates +22.83°.                          */}
        <div
          style={{
            position: "absolute", left: "1451px", top: "70%",
            width: "288.771px", height: "21.44%",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: CFG.note2.z, pointerEvents: "none",
          }}
        >
          <div ref={r_note2} style={{ willChange: "transform" }}>
            <p style={{
              transform: "rotate(22.83deg)", transformOrigin: "center",
              fontFamily: courier, fontSize: "22px",
              lineHeight: 1.32, letterSpacing: "-0.02em",
              color: "#414141",
              margin: 0, width: "252px",
            }}>
              Everything felt clean, sweet, and beautifully arranged — a world built from smiles,
            </p>
          </div>
        </div>

        {/* ════ COMMERCIAL TV — autoplay (z:16) ════ */}
        {/* Figma: flex outer left 1675, top 28 (2.59%), w 577.41, h 460.229 (42.61%) */}
        {/* Inner: rotate +6.71°, content 534 × 401 */}
        <div
          style={{
            position: "absolute", left: "1675px", top: "2.59%",
            width: "577.41px", height: "42.61%",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: CFG.tv.z,
          }}
        >
          <div ref={r_tvWrap} style={{ flexShrink: 0, willChange: "transform" }}>
            <div style={{ transform: "rotate(6.71deg)", transformOrigin: "center" }}>
              <video
                ref={tvVideoRef}
                src="/assets/happy/commercial.mp4"
                autoPlay muted loop playsInline
                style={{ width: "534px", height: "401px", objectFit: "cover", display: "block" }}
              />
            </div>
          </div>
        </div>

      </div>
      {/* ═══════════════════════════════════════════════ end track ═══════════ */}

      {/* ── Zoom-out entry image ─────────────────────────────────────────────── */}
      <div
        ref={imgWrapRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 10,
          filter: `blur(${MAX_BLUR_PX}px) brightness(${MAX_BRIGHT})`,
        }}
      >
        <Image
          src="/assets/happy/happy10.png" alt="The Perfect Decade"
          fill sizes="100vw" className="object-cover" priority
        />
      </div>

      {/* ── Section title overlay — fades as zoom-out begins ─────────────────── */}
      <div ref={titleRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
        <SectionOverlayTitle>The Perfect Decade</SectionOverlayTitle>
      </div>

      {/* ── Film grain ─────────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 200, opacity: 0.22, mixBlendMode: "soft-light",
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "160px 160px",
        }}
      />

      {/* ── Vignette ─────────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 201,
          background: "radial-gradient(ellipse 90% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* ── Entry overlay — warm cream matching tunnel exit ───────────────────── */}
      <div
        ref={entryOverlayRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ zIndex: 300, background: "#FCF1DA", opacity: 1 }}
      />
    </section>
  );
}
