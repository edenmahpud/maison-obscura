"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────────────────────────────────────
// S05 TRANSITION — scroll-scrubbed video bridge after the Happy collage.
//
// VIDEO PATH  → change VIDEO_SRC below.
// SCROLL PACE → change TOTAL_SCROLL (px the section stays pinned).
//               At 3500 px, the user scrolls ~700 px per second of video.
//               Increase for a slower, more spacious feel.
//               Decrease to rush through faster.
//
// HOW IT WORKS
// The section is pinned for TOTAL_SCROLL px. ScrollTrigger fires onUpdate
// on every scroll tick; we set video.currentTime = progress × duration so
// the video frame follows the scroll position directly. No GSAP tween is
// applied to the video — scroll IS the playhead.
//
// NOTE: There is intentionally NO dark fade at the end of this section.
// The video plays straight to its final frame, which visually matches
// sad6.png in S06. S06 opens with a blur-to-sharp reveal — no black gap.
// ─────────────────────────────────────────────────────────────────────────────

const VIDEO_SRC    = "/assets/next-transition.mp4"; /* ← VIDEO PATH */
const TOTAL_SCROLL = 3500;                           /* ← SCROLL DISTANCE (px) */

export function S05Transition() {
  const sectionRef  = useRef<HTMLElement | null>(null);
  const videoRef    = useRef<HTMLVideoElement | null>(null);
  const durationRef = useRef<number>(0);

  useEffect(() => {
    const section = sectionRef.current;
    const video   = videoRef.current;
    if (!section || !video) return;

    // Capture duration as soon as metadata is available
    const onMeta = () => { durationRef.current = video.duration; };
    video.addEventListener("loadedmetadata", onMeta);
    if (video.readyState >= 1) durationRef.current = video.duration;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: `+=${TOTAL_SCROLL}`,
        pin: true,
        onUpdate: (self) => {
          const dur = durationRef.current;
          if (!dur) return;
          // Clamp avoids seeking past end on floating-point edge
          video.currentTime = Math.min(self.progress * dur, dur - 0.001);
        },
      });
    }, section);

    return () => {
      video.removeEventListener("loadedmetadata", onMeta);
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="S05 Transition"
      className="relative h-screen w-full overflow-hidden bg-black"
    >
      {/*
       * VIDEO DISPLAY CONTROLS
       * object-fit: cover  → fills full viewport, crops edges
       * object-fit: contain → letterboxes, preserves full frame
       * Change the objectFit value below to switch.
       */}
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        muted
        playsInline
        preload="auto"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",  /* ← cover | contain */
          display: "block",
        }}
      />
    </section>
  );
}
