"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────────────────────────────────────
// S05 TRANSITION — scroll-scrubbed video with investigation overlay.
//
// SCROLL FLOW:
//   progress 0 → VIDEO_PHASE_END          : video scrubs from first to last frame
//   progress VIDEO_PHASE_END → 1          : video frozen on final frame (pinned)
//   CIRCLE_START_PROGRESS → CIRCLE_END_PROGRESS : red circle draws around character
//   EYES_DOWN_START_PROGRESS → EYES_DOWN_END_PROGRESS : eyes-down frame fades in
//
// All *_PROGRESS values are fractions of TOTAL_SCROLL (0–1).
// Circle geometry uses SVG viewBox "0 0 1920 1080" + preserveAspectRatio="xMidYMid slice"
// which mirrors objectFit:cover on the video — circle tracks character at any viewport size.
// ─────────────────────────────────────────────────────────────────────────────

const VIDEO_SRC = "/assets/next-transition.mp4";
const EYES_SRC  = "/assets/next-transition-eyes-down.png";

// ── Total pinned scroll distance (px) ────────────────────────────────────────
// Video plays over the first VIDEO_PHASE_END fraction (= 3500 px at 0.5).
// Remaining scroll drives the circle and eyes-down phases.
const TOTAL_SCROLL = 7000; /* ← change to adjust overall pacing */

// ── Phase timing (fractions of TOTAL_SCROLL) ─────────────────────────────────
const VIDEO_PHASE_END          = 0.50; /* video reaches final frame here     */
const CIRCLE_START_PROGRESS    = 0.56; /* circle begins drawing              */
const CIRCLE_END_PROGRESS      = 0.84; /* circle is fully drawn              */
const EYES_DOWN_START_PROGRESS = 0.88; /* eyes-down frame starts fading in   */
const EYES_DOWN_END_PROGRESS   = 0.97; /* eyes-down frame fully opaque       */

// ── Circle geometry (SVG units, viewBox 0 0 1920 1080) ───────────────────────
// CX/CY = center of the ellipse; RX/RY = horizontal/vertical radii.
// Calibrated to the man's face in the frozen final frame — hat brim clips the
// top of the circle; focus is on the face below the hat.
const CIRCLE_CX    = 555;      /* horizontal center (0–1920) */
const CIRCLE_CY    = 470;      /* vertical center (0–1080)   */
const CIRCLE_RX    = 360;      /* horizontal radius (px)     */
const CIRCLE_RY    = 330;      /* vertical radius  (px)      */
const CIRCLE_COLOR = "#7A1A1A"; /* muted dark red             */
const CIRCLE_WIDTH = 11;       /* stroke width in SVG units  */

// ─────────────────────────────────────────────────────────────────────────────

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

// Slightly hand-drawn ellipse expressed as four perturbed cubic Bézier arcs.
// Control points are offset a few units from a geometrically perfect ellipse
// to produce an organic, investigation-marker feel.
// pathLength="1" on the <path> element normalises dashoffset to 0–1.
function makeCirclePath(cx: number, cy: number, rx: number, ry: number): string {
  const kx = rx * 0.5523; // Bézier approximation constant for a circle arc
  const ky = ry * 0.5523;
  return [
    // Start slightly off the right-most point
    `M ${cx + rx - 4} ${cy - 7}`,
    // Arc upper-right → top
    `C ${cx + rx + 5}  ${cy - ky - 9}  ${cx + kx + 8}  ${cy - ry - 6}  ${cx + 5}   ${cy - ry - 8}`,
    // Arc top → left
    `C ${cx - kx - 7}  ${cy - ry - 4}  ${cx - rx - 8}  ${cy - ky + 6}  ${cx - rx - 10} ${cy + 7}`,
    // Arc left → bottom
    `C ${cx - rx - 4}  ${cy + ky + 10} ${cx - kx + 6}  ${cy + ry + 7}  ${cx - 6}   ${cy + ry + 6}`,
    // Arc bottom → right — ends slightly past start for the "overshot pen" look
    `C ${cx + kx + 5}  ${cy + ry + 3}  ${cx + rx + 7}  ${cy + ky - 5}  ${cx + rx + 10} ${cy - 5}`,
  ].join(" ");
}

export function S05Transition() {
  const sectionRef  = useRef<HTMLElement | null>(null);
  const videoRef    = useRef<HTMLVideoElement | null>(null);
  const durationRef = useRef<number>(0);
  const circleRef   = useRef<SVGPathElement | null>(null);
  const eyesDownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const video   = videoRef.current;
    if (!section || !video) return;

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
          const p   = self.progress;
          const dur = durationRef.current;

          // ── Phase 1: video scrubs to final frame ──────────────────────────
          if (dur > 0) {
            const tf = clamp01(p / VIDEO_PHASE_END);
            video.currentTime = Math.min(tf * dur, dur - 0.001);
          }

          // ── Phase 2: investigation circle draws with scroll ───────────────
          const circleEl = circleRef.current;
          if (circleEl) {
            const cp = clamp01(
              (p - CIRCLE_START_PROGRESS) / (CIRCLE_END_PROGRESS - CIRCLE_START_PROGRESS)
            );
            // Hide entirely before drawing begins — prevents any cap/dot artifact
            // that browsers may render at the start point when dashoffset = 1.
            circleEl.style.visibility = p < CIRCLE_START_PROGRESS ? "hidden" : "visible";
            // dashoffset 1→0 as cp 0→1: path is gradually revealed
            circleEl.style.setProperty("stroke-dashoffset", String(1 - cp));
          }

          // ── Phase 3: eyes-down edited frame fades in ─────────────────────
          const eyesEl = eyesDownRef.current;
          if (eyesEl) {
            const ep = clamp01(
              (p - EYES_DOWN_START_PROGRESS) / (EYES_DOWN_END_PROGRESS - EYES_DOWN_START_PROGRESS)
            );
            eyesEl.style.opacity = String(ep);
          }
        },
      });
    }, section);

    return () => {
      video.removeEventListener("loadedmetadata", onMeta);
      ctx.revert();
    };
  }, []);

  const circlePath = makeCirclePath(CIRCLE_CX, CIRCLE_CY, CIRCLE_RX, CIRCLE_RY);

  return (
    <section
      ref={sectionRef}
      aria-label="S05 Transition"
      className="relative h-screen w-full overflow-hidden bg-[#050505]"
    >
      {/*
       * BASE VIDEO — scrubs from 0 to final frame, then freezes pinned.
       * objectFit: cover fills the viewport; the SVG uses the same scale mode
       * (preserveAspectRatio="xMidYMid slice") so the circle tracks correctly.
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
          objectFit: "cover",
          display: "block",
        }}
      />

      {/*
       * EYES-DOWN OVERLAY — full edited final frame, fades in during last phase.
       * Uses the same objectFit:cover so it aligns pixel-perfectly with the video.
       * Starts invisible (opacity:0); GSAP onUpdate drives it to 1.
       */}
      <div
        ref={eyesDownRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          pointerEvents: "none",
        }}
      >
        <Image
          src={EYES_SRC}
          alt=""
          fill
          priority={false}
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />
      </div>

      {/*
       * INVESTIGATION CIRCLE SVG
       *
       * viewBox "0 0 1920 1080" + preserveAspectRatio="xMidYMid slice":
       *   mirrors objectFit:cover — SVG coordinate space scales identically
       *   to the video, so CIRCLE_CX/CY track the character at any viewport size.
       *
       * pathLength={1} on <path>: normalises stroke-dashoffset to 0–1.
       *   dashoffset=1 → path invisible; dashoffset=0 → path fully drawn.
       *   GSAP onUpdate interpolates from 1→0 between CIRCLE_START and CIRCLE_END.
       *
       * Tune CIRCLE_CX/CY/RX/RY above to reposition the circle on the character.
       * Tune CIRCLE_COLOR/WIDTH for different stroke appearance.
       */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <path
          ref={circleRef}
          d={circlePath}
          fill="none"
          stroke={CIRCLE_COLOR}
          strokeWidth={CIRCLE_WIDTH}
          strokeLinecap="butt"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset="1"
          style={{ visibility: "hidden" }}
        />
      </svg>
    </section>
  );
}
