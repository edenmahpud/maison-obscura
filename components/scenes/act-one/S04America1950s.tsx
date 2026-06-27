"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SectionOverlayTitle } from "@/components/effects/SectionOverlayTitle";

gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────────────────────────────────────
// COMBINED SECTION — S04 zoom-out flows directly into S05 horizontal collage
// inside a single 9500 px pinned section.
//
// CANVAS: 2800 × 1080  (TRACK_WIDTH × Figma frame height, scaled to 100 vh)
// Positions match the Figma reference frame (node 585-172).
// Z-order matches Figma DOM order, back → front.
// ─────────────────────────────────────────────────────────────────────────────

const TOTAL_SCROLL = 9500;

// ── ENTRY TRANSITION ──────────────────────────────────────────────────────────
// Warm overlay matching the tunnel's exit overlay (#FCF1DA). Starts at opacity 1
// and fades out in the first ENTRY_FADE_END fraction of S04 scroll, bridging
// the section boundary so there is no visible gap or hard cut.
const ENTRY_FADE_END = 0.03; // fully transparent by 3 % of S04 scroll (~285 px)

// ── ZOOM-OUT PHASE ────────────────────────────────────────────────────────────
const MAX_BLUR_PX   = 20;
const MAX_BRIGHT    = 5;      // tunnel-exit brightness spike
// How quickly the image clears from the bright/blurred entry state.
// 0.05 = image is sharp by 5 % of the scroll = ~475 px.
// Raise to 0.10–0.15 for a slower dissolve; lower for a snappier reveal.
const DEBLUR_END    = 0.05;
const ZOOM_START    = 0.24;
const ZOOM_END      = 0.45;
const CROSSFADE_END = 0.52;   // big image fully gone; track fully visible
const TARGET_SCALE      = 0.28;
const TARGET_X_PERCENT  = -22;   // upper-left landing aligns with happy10
const TARGET_Y_PERCENT  = -16;

// ── HORIZONTAL SCROLL ─────────────────────────────────────────────────────────
const TRACK_WIDTH    = "2800px";
const PARALLAX_SCALE = 0.55;  // global parallax strength — raise for more depth

// ── IMAGE SIZE ────────────────────────────────────────────────────────────────
// Adjust IMG_SCALE to resize ALL collage images at once.
// 1.0 = Figma spec  |  0.88 = 12 % smaller (current)
// Individual sizes: edit wBase on each entry in ASSETS below.
const IMG_SCALE = 0.88;

// ── TV SOUND DEBUG ────────────────────────────────────────────────────────────
const DEBUG_TV_SOUND = true;
function logTV(...args: unknown[]) {
  if (DEBUG_TV_SOUND) console.log("[TV]", ...args);
}

// ── CARD TEXT ────────────────────────────────────────────────────────────────
const CARD_BODY =
  "The 1950s looked like a dream polished to perfection. Pastel kitchens, shining cars, glowing diners, elegant dresses, and television screens that promised a brighter future. Everything felt clean, sweet, and beautifully arranged — a world built from smiles, chrome, soft colors, and the idea that life was finally becoming perfect.";

// ═══════════════════════════════════════════════════════════════════════════════
// ASSET MAP
// ─────────────────────────────────────────────────────────────────────────────
// left / top   — absolute position within the 2800 px canvas (Figma origin)
// wBase        — Figma spec width in px; rendered as Math.round(wBase * IMG_SCALE)
//                To resize one image individually, change its wBase value.
// rotate       — tilt in degrees (from Figma CSS)
// z            — CSS z-index, back → front (matches Figma DOM order)
// parallax     — lateral offset per vw during horizontal scroll
//                + = lags behind (background feel)   – = leads (foreground feel)
// vDrift       — max vertical drift in px at end of scroll
// opacity      — optional base opacity (omit = 1.0)
// ═══════════════════════════════════════════════════════════════════════════════
type Asset = {
  id: string;
  src: string;
  left: string;
  top: string;
  wBase: number;  // Figma spec width; final width = Math.round(wBase * IMG_SCALE)
  rotate: number;
  z: number;
  parallax: number;
  vDrift: number;
  opacity?: number;
};

const ASSETS: Asset[] = [
  // z:1 — back
  { id: "happy9",  src: "/assets/happy/happy9.png",  left: "493px",  top: "49.1%", wBase: 282, rotate: 0,      z: 1,  parallax: 4,  vDrift: 2  },
  // z:2 — faded overlay
  { id: "happy6",  src: "/assets/happy/happy6.png",  left: "1476px", top: "3.1%",  wBase: 366, rotate: 0,      z: 2,  parallax: 6,  vDrift: 3,  opacity: 0.6 },
  // z:3
  { id: "happy4",  src: "/assets/happy/happy4.png",  left: "219px",  top: "68.7%", wBase: 236, rotate: 4.93,   z: 3,  parallax: -4, vDrift: -2 },
  // z:4
  { id: "happy7",  src: "/assets/happy/happy7.png",  left: "1588px", top: "37.1%", wBase: 403, rotate: 5.96,   z: 4,  parallax: 5,  vDrift: 2  },
  // z:5
  { id: "happy1",  src: "/assets/happy/happy1.png",  left: "1842px", top: "10.2%", wBase: 316, rotate: -16.98, z: 5,  parallax: 6,  vDrift: 3  },
  // z:6 — large kitchen; zoom-out landing target
  { id: "happy10", src: "/assets/happy/happy10.png", left: "256px",  top: "7.3%",  wBase: 522, rotate: 0,      z: 6,  parallax: -3, vDrift: -2 },
  // z:7
  { id: "happy11", src: "/assets/happy/happy11.png", left: "1119px", top: "48.6%", wBase: 369, rotate: 0,      z: 7,  parallax: 4,  vDrift: 2  },
  // z:8
  { id: "happy5",  src: "/assets/happy/happy5.png",  left: "1895px", top: "46.7%", wBase: 394, rotate: -5.24,  z: 8,  parallax: 6,  vDrift: 3  },
  // z:9
  { id: "happy12", src: "/assets/happy/happy12.png", left: "2264px", top: "46.9%", wBase: 408, rotate: 0,      z: 9,  parallax: 7,  vDrift: 3  },
  // z:10 — star note
  { id: "happy",   src: "/assets/happy/happy.png",   left: "1412px", top: "69.8%", wBase: 324, rotate: 24.08,  z: 10, parallax: 5,  vDrift: 2  },
  // z:13 — above card (z:11)
  { id: "happy2",  src: "/assets/happy/happy2.png",  left: "703px",  top: "46.6%", wBase: 301, rotate: -13.28, z: 13, parallax: 3,  vDrift: 2  },
  // z:14
  { id: "happy8",  src: "/assets/happy/happy8.png",  left: "-1px",   top: "17.3%", wBase: 367, rotate: 0,      z: 14, parallax: -5, vDrift: -3 },
  // z:15
  { id: "happy3",  src: "/assets/happy/happy3.png",  left: "20px",   top: "53.8%", wBase: 272, rotate: 0,      z: 15, parallax: -4, vDrift: -2 },
];

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

export function S04America1950s() {
  const sectionRef      = useRef<HTMLElement | null>(null);
  const entryOverlayRef = useRef<HTMLDivElement | null>(null);
  const imgWrapRef      = useRef<HTMLDivElement | null>(null);
  const titleRef        = useRef<HTMLDivElement | null>(null);
  const trackRef      = useRef<HTMLDivElement | null>(null);
  const cardRef       = useRef<HTMLDivElement | null>(null);
  const tvRef         = useRef<HTMLDivElement | null>(null);
  const tvVideoRef    = useRef<HTMLVideoElement | null>(null);
  const tvUnlockedRef = useRef(false);
  const assetRefs     = useRef<(HTMLDivElement | null)[]>(
    new Array(ASSETS.length).fill(null)
  );

  // ── TV sound unlock ────────────────────────────────────────────────────────
  useEffect(() => {
    const unlock = () => {
      if (tvUnlockedRef.current) return;
      const vid = tvVideoRef.current;
      if (!vid) { logTV("unlock: no video element yet"); return; }
      tvUnlockedRef.current = true;
      logTV(
        "unlock triggered — muted:", vid.muted,
        "paused:", vid.paused,
        "volume:", vid.volume,
      );
      vid.muted = false;
      vid.volume = 0.6;
      logTV("set muted=false, volume=0.6 ✓");
      if (vid.paused) {
        vid.play()
          .then(() => logTV("play() succeeded ✓"))
          .catch((e) => logTV("play() failed:", e));
      }
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // ── GSAP ScrollTrigger ─────────────────────────────────────────────────────
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
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p    = self.progress;
          const vwPx = window.innerWidth / 100;

          // ── Entry overlay — fades from opaque warm cream to transparent ────
          if (entryOverlayRef.current) {
            entryOverlayRef.current.style.opacity = String(1 - clamp01(p / ENTRY_FADE_END));
          }

          // ── Blur + brightness — tunnel-exit light dissolves ────────────────
          const deblurP = clamp01(p / DEBLUR_END);
          imgWrap.style.filter = [
            `blur(${MAX_BLUR_PX * (1 - deblurP)}px)`,
            `brightness(${MAX_BRIGHT - (MAX_BRIGHT - 1) * deblurP})`,
          ].join(" ");

          // ── Zoom-out ──────────────────────────────────────────────────────
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

          // ── Horizontal scroll ─────────────────────────────────────────────
          // Track is invisible during zoom; fades in only as big image fades.
          // This avoids z-stacking context overlap during the zoom phase.
          const hP       = clamp01((p - ZOOM_END) / (1 - ZOOM_END));
          const travelPx = track.scrollWidth - window.innerWidth;

          gsap.set(track, { x: -(hP * travelPx), opacity: crossFadeP });

          // ── Per-asset parallax ─────────────────────────────────────────────
          // Adjust PARALLAX_SCALE to change global depth.
          // Adjust each asset's .parallax and .vDrift for individual depth.
          ASSETS.forEach((asset, i) => {
            const el = assetRefs.current[i];
            if (!el) return;
            gsap.set(el, {
              x: hP * asset.parallax * PARALLAX_SCALE * vwPx,
              y: hP * asset.vDrift,
            });
          });

          // Card parallax
          if (cardRef.current) {
            gsap.set(cardRef.current, {
              x: hP * 6 * PARALLAX_SCALE * vwPx,
              y: hP * 2,
            });
          }

          // TV parallax
          if (tvRef.current) {
            gsap.set(tvRef.current, {
              x: hP * 3 * PARALLAX_SCALE * vwPx,
              y: hP * 2,
            });
          }
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="S04–S05 The Perfect Decade"
      className="relative h-screen w-full overflow-hidden"
      style={{ background: "#050505" }}
    >
      {/* ── Horizontal collage track (2800 px canvas) ─────────────────────── */}
      {/* Invisible during zoom-out; appears as big image crossfades away.    */}
      <div
        ref={trackRef}
        style={{
          position: "absolute",
          top: 0, left: 0,
          height: "100%",
          width: TRACK_WIDTH,
          willChange: "transform",
          opacity: 0,
          zIndex: 0,
        }}
      >
        {/* ── Collage images — z-order matches Figma DOM (back → front) ──── */}
        {/* Outer div: position + rotation. Inner div: parallax x/y via GSAP. */}
        {/* Change wBase on each entry to resize that image individually.      */}
        {/* Change IMG_SCALE at top of file to resize all images at once.      */}
        {ASSETS.map((asset, i) => {
          const w = `${Math.round(asset.wBase * IMG_SCALE)}px`;
          return (
            <div
              key={asset.id}
              style={{
                position: "absolute",
                left: asset.left,
                top: asset.top,
                zIndex: asset.z,
                transform: `rotate(${asset.rotate}deg)`,
                transformOrigin: "center center",
                opacity: asset.opacity ?? 1,
              }}
            >
              <div
                ref={(el) => { assetRefs.current[i] = el; }}
                style={{ willChange: "transform" }}
              >
                <Image
                  src={asset.src}
                  alt="" aria-hidden="true"
                  width={1200} height={900}
                  sizes={w}
                  style={{ width: w, height: "auto", display: "block" }}
                />
              </div>
            </div>
          );
        })}

        {/* ── Card: happy13 notebook + text overlay — z:11 ─────────────────── */}
        {/* Position: left 716 px, top 8.6 %, width 828 px, rotate –6.9°       */}
        {/* Card is NOT scaled by IMG_SCALE — text must remain fully readable.  */}
        {/*
         * ── CARD SIZE & ANGLE ─────────────────────────────────────────────────
         * Paper size   → change `width` on the outer div AND the Image style below.
         *                Both must match. Current: 700 px (~15% smaller than Figma).
         * Paper angle  → change `transform: rotate(...)` on the outer div.
         *                Current: –4°. Negative = tilts top-left. Range –8° → +8°.
         * Text inside  → the inner overlay div uses % of card width/height, so it
         *                scales automatically when you change the card width here.
         *                Fine-tune padding with left/top/width/height in the overlay
         *                div further below (marked "TEXT SAFE AREA").
         * ─────────────────────────────────────────────────────────────────────
         */}
        <div
          style={{
            position: "absolute",
            left: "716px",
            top: "8.6%",
            width: "700px",   /* ← PAPER SIZE: change this + Image width below */
            zIndex: 11,
            transform: "rotate(-4deg)",  /* ← PAPER ANGLE: negative = tilts left */
            transformOrigin: "center center",
          }}
        >
          <div ref={cardRef} style={{ position: "relative", willChange: "transform" }}>
            <Image
              src="/assets/happy/happy13new.png"
              alt="" aria-hidden="true"
              width={700} height={495}
              style={{ width: "700px", height: "auto", display: "block" }}  /* ← must match outer div width */
            />
            {/*
             * ── TEXT SAFE AREA ────────────────────────────────────────────────
             *
             * The outer card div is already rotated –6.9°, so everything inside
             * (image + this overlay) shares the same tilted coordinate system.
             * No additional rotation is needed on the text itself.
             *
             * All positions are in % of the card image's rendered dimensions
             * (828 × ~585 px) so the safe area scales proportionally.
             *
             * TUNING GUIDE
             * ─────────────────────────────────────────────────────────────────
             * • Text angle      → outer card div's transform: rotate(–6.9deg)
             *                     (the line above the <div ref={cardRef}> block)
             * • Left padding    → left: "14%"  below
             * • Top padding     → top: "18%"   below
             * • Text column W   → width: "70%" below  (narrow to shorten lines)
             * • Text area H cap → height: "58%" below  (hard clip; raise if body
             *                     paragraph gets cut off after editing CARD_BODY)
             * • Heading size    → fontSize on the <h2> below
             * • Body size       → fontSize on the <p> below
             * • Body font       → fontFamily on the <p> below
             * • Body spacing    → lineHeight on the <p> below
             * ─────────────────────────────────────────────────────────────────
             */}
            <div
              style={{
                position: "absolute",
                left:   "14%",  /* ← left safe-area padding  */
                top:    "18%",  /* ← top safe-area padding   */
                width:  "70%",  /* ← column width            */
                height: "58%",  /* ← max height — hard clip  */
                overflow: "hidden",
                zIndex: 1,
              }}
            >
              {/* ── Heading — Cormorant Garamond Bold Italic ─────────────────
                  fontSize: clamp(min, viewport-scale, max)
                  At 1920 px viewport: 2.6 vw = ~50 px → fits on one line.
                  Change the vw value to scale with the viewport.              */}
              <h2
                className="font-cormorant italic"
                style={{
                  fontSize: "clamp(2.2rem, 2.6vw, 3.6rem)", /* ← heading size */
                  fontWeight: 700,
                  lineHeight: 1.05,
                  color: "#7c031c",
                  opacity: 0.8,
                  letterSpacing: "-0.01em",
                  marginBottom: "0.75rem",
                }}
              >
                The Perfect Decade
              </h2>

              {/* ── Body — Courier Prime Regular ─────────────────────────────
                  fontFamily: inline style forces highest CSS specificity so no
                  parent or Tailwind class can override it.
                  var(--font-courier-prime) is set on <html> by next/font
                  (courierPrime.variable in app/layout.tsx, weight 400 & 700).
                  To swap font: replace the var() with another --font-* var
                  or a literal font stack.                                      */}
              <p
                className="happy-paper-body"
                style={{
                  fontFamily: "var(--font-courier-prime)", /* ← Courier Prime  */
                  fontSize: "clamp(0.8rem, 0.85vw, 1.05rem)", /* ← body size  */
                  lineHeight: 1.35,                        /* ← body spacing   */
                  color: "#1f1712",                        /* ← typewriter ink */
                }}
              >
                {CARD_BODY}
              </p>
            </div>
          </div>
        </div>

        {/* ── Commercial video — z:16 (topmost) ───────────────────────────── */}
        {/* Position: left 2117 px, top 4.5 %, rotate +6.71°                  */}
        {/* Video width reduced by IMG_SCALE (534 px → ~470 px).               */}
        {/* Starts muted (browser autoplay policy); first gesture unmutes.     */}
        <div
          style={{
            position: "absolute",
            left: "2117px",
            top: "4.5%",
            zIndex: 16,
            transform: "rotate(6.71deg)",
            transformOrigin: "center center",
          }}
        >
          <div ref={tvRef} style={{ willChange: "transform" }}>
            <video
              ref={tvVideoRef}
              src="/assets/happy/commercial.mp4"
              autoPlay muted loop playsInline
              style={{
                width: `${Math.round(534 * IMG_SCALE)}px`,
                height: "auto",
                display: "block",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Big image — blurred/bright tunnel exit → zooms out → crossfades ─ */}
      <div
        ref={imgWrapRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 10,
          filter: `blur(${MAX_BLUR_PX}px) brightness(${MAX_BRIGHT})`,
        }}
      >
        <Image
          src="/assets/S04-1950s-america/the_perfect1.png"
          alt="The perfect America"
          fill sizes="100vw"
          className="object-cover"
        />
      </div>

      {/* ── Section title — fades as zoom begins ────────────────────────── */}
      <div
        ref={titleRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 20 }}
      >
        <SectionOverlayTitle>The Perfect Decade</SectionOverlayTitle>
      </div>

      {/* ── Film grain ────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 200,
          opacity: 0.22,
          mixBlendMode: "soft-light",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "160px 160px",
        }}
      />

      {/* ── Vignette ──────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 201,
          background:
            "radial-gradient(ellipse 90% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* ── Entry overlay — z:300, matches tunnel exit color for seamless handoff */}
      <div
        ref={entryOverlayRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ zIndex: 300, background: "#FCF1DA", opacity: 1 }}
      />
    </section>
  );
}
