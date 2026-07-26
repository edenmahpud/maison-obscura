"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { handCircle } from "./S12InvestigationBoard";

gsap.registerPlugin(ScrollTrigger);

// ── Board canvas — matches the Figma frame (node 801:914) 1:1 ───────────────
const BOARD_W = 1943;
const BOARD_H = 1025;

interface Piece {
  src: string;
  alt: string;
  x: number; y: number; w: number; h: number;
  radius?: number;
  missing?: boolean; // true = asset not yet supplied, render a labeled placeholder
}

// Photos/paper, in Figma's own paint order (later = on top).
const PIECES: Piece[] = [
  // fbi4 — party scene with the erased/glowing figure.
  { src: "/assets/fbi/fbi4.png", alt: "Party scene, a figure erased in light", x: 892, y: 77, w: 615, h: 464, radius: 32 },
  // fbi6 — the same WANTED poster already used in S12WantedTransition.
  { src: "/assets/WANTED.png", alt: "FBI Wanted poster", x: 641, y: 205, w: 559, h: 540 },
  // fbi2 — the man in the coat and hat, glancing back.
  { src: "/assets/sad/sad7.png", alt: "A man in a coat and hat glancing back on the street", x: 127, y: 236, w: 227, h: 543, radius: 9 },
  // fbi5 — the street corner storefronts.
  { src: "/assets/fbi/fbi5.png", alt: "A street corner of tailoring and camera shopfronts", x: 1094, y: 513, w: 755, h: 426 },
  // fbi3 — the painted man in the fedora at the hedge.
  { src: "/assets/fbi/fbi3.png", alt: "Illustrated man in a fedora watching from behind a hedge", x: 205, y: 475, w: 687, h: 470 },
];

// Hand-drawn red circles — center/radii measured directly off the Figma
// vectors' own bounding boxes (already axis-aligned post-rotation), reusing
// S12's handCircle() generator so the stroke matches the rest of the site.
interface Circle { cx: number; cy: number; rx: number; ry: number; rot: number; }
const CIRCLES: Circle[] = [
  { cx: 242.15, cy: 368.7, rx: 96.95, ry: 82.9, rot: -1.72 }, // around fbi2's face
  { cx: 445,    cy: 709.5, rx: 177,   ry: 148.5, rot: 2 },     // around fbi3's face
  { cx: 1276.5, cy: 186,   rx: 59.5,  ry: 50,   rot: -3 },     // around a figure in fbi4
  { cx: 1569.5, cy: 792,   rx: 145.5, ry: 64,   rot: 3 },      // around the man in fbi5
];

function isDesignMode() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("designMode") === "true";
}

const IMG_FILTER =
  "drop-shadow(0 2px 10px rgba(0,0,0,0.50)) sepia(0.18) contrast(1.06) brightness(1.08)";

// ── FBI case-file board — fades/sharpens in on top of S12WantedTransition's
// held (now blurring-out) wanted poster, then its own red circles draw in.
//
// Scroll map (section height 540vh):
//
//   0   –3   whole board blurs-to-sharp and fades in, replacing the wanted
//            poster crossfading out underneath (see S12WantedTransition)
//   3   –3.5 short pause
//   3.5 –5.8 the four red circles draw themselves in, staggered
//   5.8 –6.8 hold on the fully-marked board
//   6.8 –8.3 the board itself blurs and fades out, handing off to the next
//            section (ArrestSection) fading in on top
//
// Which CIRCLES index rides along with which PIECES index, so a circle
// drawn around a face stays locked to that face under parallax instead of
// drifting off it (images and circles move at different, unrelated rates
// otherwise, since they live in separate DOM/SVG trees).
const CIRCLE_TO_PIECE = [2, 4, 0, 3]; // CIRCLES[i] tracks PIECES[CIRCLE_TO_PIECE[i]]

// How far each image drifts under parallax, in px, at the extremes of the
// scroll range — small on purpose so it reads as depth, not motion.
const PARALLAX_X_RANGE = 10;
const PARALLAX_Y_RANGE = 18;

export function FBISection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const pieceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const circleRefs = useRef<(SVGPathElement | null)[]>([]);

  // Scale the board to fit the viewport, same technique as S12's own board.
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const applyScale = () => {
      const s = Math.min(window.innerWidth / BOARD_W, window.innerHeight / BOARD_H, 1);
      board.style.transform = `translate(-50%, -50%) scale(${s})`;
    };

    applyScale();
    window.addEventListener("resize", applyScale);
    return () => window.removeEventListener("resize", applyScale);
  }, []);

  // Subtle parallax — each photo (and the circle drawn on it, so the two
  // stay locked together) drifts a little further the farther it sits from
  // the board's center, like layers at different depths on a pinned board.
  // Skipped in design mode so the board stays static while editing layout.
  useEffect(() => {
    if (isDesignMode()) return;

    const section = sectionRef.current;
    const pieces = pieceRefs.current;
    const circles = circleRefs.current;
    if (!section || pieces.some((p) => !p) || circles.some((c) => !c)) return;

    const tl = gsap.timeline();
    pieces.forEach((el, i) => {
      if (!el) return;
      const p = PIECES[i];
      const dx = (p.x + p.w / 2 - BOARD_W / 2) / BOARD_W;
      const dy = (p.y + p.h / 2 - BOARD_H / 2) / BOARD_H;
      const targets = [el, ...CIRCLE_TO_PIECE.map((pi, ci) => (pi === i ? circles[ci] : null)).filter(Boolean)];
      tl.fromTo(
        targets,
        { x: -dx * PARALLAX_X_RANGE, y: -dy * PARALLAX_Y_RANGE },
        { x: dx * PARALLAX_X_RANGE, y: dy * PARALLAX_Y_RANGE, ease: "none" },
        0,
      );
    });

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: 1.5,
      animation: tl,
    });

    return () => { tl.kill(); st.kill(); };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    const circles = circleRefs.current;
    if (!section || !sticky || circles.some((c) => !c)) return;
    const paths = circles as SVGPathElement[];

    if (isDesignMode()) {
      gsap.set(sticky, { opacity: 1, filter: "blur(0px)" });
      gsap.set(paths, { opacity: 1, strokeDashoffset: 0 });
      return;
    }

    const lengths = paths.map((p) => p.getTotalLength());
    gsap.set(paths, {
      strokeDasharray: (i: number) => lengths[i],
      strokeDashoffset: (i: number) => lengths[i],
      opacity: 0,
    });
    gsap.set(sticky, { opacity: 0, filter: "blur(20px)" });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: 1.2,
        invalidateOnRefresh: true,
      },
    });

    // Phase 0 — the board itself blurs-to-sharp and fades in.
    tl.to(sticky, { opacity: 1, filter: "blur(0px)", ease: "power2.out", duration: 3 }, 0);

    // Phase 1 — short pause before anything else moves.

    // Phase 2 — the red circles draw in, one at a time, hand-drawn style.
    const circleStarts = [3.5, 4.0, 4.5, 5.0];
    paths.forEach((path, i) => {
      tl.to(path, { opacity: 1, ease: "power1.out", duration: 0.3 }, circleStarts[i]);
      tl.to(path, { strokeDashoffset: 0, ease: "power1.inOut", duration: 0.8 }, circleStarts[i]);
    });

    // Phase 3 — hold on the fully-marked board.
    tl.to({}, { duration: 1.0 }, 5.8);

    // Phase 4 — the board itself blurs and fades out. The next section (a
    // separate, higher z-index fixed overlay) fades in on top of this, so
    // the two crossfade rather than leaving any gap.
    tl.to(sticky, { opacity: 0, filter: "blur(24px)", ease: "power1.in", duration: 1.5 }, 6.8);

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="FBI Section"
      style={{ position: "relative", height: "540vh", background: "#181818", marginTop: "-400vh" }}
    >
      {/* Permanently position:fixed with an opacity fade-in so there is no
          CSS-sticky "slide up into place" run-up and therefore no seam/
          duplicate risk. Follows S12InvestigationBoard directly — its
          investigative-focus sequence now continues straight into this
          section rather than reversing back to the board (see
          S12InvestigationBoard's own comment). This section's zIndex (50) is
          lower than the FBI-portrait/Nikolai-photo layers there (51/53), so
          it can safely start fading in this early without showing through —
          it stays hidden underneath until that portrait dissolves away.
          -400vh gives this fade-in a long head start (beginning around when
          the zoom onto Nikolai completes) so it's already fully resolved
          well before the portrait finishes fading, with no dark gap between
          them. */}
      <div
        ref={stickyRef}
        style={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          zIndex: 50,
          pointerEvents: "none",
          background: "#181818",
        }}
      >
        <div
          ref={boardRef}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: BOARD_W,
            height: BOARD_H,
            transformOrigin: "center center",
          }}
        >
          {PIECES.map((p, i) => (
            <div
              key={i}
              ref={(el) => { pieceRefs.current[i] = el; }}
              style={{
                position: "absolute",
                left: p.x, top: p.y, width: p.w, height: p.h,
                borderRadius: p.radius ?? 0,
                overflow: "hidden",
              }}
            >
              {p.missing ? (
                <div
                  style={{
                    position: "absolute", inset: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px dashed rgba(154,20,20,0.5)",
                    color: "rgba(255,235,220,0.55)",
                    fontFamily: "var(--font-courier-prime, monospace)",
                    fontSize: 13, textAlign: "center", padding: 12,
                  }}
                >
                  missing asset — public{p.src}
                </div>
              ) : (
                <Image
                  src={p.src}
                  alt={p.alt}
                  fill
                  unoptimized
                  style={{ objectFit: "cover", filter: IMG_FILTER }}
                />
              )}
            </div>
          ))}

          {/* ── Title, on its torn-paper strip ─────────────────────────── */}
          <div style={{ position: "absolute", left: 110, top: 77, width: 589, height: 131 }}>
            <Image
              src="/assets/fbi/fbi1.png"
              alt=""
              fill
              unoptimized
              style={{ objectFit: "cover", objectPosition: "bottom", filter: IMG_FILTER }}
            />
          </div>
          <p
            className="font-cormorant"
            style={{
              position: "absolute", left: 170, top: 120, width: 474,
              color: "#414141", fontSize: 40, lineHeight: 1.09,
              letterSpacing: "-0.8px", textTransform: "capitalize",
              margin: 0, whiteSpace: "nowrap",
            }}
          >
            the man who watched
          </p>

          {/* ── Pinned "NOTES" card — asset has a white background, so
              multiply-blend it into the dark board like other collage
              elements in this project do. ───────────────────────────── */}
          <div
            style={{
              position: "absolute", left: 1478, top: 117, width: 350, height: 290,
              transform: "rotate(14.7deg)", mixBlendMode: "multiply",
            }}
          >
            <Image
              src="/assets/happy/happy1.png"
              alt="A pinned index card"
              fill
              unoptimized
              style={{ objectFit: "cover" }}
            />
          </div>
          <p
            className="font-courier"
            style={{
              position: "absolute", left: 1512, top: 240, width: 261,
              transform: "rotate(12.84deg)",
              color: "#181818", fontSize: 15.5, lineHeight: 1.4,
              letterSpacing: "-0.3px", margin: 0, whiteSpace: "nowrap",
            }}
          >
            Federal Bureau of Investigation
            <br />
            Internal Security Division
            <br />
            Case File No. 56–OBSCURA
          </p>

          {/* ── Red investigation circles, drawn over everything ───────── */}
          <svg
            aria-hidden="true"
            viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
            width={BOARD_W}
            height={BOARD_H}
            style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}
          >
            {CIRCLES.map((c, i) => (
              <path
                key={i}
                ref={(el) => { circleRefs.current[i] = el; }}
                d={handCircle(c.cx, c.cy, c.rx, c.ry, c.rot)}
                stroke="#9A1414"
                fill="none"
                strokeWidth={3}
                strokeLinecap="round"
                style={{ filter: "drop-shadow(0 0 3px rgba(154,20,20,0.36))" }}
              />
            ))}
          </svg>

          {/* ── Film grain, reused from the archival texture class ─────── */}
          <div aria-hidden="true" className="mo-archival-grain" style={{ position: "absolute", inset: 0 }} />
        </div>
      </div>
    </section>
  );
}
