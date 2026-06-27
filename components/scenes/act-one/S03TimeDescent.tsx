"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// TUNNEL SCROLL LENGTH: total scroll distance for the tunnel experience.
// 4 = 400vh (8s video across 400vh of scroll = 50vh per second).
// Decrease toward 3 for a faster ride, increase toward 5 for slower.
const TUNNEL_SCROLL_MULTIPLIER = 4;

// VIDEO SMOOTHING: easing factor applied per RAF frame (~60fps).
// 0.12 = cinematic lag, settles in ~16 frames (~270ms).
// Increase toward 0.4 for tighter/more direct scrubbing.
// Set to 1.0 to disable smoothing entirely (direct seek per frame).
const VIDEO_EASE = 0.12;

// WHITE EXIT START: fraction of tunnel scroll where the exit overlay begins to appear.
// 0.94 = last 6% of scroll (~24vh). Decrease to start the white earlier.
const EXIT_FADE_START = 0.94;

// ── YEAR OVERLAY CONTROLS ─────────────────────────────────────────────────────
// "2026" — present time, beginning of the tunnel.
// Fade IN: 0 → YEAR_2026_FADE_IN_END (text appears as black entry clears)
// Hold:    YEAR_2026_FADE_IN_END → YEAR_2026_HOLD_END
// Fade OUT: YEAR_2026_HOLD_END → YEAR_2026_GONE_BY
const YEAR_2026_FADE_IN_END = 0.03; // fully visible by this progress
const YEAR_2026_HOLD_END    = 0.08; // starts fading out here
const YEAR_2026_GONE_BY     = 0.22; // fully invisible by this progress

// "1953" — destination time, end of the tunnel.
// Invisible until YEAR_1953_APPEAR, then fades to full by YEAR_1953_FULL.
// Exit overlay at EXIT_FADE_START (0.94) naturally covers it with white.
const YEAR_1953_APPEAR = 0.75; // starts fading in here
const YEAR_1953_FULL   = 0.90; // fully visible by this progress

// YEAR TEXT SIZE: adjust font-size clamp here.
// clamp(min, viewport-scale, max)
const YEAR_FONT_SIZE = "clamp(5rem, 10vw, 11rem)";
// ─────────────────────────────────────────────────────────────────────────────

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

export function S03TimeDescent() {
  const sectionRef    = useRef<HTMLElement | null>(null);
  const videoRef      = useRef<HTMLVideoElement | null>(null);
  const rafRef        = useRef<number | null>(null);
  const targetTimeRef = useRef(0);
  const durationRef   = useRef(0);
  const exitOverlayRef  = useRef<HTMLDivElement | null>(null);
  const year2026Ref     = useRef<HTMLDivElement | null>(null);
  const year1953Ref     = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const video   = videoRef.current;
    if (!section || !video) return;

    gsap.registerPlugin(ScrollTrigger);

    const onLoadedMetadata = () => {
      durationRef.current = Number.isFinite(video.duration) ? video.duration : 8;
      video.pause();
      video.currentTime = 0;
      targetTimeRef.current = 0;
    };

    if (video.readyState >= 1) {
      onLoadedMetadata();
    } else {
      video.addEventListener("loadedmetadata", onLoadedMetadata);
      video.load();
    }

    // RAF loop: smoothly interpolates video.currentTime toward the scroll-driven target.
    const tick = () => {
      if (durationRef.current > 0) {
        const target  = targetTimeRef.current;
        const current = video.currentTime;
        const diff    = target - current;
        if (Math.abs(diff) > 0.01) {
          video.currentTime = current + diff * VIDEO_EASE;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    const scrollDistance = window.innerHeight * TUNNEL_SCROLL_MULTIPLIER;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: `+=${scrollDistance}`,
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress;

          // Video seek target — RAF loop eases toward this.
          targetTimeRef.current = clamp01(p) * durationRef.current;

          // Exit: white overlay fades in near the end.
          if (exitOverlayRef.current) {
            exitOverlayRef.current.style.opacity = String(
              clamp01((p - EXIT_FADE_START) / (1 - EXIT_FADE_START))
            );
          }

          // ── Year overlays ─────────────────────────────────────────────────
          // "2026": appears briefly at the start, fades as the tunnel deepens.
          if (year2026Ref.current) {
            const fadeIn  = clamp01(p / YEAR_2026_FADE_IN_END);
            const fadeOut = clamp01(
              (p - YEAR_2026_HOLD_END) / (YEAR_2026_GONE_BY - YEAR_2026_HOLD_END)
            );
            year2026Ref.current.style.opacity = String(fadeIn * (1 - fadeOut));
          }

          // "1953": appears near the end as the warm light breaks through.
          if (year1953Ref.current) {
            year1953Ref.current.style.opacity = String(
              clamp01((p - YEAR_1953_APPEAR) / (YEAR_1953_FULL - YEAR_1953_APPEAR))
            );
          }
        },
      });
    }, section);

    ScrollTrigger.refresh();

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      ctx.revert();
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.pause();
      durationRef.current   = 0;
      targetTimeRef.current = 0;
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="S03 Time Descent"
      className="relative h-screen overflow-hidden bg-[#050505]"
    >
      {/* z-0: tunnel video */}
      <video
        ref={videoRef}
        src="/assets/tunnel.mp4"
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ zIndex: 0 }}
      />

      {/*
        z-50: year overlay — both years share one wrapper and identical child styles.
        Only opacity is animated per scroll progress (via refs in onUpdate above).
        TO CHANGE TEXT: edit the string inside each div below.
        TO ADJUST SIZE: edit YEAR_FONT_SIZE constant at top of file.
        TO ADJUST TIMING: edit YEAR_2026_* / YEAR_1953_* constants at top of file.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 50,
        }}
      >
        <div
          ref={year2026Ref}
          className="font-cormorant italic"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: YEAR_FONT_SIZE,
            fontWeight: 300,
            lineHeight: 1,
            textAlign: "center",
            whiteSpace: "nowrap",
            color: "rgba(255, 248, 232, 0.85)",
            letterSpacing: "0.15em",
            textShadow: "0 0 40px rgba(255, 240, 200, 0.2), 0 2px 12px rgba(0,0,0,0.5)",
            filter: "blur(0.4px)",
            userSelect: "none",
            opacity: 0,
          }}
        >
          2026
        </div>

        <div
          ref={year1953Ref}
          className="font-cormorant italic"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: YEAR_FONT_SIZE,
            fontWeight: 300,
            lineHeight: 1,
            textAlign: "center",
            whiteSpace: "nowrap",
            color: "rgba(255, 248, 232, 0.85)",
            letterSpacing: "0.15em",
            textShadow: "0 0 40px rgba(255, 240, 200, 0.2), 0 2px 12px rgba(0,0,0,0.5)",
            filter: "blur(0.4px)",
            userSelect: "none",
            opacity: 0,
          }}
        >
          1953
        </div>
      </div>

      {/* z-100: exit overlay — covers year text during white-flash exit */}
      <div
        ref={exitOverlayRef}
        className="pointer-events-none absolute inset-0 bg-white"
        style={{ zIndex: 100, opacity: 0 }}
      />
    </section>
  );
}
