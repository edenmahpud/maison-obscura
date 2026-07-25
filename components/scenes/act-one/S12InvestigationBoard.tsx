"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { playSfx } from "@/lib/audio";

gsap.registerPlugin(ScrollTrigger);

// ── Board canvas ──────────────────────────────────────────────────────────────
export const BOARD_W = 1480;
export const BOARD_H = 1000;

// ── Nikolai identification — single-element zoom/crossfade target ────────────
// Values carried over from the retired S12WantedTransition: same photo, same
// measured face positions, so the identification reads as a continuation
// rather than a second, differently-cropped copy of the same evidence.
const ARCHIVAL_FACE_X = 0.618; // Nikolai's face within star20.png (piece 19)
const ARCHIVAL_FACE_Y = 0.205;
const WANTED_SRC        = "/assets/WANTED.png";
const WANTED_NATURAL_W  = 983;
const WANTED_NATURAL_H  = 950;
const WANTED_FACE_X     = 0.855; // his FBI mugshot, frontal, within the poster
const WANTED_FACE_Y     = 0.645;
const ZOOM_WANTED       = 6.7;   // crossfade-matching tightness on the mugshot

// Bottom-right signature block ("JOHN EDGAR HOOVER, DIRECTOR" / "Federal
// Bureau of Investigation, Washington 25, D. C."), measured directly in the
// poster's own natural pixel space (983×950) so the circle stays locked to
// the text at any render size. Values carried over from the retired
// S12WantedTransition.
const HOOVER_CIRCLE = { cx: 760, cy: 888, rx: 195, ry: 45, rot: -2 };

// Rect (in viewport px) of an image rendered with object-fit: contain inside
// a full-viewport box. Sizing the wrapper to exactly this rect — instead of
// scaling a full-viewport box with object-fit:cover, which crops edges to
// fill — means "scale: 1" shows the complete poster with nothing cropped
// off, and every intermediate scale zooms/reveals against the image's own
// true bounds rather than a viewport-cropped version of it.
function containRect(naturalW: number, naturalH: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.min(vw / naturalW, vh / naturalH);
  const w = naturalW * scale;
  const h = naturalH * scale;
  return { w, h, left: (vw - w) / 2, top: (vh - h) / 2 };
}

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
  const revealSoundPlayed = useRef(false);
  const circleSoundPlayed = useRef(false);

  // Nikolai identification crossfade — single fixed-viewport element that
  // fades in as the board's own star20 piece (Nikolai's face) fades out.
  const wantedPortraitRef = useRef<HTMLDivElement | null>(null);
  const wantedInnerRef    = useRef<HTMLDivElement | null>(null);
  const hooverCircleRef   = useRef<SVGPathElement | null>(null);
  const crossfadeFlashRef = useRef<HTMLDivElement | null>(null);

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
  // In design mode the sticky is immediately visible (full board, no reveal)
  // so it stays editable. Otherwise this is one continuous scrubbed timeline
  // across the whole assembly sequence:
  //   stage 1 (0–8)    the dark wall itself sharpens — board still empty
  //   stage 2 (8–14)   first main document (the logo) settles in
  //   stage 3 (14–20)  second image settles in
  //   stage 4 (20–75)  every remaining photograph/note, one by one
  //   stage 5 (75–85)  red investigation circles draw in
  //   stage 6 (85–96)  red connecting threads draw + pins fade in
  //   stage 7 (96–100) hold — board fully assembled before the focus-zoom
  //                     effect (its own ScrollTrigger, starting at -200%) begins
  // A single scrub timeline makes every stage reversible for free — scrolling
  // up simply plays it backwards.
  useEffect(() => {
    const section = sectionRef.current;
    const sticky  = stickyRef.current;
    const board   = boardRef.current;
    if (!section || !sticky || !board) return;

    if (isDesignMode()) {
      gsap.set(sticky, { opacity: 1, filter: "blur(0px)" });
      return;
    }

    gsap.set(sticky, { opacity: 0, filter: "blur(20px)" });

    const ctx = gsap.context(() => {
      const allPieceEls = Array.from(
        board.querySelectorAll<HTMLElement>(".par-img[data-piece-index]"),
      );
      const mainDocEl   = allPieceEls.find((el) => el.dataset.pieceIndex === "0");
      const secondImgEl = allPieceEls.find((el) => el.dataset.pieceIndex === "1");
      const restEls     = allPieceEls.filter((el) => el !== mainDocEl && el !== secondImgEl);

      const innerOf = (el: HTMLElement) => el.querySelector<HTMLElement>(".rot-inner");
      const rotOf   = (el: HTMLElement) =>
        PIECES[parseInt(el.dataset.pieceIndex ?? "0", 10)]?.rot ?? 0;

      // Every piece settles from slightly shrunk/rotated/dropped-down into its
      // exact final cx/cy/w/rot — never past it — so the finished board matches
      // the existing composition exactly.
      const revealPiece = (tl: gsap.core.Timeline, el: HTMLElement | undefined, at: number, dur: number) => {
        if (!el) return;
        tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: dur, ease: "none" }, at);
        const inner = innerOf(el);
        if (!inner) return;
        const rot = rotOf(el);
        tl.fromTo(
          inner,
          { scale: 0.96, y: 14, rotation: rot + 6 },
          { scale: 1, y: 0, rotation: rot, duration: dur, ease: "power2.out" },
          at,
        );
      };

      const threadEls = Array.from(board.querySelectorAll<SVGPathElement>("[data-design-thread-idx]"));
      const circleEls = Array.from(board.querySelectorAll<SVGPathElement>("[data-design-circle-idx]"));
      const pinEls    = Array.from(board.querySelectorAll<SVGCircleElement>("[data-design-pin-idx]"));

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top -20%",
          end:   "top -190%",
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            // Evidence (paper) settles in first; the red circles get their own
            // cue once the board itself is fully assembled.
            if (self.progress > 0.08 && !revealSoundPlayed.current) {
              revealSoundPlayed.current = true;
              playSfx("paper");
            } else if (self.progress <= 0.08 && revealSoundPlayed.current) {
              revealSoundPlayed.current = false;
            }
            if (self.progress > 0.75 && !circleSoundPlayed.current) {
              circleSoundPlayed.current = true;
              playSfx("redCircle");
            } else if (self.progress <= 0.75 && circleSoundPlayed.current) {
              circleSoundPlayed.current = false;
            }
          },
        },
      });

      // ── Stage 1: the wall/board itself resolves — nothing on it yet ────────
      tl.to(sticky, { opacity: 1, filter: "blur(0px)", ease: "none", duration: 8 }, 0);

      // ── Stage 2 / 3: the two lead pieces get their own dedicated beat ───────
      revealPiece(tl, mainDocEl, 8, 6);
      revealPiece(tl, secondImgEl, 14, 6);

      // ── Stage 4: everything else, staggered one by one ──────────────────────
      restEls.forEach((el, i) => {
        const at = 20 + (55 * i) / Math.max(1, restEls.length - 1);
        revealPiece(tl, el, at, 4);
      });

      // ── Stage 5: red investigation circles draw in ──────────────────────────
      circleEls.forEach((el, i) => {
        const at = 75 + (8 * i) / Math.max(1, circleEls.length - 1);
        tl.fromTo(
          el,
          { opacity: 0, strokeDashoffset: 1 },
          { opacity: 1, strokeDashoffset: 0, duration: 6, ease: "none" },
          at,
        );
      });

      // ── Stage 6: red connecting threads draw in, pins settle with them ──────
      threadEls.forEach((el, i) => {
        const at = 85 + (9 * i) / Math.max(1, threadEls.length - 1);
        tl.fromTo(
          el,
          { opacity: 0, strokeDashoffset: 1 },
          { opacity: 1, strokeDashoffset: 0, duration: 5, ease: "none" },
          at,
        );
      });
      pinEls.forEach((el, i) => {
        const at = 88 + (8 * i) / Math.max(1, pinEls.length - 1);
        tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 4, ease: "none" }, at);
      });

      // ── Stage 7 (96–100): implicit hold — nothing scheduled here, so the
      // fully assembled board just sits still before the focus-zoom effect
      // (its own ScrollTrigger starting at -200%) takes over.
    }, section);

    // This section sits deep in a very long page with many components above
    // it (videos, 3D canvases, lazy images) still settling their own layout
    // after mount. If ScrollTrigger computes this trigger's start/end before
    // that settles, every position ends up wrong. Refresh once the full page
    // (all images/fonts) has finished loading to recalculate against final
    // layout, plus a short fallback timer in case "load" already fired.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    const fallback = window.setTimeout(refresh, 1200);

    return () => {
      window.removeEventListener("load", refresh);
      window.clearTimeout(fallback);
      ctx.revert();
    };
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


  // ── Investigative focus — Nikolai's identification ───────────────────────
  //
  // Scroll map (section height 900vh, sticky active for 800vh):
  //
  //   0– 75vh    board blur-in from S11
  //   75–200vh   stagger plays; viewer examines full board (125vh hold)
  //   200–750vh  ← THIS ScrollTrigger (550vh, ≈55vh per unit); within its own
  //               0–1 progress:
  //     0.00–0.38  the couple's photo (star20, piece 19) enlarges, then zooms
  //                + pans onto Nikolai's face specifically (Eleanor drifts
  //                out of frame) — same single element the whole time
  //     0.38–0.50  crossfade directly into his matching FBI portrait (matched
  //                face position, brief blur + exposure-flash pulse, never a gap)
  //     0.50–0.66  zoom OUT from the tight face-crossfade to reveal the
  //                complete, uncropped wanted.png — a dedicated full-poster
  //                state, not a peek behind it toward the board or FBISection
  //     0.66–0.74  hold the complete poster dead still, centered, full-screen
  //     0.74–0.82  a red hand-drawn circle draws itself in around the
  //                Hoover / FBI signature block, bottom-right of the poster
  //     0.82–0.90  hold on the marked poster — signature circled, still visible
  //     0.90–1.00  the poster fades away, handing off to FBISection's own
  //                independent fade-in beneath it. The board and Nikolai's
  //                photo do NOT return; only scrolling back up past
  //                0.50/0.38 undoes those earlier stages.
  //   750–800vh  post-scrub hold before section unsticks
  //
  // Nikolai's photo (star20, piece 19) is the one persistent DOM element
  // animated throughout — no second copy of it is ever created. The FBI
  // portrait is a different photo entirely (WANTED.png), so it's necessarily
  // a separate element, but it only exists once too.
  useEffect(() => {
    if (isDesignMode()) return;

    const section      = sectionRef.current;
    const board        = boardRef.current;
    const wanted       = wantedPortraitRef.current;
    const wantedInner  = wantedInnerRef.current;
    const hooverCircle = hooverCircleRef.current;
    const flash        = crossfadeFlashRef.current;
    if (!section || !board || !wanted || !wantedInner || !hooverCircle || !flash) return;

    // Size the inner wrapper to the poster's exact contain-fit rect so
    // "scale: 1" shows the complete, uncropped image for the dedicated
    // full-poster hold state (see containRect()).
    const wr = containRect(WANTED_NATURAL_W, WANTED_NATURAL_H);
    wantedInner.style.width  = `${wr.w}px`;
    wantedInner.style.height = `${wr.h}px`;
    wantedInner.style.left   = `${wr.left}px`;
    wantedInner.style.top    = `${wr.top}px`;

    // Piece index 19 (star20.png, cx:1363, cy:188, w:258) is Nikolai & Eleanor's photo.
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

    // Scale so the piece covers the full viewport — same "cover" math as before.
    const SCALE = Math.max(vw / (imgW * boardScale), vh / (imgH * boardScale)) * 1.02;

    // Nikolai's face within the piece (board coords), not the photo's
    // geometric middle — the translate below centers HIM specifically,
    // so Eleanor (elsewhere in frame) drifts outside the zoomed view.
    const pieceLeft  = 1363 - imgW / 2;    // 1234
    const pieceTop   = 188  - imgW * 0.46; // ≈69.32
    const faceBoardX = pieceLeft + ARCHIVAL_FACE_X * imgW;
    const faceBoardY = pieceTop  + ARCHIVAL_FACE_Y * imgH;
    const TX = -(faceBoardX - 740);
    const TY = -(faceBoardY - 500);

    // This effect and the board-reveal timeline are two independent,
    // continuously-rendering ScrollTriggers that both touch otherEls'
    // opacity (one to reveal it, this one to dissolve it later). A
    // declarative tween here — fromTo or to — inevitably keeps reasserting
    // its own "at rest" value on every scroll frame even while this trigger
    // is outside its own [start, end] window, fighting the board-reveal
    // timeline's opposite opinion of what "at rest" means and leaving pieces
    // stuck however this effect last set them, with no way to reverse.
    // Driving it manually here and doing nothing at all while !self.isActive
    // means this effect only ever touches these elements within its own
    // range, in either scroll direction — outside it, whatever the
    // board-reveal timeline (or the natural settled end-state) set stands
    // untouched.
    const ease = gsap.parseEase("power2.inOut");
    const lerp01 = (p: number, lo: number, hi: number) => Math.min(1, Math.max(0, (p - lo) / (hi - lo)));

    const P_ZOOM      = 0.38; // couple's photo enlarges, then zoom+pan onto Nikolai's face completes
    const P_CROSSFADE = 0.50; // crossfade into the matching FBI portrait completes
    const P_REVEAL    = 0.66; // zoom-out completes — the complete, uncropped wanted.png is visible
    const P_HOLD1     = 0.74; // dedicated full-poster hold ends, red circle starts drawing
    const P_CIRCLE    = 0.82; // Hoover-signature circle finishes drawing
    const P_HOLD2     = 0.90; // hold on the marked poster ends; hands off into FBISection

    const st = ScrollTrigger.create({
      trigger: section,
      start:           "top -200%",
      end:             "top -750%",
      scrub:           2,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        if (!self.isActive) return;
        const p = self.progress;

        // F: "focus intensity" — rises across the enlarge + zoom-onto-face
        // stages, then plateaus at 1 for the rest of this trigger's range.
        // It never falls back on its own: the board and Nikolai's photo are
        // gone for good once we've moved past him, going forward —
        // scrolling back up still works, since re-entering [0,P_ZOOM]
        // retraces this same curve in reverse.
        const F = ease(lerp01(p, 0, P_ZOOM));

        // C: crossfade progress from Nikolai's face to his FBI portrait.
        // Also never falls back on its own — same reasoning as F.
        const C = ease(lerp01(p, P_ZOOM, P_CROSSFADE));

        // Combined "FBI portrait showing" amount — 0 early, 1 from the
        // crossfade onward (no automatic return to 0).
        const hide = C * F;

        otherEls.forEach((el) => { el.style.opacity = String(1 - F); });
        if (svgEl) svgEl.style.opacity = String(1 - F);

        // Zoom anchored on Nikolai's face (not the box centre) — scaling
        // grows the frame around him specifically. Kept above FBISection's
        // own zIndex:50 sticky so its later fade-in never shows through
        // while Nikolai's photo is still on screen.
        const focusScale = 1 + (SCALE - 1) * F;
        focusEl.style.zIndex = "53";
        focusEl.style.transformOrigin = `${(ARCHIVAL_FACE_X * 100).toFixed(2)}% ${(ARCHIVAL_FACE_Y * 100).toFixed(2)}%`;
        focusEl.style.transform =
          `translate(${(TX * F).toFixed(2)}px, ${(TY * F).toFixed(2)}px) scale(${focusScale.toFixed(4)})`;
        focusEl.style.opacity = String(1 - hide);
        // Brief blur pulse only right at the crossfade itself — never a
        // sustained blurred frame. CSS filter is rasterized *before* the
        // transform scale is applied, so a blur radius set here gets
        // magnified by the same factor on screen (a 7px blur reads as ~50px
        // at 7x zoom) — dividing by the current scale keeps it visually
        // subtle regardless of how zoomed in the element is.
        const crossfadeBlur = Math.sin(Math.min(1, lerp01(p, P_ZOOM, P_CROSSFADE)) * Math.PI) * F;
        const focusBlurPx = (crossfadeBlur * 7) / Math.max(1, focusScale);
        focusEl.style.filter = focusBlurPx > 0.05 ? `blur(${focusBlurPx.toFixed(2)}px)` : "";

        // FBI portrait: crossfades in tightly zoomed on Nikolai's matched
        // face position, then eases out to scale 1 — the complete, uncropped
        // poster — across P_CROSSFADE→P_REVEAL. lerp01 clamps past P_REVEAL,
        // so this naturally holds at exactly scale 1 (dead still, nothing
        // cropped) for the rest of the sequence (the full-poster hold, the
        // circle draw, and the marked-state hold all share this same static
        // framing — no extra branching needed). Only past P_HOLD2 does it
        // fade away, handing off to FBISection (a separate fixed overlay,
        // independently fading in beneath at zIndex:50) rather than
        // dissolving back to the reassembled board or the cropped-zoom framing.
        const revealOut = ease(lerp01(p, P_CROSSFADE, P_REVEAL));
        const wantedScale = ZOOM_WANTED - (ZOOM_WANTED - 1) * revealOut;
        wantedInner.style.transformOrigin = `${(WANTED_FACE_X * 100).toFixed(2)}% ${(WANTED_FACE_Y * 100).toFixed(2)}%`;
        wantedInner.style.transform = `scale(${wantedScale.toFixed(4)})`;
        const wantedFadeOut = 1 - ease(lerp01(p, P_HOLD2, 1));
        wanted.style.opacity = String(hide * wantedFadeOut);
        const wantedBlurPx = (crossfadeBlur * 5) / wantedScale;
        wantedInner.style.filter = wantedBlurPx > 0.05 ? `blur(${wantedBlurPx.toFixed(2)}px)` : "";

        // Hoover-signature circle — only starts drawing once the full,
        // uncropped poster has already been held on screen for a beat
        // (P_HOLD1), draws in across P_HOLD1→P_CIRCLE, then stays fully
        // drawn through the P_CIRCLE→P_HOLD2 marked-state hold. A quick
        // opacity ramp keeps the stroke from popping in at full weight the
        // instant the dash starts unwinding — same technique used for every
        // other hand-drawn circle on this board.
        const circleT = ease(lerp01(p, P_HOLD1, P_CIRCLE));
        hooverCircle.style.opacity = String(Math.min(1, circleT * 4));
        hooverCircle.style.strokeDashoffset = String(1 - circleT);

        // Brief exposure-flash pulse right at the crossfade's midpoint —
        // quick in and out, a soft veil rather than a white overlay.
        const flashT = Math.sin(Math.min(1, lerp01(p, P_ZOOM, P_CROSSFADE)) * Math.PI);
        flash.style.opacity = String((flashT * F * 0.16).toFixed(3));
      },
    });

    return () => { st.kill(); };
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
                pathLength="1"
                d={d}
                stroke="#8A1818"
                fill="none"
                strokeWidth={i < 7 ? 1.55 : 1.15}
                strokeLinecap="round"
                style={{
                  filter: "drop-shadow(0 0 2px rgba(138,24,24,0.30))",
                  strokeDasharray: "1",
                  strokeDashoffset: "0",
                }}
              />
            ))}

            {CIRCLES.map((c, i) => (
              <path
                key={i}
                data-design-circle-idx={i}
                pathLength="1"
                d={handCircle(c.cx, c.cy, c.rx, c.ry, c.rot)}
                stroke="#9A1414"
                fill="none"
                strokeWidth={i === 0 ? 2.2 : 1.7}
                strokeLinecap="round"
                style={{
                  filter: "drop-shadow(0 0 3px rgba(154,20,20,0.36))",
                  strokeDasharray: "1",
                  strokeDashoffset: "0",
                }}
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

      {/* ── Nikolai's FBI portrait — crossfade target for the investigative-
          focus sequence above. Deliberately a *sibling* of stickyRef, not
          nested inside it: stickyRef carries a CSS `filter` (for the
          board's own blur-in/out), and per spec any non-"none" filter on an
          ancestor makes that ancestor the containing block for `position:
          fixed` descendants — trapping this overlay inside stickyRef's own
          (lower) stacking context, where no z-index on this element could
          ever beat FBISection's separately-positioned fixed overlay, no
          matter how high. Living outside stickyRef lets this genuinely
          escape to the true viewport, where zIndex:51 correctly beats
          FBISection's zIndex:50. Fixed/full-viewport outer wrapper (opacity
          only) so it can crossfade independent of the board's own
          coordinate system; the inner wrapper is sized in JS to the exact
          contain-fit rect of the poster (see containRect()) so "scale: 1"
          shows the complete, uncropped image rather than a viewport-cover
          crop of it — needed for the dedicated full-poster hold state.
          Starts fully transparent; a single instance, never duplicated. */}
      <div
        ref={wantedPortraitRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 51,
          opacity: 0,
          pointerEvents: "none",
          overflow: "hidden",
          // The contain-fit inner box (see containRect()) doesn't
          // necessarily cover every pixel of the viewport if the poster's
          // own aspect ratio doesn't match the screen's — this fills that
          // letterbox margin so the standalone poster state reads as a
          // true full-screen page, not a window with FBISection's own
          // fade-in showing through the edges.
          background: "#0d0b09",
        }}
      >
        <div ref={wantedInnerRef} style={{ position: "absolute", willChange: "transform, filter" }}>
          <Image
            src={WANTED_SRC}
            alt="FBI Wanted poster — the man identified"
            fill
            unoptimized
            style={{ objectFit: "cover" }}
          />

          {/* Hand-drawn red investigation circle around the Hoover / FBI
              signature block — same drawn-in technique used elsewhere on
              the board. Shares wantedInner's own box exactly (viewBox
              matches the poster's natural pixel size), so it stays
              pixel-locked to the text at any scale/viewport. */}
          <svg
            aria-hidden="true"
            viewBox={`0 0 ${WANTED_NATURAL_W} ${WANTED_NATURAL_H}`}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
          >
            <path
              ref={hooverCircleRef}
              pathLength="1"
              d={handCircle(HOOVER_CIRCLE.cx, HOOVER_CIRCLE.cy, HOOVER_CIRCLE.rx, HOOVER_CIRCLE.ry, HOOVER_CIRCLE.rot)}
              stroke="#9A1414"
              fill="none"
              strokeWidth={2.4}
              strokeLinecap="round"
              style={{
                filter: "drop-shadow(0 0 3px rgba(154,20,20,0.36))",
                strokeDasharray: "1",
                strokeDashoffset: "1",
                opacity: 0,
              }}
            />
          </svg>
        </div>
      </div>

      {/* ── Brief exposure-flash pulse, timed to the crossfade midpoint —
          a soft veil, not a full white overlay. Same sibling-of-stickyRef
          reasoning as the portrait above. ────────────────────────────────── */}
      <div
        ref={crossfadeFlashRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 52,
          opacity: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(255,248,225,0.9) 0%, rgba(255,244,200,0.3) 45%, transparent 75%)",
        }}
      />
    </section>
  );
}
