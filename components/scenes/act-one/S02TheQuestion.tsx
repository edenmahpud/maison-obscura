"use client";

import { useEffect, useRef } from "react";

type S02TheQuestionProps = {
  progress: number;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

// ── Timing constants ──────────────────────────────────────────────────────────
// REVEAL_END at 0.12 gives ~36vh of blur-to-sharp scroll travel.
const REVEAL_START   = 0.01;
const REVEAL_END     = 0.12;
const FADE_OUT_START = 0.50;
const FADE_OUT_END   = 0.76;

// Volume for the video once audio is unlocked by a user gesture.
const VIDEO_VOLUME = 0.6;

// Events that count as a "first interaction" and unlock browser audio.
const UNLOCK_EVENTS = ["scroll", "wheel", "pointerdown", "touchstart", "keydown"];

export function S02TheQuestion({ progress }: S02TheQuestionProps) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const unlockedRef = useRef(false);

  const reveal         = clamp01((progress - REVEAL_START)   / (REVEAL_END   - REVEAL_START));
  const fadeOut        = clamp01((progress - FADE_OUT_START) / (FADE_OUT_END - FADE_OUT_START));
  const sectionOpacity = reveal * (1 - fadeOut);

  // ── Blur-to-sharp reveal on the video ────────────────────────────────────────
  // Emerges from the flash/blur of the Discover section.
  // At reveal=0: blur 14px, 1.5× brightness, 1.06× scale.
  // At reveal=1: sharp, natural, settled.
  const revealBlur   = 14 * (1 - reveal);
  const revealBright = 1 + 0.5  * (1 - reveal);   // 1.5 → 1.0
  const revealScale  = 1 + 0.06 * (1 - reveal);   // 1.06 → 1.0
  const videoFilter  = reveal < 0.99
    ? `blur(${revealBlur.toFixed(1)}px) brightness(${revealBright.toFixed(3)})`
    : undefined;

  const shouldPlay = progress >= REVEAL_START && progress < FADE_OUT_END;

  // ── Audio unlock — unmute on the first user interaction ──────────────────────
  // Video starts muted (required for autoplay). The first scroll/click/key event
  // is a trusted gesture that allows audio. We then flip muted=false and set
  // a comfortable volume. Pattern mirrors S04's TV sound unlock.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      video.muted  = false;
      video.volume = VIDEO_VOLUME;
      UNLOCK_EVENTS.forEach(t => window.removeEventListener(t, unlock));
    };

    UNLOCK_EVENTS.forEach(t => window.addEventListener(t, unlock, { passive: true }));
    return () => UNLOCK_EVENTS.forEach(t => window.removeEventListener(t, unlock));
  }, []);

  // ── Play / pause based on scroll visibility ───────────────────────────────────
  // Does NOT restart on every scroll tick — only fires when shouldPlay changes.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (shouldPlay) { video.play().catch(() => {}); }
    else            { video.pause(); }
  }, [shouldPlay]);

  return (
    <section
      aria-label="S02 Video Section"
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      style={{ opacity: sectionOpacity }}
    >
      {/* ── bg.start.png — archival background, full-viewport cover ───────────── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0,
          zIndex: 0,
          backgroundImage: "url('/assets/start/bg.start.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* ── Dark overlay — subdues background to ~35% visibility ─────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0,
          zIndex: 1,
          background: "rgba(8, 8, 8, 0.65)",
        }}
      />

      {/* Film grain */}
      <div aria-hidden="true" className="mo-archival-grain" style={{ zIndex: 2 }} />

      {/* ── Video — centered, blur-to-sharp cinematic reveal ─────────────────────
          Width:  min(70vw, 1100px)  — adjust first value to resize.
          Height: capped at 72vh.
          objectFit: contain — never stretches or crops.
          filter + transform driven by reveal (0→1) for the blur-in transition.
          Starts muted; unmuted on first user gesture via the unlock useEffect.  */}
      <video
        ref={videoRef}
        src="/assets/start/start2.mp4"
        playsInline
        muted
        loop
        style={{
          position: "relative",
          zIndex: 10,
          width: "min(70vw, 1100px)",
          maxHeight: "72vh",
          objectFit: "contain",
          display: "block",
          filter: videoFilter,
          transform: `scale(${revealScale.toFixed(4)})`,
        }}
      />
    </section>
  );
}
