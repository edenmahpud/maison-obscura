"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { RED_INK_COLOR, RED_INK_STROKE_WIDTH } from "@/components/effects/redInk";
import { useLazyVideoSrc } from "@/components/effects/useLazyVideoSrc";

gsap.registerPlugin(ScrollTrigger);

// ── Figma frame 818-1206: landscape 3840 × 1941 ──────────────────────────────
// Coordinate conversion (90° CW rotation):
//   browser_left  = figma_top  / 1941 × 100vw
//   browser_top   = (3840 − figma_left_visual − outer_w) / 3840 × SECTION_H
//   browser_width = figma_outer_h / 1941 × 100vw
//   browser_rot   = figma_inner_rot − 90°
//
// SECTION_H drives the btop() math — keep at 4000.
// SECTION_CSS_H is the actual rendered height (trims empty space below star14/15).
const FIGMA_W       = 3840;
const FIGMA_H       = 1941;
const SECTION_H     = 4000;  // coordinate baseline — do not change
const SECTION_CSS_H = 3280;  // actual CSS height; clips blank space after last image
const QUOTE_PIN_SCROLL = 1200;

function vw(px: number): string { return `${((px / FIGMA_H) * 100).toFixed(2)}vw`; }
function vy(px: number): string { return `${((px / FIGMA_W) * SECTION_H).toFixed(0)}px`; }
function btop(figmaLeftVisual: number, figmaOuterW: number): string {
  return vy(FIGMA_W - figmaLeftVisual - figmaOuterW);
}
const imgStyle: React.CSSProperties = { width: "100%", height: "auto", display: "block" };

function isDesignMode() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("designMode") === "true";
}

// ── Red investigation circle paths (hand-drawn ovals, viewBox 0 0 100 100) ───
const CIRCLE_PATH_1 =
  "M 50 6 C 74 2 97 22 96 50 C 95 78 75 98 50 96 C 25 94 2 75 4 50 " +
  "C 6 25 24 10 50 6 Z";
// (CIRCLE_PATH_2 removed with the marking that sat over the woman in star5.)
const CIRCLE_PATH_3 =
  "M 48 5 C 73 2 97 24 96 50 C 95 76 73 97 49 95 C 25 93 3 72 5 48 " +
  "C 7 24 22 8 48 5 Z";

// ── Quote text ──────────────────────────────────────────────────────────────
// No em-dash. "Maison Obscura" (54–67) glows; "hide" (122–125) blurs.
const MAISON_START = 54;
const MAISON_END   = 67;
const HIDE_START   = 122;
const HIDE_END     = 125;
const QUOTE_PARTS: { text: string; color: string }[] = [
  { text: "In a world divided by fear, Nikolai and Eleanor built ", color: "#bd9969" },
  { text: "Maison Obscura",                                         color: "#ffffff" },
  { text: " a fashion house designed not to reveal women, but to ", color: "#bd9969" },
  { text: "hide",                                                   color: "#bd9969" },
  { text: " them.",                                                 color: "#bd9969" },
];
const CHARS = QUOTE_PARTS.flatMap(p => p.text.split("").map(c => ({ c, color: p.color })));
const TOTAL_CHARS = CHARS.length; // 132

// ── Parallax speeds for image wrappers (max travel ±36px = speed×60) ──────
// 0=star2 1=star4 2=star3 3=star5 4=star7 5=star6 6=star8 7=image564
// 8=star12 9=satr9 10=star13 11=star10 12=star11 13=star14 14=star15 15=video
// 16=star20
const IMG_SPEEDS = [0.5,-0.6,0.35,-0.45,0.3,0.4,-0.35,0.25,-0.3,0.35,-0.4,0.5,-0.35,0.25,-0.3,-0.25,0.3];

export function S09StarSection() {
  const sectionRef      = useRef<HTMLElement | null>(null);
  const quoteSectionRef = useRef<HTMLElement | null>(null);
  const videoRef        = useRef<HTMLVideoElement | null>(null);
  const imgRefs         = useRef<(HTMLDivElement | null)[]>([]);

  useLazyVideoSrc(videoRef, sectionRef, "/assets/star/star-video.mp4");

  const charRefs      = useRef<(HTMLSpanElement | null)[]>([]);
  const maisonWrapRef = useRef<HTMLSpanElement | null>(null);
  const hideWrapRef   = useRef<HTMLSpanElement | null>(null);
  const maisonApplied = useRef(false);
  const hideApplied   = useRef(false);
  const hideTimeout   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Red circle refs. (There is no oval2 — the marking that sat over the woman
  // in star5 was removed; the numbering of the remaining two is left alone so
  // they still match their Figma vector names.)
  const oval1Ref = useRef<SVGPathElement | null>(null);
  const oval3Ref = useRef<SVGPathElement | null>(null);

  // Red investigation thread — connects the three circles top to bottom
  const threadWrapRef = useRef<HTMLDivElement | null>(null);
  const threadPathRef = useRef<SVGPathElement | null>(null);

  // Closing text block red guide lines
  const quoteLine1Ref = useRef<SVGLineElement | null>(null); // horizontal, from left
  const quoteLine2Ref = useRef<SVGLineElement | null>(null); // vertical, below block

  function ir(i: number) {
    return (el: HTMLDivElement | null) => { imgRefs.current[i] = el; };
  }

  // ── Reveal: opacity + filter only (parallax owns y) ───────────────────────
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const ctx = gsap.context(() => {
      const els = gsap.utils.toArray<HTMLElement>("[data-s09]", section);
      els.forEach(el => {
        gsap.set(el, { opacity: 0, filter: "blur(3px)" });
        ScrollTrigger.create({
          trigger: el,
          start: "top 88%",
          onEnter:     () => gsap.to(el, { opacity: 1, filter: "blur(0px)", duration: 0.8, ease: "power2.out" }),
          onLeaveBack: () => gsap.set(el, { opacity: 0, filter: "blur(3px)" }),
        });
      });
    }, section);
    return () => ctx.revert();
  }, []);

  // ── Parallax ──────────────────────────────────────────────────────────────
  // Skipped in Design Mode: this scrubs gsap.set(el, {y}) on every scroll
  // tick for all 16 images, which would silently overwrite any position a
  // Design Mode drag/field edit had just applied on the next scroll event.
  useEffect(() => {
    if (isDesignMode()) return;
    const section = sectionRef.current;
    if (!section) return;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: "top bottom",
        end:   "bottom top",
        scrub: true,
        onUpdate: ({ progress }) => {
          imgRefs.current.forEach((el, i) => {
            if (!el) return;
            gsap.set(el, { y: (IMG_SPEEDS[i] ?? 0) * progress * 60 });
          });
        },
      });
    }, section);
    return () => ctx.revert();
  }, []);

  // ── Red investigation circles: scroll-driven stroke draw ──────────────────
  useEffect(() => {
    const section = sectionRef.current;
    const ovals = [oval1Ref.current, oval3Ref.current];
    if (!section || ovals.some(o => !o)) return;

    ovals.forEach(oval => {
      if (!oval) return;
      oval.setAttribute("stroke-dashoffset", "1");
      oval.style.visibility = "visible";
    });

    const ctx = gsap.context(() => {
      ovals.forEach(oval => {
        if (!oval) return;
        const wrap = oval.closest<HTMLElement>("[data-circle-trigger]") ?? section;
        gsap.to(oval, {
          attr: { "stroke-dashoffset": 0 },
          ease: "none",
          scrollTrigger: {
            trigger: wrap,
            start: "top 70%",
            end:   "top 20%",
            scrub: 1.2,
          },
        });
      });
    }, section);

    return () => ctx.revert();
  }, []);

  // ── Red investigation thread ───────────────────────────────────────────────
  // Rendered fully drawn at all times (see strokeDashoffset="0" in the JSX
  // below) — no separate scroll-triggered "draw-in" animation. An earlier
  // version tied stroke-dashoffset to a second, independent ScrollTrigger
  // (onEnter/once) meant to fire once the board scrolled into view; in
  // practice that trigger did not reliably fire in step with how the page
  // actually scrolls, so the path sat almost entirely undrawn (dashoffset
  // ~1) for most of the time the section was on screen — which is exactly
  // what read as a sparse, broken set of fragments rather than one
  // continuous line, since only a sliver of its length was ever drawn.
  // The wrapper instead carries `data-s09` so it fades in via the same
  // opacity/blur reveal every other element on this board already uses
  // (see the effect above) — one proven mechanism instead of two competing
  // ones.

  // ── Quote pin + typewriter + word effects ─────────────────────────────────
  useEffect(() => {
    const section = quoteSectionRef.current;
    if (!section) return;
    charRefs.current.forEach(s => { if (s) s.style.opacity = "0"; });
    maisonApplied.current = false;
    hideApplied.current   = false;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start:   "top top",
        end:     `+=${QUOTE_PIN_SCROLL}`,
        pin:     true,
        scrub:   1,
        onUpdate: ({ progress }) => {
          // Red guide lines draw in solid over the first 15% of this pin's
          // scroll, well before the typewriter finishes — then hold complete.
          const lineP = Math.min(1, progress / 0.15);
          quoteLine1Ref.current?.setAttribute("x2", String(lineP * 100));
          quoteLine2Ref.current?.setAttribute("y2", String(lineP * 100));

          const revealed = Math.round(progress * TOTAL_CHARS);
          charRefs.current.forEach((s, i) => {
            if (s) s.style.opacity = i < revealed ? "1" : "0";
          });

          const maisonDone = revealed > MAISON_END;
          if (maisonDone && !maisonApplied.current) {
            maisonApplied.current = true;
            maisonWrapRef.current?.classList.add("s09-glow-active");
          } else if (!maisonDone && maisonApplied.current) {
            maisonApplied.current = false;
            maisonWrapRef.current?.classList.remove("s09-glow-active");
          }

          const hideDone = revealed > HIDE_END;
          if (hideDone && !hideApplied.current) {
            hideApplied.current = true;
            hideTimeout.current = setTimeout(() => {
              if (hideApplied.current) hideWrapRef.current?.classList.add("s09-hide-blur");
            }, 600);
          } else if (!hideDone && hideApplied.current) {
            hideApplied.current = false;
            if (hideTimeout.current) clearTimeout(hideTimeout.current);
            hideWrapRef.current?.classList.remove("s09-hide-blur");
          }
        },
      });
    }, section);
    return () => {
      ctx.revert();
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, []);

  // ── Video: muted loop while visible ──────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const obs = new IntersectionObserver(
      e => { if (e[0].isIntersecting) video.play().catch(() => {}); else video.pause(); },
      { threshold: 0.1 },
    );
    obs.observe(video);
    return () => obs.disconnect();
  }, []);

  // ── Quote content builder ──────────────────────────────────────────────────
  const buildQuoteContent = () => {
    const nodes: React.ReactNode[] = [];
    for (let i = 0; i < MAISON_START; i++) {
      const ci = i;
      nodes.push(<span key={ci} ref={el => { charRefs.current[ci] = el; }} style={{ color: CHARS[ci].color, opacity: 0 }}>{CHARS[ci].c}</span>);
    }
    const maisonKids: React.ReactNode[] = [];
    for (let i = MAISON_START; i <= MAISON_END; i++) {
      const ci = i;
      maisonKids.push(<span key={ci} ref={el => { charRefs.current[ci] = el; }} style={{ opacity: 0 }}>{CHARS[ci].c}</span>);
    }
    nodes.push(<span key="maison" ref={maisonWrapRef} className="s09-glow-word" style={{ color: "#ffffff", display: "inline", position: "relative" }}>{maisonKids}</span>);
    for (let i = MAISON_END + 1; i < HIDE_START; i++) {
      const ci = i;
      nodes.push(<span key={ci} ref={el => { charRefs.current[ci] = el; }} style={{ color: CHARS[ci].color, opacity: 0 }}>{CHARS[ci].c}</span>);
    }
    const hideKids: React.ReactNode[] = [];
    for (let i = HIDE_START; i <= HIDE_END; i++) {
      const ci = i;
      hideKids.push(<span key={ci} ref={el => { charRefs.current[ci] = el; }} style={{ opacity: 0 }}>{CHARS[ci].c}</span>);
    }
    nodes.push(<span key="hide" ref={hideWrapRef} className="s09-hide-word" style={{ color: "#bd9969", display: "inline" }}>{hideKids}</span>);
    for (let i = HIDE_END + 1; i < TOTAL_CHARS; i++) {
      const ci = i;
      nodes.push(<span key={ci} ref={el => { charRefs.current[ci] = el; }} style={{ color: CHARS[ci].color, opacity: 0 }}>{CHARS[ci].c}</span>);
    }
    return nodes;
  };

  return (
    <>
      <style>{`
        .s09-glow-word.s09-glow-active { animation: s09GlowPulse 4s ease-out forwards; }
        @keyframes s09GlowPulse {
          0%   { text-shadow:none;filter:none; }
          8%   { text-shadow:0 0 22px rgba(255,248,210,.95),0 0 8px rgba(255,238,170,.85),0 0 2px rgba(255,255,230,.7);filter:brightness(1.5); }
          35%  { text-shadow:0 0 14px rgba(255,242,185,.45);filter:brightness(1.12); }
          100% { text-shadow:none;filter:none; }
        }
        .s09-hide-word.s09-hide-blur { animation: s09HideBlur 2.8s cubic-bezier(.4,0,1,1) forwards; }
        @keyframes s09HideBlur {
          0%   { opacity:1;filter:blur(0); }
          30%  { opacity:.6;filter:blur(3px); }
          100% { opacity:0;filter:blur(16px); }
        }
      `}</style>

      {/* ════════════════════════════════════════════════════════════════════════
          INVESTIGATIVE BOARD
          CSS height = SECTION_CSS_H (trims empty space below last image).
          All coordinate math still uses SECTION_H = 4000.
      ════════════════════════════════════════════════════════════════════════ */}
      <section
        ref={sectionRef}
        aria-label="S09 Star — Investigative Board"
        style={{
          position:   "relative",
          background: "#181818",
          height:     `${SECTION_CSS_H}px`,
          width:      "100%",
          overflowX:  "hidden",
        }}
      >

        {/* ── LABEL STRIP 1 — star1.png banner ────────────────────────────── */}
        <div data-s09 data-design-star-key="img-16" style={{ position: "absolute", left: vw(92.71), top: btop(3587.26, 134.908), width: vw(720.701), zIndex: 2 }}>
          <Image src="/assets/star/star1.png" alt="" aria-hidden width={1440} height={262} style={imgStyle} />
        </div>
        {/* ── "The House Behind the Flash" · Figma 836:1326 ────────────────────
            left=3631.73 top=162.95 outer_w=47.051 outer_h=562.231  rot≈0°   */}
        <div data-s09 style={{
          position: "absolute",
          left: vw(162.95), top: btop(3631.73, 47.051),
          width: vw(562.231), zIndex: 3, pointerEvents: "none",
        }}>
          <p className="font-cormorant" style={{ fontWeight: 400, fontSize: "clamp(14px, 2.08vw, 40px)", lineHeight: 1.09, letterSpacing: "-0.8px", color: "#414141", whiteSpace: "nowrap" }}>
            The House Behind the Flash
          </p>
        </div>

        {/* ── star2 — flags · parallax 0 ───────────────────────────────────── */}
        <div ref={ir(0)} data-design-star-key="img-0" style={{ position: "absolute", left: vw(90.38), top: btop(3158.32, 413.844), width: vw(895.208), zIndex: 2 }}>
          <div data-s09>
            <Image src="/assets/star/star2.png" alt="Soviet and American flags" width={1786} height={818} style={imgStyle} />
          </div>
        </div>

        {/* ── star4 — medal · parallax 1 ───────────────────────────────────── */}
        <div ref={ir(1)} data-design-star-key="img-1" style={{ position: "absolute", left: vw(1298.55), top: btop(3226.02, 517.789), width: vw(517.789), zIndex: 4 }}>
          <div data-s09>
            <Image src="/assets/star/star4.png" alt="Soviet star medal" width={1042} height={1042} style={imgStyle} />
          </div>
        </div>

        {/* ── Red circle 1 · Vector14 · near strip 1 / star4 ───────────────── */}
        {/* Figma: left=3358.77 top=1425.53 w=246.6 h=252.135 → browser: left=vw(1425.53) top=239px */}
        <div
          data-circle-trigger
          data-design-star-key="circle-0"
          style={{ position: "absolute", left: vw(1425.53), top: "239px", width: vw(246.6), aspectRatio: "246.6 / 252.135", zIndex: 6, pointerEvents: "none" }}
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%", overflow: "visible" }}>
            <path
              ref={oval1Ref}
              d={CIRCLE_PATH_1}
              fill="none"
              stroke={RED_INK_COLOR}
              strokeWidth={RED_INK_STROKE_WIDTH}
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset="1"
              style={{ visibility: "hidden" }}
            />
          </svg>
        </div>

        {/* ── star3 — US roundel (scaleY −1) · parallax 2 ──────────────────── */}
        <div ref={ir(2)} data-design-star-key="img-2" style={{ position: "absolute", left: vw(263.27), top: btop(2863.11, 442.17), width: vw(587.375), zIndex: 3 }}>
          <div data-s09>
            <Image src="/assets/star/star3.png" alt="US Air Force star roundel" width={1170} height={878}
              style={{ ...imgStyle, transform: "scaleY(-1)" }} />
          </div>
        </div>

        {/* ── star5 — large tilted portrait 10.15° · parallax 3 ────────────── */}
        <div ref={ir(3)} data-design-star-key="img-3" style={{ position: "absolute", left: vw(988.98), top: btop(2626.82, 735.847), width: vw(627.967), zIndex: 3 }}>
          <div data-s09 style={{ borderRadius: "19px", overflow: "hidden", transform: "rotate(10.15deg)", transformOrigin: "top left" }}>
            <Image src="/assets/star/star5.png" alt="" aria-hidden width={1042} height={1309} style={imgStyle} />
          </div>
        </div>

        {/* ── star7 — small angled photo · parallax 4 ──────────────────────── */}
        {/* Figma: 818:1225  left=2317.78  top=53.26  w=354.199 h=394.751  inner rot=105.01° → browser 15.01° */}
        <div ref={ir(4)} data-design-star-key="img-4" style={{ position: "absolute", left: vw(53.26), top: btop(2317.78, 354.199), width: vw(394.751), zIndex: 3 }}>
          <div data-s09 style={{ transform: "rotate(15.01deg)", transformOrigin: "top left" }}>
            <Image src="/assets/star/star7.png" alt="" aria-hidden width={685} height={574} style={imgStyle} />
          </div>
        </div>

        {/* ── "this mark became…" — sibling annotation near star7 ─────────────
            Figma 818:1226  left=2399.23  top=118.55  w=181.612 h=265.267
            inner rot=103.69° → browser 13.69°  font=24px  capitalize         */}
        <div data-s09 style={{
          position: "absolute",
          left: vw(118.55), top: btop(2399.23, 181.612), width: vw(241.84),
          transform: "rotate(13.69deg)", transformOrigin: "top left", zIndex: 4, pointerEvents: "none",
        }}>
          <p style={{
            fontFamily: "var(--font-courier-prime)",
            fontSize: "clamp(15px, 1.24vw, 30px)",
            lineHeight: 1.32, letterSpacing: "-0.48px",
            color: "#333232", textTransform: "capitalize",
          }}>
            this mark became the first language of the brand
          </p>
        </div>

        {/* ── star-video · parallax 15 ──────────────────────────────────────── */}
        <div ref={ir(15)} data-design-star-key="img-15" style={{ position: "absolute", left: vw(275.35), top: btop(2601.11, 320.042), width: vw(562.713), height: vy(320.042), zIndex: 4 }}>
          <div data-s09 style={{ width: "100%", height: "100%" }}>
            <video ref={videoRef} muted loop playsInline preload="metadata"
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
          </div>
        </div>

        {/* ── star6 — small angled photo · parallax 5 ──────────────────────── */}
        <div ref={ir(5)} data-design-star-key="img-5" style={{ position: "absolute", left: vw(1369.5), top: btop(2503.28, 368.915), width: vw(422.715), zIndex: 3 }}>
          <div data-s09 style={{ transform: "rotate(-9.08deg)", transformOrigin: "top left" }}>
            <Image src="/assets/star/star6.png" alt="" aria-hidden width={768} height={640} style={imgStyle} />
          </div>
        </div>

        {/* ── star8 — oval portrait (intentional oval clip) · parallax 6 ─────
            Figma inner rot=80.63° → browser −9.37°                           */}
        <div ref={ir(6)} data-design-star-key="img-6" style={{ position: "absolute", left: vw(432.04), top: btop(2153.53, 459.584), width: vw(469.653), height: vy(459.584), zIndex: 3 }}>
          <div data-s09 style={{ width: "100%", height: "100%", overflow: "hidden", borderRadius: "155px", transform: "rotate(-9.37deg)", transformOrigin: "top left" }}>
            <Image src="/assets/star/star8.png" alt="Period portrait photograph" fill sizes="24vw" style={{ objectFit: "cover" }} />
          </div>
        </div>

        {/* ── "Photograph of unidentified customer…" ───────────────────────────
            Figma 856:6  left=2564.28  top=1435.05  inner rot=78.6° → −11.4°
            font=22px                                                          */}
        <div data-s09 style={{
          position: "absolute",
          left: vw(1435.05), top: btop(2564.28, 217.173), width: vw(265.545),
          transform: "rotate(-11.4deg)", transformOrigin: "top left", zIndex: 4, pointerEvents: "none",
        }}>
          <p style={{
            fontFamily: "var(--font-courier-prime)",
            fontSize: "clamp(14px, 1.13vw, 27px)",
            lineHeight: 1.27, letterSpacing: "-0.44px", color: "#333232", textTransform: "capitalize",
          }}>
            Photograph of an unidentified customer holding a Maison Obscura package, dated approximately 1956.
          </p>
        </div>

        {/* ── image564 — central archive photo, rounded corners · parallax 7 ── */}
        <div ref={ir(7)} data-design-star-key="img-7" style={{ position: "absolute", left: vw(111.68), top: btop(1415.03, 577.803), width: vw(889.099), zIndex: 3 }}>
          <div data-s09 style={{ borderRadius: "17px", overflow: "hidden" }}>
            <Image src="/assets/star/image 564.png" alt="Maison Obscura archive" width={1772} height={1146} style={imgStyle} />
          </div>
        </div>

        {/* The second red marking used to sit here — a curved stroke that fell
            inside star5's bounds, over the woman in that portrait. Removed on
            request; star5 itself, the other two circles, and the red thread
            are untouched. Its old Figma reference, in case it's ever wanted
            back: Vector13, left=2850.46 top=1081.31 w=150.712 h=147.691. */}

        {/* ── star12 — small angled photo · parallax 8 ─────────────────────── */}
        {/* Figma 818:1224  left=1223.82 top=779.33 w=354.199 h=394.751  rot=105.01°→15.01° */}
        <div ref={ir(8)} data-s09 data-design-star-key="img-8" style={{ position: "absolute", left: vw(779.33), top: btop(1223.82, 354.199), width: vw(394.751), zIndex: 3 }}>
          <div style={{ transform: "rotate(15.01deg)", transformOrigin: "top left" }}>
            <Image src="/assets/star/star12.png" alt="" aria-hidden width={687} height={576} style={imgStyle} />
          </div>
        </div>
        {/* ── "Nikolai came from…" · Figma 818:1227 ────────────────────────────
            left=calc(50%−608.07)=1311.93  top=845.28
            inner rot=103.15° → 13.15°  font=20px  w=249.417px               */}
        <div data-s09 style={{
          position: "absolute",
          left: vw(845.28), top: btop(1311.93, 183.336), width: vw(249.417),
          transform: "rotate(13.15deg)", transformOrigin: "top left", zIndex: 4, pointerEvents: "none",
        }}>
          <p style={{
            fontFamily: "var(--font-courier-prime)",
            fontSize: "clamp(13px, 1.03vw, 24px)",
            lineHeight: 1.32, letterSpacing: "-0.4px", color: "#181818",
          }}>
            Nikolai came from the Soviet Union.
            <br /><br />
            Eleanor came from the United States.
          </p>
        </div>

        {/* ── LABEL STRIP 2 — star1.png banner ────────────────────────────── */}
        <div data-s09 data-design-star-key="img-17" style={{ position: "absolute", left: vw(94.16), top: btop(2014.47, 133.659), width: vw(490.704), zIndex: 2 }}>
          <Image src="/assets/star/star1.png" alt="" aria-hidden width={1440} height={262} style={imgStyle} />
        </div>
        {/* ── "The Founders" · Figma 839:1328 ──────────────────────────────────
            left=2059.04 top=200.4 outer_w=45.515 outer_h=279.235  rot≈0°
            Nudged up so it sits cleanly on star1.png's banner. */}
        <div data-s09 style={{
          position: "absolute",
          left: vw(200.4), top: `calc(${btop(2059.04, 45.515)} - 22px)`,
          width: vw(279.235), zIndex: 3, pointerEvents: "none",
        }}>
          <p className="font-cormorant" style={{ fontWeight: 400, fontSize: "clamp(14px, 2.08vw, 40px)", lineHeight: 1.09, letterSpacing: "-0.8px", color: "#414141", whiteSpace: "nowrap", textTransform: "capitalize" }}>
            The Founders
          </p>
        </div>

        {/* ── star20 — founders outside the tailor shop, 1953 · parallax 16 ───
            Placed in the one open pocket in this cluster: below "The
            Founders" label, left of satr9, above star13. Sized up (39vw,
            was 34vw) for stronger visual presence while still clearing
            the label above and star13 below. */}
        <div ref={ir(16)} data-design-star-key="img-18" style={{ position: "absolute", left: "1.8vw", top: "1860px", width: "39vw", zIndex: 3 }}>
          <div data-s09 style={{ borderRadius: "10px", overflow: "hidden", transform: "rotate(-4deg)", transformOrigin: "top left" }}>
            <Image src="/assets/star/star20.png" alt="Nikolai and Eleanor outside the tailor shop, 1953" width={1772} height={1146} style={imgStyle} />
          </div>
        </div>

        {/* ── satr9 — full-length founders portrait · parallax 9 ───────────── */}
        <div ref={ir(9)} data-design-star-key="img-9" style={{ position: "absolute", left: vw(1029.81), top: btop(1610.59, 893.845), width: vw(670.244), zIndex: 3 }}>
          <div data-s09>
            <Image src="/assets/star/satr9.png" alt="Portrait from the archive" width={1351} height={1795} style={imgStyle} />
          </div>
        </div>

        {/* ── star13 — angled newspaper note · parallax 10 ─────────────────────
            Figma 818:1229  left=1242.65  top=41.4  w=303.861 h=406.536
            inner rot=73.33° → browser −16.67°
            Answer text lives inside this same rotated wrapper as a sibling
            of the note image, positioned by % of the note's own box. The
            previous version gave each line its own figma-derived left/top
            and its own rotation (−17.93°/−17.81°, not quite the note's
            −16.67°) instead of sharing the note's coordinate space — those
            small independent errors compounded until all three lines
            collapsed onto roughly the same spot and spilled past the
            paper's right/bottom edges. Percentages below are read directly
            off star13.png: the LOCATION/DATE/NOTES rows sit at ~24.5% /
            38.6% / 52.6% of the image height, and their label text ends by
            ~41% of the width, so the answers start at 45%.             */}
        <div ref={ir(10)} data-s09 data-design-star-key="img-10" style={{ position: "absolute", left: vw(41.4), top: btop(1242.65, 303.861), width: vw(406.536), zIndex: 3 }}>
          <div style={{ position: "relative", transform: "rotate(-16.67deg)", transformOrigin: "top left" }}>
            <Image src="/assets/star/star13.png" alt="" aria-hidden width={730} height={428} style={imgStyle} />
            <p style={{
              position: "absolute", left: "45%", top: "24.5%", transform: "translateY(-50%)", margin: 0,
              fontFamily: "var(--font-courier-prime)",
              fontSize: "clamp(10px, 0.78vw, 16px)",
              lineHeight: 1.2, letterSpacing: "-0.3px", color: "#292929", whiteSpace: "nowrap",
            }}>America</p>
            <p style={{
              position: "absolute", left: "45%", top: "38.6%", transform: "translateY(-50%)", margin: 0,
              fontFamily: "var(--font-courier-prime)",
              fontSize: "clamp(10px, 0.78vw, 16px)",
              lineHeight: 1.2, letterSpacing: "-0.3px", color: "#292929", whiteSpace: "nowrap", textTransform: "capitalize",
            }}>1950-1953</p>
            <p style={{
              position: "absolute", left: "45%", top: "52.6%", transform: "translateY(-50%)", margin: 0, width: "50%",
              fontFamily: "var(--font-courier-prime)",
              fontSize: "clamp(9px, 0.68vw, 14px)",
              lineHeight: 1.15, letterSpacing: "-0.3px", color: "#292929",
            }}>
              Nikolai Volkov &amp; Eleanor Voss
            </p>
          </div>
        </div>

        {/* ── Red circle 3 · Vector10 · over star13 area ───────────────────── */}
        {/* Figma: left=1866.85 top=1117.99 w=341.767 h=342.089 → browser: left=vw(1117.99) top=1699px */}
        <div
          data-circle-trigger
          data-design-star-key="circle-2"
          style={{ position: "absolute", left: vw(1117.99), top: "1699px", width: vw(341.767), aspectRatio: "341.767 / 342.089", zIndex: 6, pointerEvents: "none" }}
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%", overflow: "visible" }}>
            <path
              ref={oval3Ref}
              d={CIRCLE_PATH_3}
              fill="none"
              stroke={RED_INK_COLOR}
              strokeWidth={RED_INK_STROKE_WIDTH}
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset="1"
              style={{ visibility: "hidden" }}
            />
          </svg>
        </div>

        {/* ── Red investigation thread — one straight spine spanning the whole ──
            board. Bounding box covers the full board WIDTH (0 → 100%) and the
            full HEIGHT (0 → SECTION_CSS_H) so it runs the entire image
            sequence top to bottom, not just a narrow column.
            The path is a single, gently-curved, strictly top-to-bottom
            monotonic line (no back-and-forth zigzag) — the same restrained
            "one continuous spine" character as the Happy (S04) section's own
            thread, which likewise never doubles back on itself.
            viewBox height (170.8, not 100) matches this container's real
            aspect ratio at the ~1920px reference width (SECTION_CSS_H/1920×
            100 ≈ 170.8), so the x/y scale factors applied by
            preserveAspectRatio="none" are equal. That's what keeps the
            non-scaling stroke a CONSTANT width along the whole path — with a
            distorted (100×100) viewBox, a path with segments running in
            different directions gets stroked at different effective widths
            depending on local angle, which is what was reading as "uneven
            thickness" before.
            zIndex 1 + color/thickness matched to S04's own thread, which
            sits at z:2 — below every photo (z:3+) there. Every star image
            has zIndex ≥ 2, so z:1 here keeps this thread behind all of them
            (and behind text) — it can only ever show in the gaps. */}
        <div
          ref={threadWrapRef}
          data-s09
          aria-hidden="true"
          data-design-star-key="thread-0"
          style={{ position: "absolute", left: "0px", top: "0px", width: "100%", height: `${SECTION_CSS_H}px`, zIndex: 1, pointerEvents: "none" }}
        >
          <svg viewBox="0 0 100 170.8" preserveAspectRatio="none" style={{ width: "100%", height: "100%", overflow: "visible" }}>
            <path
              ref={threadPathRef}
              d="M 45 0 C 55 25.6 62 42.7 58 68.3 C 54 93.9 48 119.6 52 145.2 C 54 157.1 50 165.7 50 170.8"
              fill="none"
              stroke="#b71c1c"
              strokeWidth="1.5"
              opacity="0.82"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset="0"
              style={{ visibility: "visible" }}
            />
          </svg>
        </div>

        {/* ── star10 — ID card / newspaper · parallax 11 ───────────────────────
            Figma 818:1234  left=1324.3  top=1198.63  inner rot=98.38° → 8.38° */}
        <div ref={ir(11)} data-design-star-key="img-11" style={{ position: "absolute", left: vw(1198.63), top: btop(1324.3, 473.527), width: vw(638.853), zIndex: 3 }}>
          <div data-s09 style={{ transform: "rotate(8.38deg)", transformOrigin: "top left" }}>
            <Image src="/assets/star/star10.png" alt="Archive document" width={1185} height={797} style={imgStyle} />
          </div>
        </div>

        {/* ── star11 — square ID card photo, rounded corners · parallax 12 ──── */}
        <div ref={ir(12)} data-design-star-key="img-12" style={{ position: "absolute", left: vw(1351.28), top: btop(1112.51, 331.776), width: vw(329.787), zIndex: 3 }}>
          <div data-s09 style={{ borderRadius: "13px", overflow: "hidden" }}>
            <Image src="/assets/star/star11.png" alt="Identification card" width={656} height={660} style={imgStyle} />
          </div>
        </div>

        {/* ── star14 — founders couple portrait · parallax 13 ──────────────── */}
        <div ref={ir(13)} data-design-star-key="img-13" style={{ position: "absolute", left: vw(124.83), top: btop(823.51, 427.537), width: vw(567.484), zIndex: 3 }}>
          <div data-s09>
            <Image src="/assets/star/star14.png" alt="Founder portrait" width={1131} height={849} style={imgStyle} />
          </div>
        </div>

        {/* ── star15 — secondary archive photograph · parallax 14 ───────────── */}
        <div ref={ir(14)} data-design-star-key="img-14" style={{ position: "absolute", left: vw(698.78), top: btop(837.94, 401.883), width: vw(534.159), zIndex: 3 }}>
          <div data-s09>
            <Image src="/assets/star/star15.png" alt="" aria-hidden width={1064} height={798} style={imgStyle} />
          </div>
        </div>

        {/* Film grain + vignette */}
        <div aria-hidden="true" className="mo-archival-grain" style={{ zIndex: 200 }} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.5) 100%)", zIndex: 201 }} />
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          CLOSING QUOTE — pinned 100vh; typewriter scrub; word effects
      ════════════════════════════════════════════════════════════════════════ */}
      <section
        ref={quoteSectionRef}
        aria-label="S09 — Closing Quote"
        style={{ position: "relative", background: "#181818", height: "100vh", width: "100%", overflowX: "hidden" }}
      >
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 10vw" }}>
          <div style={{ position: "relative", textAlign: "left", width: "min(720px, 85vw)" }}>
            {/* Red guide lines — horizontal enters from the left and stops a
                few pixels short of the title; vertical drops from the same
                left axis as the title/paragraph, not centered under the
                block. Same solid (non-dashed) endpoint-growth technique as
                Cold. */}
            <div
              aria-hidden="true"
              data-design-star-key="line-0"
              style={{ position: "absolute", top: "44px", left: "-25vw", width: "calc(25vw - 14px)", height: "8px", pointerEvents: "none" }}
            >
              <svg viewBox="0 0 100 10" preserveAspectRatio="none" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                <line
                  ref={quoteLine1Ref}
                  x1="0" y1="5" x2="0" y2="5"
                  stroke={RED_INK_COLOR}
                  strokeWidth={RED_INK_STROKE_WIDTH}
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div
              aria-hidden="true"
              data-design-star-key="line-1"
              style={{ position: "absolute", top: "100%", left: "0", width: "8px", height: "120px", pointerEvents: "none" }}
            >
              <svg viewBox="0 0 10 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                <line
                  ref={quoteLine2Ref}
                  x1="5" y1="0" x2="5" y2="0"
                  stroke={RED_INK_COLOR}
                  strokeWidth={RED_INK_STROKE_WIDTH}
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <p
              className="font-cormorant"
              data-design-star-key="text-title"
              style={{
                fontStyle:     "italic",
                fontWeight:    600,
                fontSize:      "80px",
                lineHeight:    1.53,
                letterSpacing: "-1.6px",
                color:         "#bd9969",
                textTransform: "capitalize",
                whiteSpace:    "nowrap",
                margin:        "0 0 12px",
              }}
            >
              Nikolai and Eleanor
            </p>
            <p
              className="cinematic-text"
              data-design-star-key="text-body"
              style={{ letterSpacing: "-1.4px", margin: 0 }}
            >
              {buildQuoteContent()}
            </p>
          </div>
        </div>
        <div aria-hidden="true" className="mo-archival-grain" style={{ zIndex: 200 }} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.5) 100%)", zIndex: 201 }} />
      </section>
    </>
  );
}
