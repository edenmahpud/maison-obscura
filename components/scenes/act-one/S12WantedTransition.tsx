"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { handCircle } from "./S12InvestigationBoard";

gsap.registerPlugin(ScrollTrigger);

// ── Source assets ──────────────────────────────────────────────────────────
// Archival frame = S12's own final focus image (star20.png), reused here so
// the handoff from the investigation board is a continuation, not a cut.
const ARCHIVAL_SRC = "/assets/star/star20.png";
const ARCHIVAL_NATURAL_W = 1772;
const ARCHIVAL_NATURAL_H = 1146;

// Man's face, right side of the archival photo (measured against source px).
const ARCHIVAL_FACE_X = 0.618;
const ARCHIVAL_FACE_Y = 0.205;

const WANTED_SRC = "/assets/WANTED.png";
const WANTED_NATURAL_W = 983;
const WANTED_NATURAL_H = 950;

// Right-hand frontal mugshot — captioned "Photographs taken February 5,
// 1953", the same year as the archival photo's torn corner label.
const WANTED_FACE_X = 0.855;
const WANTED_FACE_Y = 0.645;

const ZOOM_ARCHIVAL = 3.8; // how tight the archival face-zoom gets — crops the woman out, man's face fills the frame
const ZOOM_WANTED = 6.7;   // matching tightness on the wanted mugshot, isolating it from the profile shot beside it

// Bottom-right signature block ("JOHN EDGAR HOOVER, DIRECTOR" / "Federal
// Bureau of Investigation, Washington 25, D. C."), measured directly in the
// poster's own natural pixel space (983×950) so the circle stays locked to
// the text at any render size.
const HOOVER_CIRCLE = { cx: 760, cy: 888, rx: 195, ry: 45, rot: -2 };

function isDesignMode() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("designMode") === "true";
}

// Displayed on-screen position (as a 0–100 percentage pair) of a point at
// fraction (fx, fy) within a source image rendered with object-fit: cover
// inside a full-viewport box. Since a cover-fit image already fills the box
// with no letterbox margin, scaling that box around this origin maps 1:1 to
// the image's own content — 1/scale is exactly the visible width fraction.
function coverFaceOrigin(naturalW: number, naturalH: number, fx: number, fy: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.max(vw / naturalW, vh / naturalH);
  const renderedW = naturalW * scale;
  const renderedH = naturalH * scale;
  const dispX = fx * renderedW - (renderedW - vw) / 2;
  const dispY = fy * renderedH - (renderedH - vh) / 2;
  return { xPct: (dispX / vw) * 100, yPct: (dispY / vh) * 100 };
}

// Rect (in viewport px) of an image rendered with object-fit: contain inside
// a full-viewport box. Sizing a wrapper to exactly this rect — instead of
// scaling a full-viewport box with empty pillarbox margins — means 1/scale
// maps directly to the visible fraction of the poster with no wasted zoom
// budget spent magnifying empty margin.
function containRect(naturalW: number, naturalH: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.min(vw / naturalW, vh / naturalH);
  const w = naturalW * scale;
  const h = naturalH * scale;
  return { w, h, left: (vw - w) / 2, top: (vh - h) / 2 };
}

// ── Investigative reveal — continues straight off S12's final held frame ────
//
// Scroll map (section height 886vh, sticky throughout):
//
//   0    –3    zoom archival face-first, transform-origin locked on the man's face
//   3    –5.2  crossfade: dark bridge rises/falls while archival blurs out
//              and the (already face-zoomed) wanted mugshot blurs in
//   5    –6.5  wanted face sharpens into focus
//   6.5  –8    hold — identification confirmed
//   8    –10   pull back to reveal the full, readable WANTED poster
//   10   –10.5 short pause — the poster settles before anything else happens
//   10.5 –12.2 red investigation circle draws itself in around the
//              Hoover / FBI signature block
//   12.2 –13.0 hold on the completed circle
//   13.0 –14.5 the wanted poster itself blurs and fades out, handing off to
//              the FBI section fading in on top (see FBISection.tsx)
//
export function S12WantedTransition() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const archivalWrapRef = useRef<HTMLDivElement | null>(null);
  const wantedWrapRef = useRef<HTMLDivElement | null>(null);
  const wantedInnerRef = useRef<HTMLDivElement | null>(null);
  const darkFadeRef = useRef<HTMLDivElement | null>(null);
  const hooverCircleRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    const archivalWrap = archivalWrapRef.current;
    const wantedWrap = wantedWrapRef.current;
    const wantedInner = wantedInnerRef.current;
    const darkFade = darkFadeRef.current;
    const hooverCircle = hooverCircleRef.current;
    if (!section || !sticky || !archivalWrap || !wantedWrap || !wantedInner || !darkFade || !hooverCircle) return;

    if (isDesignMode()) {
      gsap.set(archivalWrap, { opacity: 0 });
      gsap.set(wantedWrap, { opacity: 1 });
      gsap.set(wantedInner, { scale: 1, filter: "blur(0px)" });
      gsap.set(hooverCircle, { opacity: 1, strokeDashoffset: 0 });
      return;
    }

    const applyOrigins = () => {
      const a = coverFaceOrigin(ARCHIVAL_NATURAL_W, ARCHIVAL_NATURAL_H, ARCHIVAL_FACE_X, ARCHIVAL_FACE_Y);
      archivalWrap.style.transformOrigin = `${a.xPct}% ${a.yPct}%`;

      // Size the wanted-poster box to its exact contain-fit rect so the face
      // origin can be expressed in the image's own 0–1 coordinate space.
      const r = containRect(WANTED_NATURAL_W, WANTED_NATURAL_H);
      wantedInner.style.width = `${r.w}px`;
      wantedInner.style.height = `${r.h}px`;
      wantedInner.style.left = `${r.left}px`;
      wantedInner.style.top = `${r.top}px`;
      wantedInner.style.transformOrigin = `${WANTED_FACE_X * 100}% ${WANTED_FACE_Y * 100}%`;
    };

    applyOrigins();
    window.addEventListener("resize", applyOrigins);

    // "Draws itself in" — classic SVG line-draw technique: dash the stroke
    // to exactly its own length, then animate the offset back to 0.
    const circleLength = hooverCircle.getTotalLength();
    gsap.set(hooverCircle, {
      strokeDasharray: circleLength,
      strokeDashoffset: circleLength,
      opacity: 0,
    });

    gsap.set(sticky, { opacity: 0 });
    gsap.set(archivalWrap, { scale: 1, filter: "blur(0px)", opacity: 1 });
    gsap.set(wantedWrap, { opacity: 0 });
    gsap.set(wantedInner, { scale: ZOOM_WANTED, filter: "blur(18px)" });
    gsap.set(darkFade, { opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: 1.2,
        invalidateOnRefresh: true,
      },
    });

    // Phase 0 — fade this whole layer in. `sticky` is permanently
    // position:fixed (see JSX) rather than CSS sticky/GSAP-pinned, so there
    // is no "scrolls up into place" run-up: a block scrolling into view
    // always takes one full viewport-height of scroll to go from "just
    // below" to "fully covering", and for that whole run-up S12's own
    // (slightly differently-cropped, due to its board-scale math) copy of
    // the same photo would show through as a hard, misaligned seam — read
    // by the viewer as the photo appearing twice. A fixed layer that fades
    // in by opacity instead blends smoothly over that same mismatch.
    tl.to(sticky, { opacity: 1, ease: "power1.out", duration: 0.5 }, 0);

    // Phase 1 — zoom into the man's face.
    tl.to(archivalWrap, { scale: ZOOM_ARCHIVAL, ease: "power1.inOut", duration: 3 }, 0);

    // Phase 2 — crossfade, bridged by a soft dark veil so there's never a gap.
    tl.to(darkFade, { opacity: 0.55, ease: "power1.in", duration: 1 }, 3.0);
    tl.to(archivalWrap, { opacity: 0, filter: "blur(24px)", ease: "power1.in", duration: 1.4 }, 3.1);
    tl.to(wantedWrap, { opacity: 1, ease: "power1.out", duration: 1.6 }, 3.3);
    tl.to(darkFade, { opacity: 0, ease: "power1.out", duration: 1.4 }, 3.8);

    // Phase 3 — sharpen the identified face.
    tl.to(wantedInner, { filter: "blur(0px)", ease: "power2.out", duration: 1.5 }, 5.0);

    // Phase 4 — hold (no tween; timeline idles on the sharp face).

    // Phase 5 — pull back to reveal the full, readable poster.
    tl.to(wantedInner, { scale: 1, ease: "power2.inOut", duration: 2 }, 8.0);

    // Phase 6 — short pause; the poster settles before anything else moves.

    // Phase 7 — the red circle draws itself in around the Hoover / FBI
    // signature block. A quick opacity-in keeps the stroke from popping at
    // full weight the instant the dash starts unwinding.
    tl.to(hooverCircle, { opacity: 1, ease: "power1.out", duration: 0.3 }, 10.5);
    tl.to(hooverCircle, { strokeDashoffset: 0, ease: "power1.inOut", duration: 1.7 }, 10.5);

    // Phase 8 — hold on the completed circle.
    tl.to({}, { duration: 0.8 }, 12.2);

    // Phase 9 — the wanted poster itself blurs and fades out. The FBI
    // section (a separate, higher z-index fixed overlay) fades in on top of
    // this, so the two crossfade rather than leaving any gap.
    tl.to(wantedWrap, { opacity: 0, filter: "blur(24px)", ease: "power1.in", duration: 1.5 }, 13.0);

    return () => {
      window.removeEventListener("resize", applyOrigins);
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="S12 Wanted Identification Reveal"
      style={{ position: "relative", height: "886vh", background: "#0d0b09", marginTop: "-105vh" }}
    >
      {/* Permanently position:fixed (not CSS sticky / GSAP pin) — see the
          opacity-fade comment in the effect above for why. pointer-events
          is off because this div exists (at opacity 0) for the entire page
          lifetime and must never block clicks/scroll on earlier scenes.
          marginTop:-105vh on the section shifts this fade-in to start right
          where S12's own sticky (900vh section, 100vh sticky) naturally
          begins un-sticking, so nothing is ever left uncovered between them. */}
      <div
        ref={stickyRef}
        style={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          zIndex: 40,
          pointerEvents: "none",
        }}
      >
        {/* ── Archival face-zoom layer ─────────────────────────────────── */}
        <div
          ref={archivalWrapRef}
          style={{ position: "absolute", inset: 0, zIndex: 10, willChange: "transform, filter, opacity" }}
        >
          <Image
            src={ARCHIVAL_SRC}
            alt="Archival photograph, zooming into the man's face"
            fill
            unoptimized
            style={{ objectFit: "cover", objectPosition: "50% 50%" }}
          />
        </div>

        {/* ── Wanted poster layer ──────────────────────────────────────── */}
        <div ref={wantedWrapRef} style={{ position: "absolute", inset: 0, zIndex: 20, background: "#0d0b09" }}>
          {/* Sized in JS to the exact contain-fit rect of the poster — see
              applyOrigins(). Scaling this box (not a full-viewport box with
              empty pillarbox margins) keeps the face-zoom mathematically
              tight instead of diluted by letterboxing. */}
          <div ref={wantedInnerRef} style={{ position: "absolute", willChange: "transform, filter" }}>
            <Image
              src={WANTED_SRC}
              alt="FBI Wanted poster — the man identified"
              fill
              unoptimized
              style={{ objectFit: "cover" }}
            />

            {/* Hand-drawn red investigation circle around the Hoover / FBI
                signature block — shares wantedInner's own box and transform
                so it stays pixel-locked to the text at any scale/viewport. */}
            <svg
              aria-hidden="true"
              viewBox={`0 0 ${WANTED_NATURAL_W} ${WANTED_NATURAL_H}`}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
            >
              <path
                ref={hooverCircleRef}
                d={handCircle(HOOVER_CIRCLE.cx, HOOVER_CIRCLE.cy, HOOVER_CIRCLE.rx, HOOVER_CIRCLE.ry, HOOVER_CIRCLE.rot)}
                stroke="#9A1414"
                fill="none"
                strokeWidth={2.4}
                strokeLinecap="round"
                style={{ filter: "drop-shadow(0 0 3px rgba(154,20,20,0.36))" }}
              />
            </svg>
          </div>
        </div>

        {/* ── Film grain, reused from S12's archival texture ─────────────── */}
        <div aria-hidden="true" className="mo-archival-grain" style={{ position: "absolute", inset: 0, zIndex: 25 }} />

        {/* ── Soft dark bridge — masks the crossfade cut ───────────────── */}
        <div
          aria-hidden="true"
          ref={darkFadeRef}
          style={{ position: "absolute", inset: 0, zIndex: 30, background: "#000", pointerEvents: "none" }}
        />
      </div>
    </section>
  );
}
