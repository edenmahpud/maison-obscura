"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ── Canvas — matches the Figma frame (node 801:707, "life") 1:1 ─────────────
const BOARD_W = 1920;
const BOARD_H = 1080;

const NOTE_TEXT =
  "She immigrated to Israel, built a happy life, and raised a family. Her story continued far beyond the archive";

// Single continuous red investigative thread, traced from Figma's own
// exported vector (node 1186:212) — six points, in the frame's own pixel
// space, so it stays locked to the images it weaves between at any render
// size. Rendered *behind* the photos (see z-index below), so it's only
// visible in the gaps between them, as if it runs under the composition.
const THREAD_D =
  "M -22.72 148.09 L 535.28 835.09 L 1028.78 148.09 L 1315.28 197.09 L 1346.28 915.09 L 1731.28 646.59";

function isDesignMode() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("designMode") === "true";
}

// ── "Life" reveal — the epilogue board: the people the file left behind.
// Crossfades in on top of ReverseTunnelSection's own fade-out, then four
// photographs and a red baseline reveal in sequence as the user scrolls,
// ending on life3 (the pinned note card asset) with its handwritten text.
//
// Scroll map (section height 440vh):
//
//   0   –1.2  this whole layer fades in over ReverseTunnelSection fading out
//   0.3 –1.8  life1 (the family, present day) settles in
//   1.6 –3.0  life4 (the headstone) settles in
//   2.8 –4.3  the red thread draws on, weaving between the images
//   4.0 –5.3  life2 (the family, decades earlier) settles in
//   5.0 –6.2  life3 (the note card) settles in
//   5.4 –6.6  the note's text fades in on top of life3
//   6.8 –8.0  hold
//
export function LifeSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const life1Ref = useRef<HTMLDivElement | null>(null);
  const life2Ref = useRef<HTMLDivElement | null>(null);
  const life3Ref = useRef<HTMLDivElement | null>(null);
  const life4Ref = useRef<HTMLDivElement | null>(null);
  const noteRef = useRef<HTMLDivElement | null>(null);
  const threadRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    const life1 = life1Ref.current;
    const life2 = life2Ref.current;
    const life3 = life3Ref.current;
    const life4 = life4Ref.current;
    const note = noteRef.current;
    const thread = threadRef.current;
    if (!section || !sticky || !life1 || !life2 || !life3 || !life4 || !note || !thread) return;

    const photos = [life1, life2, life3, life4];

    if (isDesignMode()) {
      gsap.set(sticky, { opacity: 1 });
      gsap.set(photos, { opacity: 1, y: 0, scale: 1 });
      gsap.set(note, { opacity: 1, y: 0, scale: 1 });
      gsap.set(thread, { strokeDashoffset: 0 });
      return;
    }

    gsap.set(sticky, { opacity: 0 });
    gsap.set(photos, { opacity: 0, y: 28, scale: 0.97 });
    gsap.set(note, { opacity: 0, y: 20, scale: 0.97 });
    gsap.set(thread, { strokeDashoffset: 1 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: 1.2,
        invalidateOnRefresh: true,
      },
    });

    // Phase 0 — fade this layer in over ReverseTunnelSection's own fade-out.
    tl.to(sticky, { opacity: 1, ease: "power1.out", duration: 1.2 }, 0);

    // Phase 1 — life1 (present-day family) settles in.
    tl.to(life1, { opacity: 1, y: 0, scale: 1, ease: "power2.out", duration: 1.5 }, 0.3);

    // Phase 2 — life4 (the headstone) settles in.
    tl.to(life4, { opacity: 1, y: 0, scale: 1, ease: "power2.out", duration: 1.4 }, 1.6);

    // Phase 3 — the red thread draws on, connecting the two.
    tl.to(thread, { strokeDashoffset: 0, ease: "power1.inOut", duration: 1.5 }, 2.8);

    // Phase 4 — life2 (the earlier family photo).
    tl.to(life2, { opacity: 1, y: 0, scale: 1, ease: "power2.out", duration: 1.3 }, 4.0);

    // Phase 5 — life3 (the note card) settles in first...
    tl.to(life3, { opacity: 1, y: 0, scale: 1, ease: "power2.out", duration: 1.2 }, 5.0);

    // Phase 6 — ...then its handwritten text fades in on top of it.
    tl.to(note, { opacity: 1, y: 0, scale: 1, ease: "power2.out", duration: 1.2 }, 5.4);

    // Phase 7 — hold.
    tl.to({}, { duration: 1.2 }, 6.8);

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="Life Section"
      style={{ position: "relative", height: "440vh", background: "#181818", marginTop: "-50vh" }}
    >
      {/* Permanently position:fixed with an opacity fade-in — same technique
          used by every section since S12WantedTransition — so this
          crossfades in cleanly on top of ReverseTunnelSection's own
          fade-out with no gap, jump, or black frame. */}
      <div
        ref={stickyRef}
        style={{ position: "fixed", inset: 0, overflow: "hidden", zIndex: 80, pointerEvents: "none", background: "#181818" }}
      >
        <div aria-hidden="true" className="mo-archival-grain" style={{ position: "absolute", inset: 0, zIndex: 30 }} />

        {/* ── Red investigative thread (Figma node 1186:212) ───────────────
            No explicit z-index: it must stay at the base stacking level so
            the photos below (all also z-index:auto, but painted later in
            DOM order) render on top of it — visible only in the gaps
            between images, "going under" wherever a photo covers it. */}
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
        >
          <path
            ref={threadRef}
            d={THREAD_D}
            pathLength="1"
            stroke="#FF0000"
            strokeWidth={2}
            fill="none"
            style={{ strokeDasharray: "1", strokeDashoffset: "1" }}
          />
        </svg>

        {/* ── life1 — the family, present day ─────────────────────────── */}
        <div
          ref={life1Ref}
          style={{
            position: "absolute",
            left: `${(131 / BOARD_W) * 100}%`, top: `${(85 / BOARD_H) * 100}%`,
            width: `${(438.051 / BOARD_W) * 100}%`, height: `${(555.619 / BOARD_H) * 100}%`,
            transform: "rotate(-1.6deg)", overflow: "hidden",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          }}
        >
          <Image src="/assets/life/life1.png" alt="The family today, generations later" fill unoptimized style={{ objectFit: "cover" }} />
        </div>

        {/* ── life4 — the headstone ───────────────────────────────────── */}
        <div
          ref={life4Ref}
          style={{
            position: "absolute",
            left: `${(604.119 / BOARD_W) * 100}%`, top: `${(282 / BOARD_H) * 100}%`,
            width: `${(482.25 / BOARD_W) * 100}%`, height: `${(643 / BOARD_H) * 100}%`,
            overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          }}
        >
          <Image src="/assets/life/life4.png" alt="A headstone, decades later" fill unoptimized style={{ objectFit: "cover" }} />
        </div>

        {/* ── life2 — the family, decades earlier ─────────────────────── */}
        <div
          ref={life2Ref}
          style={{
            position: "absolute",
            left: `${(1114 / BOARD_W) * 100}%`, top: `${(94 / BOARD_H) * 100}%`,
            width: `${(680 / BOARD_W) * 100}%`, height: `${(510 / BOARD_H) * 100}%`,
            overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          }}
        >
          <Image src="/assets/life/life2.png" alt="The family, decades earlier" fill unoptimized style={{ objectFit: "cover" }} />
        </div>

        {/* ── life3 — small accent photo ──────────────────────────────── */}
        <div
          ref={life3Ref}
          style={{
            position: "absolute",
            left: `${(1382 / BOARD_W) * 100}%`, top: `${(489 / BOARD_H) * 100}%`,
            width: `${(412.123 / BOARD_W) * 100}%`, height: `${(369.281 / BOARD_H) * 100}%`,
            transform: "rotate(14.7deg)", overflow: "hidden",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          }}
        >
          <Image src="/assets/life/life3.png" alt="An earlier snapshot" fill unoptimized style={{ objectFit: "cover" }} />
        </div>

        {/* ── Note text — no separate card: life3.png *is* the note-card
            asset (paper texture, "NOTES:" label, pin), so the text sits
            directly on top of it, positioned in its blank writing area
            (Figma node 1186:189's own coordinates, which already fall
            inside life3's card bounds). ─────────────────────────────────── */}
        <div
          ref={noteRef}
          style={{
            position: "absolute",
            left: `${(1426 / BOARD_W) * 100}%`, top: `${(576 / BOARD_H) * 100}%`,
            width: `${(293.653 / BOARD_W) * 100}%`,
            transform: "rotate(12.84deg)",
          }}
        >
          <p
            className="font-courier"
            style={{
              margin: 0, color: "#181818", fontWeight: 400, fontStyle: "normal",
              fontSize: "clamp(0.75rem, 1.09vw, 1.35rem)", lineHeight: 1.32,
              letterSpacing: "-0.02em", textAlign: "left",
            }}
          >
            {NOTE_TEXT}
          </p>
        </div>
      </div>
    </section>
  );
}
