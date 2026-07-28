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
//                 600vh → 500vh of scroll travel.
//
// Flash phase constants are scaled ×(380/600) from original 380vh tuning so
// the physical scroll distances of the flash animation are preserved exactly.
//
// ── CONTENT REVEAL PHASES ────────────────────────────────────────────────────
//   FRAME_*        Decorative frame + atmospheric elements
//   DISCOVER_*     "DISCOVER" subtitle line
//   WORLDOF_*      "THE WORLD OF" main headline
//   BURST_*        Light burst behind logo
//   LOGO_*         Maison Obscura logo
//
// ── RAY TUNING ───────────────────────────────────────────────────────────────
//   MAX_RAYS_*     Mouse-parallax limits: px offset and ° rotation for rays.
//   BLOOM_FOLLOW   Bloom follows at this fraction of the ray offset.
//   LERP_SPEED     Mouse tracking speed (lower = softer / more delayed).
//
//   RAYS           [angle °, height px, width px, opacity, anim, dur s, delay s]
//                  Anim variant controls organic CSS animation.
//                  Rays do NOT spin — they breathe, flicker, and stretch.
// ─────────────────────────────────────────────────────────────────────────────

const SCROLL_HEIGHT      = "600vh";
const FLASH_SCALE        = 16;

// ── Flash phase (scaled ×380/600 from 380vh tuning) ──────────────────────────
const FLASH_PEAK         = 0.285;
const WHITE_START        = 0.241;
const WHITE_FULL         = 0.355;
const OVERLAY_FADE_START = 0.367;
const OVERLAY_FADE_END   = 0.570;

// ── Settle — flash scales back to atmospheric sparkle ────────────────────────
const FLASH_SETTLE_START = 0.570;  // 342vh — starts as overlay clears
const FLASH_SETTLE_END   = 0.720;  // 432vh — flash at 1× scale, 30% opacity

// ── Discover composition reveal ───────────────────────────────────────────────
const DISCOVER_REVEAL_START = 0.710;  // 426vh
const DISCOVER_REVEAL_END   = 0.795;  // 477vh
const WORLDOF_REVEAL_START  = 0.745;  // 447vh
const WORLDOF_REVEAL_END    = 0.855;  // 513vh
const BURST_REVEAL_START    = 0.800;  // 480vh
const BURST_REVEAL_END      = 0.895;  // 537vh
const LOGO_REVEAL_START     = 0.830;  // 498vh
const LOGO_REVEAL_END       = 0.940;  // 564vh
// Hold: 0.940–1.0 (564–600vh)

const MAX_RAYS_X  = 12;
const MAX_RAYS_Y  = 10;
const MAX_RAYS_ROT = 3;
const BLOOM_FOLLOW = 0.45;
const LERP_SPEED   = 0.055;

type Ray = [number, number, number, number, string, number, number];

const RAYS: Ray[] = [
  // ── Primary arms ─────────────────────────────────────────────────────────────
  [  0, 380, 6, 0.88, "a", 3.2, 0.00],
  [  2, 330, 4, 0.62, "b", 2.8, 0.40],
  [ -2, 310, 4, 0.55, "d", 3.0, 1.20],
  [  4, 240, 3, 0.38, "e", 4.2, 0.80],
  [ 90, 370, 6, 0.84, "b", 3.5, 0.90],
  [ 92, 320, 4, 0.58, "a", 3.1, 1.50],
  [ 88, 298, 4, 0.52, "d", 2.9, 0.30],
  [180, 360, 6, 0.82, "a", 3.0, 1.80],
  [182, 310, 4, 0.56, "c", 2.6, 0.60],
  [178, 285, 4, 0.48, "e", 4.5, 1.10],
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
  // ── 22.5° mid-arms ───────────────────────────────────────────────────────────
  [ 22, 195, 3, 0.40, "c", 2.6, 0.40],
  [ 67, 185, 3, 0.38, "d", 2.7, 1.10],
  [112, 188, 3, 0.38, "a", 3.0, 0.80],
  [157, 180, 3, 0.36, "e", 4.0, 0.30],
  [202, 175, 3, 0.35, "b", 2.8, 1.60],
  [247, 178, 3, 0.36, "c", 2.9, 0.70],
  [292, 183, 3, 0.38, "d", 3.1, 1.40],
  [337, 190, 3, 0.40, "a", 2.7, 0.50],
  // ── Fine whiskers ────────────────────────────────────────────────────────────
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

  // ── Discover composition refs ─────────────────────────────────────────────
  const contentWrapRef = useRef<HTMLDivElement | null>(null);
  const discoverRef    = useRef<HTMLParagraphElement | null>(null);
  const worldOfRef    = useRef<HTMLHeadingElement | null>(null);
  const burstRef      = useRef<HTMLDivElement | null>(null);
  const logoRef       = useRef<HTMLDivElement | null>(null);
  const scrollCueRef  = useRef<HTMLDivElement | null>(null);

  const mNX     = useRef(0);
  const mNY     = useRef(0);
  const lX      = useRef(0);
  const lY      = useRef(0);
  const progRef = useRef(0);
  const rafId   = useRef(0);

  // ── Mouse tracking ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onMove = (e: MouseEvent) => {
      mNX.current = clamp((e.clientX - window.innerWidth  / 2) / (window.innerWidth  / 2), -1, 1);
      mNY.current = clamp((e.clientY - window.innerHeight / 2) / (window.innerHeight / 2), -1, 1);
    };
    window.addEventListener("mousemove", onMove);

    let running = false;
    const tick = () => {
      if (!running) return;
      const inf = Math.max(
        clamp(1 - progRef.current * 3.5, 0, 1),
        progRef.current > FLASH_SETTLE_END ? 0.06 : 0,
      );
      lX.current += (mNX.current - lX.current) * LERP_SPEED;
      lY.current += (mNY.current - lY.current) * LERP_SPEED;
      const tx  = lX.current * MAX_RAYS_X   * inf;
      const ty  = lY.current * MAX_RAYS_Y   * inf;
      const rot = lX.current * MAX_RAYS_ROT * inf;
      if (raysHookRef.current)
        raysHookRef.current.style.transform = `translate(${tx}px,${ty}px) rotate(${rot}deg)`;
      if (bloomHookRef.current)
        bloomHookRef.current.style.transform = `translate(${tx * BLOOM_FOLLOW}px,${ty * BLOOM_FOLLOW}px)`;
      rafId.current = requestAnimationFrame(tick);
    };

    // Only run the mouse-parallax loop while the intro is on screen — it's the
    // opening scene, so once the user scrolls past there's nothing to animate.
    const setRunning = (next: boolean) => {
      if (next === running) return;
      running = next;
      if (running) rafId.current = requestAnimationFrame(tick);
      else cancelAnimationFrame(rafId.current);
    };
    const io = new IntersectionObserver(
      ([entry]) => setRunning(entry.isIntersecting),
      { rootMargin: "200px 0px" },
    );
    if (wrapperRef.current) io.observe(wrapperRef.current);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId.current);
      io.disconnect();
    };
  }, []);

  // ── ScrollTrigger ──────────────────────────────────────────────────────────
  useEffect(() => {
    const wrapper   = wrapperRef.current;
    const flashWrap = flashWrapRef.current;
    const white     = whiteRef.current;
    if (!wrapper || !flashWrap || !white) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: wrapper,
        start: "top top",
        end: "bottom bottom",
        scrub: 1.2,
        onUpdate: (self) => {
          const p = self.progress;
          progRef.current = p;

          // ── "SCROLL" cue — present at rest, fades out quickly as soon as the
          // user starts scrolling (well before the flash itself takes over).
          if (scrollCueRef.current) {
            scrollCueRef.current.style.opacity = String(0.55 * (1 - clamp(p / 0.05, 0, 1)));
          }

          // ── Reduced motion fallback ─────────────────────────────────────────
          if (reduced) {
            white.style.opacity = String(clamp(p * 3, 0, 1) * (1 - clamp((p - 0.38) * 3, 0, 1)));
            if (discoverRef.current) discoverRef.current.style.opacity = String(clamp((p - 0.58) * 5, 0, 1));
            if (worldOfRef.current)  worldOfRef.current.style.opacity  = String(clamp((p - 0.62) * 5, 0, 1));
            if (burstRef.current)    burstRef.current.style.opacity    = String(clamp((p - 0.68) * 5, 0, 1));
            if (logoRef.current)     logoRef.current.style.opacity     = String(clamp((p - 0.72) * 5, 0, 1));
            return;
          }

          // ── Flash scale + brightness ────────────────────────────────────────
          const flashP = clamp(p / FLASH_PEAK, 0, 1);
          let flashScale      = 1 + flashP * (FLASH_SCALE - 1);
          let flashBrightness = 1 + flashP * 3.2;
          let flashOpacity    = 1;

          if (p >= FLASH_SETTLE_START) {
            const sP    = clamp((p - FLASH_SETTLE_START) / (FLASH_SETTLE_END - FLASH_SETTLE_START), 0, 1);
            flashScale      = 1 + (FLASH_SCALE - 1) * (1 - sP);
            flashBrightness = 1 + 3.2 * (1 - sP);
            flashOpacity    = 1 - sP * 0.70;
          }

          gsap.set(flashWrap, {
            scale:           flashScale,
            filter:          `brightness(${flashBrightness})`,
            transformOrigin: "center center",
            opacity:         flashOpacity,
          });

          // ── Warm overlay ────────────────────────────────────────────────────
          const overlayIn  = clamp((p - WHITE_START)        / (WHITE_FULL         - WHITE_START),        0, 1);
          const overlayOut = clamp((p - OVERLAY_FADE_START) / (OVERLAY_FADE_END   - OVERLAY_FADE_START), 0, 1);
          white.style.opacity = String(overlayIn * (1 - overlayOut));

          // ── "DISCOVER" ──────────────────────────────────────────────────────
          if (discoverRef.current) {
            const dP  = clamp((p - DISCOVER_REVEAL_START) / (DISCOVER_REVEAL_END - DISCOVER_REVEAL_START), 0, 1);
            discoverRef.current.style.opacity = String(dP);
            discoverRef.current.style.filter  = dP < 0.99
              ? `blur(${(5 * (1 - dP)).toFixed(2)}px) brightness(${(1.6 - 0.6 * dP).toFixed(3)})`
              : "";
          }

          // ── "THE WORLD OF" ──────────────────────────────────────────────────
          if (worldOfRef.current) {
            const wP  = clamp((p - WORLDOF_REVEAL_START) / (WORLDOF_REVEAL_END - WORLDOF_REVEAL_START), 0, 1);
            worldOfRef.current.style.opacity = String(wP);
            worldOfRef.current.style.filter  = wP < 0.99
              ? `blur(${(10 * (1 - wP)).toFixed(2)}px) brightness(${(1.8 - 0.8 * wP).toFixed(3)})`
              : "";
          }

          // ── Light burst ─────────────────────────────────────────────────────
          if (burstRef.current) {
            burstRef.current.style.opacity = String(
              clamp((p - BURST_REVEAL_START) / (BURST_REVEAL_END - BURST_REVEAL_START), 0, 1),
            );
          }

          // ── Logo ────────────────────────────────────────────────────────────
          if (logoRef.current) {
            const lP  = clamp((p - LOGO_REVEAL_START) / (LOGO_REVEAL_END - LOGO_REVEAL_START), 0, 1);
            logoRef.current.style.opacity = String(lP);
            logoRef.current.style.filter  = lP < 0.99
              ? `blur(${(6 * (1 - lP)).toFixed(2)}px) brightness(${(1.5 - 0.5 * lP).toFixed(3)})`
              : "";
          }

          // ── Discover exit blur — softens content at the tail of the hold phase ─
          // Runs from 0.965→1.0 (last ~21vh). Individual element filters are all
          // cleared by LOGO_REVEAL_END=0.940 before this starts, so there's no
          // interference. The wrapper blur makes the Discover comp dissolve gently
          // before the sticky unsticks and the video section takes over.
          if (contentWrapRef.current) {
            const exitP = clamp((p - 0.965) / (1.0 - 0.965), 0, 1);
            if (exitP > 0) {
              contentWrapRef.current.style.filter  = `blur(${(exitP * 9).toFixed(2)}px) brightness(${(1 + exitP * 0.25).toFixed(3)})`;
              contentWrapRef.current.style.opacity = (1 - exitP * 0.35).toFixed(3);
            } else {
              contentWrapRef.current.style.filter  = "";
              contentWrapRef.current.style.opacity = "1";
            }
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
      <style>{`
        @keyframes fi-core-breath {
          0%, 100% { transform: scale(1);    opacity: 1;    }
          50%       { transform: scale(1.14); opacity: 0.82; }
        }
        @keyframes fi-bloom-pulse {
          0%, 100% { transform: scale(1);    opacity: 0.70; }
          50%       { transform: scale(1.09); opacity: 0.90; }
        }
        @keyframes fi-halo-pulse {
          0%, 100% { transform: scale(1);    opacity: 0.36; }
          50%       { transform: scale(1.06); opacity: 0.50; }
        }
        @keyframes fi-flicker {
          0%,  87%, 91%, 95%, 100% { opacity: 1;    }
          88%                      { opacity: 0.74; }
          92%                      { opacity: 0.90; }
        }
        @keyframes fi-ray-a {
          0%, 100% { transform: scaleY(1);    opacity: 1;    }
          48%       { transform: scaleY(1.18); opacity: 0.86; }
        }
        @keyframes fi-ray-b {
          0%, 100% { transform: scaleY(0.90); opacity: 0.88; }
          55%       { transform: scaleY(1.14); opacity: 1;    }
        }
        @keyframes fi-ray-c {
          0%, 82%, 86%, 92%, 100% { opacity: 0.92; transform: scaleY(1);    }
          84%                      { opacity: 0.52; transform: scaleY(0.94); }
          89%                      { opacity: 0.80; transform: scaleY(0.97); }
        }
        @keyframes fi-ray-d {
          0%   { transform: scaleY(1.04); opacity: 0.86; }
          38%   { transform: scaleY(0.88); opacity: 0.72; }
          72%   { transform: scaleY(1.12); opacity: 0.96; }
          100%  { transform: scaleY(1.04); opacity: 0.86; }
        }
        @keyframes fi-ray-e {
          0%, 100% { transform: scaleY(1);    opacity: 1;    }
          30%       { transform: scaleY(0.86); opacity: 0.64; }
          65%       { transform: scaleY(1.10); opacity: 0.92; }
        }
        @media (prefers-reduced-motion: reduce) {
          .fi-anim { animation: none !important; }
        }
      `}</style>

      {/* ── Sticky 100vh viewport ───────────────────────────────────────────── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
          background: "#181818",
          zIndex: 10,
        }}
      >

        {/* ── Film grain ──────────────────────────────────────────────────────── */}
        <div aria-hidden="true" className="mo-archival-grain" style={{ zIndex: 20 }} />

        {/* ── Radial vignette ─────────────────────────────────────────────────── */}
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

        {/* ── Subtle center atmospheric glow — sits behind text, above vignette ─ */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "50%", top: "50%",
            transform: "translate(-50%, -52%)",
            width: "700px", height: "480px",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse, rgba(252,241,218,0.032) 0%, rgba(230,195,120,0.015) 45%, transparent 72%)",
            filter: "blur(48px)",
            zIndex: 22,
            pointerEvents: "none",
          }}
        />

        {/* ── Flash wrap — GSAP target ─────────────────────────────────────────── */}
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
              background: "radial-gradient(circle, rgba(252,241,218,0.07) 0%, transparent 58%)",
              animation: "fi-halo-pulse 6.8s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
          {/* Bloom */}
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
          {/* Rays */}
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
                <div
                  className="fi-anim"
                  style={{
                    width: "100%", height: "100%",
                    transformOrigin: "bottom center",
                    background: `linear-gradient(to top, rgba(252,241,218,${opacity}) 0%, rgba(252,241,218,0) 100%)`,
                    filter: `blur(${width <= 2 ? 1.5 : width <= 3 ? 2 : width <= 4 ? 2.5 : 3}px)`,
                    animation: `fi-ray-${anim} ${dur}s ease-in-out infinite`,
                    animationDelay: `${-delay}s`,
                  }}
                />
              </div>
            ))}
          </div>
          {/* Core glow */}
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
          {/* Pinpoint */}
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

        {/* ── Main cinematic composition — z-30 ─────────────────────────────────
            Stacked: DISCOVER / THE WORLD OF / logo+burst.
            contentWrapRef receives the exit blur at the tail of the hold phase.
            Positioned at 47% top: optic centering for the logo-heavy stack.   */}
        <div
          ref={contentWrapRef}
          style={{
            position: "absolute",
            left: "50%",
            top: "47%",
            transform: "translate(-50%, -50%)",
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >

          {/* ── "DISCOVER" — small, spaced, uppercase ──────────────────────────── */}
          <p
            ref={discoverRef}
            style={{
              fontFamily: "var(--font-cormorant-garamond), serif",
              fontWeight: 400,
              fontSize: "60px",
              color: "rgba(225, 200, 140, 0.70)",
              letterSpacing: "0.1em",
              margin: 0,
              marginBottom: "18px",
              lineHeight: 1,
              textAlign: "center",
              textTransform: "uppercase",
              opacity: 0,
              paddingLeft: "0.1em",
            }}
          >
            Discover
          </p>

          {/* ── "THE WORLD OF" — large, italic, dramatic ───────────────────────── */}
          <h1
            ref={worldOfRef}
            style={{
              fontFamily: "var(--font-cormorant-garamond), serif",
              fontWeight: 300,
              fontStyle: "italic",
              fontSize: "90px",
              color: "rgba(232, 218, 180, 0.95)",
              letterSpacing: "0.10em",
              margin: 0,
              lineHeight: 1,
              textAlign: "center",
              textTransform: "uppercase",
              opacity: 0,
            }}
          >
            The World Of
          </h1>

          {/* Gap between headline and logo */}
          <div style={{ height: "clamp(32px, 5vh, 58px)" }} />

          {/* ── Logo + burst ────────────────────────────────────────────────────── */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

            {/* Light burst behind logo — layered warm radial glows */}
            <div
              ref={burstRef}
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "50%", top: "50%",
                transform: "translate(-50%, -50%)",
                width: "680px", height: "680px",
                opacity: 0,
                pointerEvents: "none",
              }}
            >
              {/* Outermost soft corona */}
              <div style={{
                position: "absolute", inset: 0,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(252,241,218,0.10) 0%, rgba(230,195,120,0.05) 38%, transparent 66%)",
                filter: "blur(36px)",
              }} />
              {/* Mid bloom */}
              <div style={{
                position: "absolute",
                left: "18%", top: "18%", right: "18%", bottom: "18%",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(252,241,218,0.28) 0%, rgba(252,241,218,0.12) 42%, transparent 72%)",
                filter: "blur(18px)",
              }} />
              {/* Inner bright core */}
              <div style={{
                position: "absolute",
                left: "34%", top: "34%", right: "34%", bottom: "34%",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(252,241,218,0.55) 0%, rgba(252,241,218,0.22) 48%, transparent 80%)",
                filter: "blur(9px)",
              }} />
              {/* Pinpoint center */}
              <div style={{
                position: "absolute",
                left: "50%", top: "50%",
                transform: "translate(-50%, -50%)",
                width: "10px", height: "10px",
                borderRadius: "50%",
                background: "rgba(252,241,218,0.80)",
                boxShadow: "0 0 18px 6px rgba(252,241,218,0.35), 0 0 48px 18px rgba(252,241,218,0.12)",
              }} />
            </div>

            {/* Logo */}
            <div
              ref={logoRef}
              style={{
                position: "relative",
                width: "clamp(180px, 20vw, 340px)",
                aspectRatio: "424 / 414",
                opacity: 0,
                zIndex: 2,
              }}
            >
              <Image
                src="/assets/start/logo.png"
                alt="Maison Obscura"
                fill
                priority
                sizes="(max-width: 768px) 180px, 20vw"
                style={{ objectFit: "contain", objectPosition: "center" }}
              />
            </div>

          </div>
          {/* end logo + burst */}

        </div>
        {/* end main composition */}

        {/* ── Warm flash overlay — z-50, covers text during peak ─────────────────
            Peaks at WHITE_FULL then fully gone by OVERLAY_FADE_END.            */}
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

        {/* ── "SCROLL" cue — bottom center, small and minimal. Fade-out on
            scroll is driven on the wrapper (JS, via ScrollTrigger progress);
            the breathing motion lives on the inner <p> (CSS keyframe) so the
            two don't fight over the `opacity` property. Reuses the same
            mo-scroll-cue keyframe already defined in globals.css. */}
        <div
          ref={scrollCueRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "50%", bottom: "40px",
            transform: "translateX(-50%)",
            opacity: 0.55,
            zIndex: 40,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <p
            className="fi-anim"
            style={{
              margin: 0,
              fontFamily: "var(--font-cormorant-garamond), serif",
              fontWeight: 400,
              fontSize: "20px",
              letterSpacing: "0.2em",
              color: "#FCF1DA",
              textAlign: "center",
              textTransform: "uppercase",
              animation: "mo-scroll-cue 3.8s ease-in-out infinite",
            }}
          >
            Scroll Down
          </p>
        </div>

      </div>
      {/* end sticky */}
    </section>
  );
}
