"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ── Board canvas ──────────────────────────────────────────────────────────────
export const BOARD_W = 1480;
export const BOARD_H = 1000;

interface Piece {
  src: string; alt: string;
  cx: number; cy: number; w: number;
  rot: number; z: number;
  hidden?: true;
}

export const PIECES: Piece[] = [

  // ── CENTER — logo fills the main red circle ───────────────────────────────
  { src: "/assets/start/logo.png",                   alt: "Maison Obscura", cx:  740, cy: 481, w: 288, rot:  0, z: 22 },
  { src: "/assets/dress/dress5.png",                 alt: "Dress 5",        cx:  518, cy: 488, w: 165, rot: -3, z: 18 },
  { src: "/assets/dress/dress7.png",                 alt: "Dress 7",        cx: 1047, cy: 552, w: 158, rot:  2, z: 17 },

  // ── ABOVE CENTER ──────────────────────────────────────────────────────────
  { src: "/assets/all/all7.png",                     alt: "Archive",        cx:  675, cy: 112, w: 155, rot:  3, z:  6 },

  // ── TOP-LEFT — 1950s ─────────────────────────────────────────────────────
  { src: "/assets/happy/happy7.png",                 alt: "1950s",          cx:  195, cy: 106, w: 175, rot: -3, z:  8 },
  { src: "/assets/happy/happy10.png",                alt: "1950s",          cx:  390, cy: 100, w: 165, rot:  4, z:  7 },
  { src: "/assets/happy/happy4.png",                 alt: "1950s",          cx:  118, cy: 248, w: 172, rot: -2, z:  9 },

  // ── LEFT BRIDGE ───────────────────────────────────────────────────────────
  { src: "/assets/sad/sad5.png",                     alt: "Evidence",       cx:  331, cy: 218, w: 207, rot:  2, z:  8 },

  // ── LEFT — EVIDENCE FILES ─────────────────────────────────────────────────
  { src: "/assets/sad/sad1.png",                     alt: "Evidence",       cx:  115, cy: 441, w: 165, rot:  1, z:  8 },
  { src: "/assets/sad/sad6.png",                     alt: "Evidence",       cx:  285, cy: 375, w: 203, rot:  3, z:  8 },
  { src: "/assets/all/all1.png",                     alt: "Archive",        cx:  293, cy: 515, w: 165, rot: -4, z:  8 },
  { src: "/assets/sad/sad9.png",                     alt: "Evidence",       cx:  108, cy: 663, w: 155, rot: -1, z:  7 },

  // ── LEFT-CENTER BRIDGE ────────────────────────────────────────────────────
  { src: "/assets/star/star5.png",                   alt: "Evidence",       cx:  538, cy: 245, w: 155, rot:  2, z:  6 },
  { src: "/assets/light/light1.png",                 alt: "Evidence",       cx:  510, cy: 396, w: 148, rot: -3, z:  6 },
  { src: "/assets/all/all3.png",                     alt: "Archive",        cx:  525, cy: 610, w: 148, rot:  3, z:  6 },

  // ── RIGHT-CENTER BRIDGE ───────────────────────────────────────────────────
  { src: "/assets/happy/happy5.png",                 alt: "1950s",          cx:  938, cy: 330, w: 158, rot: -3, z:  6 },
  { src: "/assets/light/light3.png",                 alt: "Evidence",       cx:  930, cy: 398, w: 148, rot:  2, z:  6 },

  // ── TOP-RIGHT — STAR / FOUNDER EVIDENCE ──────────────────────────────────
  { src: "/assets/star/star11.png",                  alt: "Star evidence",  cx: 1142, cy: 100, w: 158, rot: -2, z:  8 },
  { src: "/assets/star/star3.png",                   alt: "Star evidence",  cx: 1269, cy: 104, w: 175, rot: -4, z:  9 },
  { src: "/assets/star/star20.png",                  alt: "Star evidence",  cx: 1363, cy: 188, w: 258, rot:  2, z:  8 },
  { src: "/assets/S04-1950s-america/the_perfect1.png", alt: "Evidence",    cx:  946, cy: 173, w: 216, rot: -2, z:  7 },
  { src: "/assets/star/star10.png",                  alt: "Star evidence",  cx: 1239, cy: 315, w: 158, rot: -2, z:  7 },
  { src: "/assets/all/all8.png",                     alt: "Archive",        cx: 1057, cy: 284, w: 158, rot:  4, z:  8 },
  { src: "/assets/star/star2.png",                   alt: "Star evidence",  cx: 1380, cy: 190, w: 148, rot:  3, z:  6 },

  // ── RIGHT — ATELIER / PLACE ───────────────────────────────────────────────
  { src: "/assets/place/interior-preview.png",       alt: "Atelier",        cx: 1301, cy: 494, w: 279, rot:  2, z: 10 },
  { src: "/assets/sad/sad7.png",                     alt: "Evidence",       cx: 1497, cy: 320, w:  55, rot:  2, z:  7 },
  { src: "/assets/place/entry-bg.png",               alt: "Atelier entry",  cx: 1307, cy: 612, w: 226, rot: -3, z: 12 },
  { src: "/assets/all/all27.png",                    alt: "Archive",        cx: 1203, cy: 710, w: 148, rot:  1, z:  7 },

  // ── BOTTOM-LEFT ───────────────────────────────────────────────────────────
  { src: "/assets/sad/sad3.png",                     alt: "Evidence",       cx:  122, cy: 776, w: 180, rot: -2, z:  7 },
  { src: "/assets/light/light2.png",                 alt: "Evidence",       cx:  330, cy: 900, w: 172, rot: -3, z:  8 },
  { src: "/assets/cold/sad9.png",                    alt: "Evidence",       cx:  115, cy: 932, w: 155, rot:  3, z:  6 },
  { src: "/assets/all/all11.png",                    alt: "Archive",        cx:  432, cy: 798, w: 148, rot:  2, z:  7 },

  // ── BOTTOM-CENTER ─────────────────────────────────────────────────────────
  { src: "/assets/all/all6.png",                     alt: "Archive",        cx:  740, cy: 795, w: 155, rot:  1, z:  7 },
  { src: "/assets/light/light4.png",                 alt: "Evidence",       cx:  592, cy: 885, w: 205, rot: -4, z:  8 },
  { src: "/assets/light/light5.png",                 alt: "Evidence",       cx:  786, cy: 932, w: 205, rot:  2, z:  7 },
  { src: "/assets/light/light6.png",                 alt: "Evidence",       cx:  898, cy: 779, w: 148, rot:  3, z:  8 },

  // ── BOTTOM-RIGHT ──────────────────────────────────────────────────────────
  { src: "/assets/dress/dress8.png",                 alt: "Dress 8",        cx:  952, cy: 910, w: 148, rot: -3, z:  7 },
  { src: "/assets/dress/dress4.png",                 alt: "Dress 4",        cx: 1082, cy: 828, w: 162, rot:  2, z:  8 },
  { src: "/assets/dress/dress6.png",                 alt: "Dress 6",        cx: 1248, cy: 912, w: 223, rot: -3, z:  7 },
  { src: "/assets/sad/sad4.png",                     alt: "Evidence",       cx: 1375, cy: 708, w: 158, rot:  3, z:  7 },
  { src: "/assets/light/light7.png",                 alt: "Evidence",       cx: 1112, cy: 932, w: 148, rot:  1, z:  7 },
];

// ── Red investigation circles ─────────────────────────────────────────────────
interface Circle { cx: number; cy: number; rx: number; ry: number; rot: number; }
export const CIRCLES: Circle[] = [
  { cx:  735, cy: 490, rx: 148, ry: 196, rot: -2 },  // main — frames logo
  { cx: 1139, cy: 106, rx: 114, ry:  88, rot:  3 },  // top-right cluster
  { cx:   90, cy: 490, rx: 112, ry:  88, rot: -2 },  // left cluster
];

// ── Red thread bezier paths ───────────────────────────────────────────────────
export const THREADS = [
  "M 740 490 C 560 400 385 268 233 170",
  "M 740 490 C 848 382 962 240 1044 118",
  "M 740 490 C 578 490 360 490  90 490",
  "M 740 490 C 900 458 1065 430 1200 385",
  "M 740 490 C 618 614 432 722 248 802",
  "M 740 490 C 822 620 930 720 1025 788",
  "M 740 490 C 740 624 740 752 740 862",
  "M  90 490 C 120 588 175 700 248 802",
  "M 233 170 C 248 250 260 340 274 420",
  "M 1044 118 C 1060 190 1075 250 1098 298",
];

// ── Pin dots at thread endpoints ──────────────────────────────────────────────
export const PINS = [
  { cx: 233, cy: 170 }, { cx:1044, cy: 118 }, { cx:  90, cy: 490 },
  { cx:1200, cy: 385 }, { cx: 248, cy: 802 }, { cx:1025, cy: 788 },
  { cx: 740, cy: 862 }, { cx: 274, cy: 420 }, { cx:1098, cy: 298 },
  { cx: 740, cy: 490 },
];

// ── Hand-drawn SVG oval ───────────────────────────────────────────────────────
export function handCircle(cx: number, cy: number, rx: number, ry: number, rotDeg: number): string {
  const a = rotDeg * (Math.PI / 180);
  const cos = Math.cos(a), sin = Math.sin(a);
  const pt = (ang: number): [number, number] => {
    const x0 = rx * Math.cos(ang), y0 = ry * Math.sin(ang);
    return [cx + x0 * cos - y0 * sin, cy + x0 * sin + y0 * cos];
  };
  const jit = (p: [number, number], s: number): [number, number] => {
    const r = (n: number) => (Math.sin(n * 127.1 + cx * 0.31) * 0.5 + 0.5) * 8 - 4;
    return [p[0] + r(s), p[1] + r(s + 1)];
  };
  const [t, r, b, l] = [pt(Math.PI * 1.5), pt(0), pt(Math.PI * 0.5), pt(Math.PI)];
  const [tj, rj, bj, lj] = [jit(t, 0), jit(r, 2), jit(b, 4), jit(l, 6)];
  const f = (v: number) => v.toFixed(1);
  return [
    `M ${f(tj[0])} ${f(tj[1])}`,
    `C ${f(tj[0] + rx * 0.44)} ${f(tj[1] + ry * 0.04)} ${f(rj[0] - rx * 0.04)} ${f(rj[1] - ry * 0.44)} ${f(rj[0])} ${f(rj[1])}`,
    `C ${f(rj[0] + rx * 0.04)} ${f(rj[1] + ry * 0.44)} ${f(bj[0] + rx * 0.44)} ${f(bj[1] - ry * 0.04)} ${f(bj[0])} ${f(bj[1])}`,
    `C ${f(bj[0] - rx * 0.44)} ${f(bj[1] + ry * 0.04)} ${f(lj[0] + rx * 0.04)} ${f(lj[1] + ry * 0.44)} ${f(lj[0])} ${f(lj[1])}`,
    `C ${f(lj[0] - rx * 0.04)} ${f(lj[1] - ry * 0.44)} ${f(tj[0] - rx * 0.44)} ${f(tj[1] - ry * 0.04)} ${f(tj[0])} ${f(tj[1])} Z`,
  ].join(" ");
}

function isDesignMode() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("designMode") === "true";
}

// ── Image filter applied to every photo ──────────────────────────────────────
const IMG_FILTER =
  "drop-shadow(0 2px 10px rgba(0,0,0,0.50)) sepia(0.18) contrast(1.06) brightness(1.08)";

export function S12InvestigationBoard() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stickyRef  = useRef<HTMLDivElement | null>(null);
  const boardRef   = useRef<HTMLDivElement | null>(null);

  // ── Scale board to fit viewport, never upscale ────────────────────────────
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const applyScale = () => {
      const s = Math.min(
        window.innerWidth  / BOARD_W,
        window.innerHeight / BOARD_H,
        1,
      );
      board.style.transform = `translate(-50%, -50%) scale(${s})`;
    };

    applyScale();
    window.addEventListener("resize", applyScale);
    return () => window.removeEventListener("resize", applyScale);
  }, []);

  // ── Board reveal — scrub-driven, overlaps S11 exit blur ──────────────────
  // In design mode the sticky is immediately visible so the board can be edited.
  useEffect(() => {
    const section = sectionRef.current;
    const sticky  = stickyRef.current;
    if (!section || !sticky) return;

    if (isDesignMode()) {
      gsap.set(sticky, { opacity: 1, filter: "blur(0px)" });
      return;
    }

    gsap.set(sticky, { opacity: 0, filter: "blur(20px)" });

    const tween = gsap.to(sticky, {
      opacity: 1,
      filter: "blur(0px)",
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top -30%",
        end:   "top -70%",
        scrub: 0.4,
      },
    });

    return () => { tween.scrollTrigger?.kill(); tween.kill(); };
  }, []);

  // ── Subtle parallax — skipped in design mode ──────────────────────────────
  useEffect(() => {
    if (isDesignMode()) return;

    const section = sectionRef.current;
    const board   = boardRef.current;
    if (!section || !board) return;

    const els = Array.from(board.querySelectorAll<HTMLElement>(".par-img[data-piece-index]"))
      .sort((a, b) => parseInt(a.dataset.pieceIndex ?? "0") - parseInt(b.dataset.pieceIndex ?? "0"));
    if (!els.length) return;

    const tl = gsap.timeline();
    els.forEach((el) => {
      const i = parseInt(el.dataset.pieceIndex ?? "0", 10);
      if (i === 19) return; // star20 is reserved for the focus animation
      const p = PIECES[i];
      if (!p) return;
      const dy = (p.cy - 490) / BOARD_H;
      const dx = (p.cx - 740) / BOARD_W;
      tl.fromTo(
        el,
        { y: -dy * 25, x: -dx * 8 },
        { y:  dy * 25, x:  dx * 8, ease: "none" },
        0,
      );
    });

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end:   "bottom bottom",
      scrub: 1.5,
      animation: tl,
    });

    return () => { tl.kill(); st.kill(); };
  }, []);


  // ── Investigative focus — board dissolves while the focus image expands ─────
  //
  // Scroll map (section height 900vh, sticky active for 800vh):
  //
  //   0– 75vh    board blur-in from S11
  //   75–200vh   stagger plays; viewer examines full board (125vh hold)
  //   200–750vh  ← THIS ScrollTrigger (550vh, ≈55vh per unit)
  //     t=0→8    all board elements fade AND focus image grows — fully parallel
  //     t=8→10   hold: focus image fills the viewport
  //   750–800vh  post-scrub hold before section unsticks
  //
  useEffect(() => {
    if (isDesignMode()) return;

    const section = sectionRef.current;
    const board   = boardRef.current;
    if (!section || !board) return;

    // Piece index 19 (star20.png, cx:1363, cy:188, w:258) is the focus image.
    const focusEl = board.querySelector<HTMLElement>("[data-piece-index='19']");
    if (!focusEl) return;

    const allPieceEls  = Array.from(board.querySelectorAll<HTMLElement>(".par-img[data-piece-index]"));
    const otherEls     = allPieceEls.filter(el => el !== focusEl);
    const svgEl        = board.querySelector<SVGSVGElement>("svg");

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const boardScale = Math.min(vw / BOARD_W, vh / BOARD_H, 1);
    const imgW = 258;
    const imgH = Math.round(imgW * 0.72); // ≈ 186

    // Scale so the image covers the full viewport.
    const SCALE = Math.max(vw / (imgW * boardScale), vh / (imgH * boardScale)) * 1.02;

    // Move the image's geometric center to the board center (= viewport center).
    // center in board coords: (cx, top + h/2) = (1363, 69 + 93) = (1363, 162)
    const TX = -(1363 - 740); // -623
    const TY = -(162  - 500); //  338

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start:           "top -200%",
        end:             "top -750%",
        scrub:           2,
        invalidateOnRefresh: true,
      },
    });

    // Elevate focus image; scale from its own center — no face targeting.
    tl.set(focusEl, { opacity: 1, zIndex: 50, transformOrigin: "50% 50%" }, 0);

    // t=0→8: board dissolves AND focus image grows — fully parallel.
    // fromTo is required so GSAP knows the explicit from-state (opacity: 1).
    // Without it, GSAP captures the from-state at mount time when images are
    // still at opacity: 0 (JSX default), and scrubbing backwards returns them
    // to opacity: 0 instead of visible.
    tl.fromTo(otherEls, { opacity: 1 }, { opacity: 0, ease: "power2.inOut", duration: 8 }, 0);
    if (svgEl) tl.fromTo(svgEl, { opacity: 1 }, { opacity: 0, ease: "power2.inOut", duration: 8 }, 0);
    tl.fromTo(focusEl, { x: 0, y: 0, scale: 1 }, { x: TX, y: TY, scale: SCALE, ease: "power2.inOut", duration: 8 }, 0);

    // t=8→10: hold — focus image fills viewport, everything else gone.

    return () => { tl.scrollTrigger?.kill(); tl.kill(); };
  }, []);

  const logo = PIECES[0];

  return (
    <section
      ref={sectionRef}
      aria-label="S12 Investigation Board"
      style={{ position: "relative", height: "900vh", background: "#181818", marginTop: "-50vh" }}
    >
      {/* zIndex:22 sits above S11's exit overlay (z:20).
          background:transparent lets S11 show through while opacity is 0. */}
      <div
        ref={stickyRef}
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
          background: "transparent",
          zIndex: 22,
        }}
      >
        {/* ── Dark warm wall (z:0) ─────────────────────────────────────── */}
        <div
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, zIndex: 0, background: "#1c1814" }}
        />

        {/* ── Board canvas (z:5) ───────────────────────────────────────── */}
        <div
          ref={boardRef}
          data-design-board=""
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: BOARD_W,
            height: BOARD_H,
            transform: "translate(-50%, -50%)",
            transformOrigin: "center center",
            zIndex: 5,
          }}
        >
          {/* ── Logo at z:20 — above SVG threads (z:15) ─────────────── */}
          <div
            className="par-img"
            data-piece-index={0}
            style={{
              position: "absolute",
              left: logo.cx - logo.w / 2,
              top:  logo.cy - logo.w * 0.46,
              width: logo.w,
              zIndex: logo.z,
              opacity: 1,
            }}
          >
            <div className="rot-inner" style={{ transform: `rotate(${logo.rot}deg)` }}>
              <Image
                src={logo.src}
                alt={logo.alt}
                width={logo.w}
                height={Math.round(logo.w * 0.72)}
                style={{ width: "100%", height: "auto", display: "block", filter: IMG_FILTER }}
                unoptimized
              />
            </div>
          </div>

          {/* ── SVG: threads + circles + pins (z:15) ────────────────── */}
          <svg
            aria-hidden="true"
            viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
            width={BOARD_W}
            height={BOARD_H}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 15,
              pointerEvents: "none",
              overflow: "visible",
            }}
          >
            {THREADS.map((d, i) => (
              <path
                key={i}
                data-design-thread-idx={i}
                d={d}
                stroke="#8A1818"
                fill="none"
                strokeWidth={i < 7 ? 1.55 : 1.15}
                strokeLinecap="round"
                style={{ filter: "drop-shadow(0 0 2px rgba(138,24,24,0.30))" }}
              />
            ))}

            {CIRCLES.map((c, i) => (
              <path
                key={i}
                data-design-circle-idx={i}
                d={handCircle(c.cx, c.cy, c.rx, c.ry, c.rot)}
                stroke="#9A1414"
                fill="none"
                strokeWidth={i === 0 ? 2.2 : 1.7}
                strokeLinecap="round"
                style={{ filter: "drop-shadow(0 0 3px rgba(154,20,20,0.36))" }}
              />
            ))}

            {PINS.map((p, i) => (
              <circle
                key={i}
                data-design-pin-idx={i}
                cx={p.cx}
                cy={p.cy}
                r={i === PINS.length - 1 ? 4.5 : 3}
                fill={i === PINS.length - 1 ? "#AD0F0F" : "#8A1818"}
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.70))" }}
              />
            ))}
          </svg>

          {/* ── All other images (z:10 container) ───────────────────── */}
          <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
            {PIECES.slice(1).map((piece, i) => (
              // All pieces render in the DOM; hidden ones start at opacity:0 and
              // are skipped by the stagger so they stay invisible on the normal site.
              <div
                key={i + 1}
                className="par-img"
                data-piece-index={i + 1}
                style={{
                  position: "absolute",
                  left: piece.cx - piece.w / 2,
                  top:  piece.cy - piece.w * 0.46,
                  width: piece.w,
                  zIndex: piece.z,
                  opacity: 1,
                }}
              >
                <div className="rot-inner" style={{ transform: `rotate(${piece.rot}deg)` }}>
                  <Image
                    src={piece.src}
                    alt={piece.alt}
                    width={piece.w}
                    height={Math.round(piece.w * 0.72)}
                    style={{ width: "100%", height: "auto", display: "block", filter: IMG_FILTER }}
                    unoptimized
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Film grain (z:8) ─────────────────────────────────────────── */}
        <div aria-hidden="true" className="mo-archival-grain" style={{ zIndex: 8 }} />

        {/* ── Soft center spotlight (z:9) ──────────────────────────────── */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 9,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse 70% 65% at 50% 50%, rgba(245,228,185,0.07) 0%, transparent 100%)",
          }}
        />
      </div>
    </section>
  );
}
