"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLazyVideoSrc } from "@/components/effects/useLazyVideoSrc";

gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────────────────────────────────────
// S06 THE HIDDEN SIDE — pixel-perfect recreation of Figma node 801-738.
//
// CANVAS: 2800 px wide, 100 vh tall.
//   X positions: exact Figma px (0–2800).
//   Y positions: Figma_y / 1080 × 100 % (scales with viewport height).
//   SVG thread: viewBox "0 0 2800 1080", preserveAspectRatio none —
//     x = Figma px, y = Figma px (same proportional mapping as CSS %).
//
// LAYER ORDER (Figma back → front):
//   0  red thread SVG
//   1  sad5  – group portrait photo
//   2  sad9  – Soviet/US flags
//   3  sad8.mp4 VIDEO 2  – Paramount News (muted loop, click for sound)
//   4  sad.mp4  VIDEO 1  – Armed Forces (plays with sound on section enter)
//   5  sad11 – location note card
//   6  sad2  – "The Hidden Side" torn-paper banner
//   7  sad3  – fallout shelter photo
//   8  sad1  – notebook / journal (needs rotate+flip to display upright)
//   9  sad4  – Atomic War comic
//   10 sad10 – communist evidence note card
//   11 sad7  – vertical noir photo (frontmost image)
//   12 text  – all text labels (always above images)
// ─────────────────────────────────────────────────────────────────────────────

const TOTAL_SCROLL   = 8500;   // px of vertical scroll while section is pinned
const PARALLAX_SCALE = 0.18;   // global depth multiplier — keep subtle
const ENTRY_CLEAR    = 0.04;   // fraction of scroll for entry blur-in
// Horizontal scroll completes at this fraction; bridge/zoom phase runs ENTRY_CLEAR→BRIDGE_START_P
const BRIDGE_START_P = 6000 / 8500; // ≈ 0.706

// ── Red thread ────────────────────────────────────────────────────────────────
const THREAD_COLOR    = "#C1001A";
const THREAD_WIDTH    = 2;
const THREAD_DURATION = 2000;  // ms to draw all lines

// ── Video volumes ─────────────────────────────────────────────────────────────
const V1_VOLUME = 0.55;   // sad.mp4  – Armed Forces
const V2_VOLUME = 0.5;    // sad8.mp4 – Paramount News (click to unmute)

// ── Parallax: [horizontal vw × scroll, vertical px drift] ────────────────────
// All values are small so the Figma layout is preserved at rest.
const PAX = {
  sad5:   [ 8, -2],
  sad9:   [10,  2],
  vid2:   [-5,  3],
  vid1:   [ 7, -2],
  sad11:  [ 8, -3],
  header: [-4, -1],
  sad3:   [-5,  3],
  sad1:   [ 5,  2],
  sad4:   [-8,  5],
  sad10:  [ 3, -4],
  sad7:   [-6,  2],
} as const;

function clamp01(v: number) { return Math.min(1, Math.max(0, v)); }
function vw(px: number): string { return `${((px / 1920) * 100).toFixed(3)}vw`; }

// ─────────────────────────────────────────────────────────────────────────────

export function S06SadSection() {
  const sectionRef  = useRef<HTMLElement | null>(null);
  const blurWrapRef = useRef<HTMLDivElement | null>(null);
  const trackRef    = useRef<HTMLDivElement | null>(null);
  const threadGRef  = useRef<SVGGElement | null>(null);

  // Video elements
  const vid1Ref  = useRef<HTMLVideoElement | null>(null);  // sad.mp4
  const vid2Ref  = useRef<HTMLVideoElement | null>(null);  // sad8.mp4

  useLazyVideoSrc(vid1Ref, sectionRef, "/assets/sad/sad.mp4");
  useLazyVideoSrc(vid2Ref, sectionRef, "/assets/sad/sad8.mp4");

  // Parallax inner-wrapper refs (outer div = position+rotation, inner = GSAP)
  const px5Ref   = useRef<HTMLDivElement | null>(null);  // sad5
  const px9Ref   = useRef<HTMLDivElement | null>(null);  // sad9
  const pxV2Ref  = useRef<HTMLDivElement | null>(null);  // vid2 inner
  const pxV1Ref  = useRef<HTMLDivElement | null>(null);  // vid1 inner
  const px11Ref  = useRef<HTMLDivElement | null>(null);  // sad11
  const pxHRef   = useRef<HTMLDivElement | null>(null);  // header (sad2)
  const px3Ref   = useRef<HTMLDivElement | null>(null);  // sad3
  const px1Ref   = useRef<HTMLDivElement | null>(null);  // sad1
  const px4Ref   = useRef<HTMLDivElement | null>(null);  // sad4
  const px10Ref  = useRef<HTMLDivElement | null>(null);  // sad10
  const px7Ref   = useRef<HTMLDivElement | null>(null);  // sad7

  // Bridge phase refs — sad9 zooms from collage position to Cold hero size at end of S06
  const bridgeRef        = useRef<HTMLDivElement | null>(null);
  const bridgeBgRef      = useRef<HTMLDivElement | null>(null);
  const bridgeStartRef   = useRef<{ scale: number; x: number; y: number } | null>(null);

  // Track whether any user gesture has occurred (needed for audio unlock)
  const gestureRef = useRef(false);
  // Track whether VIDEO 2 is currently sounding
  const vid2Sound  = useRef(false);

  // ── Gesture unlock ───────────────────────────────────────────────────────
  // By the time S06 scrolls into view the user has interacted; this listener
  // fires on the very first touch/click/scroll anywhere on the page.
  useEffect(() => {
    const mark = () => { gestureRef.current = true; };
    window.addEventListener("pointerdown", mark, { once: true });
    window.addEventListener("wheel",       mark, { once: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", mark);
      window.removeEventListener("wheel",       mark);
    };
  }, []);

  // ── VIDEO 1 — sad.mp4 (Armed Forces, WITH SOUND on section enter) ─────────
  useEffect(() => {
    const section = sectionRef.current;
    const v1      = vid1Ref.current;
    if (!section || !v1) return;

    v1.muted  = true;
    v1.volume = V1_VOLUME;
    v1.loop   = true;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          if (gestureRef.current) {
            v1.muted  = false;
            v1.volume = V1_VOLUME;
          }
          v1.play().catch((err) => {
            console.log("[S06 V1] autoplay blocked, retrying muted:", err);
            v1.muted = true;
            v1.play().catch(() => {});
          });
        } else {
          v1.pause();
          v1.muted       = true;
          v1.currentTime = 0;
        }
      });
    }, { threshold: 0.25 });

    obs.observe(section);
    return () => obs.disconnect();
  }, []);

  // ── VIDEO 2 — sad8.mp4 (Paramount News, MUTED LOOP, click toggles sound) ─
  useEffect(() => {
    const section = sectionRef.current;
    const v2      = vid2Ref.current;
    if (!section || !v2) return;

    v2.muted  = true;
    v2.volume = V2_VOLUME;
    v2.loop   = true;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          v2.play().catch(() => {});
        } else {
          v2.pause();
          v2.muted       = true;
          vid2Sound.current = false;
        }
      });
    }, { threshold: 0.25 });

    obs.observe(section);

    const onClick = () => {
      vid2Sound.current = !vid2Sound.current;
      v2.muted          = !vid2Sound.current;
      if (!v2.muted) v2.volume = V2_VOLUME;
    };
    v2.addEventListener("click", onClick);

    return () => {
      obs.disconnect();
      v2.removeEventListener("click", onClick);
    };
  }, []);

  // ── RED THREAD — draw lines sequentially on section entry ─────────────────
  useEffect(() => {
    const section = sectionRef.current;
    const g       = threadGRef.current;
    if (!section || !g) return;

    const lines = Array.from(g.querySelectorAll<SVGLineElement>("line"));

    // Initialise each line hidden
    lines.forEach((line) => {
      const len = Math.hypot(
        (parseFloat(line.getAttribute("x2") ?? "0") - parseFloat(line.getAttribute("x1") ?? "0")),
        (parseFloat(line.getAttribute("y2") ?? "0") - parseFloat(line.getAttribute("y1") ?? "0"))
      );
      line.style.strokeDasharray  = String(len);
      line.style.strokeDashoffset = String(len);
    });

    let animated = false;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting || animated) return;
        animated = true;

        const perLine  = THREAD_DURATION / lines.length;
        lines.forEach((line, i) => {
          const len       = parseFloat(line.style.strokeDasharray);
          const startAt   = i * perLine * 0.6;
          const drawMs    = perLine * 1.0;
          let start: number | null = null;

          const tick = (ts: number) => {
            if (!start) start = ts;
            const elapsed = ts - start - startAt;
            if (elapsed < 0) { requestAnimationFrame(tick); return; }
            const frac = Math.min(elapsed / drawMs, 1);
            line.style.strokeDashoffset = String(len * (1 - frac));
            if (frac < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      });
    }, { threshold: 0.15 });

    obs.observe(section);
    return () => obs.disconnect();
  }, []);

  // ── GSAP: horizontal scroll + parallax + bridge zoom ─────────────────────
  useEffect(() => {
    const section  = sectionRef.current;
    const blurWrap = blurWrapRef.current;
    const track    = trackRef.current;
    const bridge   = bridgeRef.current;
    if (!section || !blurWrap || !track) return;

    const ctx = gsap.context(() => {
      // ── Precompute bridge start: sad9's screen position at hP=1 ───────────
      // Canvas: 2800px wide; sad9: left=1979px, top=63.33%vh, w=706, h=323.
      // At hP=1 the canvas is offset by -(2800 - vw).
      // Parallax (PAX.sad9=[10,2], PARALLAX_SCALE=0.18, hP=1):
      //   x drift = 10 × 0.18 × (vw/100)   y drift = +2px
      if (bridge) {
        const win    = window.innerWidth;
        const vh     = window.innerHeight;
        const travel = 2800 - win;
        const paxX   = 10 * PARALLAX_SCALE * (win / 100);
        const paxY   = 2;
        const sad9CX = 1979 - travel + paxX + 706 / 2;
        const sad9CY = 0.6333 * vh + paxY + 323 / 2;
        const cloneW = bridge.offsetWidth;
        bridgeStartRef.current = {
          scale: 706 / cloneW,
          x: sad9CX - win / 2,
          y: sad9CY - vh  / 2,
        };
        const s = bridgeStartRef.current;
        gsap.set(bridge, { scale: s.scale, x: s.x, y: s.y, opacity: 0 });
      }
      if (bridgeBgRef.current) gsap.set(bridgeBgRef.current, { opacity: 0 });

      ScrollTrigger.create({
        trigger: section,
        start:   "top top",
        end:     `+=${TOTAL_SCROLL}`,
        pin:     true,
        scrub:   1.2,
        invalidateOnRefresh: true,
        onRefresh: () => {
          if (!bridge) return;
          const win    = window.innerWidth;
          const vh     = window.innerHeight;
          const travel = 2800 - win;
          const paxX   = 10 * PARALLAX_SCALE * (win / 100);
          const paxY   = 2;
          const sad9CX = 1979 - travel + paxX + 706 / 2;
          const sad9CY = 0.6333 * vh + paxY + 323 / 2;
          const cloneW = bridge.offsetWidth;
          bridgeStartRef.current = {
            scale: 706 / cloneW,
            x: sad9CX - win / 2,
            y: sad9CY - vh  / 2,
          };
        },
        onUpdate: (self) => {
          const p    = self.progress;
          const vwPx = window.innerWidth / 100;

          // Entry blur — clears over first ENTRY_CLEAR fraction
          const eP = clamp01(p / ENTRY_CLEAR);
          blurWrap.style.filter = `blur(${10 * (1 - eP)}px) brightness(${1 + 0.4 * (1 - eP)})`;

          // Horizontal travel — clamps at BRIDGE_START_P; bridge owns the rest
          const hP     = clamp01((p - ENTRY_CLEAR) / (BRIDGE_START_P - ENTRY_CLEAR));
          const travel = track.scrollWidth - window.innerWidth;
          gsap.set(track, { x: -(hP * travel) });

          // Per-element parallax helper
          const px = (ref: React.RefObject<HTMLDivElement | null>, h: number, v: number) => {
            if (ref.current) gsap.set(ref.current, {
              x: hP * h * PARALLAX_SCALE * vwPx,
              y: hP * v,
            });
          };

          px(px5Ref,  ...PAX.sad5);
          px(px9Ref,  ...PAX.sad9);
          px(pxV2Ref, ...PAX.vid2);
          px(pxV1Ref, ...PAX.vid1);
          px(px11Ref, ...PAX.sad11);
          px(pxHRef,  ...PAX.header);
          px(px3Ref,  ...PAX.sad3);
          px(px1Ref,  ...PAX.sad1);
          px(px4Ref,  ...PAX.sad4);
          px(px10Ref, ...PAX.sad10);
          px(px7Ref,  ...PAX.sad7);

          // ── Bridge phase: sad9 grows from collage position to hero ────────
          const bp = clamp01((p - BRIDGE_START_P) / (1 - BRIDGE_START_P));

          // Canvas fades out over first half of bridge; bridge fades in immediately
          blurWrap.style.opacity = String(1 - clamp01(bp * 2));

          if (bridge && bridgeStartRef.current) {
            const s    = bridgeStartRef.current;
            const vh   = window.innerHeight;
            // At bp=1, sad9 lands at the top of the viewport so it naturally
            // scrolls out as S06 exits — no hard cut between sections.
            const yEnd = -(vh / 2 - 517 / 2);
            gsap.set(bridge, {
              scale:   s.scale + (1 - s.scale) * bp,
              x:       s.x * (1 - bp),
              y:       s.y * (1 - bp) + yEnd * bp,
              opacity: clamp01(bp / 0.05),
            });
          }

          // Cold atmosphere bg fades in once canvas is mostly gone
          if (bridgeBgRef.current)
            gsap.set(bridgeBgRef.current, { opacity: clamp01((bp - 0.1) / 0.4) });
        },
        onLeave: () => {
          // Bridge animation complete — hide bridge and signal S07's fixed relay
          if (bridge) gsap.set(bridge, { opacity: 0 });
          window.dispatchEvent(new Event("sad9-bridge-leave"));
        },
        onEnterBack: () => {
          // User scrolled back into S06's pin — tell S07 to hide relay/dest
          window.dispatchEvent(new Event("sad9-bridge-enter-back"));
        },
      });
      // GSAP's pin mechanism may wrap the section in a pin-spacer div that
      // has overflow:hidden, clipping children that scale beyond section bounds.
      // Force it to visible so the bridge image is never cut off.
      requestAnimationFrame(() => {
        const spacer = section.parentElement;
        if (spacer && spacer.style.overflow === "hidden") {
          spacer.style.overflow = "visible";
        }
      });
    }, section);

    return () => ctx.revert();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <section
      ref={sectionRef}
      aria-label="S06 The Hidden Side"
      className="relative h-screen w-full"
      style={{ background: "#181818" }}
    >

      {/* Entry blur — overflow:hidden here contains the 2800px canvas.
          Moved from the section so the bridge can scale past section bounds
          without being clipped during the zoom animation. */}
      <div
        ref={blurWrapRef}
        style={{ position: "absolute", inset: 0, overflow: "hidden", filter: "blur(10px) brightness(1.4)" }}
      >

        {/* ── 2800 px canvas ─────────────────────────────────────────────── */}
        <div
          ref={trackRef}
          style={{
            position: "absolute",
            top: 0, left: 0,
            height: "100%",
            width: "2800px",
            willChange: "transform",
          }}
        >

          {/* ══════════════════════════════════════════════════════════════════
              LAYER 0 — RED THREAD SVG
              viewBox 0 0 2800 1080, preserveAspectRatio none.
              SVG x = Figma px; SVG y = Figma px → proportionally maps to %
              of canvas height (identical to the CSS % positions below).
              Lines animate stroke-dashoffset on IntersectionObserver fire.
              TO ADJUST LINES: edit x1/y1/x2/y2 attributes below.
          ══════════════════════════════════════════════════════════════════ */}
          <svg
            aria-hidden="true"
            viewBox="0 0 2800 1080"
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              zIndex: 0,
              pointerEvents: "none",
              overflow: "visible",
            }}
          >
            <g
              ref={threadGRef}
              stroke={THREAD_COLOR}
              strokeWidth={THREAD_WIDTH}
              strokeLinecap="round"
              fill="none"
            >
              {/* 1. Header (sad2) → fallout shelter (sad3) */}
              <line x1="395" y1="215" x2="422" y2="315" />
              {/* 2. Group photo (sad5) top → communists note (sad10) */}
              <line x1="972" y1="168" x2="1108" y2="107" />
              {/* 3. Group photo (sad5) mid → Paramount video (sad8) */}
              <line x1="871" y1="390" x2="856" y2="638" />
              {/* 4. Atomic War (sad4) → fallout shelter (sad3) */}
              <line x1="278" y1="610" x2="424" y2="435" />
              {/* 5. Communists note (sad10) → location card (sad11) */}
              <line x1="1253" y1="107" x2="1875" y2="100" />
              {/* 6. Notebook (sad1) right → Armed Forces (sad.mp4) */}
              <line x1="1845" y1="510" x2="2238" y2="390" />
              {/* 7. Notebook (sad1) bottom → flags (sad9) */}
              <line x1="1857" y1="870" x2="2092" y2="718" />
            </g>
          </svg>

          {/* ══════════════════════════════════════════════════════════════════
              LAYER 1 — sad5.png  GROUP PORTRAIT PHOTO
              Figma: left 830, top 70 (6.48%), w 754, h 389.
              border-bottom-left-radius / border-bottom-right-radius: 8px.
              Image is cropped top/bottom (Figma: h 109.16%, top -4.5%).
          ══════════════════════════════════════════════════════════════════ */}
          <div style={{ position: "absolute", left: "830px", top: "6.48%", zIndex: 1 }}>
            <div ref={px5Ref} style={{ willChange: "transform" }}>
              <div style={{
                width: "754px",
                height: "389px",
                position: "relative",
                overflow: "hidden",
                borderBottomLeftRadius: "8px",
                borderBottomRightRadius: "8px",
              }}>
                <Image
                  src="/assets/sad/sad5.png"
                  alt="" aria-hidden="true"
                  fill
                  sizes="754px"
                  style={{ objectFit: "cover", objectPosition: "center 4.5%" }}
                />
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              LAYER 2 — sad9.png  SOVIET/US FLAGS
              Figma: left 1979, top 684 (63.33%), w 706, h 323.
              Image fills container with top-offset crop.
          ══════════════════════════════════════════════════════════════════ */}
          <div style={{ position: "absolute", left: "1979px", top: "63.33%", zIndex: 2 }}>
            <div ref={px9Ref} style={{ willChange: "transform" }}>
              <div style={{ width: "706px", height: "323px", position: "relative", overflow: "hidden" }}>
                <Image
                  src="/assets/sad/sad9.png"
                  alt="" aria-hidden="true"
                  fill
                  sizes="706px"
                  style={{ objectFit: "cover", objectPosition: "center 22.93%" }}
                />
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              LAYER 3 — sad8.mp4  PARAMOUNT NEWS  (VIDEO 2)
              Loops MUTED by default. Click the video to toggle sound.
              Figma: outer flex left 729, top 633 (58.6%), w 646, h 373.5.
              Inner: rotate 0.28°, w 644, h 370.5, opacity 0.8.
              TO REPOSITION: edit left/top above.
          ══════════════════════════════════════════════════════════════════ */}
          <div style={{
            position: "absolute",
            left: "729px",
            top: "58.6%",
            width: "646px",
            height: "373.5px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3,
          }}>
            <div
              ref={pxV2Ref}
              style={{
                transform: "rotate(0.28deg)",
                opacity: 0.8,
                cursor: "pointer",
                willChange: "transform",
                position: "relative",
              }}
              title="Click for sound"
            >
              <video
                ref={vid2Ref}
                muted
                playsInline
                preload="metadata"
                style={{ width: "644px", height: "370.5px", display: "block" }}
              />
              <div aria-hidden="true" style={{
                position: "absolute",
                bottom: 7, right: 9,
                fontFamily: "var(--font-courier-prime)",
                fontSize: "0.45rem",
                color: "rgba(255,255,255,0.38)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                userSelect: "none",
                pointerEvents: "none",
              }}>
                click for sound
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              LAYER 4 — sad.mp4  ARMED FORCES INFORMATION FILM  (VIDEO 1)
              Plays WITH SOUND when section enters viewport.
              Pauses and resets when section leaves.
              Figma: outer flex left 2039.85, top 145.7 (13.49%), w 667, h 514.2.
              Inner: rotate 2.84°, w 643.9, h 482.9.
          ══════════════════════════════════════════════════════════════════ */}
          <div style={{
            position: "absolute",
            left: "2039.85px",
            top: "13.49%",
            width: "667px",
            height: "514.2px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 4,
          }}>
            <div
              ref={pxV1Ref}
              style={{ transform: "rotate(2.84deg)", willChange: "transform" }}
            >
              <video
                ref={vid1Ref}
                muted
                playsInline
                preload="metadata"
                style={{ width: "643.9px", height: "482.9px", display: "block" }}
              />
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              LAYER 5 — sad11.png  LOCATION NOTE CARD
              Figma: flex container left 1836.36, top 40.02 (3.7%), w 407, h 305.4.
              Inner: rotate -16.98°, w 361.8, h 208.9.
              Text labels (America / the 50's / the cold war) are nested
              inside the rotated wrapper as position:absolute children.
          ══════════════════════════════════════════════════════════════════ */}
          <div style={{
            position: "absolute",
            left: "1836.36px",
            top: "3.7%",
            width: "407px",
            height: "305.4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 5,
          }}>
            <div
              ref={px11Ref}
              style={{ transform: "rotate(-16.98deg)", willChange: "transform" }}
            >
              <div style={{ position: "relative", width: "361.8px", height: "208.9px" }}>
                <Image
                  src="/assets/sad/sad11.png"
                  alt="" aria-hidden="true"
                  width={362}
                  height={209}
                  style={{ width: "361.8px", height: "208.9px", display: "block" }}
                />
                {/* "America" — typed value after LOCATION: label */}
                <div style={{ position: "absolute", left: "164.5px", top: "18.4px", width: "91.4px", height: "53.8px", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <div style={{ transform: "rotate(-1.26deg)" }}>
                    <p style={{ fontFamily: "var(--font-courier-prime)", fontSize: "21.284px", lineHeight: 1.32, letterSpacing: "-0.4257px", color: "#292929", whiteSpace: "nowrap" }}>
                      America
                    </p>
                  </div>
                </div>
                {/* "the 50's" — typed value after DATE: label */}
                <div style={{ position: "absolute", left: "116.9px", top: "50.8px", width: "103.7px", height: "57.9px", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <div style={{ transform: "rotate(-1.26deg)" }}>
                    <p style={{ fontFamily: "var(--font-courier-prime)", fontSize: "21.284px", lineHeight: 1.32, letterSpacing: "-0.4257px", color: "#292929", whiteSpace: "nowrap", textTransform: "capitalize" }}>
                      the 50&apos;s
                    </p>
                  </div>
                </div>
                {/* "the cold war" — typed value after NOTES: label */}
                <div style={{ position: "absolute", left: "132.5px", top: "73.3px", width: "150.3px", height: "73.2px", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <div style={{ transform: "rotate(-1.26deg)" }}>
                    <p style={{ fontFamily: "var(--font-courier-prime)", fontSize: "21.284px", lineHeight: 1.32, letterSpacing: "-0.4257px", color: "#292929", whiteSpace: "nowrap", textTransform: "capitalize" }}>
                      the cold war
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              LAYER 6 — sad2.png  HEADER BANNER
              Figma: left 49, top 52 (4.81%), w 733, h 230. No rotation.
              The title text is anchored inside the wrapper at left:105, top:80.
          ══════════════════════════════════════════════════════════════════ */}
          <div style={{ position: "absolute", left: "49px", top: "4.81%", zIndex: 6 }}>
            <div ref={pxHRef} style={{ position: "relative", willChange: "transform" }}>
              <Image
                src="/assets/sad/sad2.png"
                alt="" aria-hidden="true"
                width={733}
                height={230}
                style={{ width: "733px", height: "230px", display: "block", objectFit: "fill" }}
              />
              {/* "The Hidden Side" title — anchored inside the banner image */}
              <div style={{ position: "absolute", left: "105px", top: "80px", pointerEvents: "none" }}>
                <p
                  className="font-cormorant"
                  style={{
                    fontWeight: 600,
                    fontSize: "80px",
                    lineHeight: 0.89,
                    letterSpacing: "-1.6px",
                    color: "#414141",
                    whiteSpace: "nowrap",
                    textTransform: "capitalize",
                  }}
                >
                  The Hidden Side
                </p>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              LAYER 7 — sad3.png  FALLOUT SHELTER PHOTO
              Figma: left 392, top 313 (29.0%), w 438, h 353. No rotation.
              object-position: bottom (Figma: object-bottom).
          ══════════════════════════════════════════════════════════════════ */}
          <div style={{ position: "absolute", left: "392px", top: "29.0%", zIndex: 7 }}>
            <div ref={px3Ref} style={{ willChange: "transform" }}>
              <div style={{ width: "438px", height: "353px", position: "relative", overflow: "hidden" }}>
                <Image
                  src="/assets/sad/sad3.png"
                  alt="" aria-hidden="true"
                  fill
                  sizes="438px"
                  style={{ objectFit: "cover", objectPosition: "center bottom" }}
                />
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              LAYER 8 — sad1.png  NOTEBOOK / JOURNAL
              Figma: outer flex left 1389.27, top 335 (31.0%), w 570.1, h 716.6.
              Inner transform: rotate(172.24deg) scaleY(-1).
              sad1.png is stored mirrored/flipped; this transform displays it
              right-side-up with a ~7.76° clockwise tilt.
              Inner image: w 485.85, h 656.98.
          ══════════════════════════════════════════════════════════════════ */}
          <div style={{
            position: "absolute",
            left: "1389.27px",
            top: "31.0%",
            width: "570.1px",
            height: "716.6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 8,
          }}>
            <div
              ref={px1Ref}
              style={{ transform: "rotate(172.24deg) scaleY(-1)", willChange: "transform" }}
            >
              <Image
                src="/assets/sad/sad1.png"
                alt="" aria-hidden="true"
                width={486}
                height={657}
                style={{ width: "485.85px", height: "656.98px", display: "block" }}
              />
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              LAYER 9 — sad4.png  ATOMIC WAR COMIC
              Figma: outer flex left 103, top 515 (47.7%), w 398.9, h 478.6.
              Inner: rotate -12.57°, w 315.1, h 420.1.
          ══════════════════════════════════════════════════════════════════ */}
          <div style={{
            position: "absolute",
            left: "103px",
            top: "47.7%",
            width: "398.9px",
            height: "478.6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9,
          }}>
            <div
              ref={px4Ref}
              style={{ transform: "rotate(-12.57deg)", willChange: "transform" }}
            >
              <Image
                src="/assets/sad/sad4.png"
                alt="" aria-hidden="true"
                width={315}
                height={420}
                style={{ width: "315.1px", height: "420.1px", display: "block" }}
              />
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              LAYER 10 — sad10.png  COMMUNIST EVIDENCE NOTE CARD
              Figma: outer flex left 1476.06, top 7.09 (0.66%), w 377.1, h 335.7.
              Inner: rotate -13.28°, w 324.1, h 268.5.
              The typewriter text overlay is nested inside the rotated wrapper.
          ══════════════════════════════════════════════════════════════════ */}
          <div style={{
            position: "absolute",
            left: "1476.06px",
            top: "0.66%",
            width: "377.1px",
            height: "335.7px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}>
            <div
              ref={px10Ref}
              style={{ transform: "rotate(-13.28deg)", willChange: "transform" }}
            >
              <div style={{ position: "relative", width: "324.1px", height: "268.5px" }}>
                <Image
                  src="/assets/sad/sad10.png"
                  alt="" aria-hidden="true"
                  width={324}
                  height={269}
                  style={{ width: "324.1px", height: "268.5px", display: "block" }}
                />
                {/* Communists note body text — anchored inside the card image */}
                <div style={{ position: "absolute", left: "32.4px", top: "44.2px", width: "234.7px", height: "180.4px", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <div style={{ transform: "rotate(-1.62deg)" }}>
                    <p style={{
                      fontFamily: "var(--font-courier-prime)",
                      fontSize: "22px",
                      lineHeight: 1.32,
                      letterSpacing: "-0.44px",
                      color: "#292929",
                      width: "207px",
                      textTransform: "capitalize",
                    }}>
                      In the 1950s, communists were among America&apos;s most feared figures
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              LAYER 11 — sad7.png  VERTICAL NOIR PHOTO (frontmost image)
              Figma: left 550, top 633 (58.6%), w 146, h 349.
              border-radius: 9px. object-cover.
          ══════════════════════════════════════════════════════════════════ */}
          <div style={{ position: "absolute", left: "550px", top: "58.6%", zIndex: 11 }}>
            <div ref={px7Ref} style={{ willChange: "transform" }}>
              <div style={{
                width: "146px",
                height: "349px",
                position: "relative",
                overflow: "hidden",
                borderRadius: "9px",
              }}>
                {/* .webp, matching the copies the FBI and S12 boards load —
                    same pixels, and it keeps this one image from being fetched
                    twice in two formats across the page. */}
                <Image
                  src="/assets/sad/sad7.webp"
                  alt="" aria-hidden="true"
                  fill
                  sizes="146px"
                  style={{ objectFit: "cover" }}
                />
              </div>
            </div>
          </div>

        </div>
        {/* end trackRef */}

      </div>
      {/* end blurWrapRef */}

      {/* ── Bridge: sad9 zooms from collage position to Cold section hero ─── */}
      {/* Mirrors the_perfect1 zoom-out in S04 but reversed: small → large.   */}
      {/* All three layers are hidden (opacity:0) until GSAP bridge phase.    */}

      {/* Cold atmosphere bg — fades in under the growing image */}
      <div
        ref={bridgeBgRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 10,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 90% 80% at 50% 50%, rgba(24,12,6,0.0) 0%, rgba(0,0,0,0.72) 100%)",
        }}
      />

      {/* sad9 image — starts at collage scale/position, grows to hero */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 11,
          pointerEvents: "none",
        }}
      >
        <div
          ref={bridgeRef}
          style={{
            position: "relative",
            width: vw(1129),
            aspectRatio: "1129 / 517",
            maxWidth: "90vw",
            flexShrink: 0,
            transformOrigin: "center center",
          }}
        >
          <Image
            src="/assets/sad/sad9.png"
            alt=""
            aria-hidden="true"
            fill
            sizes={`${((1129 / 1920) * 100).toFixed(1)}vw`}
            style={{ objectFit: "contain" }}
          />
        </div>
      </div>

      {/* ── Film grain — archival texture ──────────────────────────────────── */}
      <div aria-hidden="true" className="mo-archival-grain" style={{ zIndex: 200 }} />

      {/* ── Vignette ───────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 201,
          background:
            "radial-gradient(ellipse 88% 78% at 50% 50%, transparent 38%, rgba(0,0,0,0.72) 100%)",
        }}
      />

    </section>
  );
}
