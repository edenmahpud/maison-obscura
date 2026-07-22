"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// ── Sparkle mouse-tracking constants ─────────────────────────────────────────
// MAX_X / MAX_Y  — max pixel drift at screen edge. LERP — follow speed.
const SPARKLE_MAX_X = 12;
const SPARKLE_MAX_Y = 8;
const SPARKLE_LERP  = 0.05;

// ── Section hold height ───────────────────────────────────────────────────────
// Extra scroll travel while content is pinned (gives breathing room after logo).
// 100vh viewport + HOLD_HEIGHT = total section scroll distance.
// Increase for longer hold; decrease to reach video sooner.
const HOLD_HEIGHT = "100vh";

export function S01PhotographAppears() {
  const sectionRef  = useRef<HTMLElement>(null);
  const sparkleRef  = useRef<HTMLDivElement>(null);

  // `entered` flips true the first time the section scrolls into the viewport.
  // Animations only run after this — ensures they play at the right moment,
  // not on page mount (which would be long before the user sees the section).
  const [entered, setEntered] = useState(false);

  // ── IntersectionObserver — fire animations on viewport entry ──────────────
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEntered(true);
          obs.disconnect(); // trigger once, then stop watching
        }
      },
      { threshold: 0.02 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ── Sparkle mouse tracking ────────────────────────────────────────────────
  useEffect(() => {
    const el = sparkleRef.current;
    if (!el) return;

    let rafId: number;
    let tx = 0, ty = 0;
    let cx = 0, cy = 0;

    const onMove = (e: MouseEvent) => {
      const nx = (e.clientX - window.innerWidth  / 2) / (window.innerWidth  / 2);
      const ny = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
      tx = nx * SPARKLE_MAX_X;
      ty = ny * SPARKLE_MAX_Y;
    };

    const tick = () => {
      cx += (tx - cx) * SPARKLE_LERP;
      cy += (ty - cy) * SPARKLE_LERP;
      el.style.transform = `translate(${cx}px, ${cy}px)`;
      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    // Outer: total scroll height = viewport + hold zone.
    // Change HOLD_HEIGHT above to tune how long the content pins before video.
    <section
      ref={sectionRef}
      aria-label="S01 Entrance — Maison Obscura"
      style={{ position: "relative", height: `calc(100vh + ${HOLD_HEIGHT})` }}
    >
      <style>{`
        /*
          TEXT REVEAL — "Discover The World Of"
          ──────────────────────────────────────
          The text appears as if lit by the receding flash:
            • brightness starts high (flash light on text) and settles to natural
            • blur clears from 8px → 0
            • letter-spacing tightens gently (0.24em → 0.18em)
            • a warm text-shadow fades out (simulates flash glow)
            • subtle translateY lift for cinematic entrance

          To change speed:   edit "2.4s" in the animation shorthand on the <p>.
          To change glow:    edit brightness() and text-shadow values here.
          To change spacing: edit the letter-spacing values here.
        */
        @keyframes s01-text-reveal {
          0% {
            opacity: 0;
            filter: blur(8px) brightness(1.8);
            letter-spacing: 0.24em;
            transform: translateY(8px);
            text-shadow: 0 0 28px rgba(252,241,218,0.45), 0 0 60px rgba(252,241,218,0.18);
          }
          38% {
            opacity: 0.88;
            filter: blur(2px) brightness(1.3);
            letter-spacing: 0.20em;
            transform: translateY(3px);
            text-shadow: 0 0 14px rgba(252,241,218,0.20);
          }
          100% {
            opacity: 1;
            filter: blur(0px) brightness(1);
            letter-spacing: 0.18em;
            transform: translateY(0);
            text-shadow: none;
          }
        }

        /*
          LOGO REVEAL
          ──────────────────────────────────────
          Gentler version of the same flash-reveal.
          Appears 1.6s after text starts (logo delay).

          To change logo delay: edit animationDelay on the logo div.
          To change logo speed: edit "2.0s" on the logo div.
        */
        @keyframes s01-logo-reveal {
          0%   { opacity: 0; filter: blur(6px) brightness(1.5); transform: translateY(6px) scale(0.98); }
          100% { opacity: 1; filter: blur(0px) brightness(1);   transform: translateY(0)   scale(1);    }
        }
      `}</style>

      {/* ── Sticky viewport ────────────────────────────────────────────────────
          Pins at top while user scrolls through HOLD_HEIGHT.
          Same background as the body (#181818) — no visible seam on scroll. */}
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
          background: "#181818",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Archival grain — same class as flash and video sections */}
        <div aria-hidden="true" className="mo-archival-grain" style={{ zIndex: 5 }} />

        {/* ── Sparkle ────────────────────────────────────────────────────────
            Residual from flash: same warm palette, ~30% opacity.
            z-index 1, behind text/logo.  Mouse drift applied to this element.
            Tune glow:    rgba alpha values below.
            Tune size:    width/height on each layer.
            Tune mouse:   SPARKLE_MAX_X, SPARKLE_MAX_Y, SPARKLE_LERP above.   */}
        <div
          ref={sparkleRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            willChange: "transform",
          }}
        >
          <div style={{
            position: "absolute", width: "560px", height: "560px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(252,241,218,0.10) 0%, rgba(210,185,140,0.05) 44%, transparent 70%)",
            filter: "blur(28px)",
          }} />
          <div style={{
            position: "absolute", width: "260px", height: "260px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(252,241,218,0.18) 0%, rgba(230,200,155,0.07) 52%, transparent 84%)",
            filter: "blur(14px)",
          }} />
          <div style={{
            position: "absolute", width: "100px", height: "100px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(252,241,218,0.28) 0%, rgba(252,241,218,0.10) 55%, transparent 100%)",
            filter: "blur(6px)",
          }} />
          <div style={{
            position: "absolute", width: "5px", height: "5px",
            borderRadius: "50%",
            background: "rgba(252,241,218,0.32)",
            boxShadow: "0 0 16px 6px rgba(252,241,218,0.12), 0 0 48px 16px rgba(252,241,218,0.05)",
          }} />
        </div>

        {/* ── Content: text then logo ────────────────────────────────────────
            z-index 2 sits above sparkle (z-1).
            Both elements start invisible (opacity 0).
            Animations are gated by `entered` — they start when the section
            enters the viewport, not on page load.                            */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "44px",
          }}
        >

          {/* ── "Discover The World Of" ───────────────────────────────────────
              Text size: clamp(1.6rem, 3vw, 3.2rem) — elegant, not headline.
              Change those three values to resize.
              Animation duration: 2.4s (change on the animation property below).
              fill-mode: both — hides the text before animation starts (during delay).
              `entered` must be true before any animation runs.                */}
          <p
            style={{
              fontFamily: "var(--font-cormorant-garamond), serif",
              fontWeight: 600,
              fontSize: "clamp(1.6rem, 3vw, 3.2rem)",
              color: "rgba(255, 248, 232, 0.92)",
              letterSpacing: "0.18em",
              margin: 0,
              lineHeight: 1,
              textAlign: "center",
              opacity: 0,
              // Animation fires only after IntersectionObserver sets entered=true
              animation: entered ? "s01-text-reveal 2.4s ease-out both" : "none",
            }}
          >
            Discover The World Of
          </p>

          {/* ── Logo ──────────────────────────────────────────────────────────
              Asset: /assets/start/logo.png  (public/assets/start/logo.png)
              Size: clamp(240px, 26vw, 420px). Change to resize.
              Aspect ratio: 424 × 414 (native, near-square).
              Delay: 1.6s after text animation starts — logo appears after text settles.
              Change animationDelay to adjust when the logo appears.           */}
          <div
            style={{
              position: "relative",
              width: "clamp(240px, 26vw, 420px)",
              aspectRatio: "424 / 414",
              opacity: 0,
              // 1.6s delay means logo starts 1.6s after text, well after text is readable
              animation: entered ? "s01-logo-reveal 2.0s ease-out 1.6s both" : "none",
            }}
          >
            <Image
              src="/assets/start/logo.png"
              alt="Maison Obscura"
              fill
              priority
              sizes="(max-width: 768px) 240px, 26vw"
              style={{ objectFit: "contain", objectPosition: "center" }}
            />
          </div>

        </div>
      </div>
    </section>
  );
}
