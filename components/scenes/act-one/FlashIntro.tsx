"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────────────────────────────────────
// FLASH INTRO — Opening screen for Maison Obscura.
//
// ── TUNING GUIDE ─────────────────────────────────────────────────────────────
//
// SCROLL_HEIGHT   Total height of the scroll wrapper (sticky = 100vh inside).
//                 Animation travel = SCROLL_HEIGHT − 100vh.
//
// FLASH_SCALE     Peak scale of the flash burst at full scroll. 14–18 cinematic.
//
// WHITE_START /   Progress (0–1) when warm flash overlay begins / completes.
// WHITE_FULL      Overlay fills with #FCF1DA (warm photographic flash tone) before sliding off.
//
// MAX_RAYS_*      Mouse-parallax limits: px offset and ° rotation for rays.
// BLOOM_FOLLOW    Bloom follows at this fraction of the ray offset.
// LERP_SPEED      Mouse tracking speed (lower = softer / more delayed).
//
// RAYS            Each entry: [angle °, height px, width px, opacity, anim, dur s, delay s]
//                 Anim variant controls which organic CSS animation the ray uses.
//                 The rays do NOT spin — they breathe, flicker, and stretch organically.
// ─────────────────────────────────────────────────────────────────────────────

const SCROLL_HEIGHT      = "380vh";
const FLASH_SCALE        = 16;
const FLASH_PEAK         = 0.45;   // flash stops growing at this progress
const WHITE_START        = 0.38;   // warm overlay starts fading in
const WHITE_FULL         = 0.56;   // warm overlay fully opaque
const OVERLAY_FADE_START = 0.58;   // warm overlay starts fading out
const OVERLAY_FADE_END   = 0.90;   // warm overlay fully gone
const IMG_START          = 0.56;   // image starts fading in
const IMG_END            = 0.90;   // image fully settled (blur 0, opacity 1)
const IMG_BLUR_MAX       = 28;     // starting blur for image reveal
const IMG_SCALE_MAX      = 1.04;   // starting scale for image reveal
const MAX_RAYS_X         = 12;
const MAX_RAYS_Y         = 10;
const MAX_RAYS_ROT       = 3;
const BLOOM_FOLLOW       = 0.45;
const LERP_SPEED         = 0.055;

// [angle °, height px, width px, opacity, animVariant, duration s, delay s]
// Anim variants:
//   a — gentle grow: tip stretches out and returns (slow)
//   b — contract-then-grow: ray dims and shortens before expanding (medium)
//   c — micro-flicker: rapid subtle opacity flicker with tiny scale
//   d — irregular breath: two-phase length shift, asymmetric timing (medium-slow)
//   e — shimmer: longer period opacity + scale drift (slow)
type Ray = [number, number, number, number, string, number, number];

const RAYS: Ray[] = [
  // ── Primary arms — thick, bright, multiple overlapping rays create starburst ──
  // Near 0° (up)
  [  0, 380, 6, 0.88, "a", 3.2, 0.00],
  [  2, 330, 4, 0.62, "b", 2.8, 0.40],
  [ -2, 310, 4, 0.55, "d", 3.0, 1.20],
  [  4, 240, 3, 0.38, "e", 4.2, 0.80],
  // Near 90° (right)
  [ 90, 370, 6, 0.84, "b", 3.5, 0.90],
  [ 92, 320, 4, 0.58, "a", 3.1, 1.50],
  [ 88, 298, 4, 0.52, "d", 2.9, 0.30],
  // Near 180° (down)
  [180, 360, 6, 0.82, "a", 3.0, 1.80],
  [182, 310, 4, 0.56, "c", 2.6, 0.60],
  [178, 285, 4, 0.48, "e", 4.5, 1.10],
  // Near 270° (left)
  [270, 355, 6, 0.80, "b", 3.7, 0.40],
  [268, 302, 4, 0.54, "d", 3.2, 1.70],
  [272, 275, 3, 0.44, "a", 2.8, 0.70],

  // ── Secondary diagonal arms ──────────────────────────────────────────────────
  [ 45, 252, 4, 0.54, "b", 2.8, 1.20],
  [ 47, 210, 3, 0.38, "e", 4.1, 0.50],
  [135, 242, 4, 0.50, "a", 3.1, 0.60],
  [133, 200, 3, 0.36, "c", 2.5, 1.40],
  [225, 236, 4, 0.48, "d", 2.9, 0.20],
  [315, 248, 4, 0.52, "b", 3.3, 1.00],
  [317, 205, 3, 0.37, "e", 4.3, 0.30],

  // ── 22.5° interval mid-arms ──────────────────────────────────────────────────
  [ 22, 195, 3, 0.40, "c", 2.6, 0.40],
  [ 67, 185, 3, 0.38, "d", 2.7, 1.10],
  [112, 188, 3, 0.38, "a", 3.0, 0.80],
  [157, 180, 3, 0.36, "e", 4.0, 0.30],
  [202, 175, 3, 0.35, "b", 2.8, 1.60],
  [247, 178, 3, 0.36, "c", 2.9, 0.70],
  [292, 183, 3, 0.38, "d", 3.1, 1.40],
  [337, 190, 3, 0.40, "a", 2.7, 0.50],

  // ── Fine whiskers — thin, many, irregular spacing ────────────────────────────
  [ 11, 148, 2, 0.28, "e", 4.2, 0.90],
  [ 33, 138, 2, 0.26, "c", 3.8, 1.70],
  [ 56, 142, 2, 0.26, "d", 4.5, 0.30],
  [ 78, 132, 2, 0.25, "b", 2.6, 1.10],
  [101, 136, 2, 0.25, "e", 4.1, 0.60],
  [123, 144, 2, 0.27, "a", 3.4, 1.40],
  [146, 138, 2, 0.26, "c", 3.7, 0.20],
  [168, 130, 2, 0.25, "d", 4.0, 1.80],
  [191, 127, 2, 0.24, "e", 4.2, 0.70],
  [213, 134, 2, 0.25, "b", 2.7, 1.30],
  [236, 140, 2, 0.26, "c", 3.9, 0.40],
  [258, 130, 2, 0.25, "d", 3.8, 1.60],
  [281, 135, 2, 0.26, "a", 3.5, 0.90],
  [303, 142, 2, 0.27, "e", 4.3, 0.20],
  [326, 136, 2, 0.25, "c", 3.6, 1.50],
  [348, 148, 2, 0.28, "b", 2.8, 0.80],
];

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export function FlashIntro() {
  const wrapperRef    = useRef<HTMLElement | null>(null);
  const flashWrapRef  = useRef<HTMLDivElement | null>(null);
  const raysHookRef   = useRef<HTMLDivElement | null>(null);
  const bloomHookRef  = useRef<HTMLDivElement | null>(null);
  const whiteRef      = useRef<HTMLDivElement | null>(null);
  const imageLayerRef = useRef<HTMLDivElement | null>(null);
  const imageWrapRef  = useRef<HTMLDivElement | null>(null);

  const mNX     = useRef(0);
  const mNY     = useRef(0);
  const lX      = useRef(0);
  const lY      = useRef(0);
  const progRef = useRef(0);
  const rafId   = useRef(0);

  // ── Mouse tracking + interpolation loop ────────────────────────────────────
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onMove = (e: MouseEvent) => {
      mNX.current = clamp((e.clientX - window.innerWidth  / 2) / (window.innerWidth  / 2), -1, 1);
      mNY.current = clamp((e.clientY - window.innerHeight / 2) / (window.innerHeight / 2), -1, 1);
    };
    window.addEventListener("mousemove", onMove);

    const tick = () => {
      const inf = clamp(1 - progRef.current * 3.5, 0, 1);

      lX.current += (mNX.current - lX.current) * LERP_SPEED;
      lY.current += (mNY.current - lY.current) * LERP_SPEED;

      const tx  = lX.current * MAX_RAYS_X   * inf;
      const ty  = lY.current * MAX_RAYS_Y   * inf;
      const rot = lX.current * MAX_RAYS_ROT * inf;

      // Rays lean toward mouse (translate + subtle rotate)
      if (raysHookRef.current)
        raysHookRef.current.style.transform = `translate(${tx}px,${ty}px) rotate(${rot}deg)`;
      // Bloom drifts softly in the same direction
      if (bloomHookRef.current)
        bloomHookRef.current.style.transform = `translate(${tx * BLOOM_FOLLOW}px,${ty * BLOOM_FOLLOW}px)`;

      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  // ── ScrollTrigger ──────────────────────────────────────────────────────────
  useEffect(() => {
    const wrapper   = wrapperRef.current;
    const flashWrap = flashWrapRef.current;
    const white     = whiteRef.current;
    if (!wrapper || !flashWrap || !white) return;

    const reduced    = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const imageLayer = imageLayerRef.current;
    const imageWrap  = imageWrapRef.current;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: wrapper,
        start: "top top",
        end: "bottom bottom",
        scrub: 1.2,
        onUpdate: (self) => {
          const p = self.progress;
          progRef.current = p;

          if (reduced) {
            const rIn  = clamp(p * 3, 0, 1);
            const rOut = clamp((p - 0.5) * 3, 0, 1);
            white.style.opacity = String(rIn * (1 - rOut));
            if (imageLayer) imageLayer.style.opacity = String(rOut);
            return;
          }

          // Flash builds until FLASH_PEAK, then holds at max scale
          const flashP = clamp(p / FLASH_PEAK, 0, 1);
          gsap.set(flashWrap, {
            scale:           1 + flashP * (FLASH_SCALE - 1),
            filter:          `brightness(${1 + flashP * 3.2})`,
            transformOrigin: "center center",
          });

          // Warm overlay: fades in (WHITE_START→WHITE_FULL) then out (OVERLAY_FADE_START→OVERLAY_FADE_END)
          const overlayIn  = clamp((p - WHITE_START)        / (WHITE_FULL         - WHITE_START),        0, 1);
          const overlayOut = clamp((p - OVERLAY_FADE_START) / (OVERLAY_FADE_END   - OVERLAY_FADE_START), 0, 1);
          white.style.opacity = String(overlayIn * (1 - overlayOut));

          // Image reveal: fades in with blur + scale as overlay fades out
          const imgP     = clamp((p - IMG_START) / (IMG_END - IMG_START), 0, 1);
          const blurPx   = IMG_BLUR_MAX * (1 - imgP);
          const imgScale = IMG_SCALE_MAX - imgP * (IMG_SCALE_MAX - 1);
          if (imageLayer) imageLayer.style.opacity = String(imgP);
          if (imageWrap) {
            imageWrap.style.transform = `scale(${imgScale})`;
            imageWrap.style.filter    = blurPx > 0.3 ? `blur(${blurPx}px)` : "";
          }
        },
      });
    }, wrapper);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={wrapperRef}
      aria-label="Flash Intro"
      style={{ position: "relative", height: SCROLL_HEIGHT }}
    >
      {/* ── CSS keyframe animations ───────────────────────────────────────────
          All living/looping animations live here.
          Rays do NOT spin. Instead each ray breathes, flickers, or shimmers
          independently via scaleY + opacity on its inner fill div.
          .fi-anim → animation: none under prefers-reduced-motion.             */}
      <style>{`
        /* Core breathing */
        @keyframes fi-core-breath {
          0%, 100% { transform: scale(1);    opacity: 1;    }
          50%       { transform: scale(1.14); opacity: 0.82; }
        }
        /* Bloom pulsing */
        @keyframes fi-bloom-pulse {
          0%, 100% { transform: scale(1);    opacity: 0.70; }
          50%       { transform: scale(1.09); opacity: 0.90; }
        }
        /* Outer halo */
        @keyframes fi-halo-pulse {
          0%, 100% { transform: scale(1);    opacity: 0.36; }
          50%       { transform: scale(1.06); opacity: 0.50; }
        }
        /* Whole-flash flicker (on core) */
        @keyframes fi-flicker {
          0%,  87%, 91%, 95%, 100% { opacity: 1;    }
          88%                      { opacity: 0.74; }
          92%                      { opacity: 0.90; }
        }
        /* ── Ray organic animations — scaleY anchored at bottom-center ──────
           All animate transform (scaleY) and/or opacity on the INNER fill div.
           The outer rotation div has a static transform; the inner div's
           animation never conflicts with it.                                  */
        /* a — gentle grow: tip extends and returns */
        @keyframes fi-ray-a {
          0%, 100% { transform: scaleY(1);    opacity: 1;    }
          48%       { transform: scaleY(1.18); opacity: 0.86; }
        }
        /* b — contract then grow: dims before extending */
        @keyframes fi-ray-b {
          0%, 100% { transform: scaleY(0.90); opacity: 0.88; }
          55%       { transform: scaleY(1.14); opacity: 1;    }
        }
        /* c — micro-flicker: rapid subtle opacity + slight contract */
        @keyframes fi-ray-c {
          0%, 82%, 86%, 92%, 100% { opacity: 0.92; transform: scaleY(1);    }
          84%                      { opacity: 0.52; transform: scaleY(0.94); }
          89%                      { opacity: 0.80; transform: scaleY(0.97); }
        }
        /* d — irregular breath: two-phase stretch, asymmetric */
        @keyframes fi-ray-d {
          0%        { transform: scaleY(1.04); opacity: 0.86; }
          38%        { transform: scaleY(0.88); opacity: 0.72; }
          72%        { transform: scaleY(1.12); opacity: 0.96; }
          100%       { transform: scaleY(1.04); opacity: 0.86; }
        }
        /* e — shimmer: slow drift, long period */
        @keyframes fi-ray-e {
          0%, 100% { transform: scaleY(1);    opacity: 1;    }
          30%       { transform: scaleY(0.86); opacity: 0.64; }
          65%       { transform: scaleY(1.10); opacity: 0.92; }
        }
        @media (prefers-reduced-motion: reduce) {
          .fi-anim { animation: none !important; }
        }
      `}</style>

      {/* ── Sticky 100vh viewport ─────────────────────────────────────────────
          z-index: 10 keeps this above S00–S02 while active.                  */}
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
          background: "#050505",
          zIndex: 10,
        }}
      >

        {/* ── Film grain — shared archival texture ──────────────────────────── */}
        <div aria-hidden="true" className="mo-archival-grain" style={{ zIndex: 20 }} />

        {/* ── Radial vignette ───────────────────────────────────────────────── */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0,
            zIndex: 21,
            background:
              "radial-gradient(ellipse 80% 72% at 50% 50%, transparent 20%, rgba(0,0,0,0.92) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* ── Flash wrap — GSAP scale + brightness target ────────────────────
            All flash layers live inside this. GSAP animates its scale/filter. */}
        <div
          ref={flashWrapRef}
          style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >

          {/* Outermost diffuse halo */}
          <div
            className="fi-anim"
            aria-hidden="true"
            style={{
              position: "absolute",
              width: "1100px", height: "1100px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(252,241,218,0.07) 0%, transparent 58%)",
              animation: "fi-halo-pulse 6.8s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />

          {/* Bloom — mouse offset applied via bloomHookRef ─────────────────── */}
          <div
            ref={bloomHookRef}
            style={{
              position: "absolute",
              display: "flex", alignItems: "center", justifyContent: "center",
              pointerEvents: "none",
              willChange: "transform",
            }}
          >
            <div
              className="fi-anim"
              style={{
                width: "580px", height: "580px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(252,241,218,0.44) 0%, rgba(252,241,218,0.18) 44%, transparent 70%)",
                animation: "fi-bloom-pulse 4.2s ease-in-out infinite",
              }}
            />
          </div>

          {/* ── Rays — 0×0 anchor at viewport center ────────────────────────
              raysHookRef is a 0×0 point at 50%/50%.
              Mouse translate+rotate is applied to this element via JS.
              Each ray is TWO divs:
                outer → static rotation (transform: rotate(angle))
                inner → CSS organic animation (scaleY + opacity)
              The two transforms live on different elements so they never
              conflict — CSS animation wins over inline styles only on the
              SAME element, not across parent/child.                         */}
          <div
            ref={raysHookRef}
            style={{
              position: "absolute",
              left: "50%", top: "50%",
              width: 0, height: 0,
              pointerEvents: "none",
              willChange: "transform",
            }}
          >
            {RAYS.map(([angle, height, width, opacity, anim, dur, delay], i) => (
              /* Outer — static rotation; bottom-center anchors ray to flash center */
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${-width / 2}px`,
                  top: `${-height}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                  transformOrigin: "bottom center",
                  transform: `rotate(${angle}deg)`,
                }}
              >
                {/* Inner — organic CSS animation (scaleY stretches tip outward) */}
                <div
                  className="fi-anim"
                  style={{
                    width: "100%",
                    height: "100%",
                    transformOrigin: "bottom center",
                    background: `linear-gradient(to top, rgba(252,241,218,${opacity}) 0%, rgba(252,241,218,0) 100%)`,
                    filter: `blur(${width <= 2 ? 1.5 : width <= 3 ? 2 : width <= 4 ? 2.5 : 3}px)`,
                    animation: `fi-ray-${anim} ${dur}s ease-in-out infinite`,
                    animationDelay: `${-delay}s`,  /* negative delay = pre-offset phase */
                  }}
                />
              </div>
            ))}
          </div>

          {/* Core glow — breathes and flickers; always visually centered ─────
              This element has CSS animations but no mouse translation.        */}
          <div
            className="fi-anim"
            style={{
              position: "absolute",
              width: "210px", height: "210px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(252,241,218,0.95) 0%, rgba(252,241,218,0.68) 22%, rgba(252,241,218,0.36) 48%, transparent 72%)",
              animation:
                "fi-core-breath 2.9s ease-in-out infinite, fi-flicker 9.4s ease-in-out infinite",
              pointerEvents: "none",
              zIndex: 2,
            }}
          />

          {/* Hard center point — NO animation; always static and locked ───────
              This pinpoint must never move — it is the viewer's eye anchor.  */}
          <div
            style={{
              position: "absolute",
              width: "26px", height: "26px",
              borderRadius: "50%",
              background: "#FCF1DA",
              boxShadow: [
                "0 0 6px 3px rgba(252,241,218,1)",
                "0 0 22px 10px rgba(252,241,218,0.90)",
                "0 0 60px 24px rgba(252,241,218,0.30)",
              ].join(", "),
              zIndex: 3,
              pointerEvents: "none",
            }}
          />

        </div>
        {/* end flashWrapRef */}

        {/* ── Image reveal layer ────────────────────────────────────────────
            z-index 8: sits above flash elements (auto) but below the warm
            overlay (50), grain (20), and vignette (21).
            Fades in as the warm overlay fades out, blurring into the
            photograph from the flash. Opacity and filter are driven by GSAP
            via imageLayerRef / imageWrapRef — no React state re-renders.     */}
        <div
          ref={imageLayerRef}
          style={{
            position: "absolute", inset: 0,
            zIndex: 8,
            opacity: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#050505",
            pointerEvents: "none",
          }}
        >
          <div
            ref={imageWrapRef}
            style={{
              position: "relative",
              width: "70vw",
              height: "70vh",
              transform: `scale(${IMG_SCALE_MAX})`,
              transformOrigin: "center center",
            }}
          >
            <Image
              src="/assets/S01-photograph/women-hiding-hero.jpg"
              alt="Archival photograph revealing women in plain sight"
              fill
              priority
              sizes="70vw"
              style={{ objectFit: "contain", objectPosition: "center" }}
            />
          </div>
        </div>

        {/* ── Warm flash exposure overlay ────────────────────────────────────
            Fades to #FCF1DA (warm photographic flash tone) as the scroll
            takeover completes, then the FlashIntro sticky slides off to
            reveal the dark S01 section beneath.                               */}
        <div
          ref={whiteRef}
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0,
            background: "#FCF1DA",
            opacity: 0,
            zIndex: 50,
            pointerEvents: "none",
          }}
        />

      </div>
      {/* end sticky */}
    </section>
  );
}
