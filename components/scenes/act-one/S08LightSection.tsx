"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────────────────────────────────────
// S08 LIGHT — four-phase pinned section, Figma frame 818-1182.
//
// PHASE 1 — REVEAL  (4000 px):
//   Black → 8 layers appear one by one.  Paper sound per layer.
//
// PHASE 2 — CARD PIN  (2000 px):
//   Note-card typewriter (Courier Prime). "spark" glow, "hide" blur.
//
// PHASE 3 — HORIZONTAL SCROLL  (5000 px):
//   200vw track slides left 100vw, panning photo collage.  Parallax.
//
// PHASE 4 — QUOTE PIN  (4000 px):
//   Track holds at final position.  Quote text types in letter-by-letter
//   (Cormorant Garamond, centered in right viewport).
//   "same sparkles" → warm glimmer after phrase is complete.
//   "hide" → blur-fade 600 ms after the word appears.
//   Typewriter key sound + sparkle chime.
//
// CANVAS: 3840 × 1080 px (2 × 1920 reference).
//
// REQUIRED AUDIO (public/assets/sounds/sfx/):
//   paper-place.mp3    vol 0.30
//   typewriter-key.mp3 vol 0.25
//   sparkle.mp3        vol 0.35
// ─────────────────────────────────────────────────────────────────────────────

const CANVAS_W         = 1920;
const CANVAS_H         = 1080;
const REVEAL_SCROLL    = 4000;
const CARD_PIN_SCROLL  = 2000;
const HSCROLL_SCROLL   = 5000;
const QUOTE_PIN_SCROLL = 4000;
const TOTAL_SCROLL     = REVEAL_SCROLL + CARD_PIN_SCROLL + HSCROLL_SCROLL + QUOTE_PIN_SCROLL; // 15000

const REVEAL_FRAC      = REVEAL_SCROLL    / TOTAL_SCROLL;  // 0.2667
const CARD_PIN_FRAC    = CARD_PIN_SCROLL  / TOTAL_SCROLL;  // 0.1333
const CARD_END_FRAC    = REVEAL_FRAC + CARD_PIN_FRAC;      // 0.4000
const HSCROLL_FRAC     = HSCROLL_SCROLL   / TOTAL_SCROLL;  // 0.3333
const HSCROLL_END_FRAC = CARD_END_FRAC + HSCROLL_FRAC;     // 0.7333

// ── CARD typewriter (light8.png, Phase 2) ────────────────────────────────────
// '\n' at index 50 → <br>.
// "spark" 9–13  → amber glow.    "hide" 87–90 → blur-fade.
const TW_TEXT       = "A sudden spark of light caught against the fabric.\nSomething in the weave was meant to hide.";
const SPARK_START   = 9;
const SPARK_END     = 13;
const TW_HIDE_START = 87;
const TW_HIDE_END   = 90;
const TW_TOTAL      = TW_TEXT.length; // 92

// ── QUOTE typewriter (right viewport, Phase 4) ────────────────────────────────
// '\n' at indices 42, 99, 133.
// "same sparkles" 4–16 → warm glimmer.   "shine" 127–131 → warm glimmer.
// "hide" 150–153 → blur-fade.
const QUOTE_TEXT      = "The same sparkles returned in every image.\nWhat first looked like beauty began to feel intentional.\nThe light was not there to shine.\nIt was there to hide.";
const Q_SAME_START    = 4;    // "same sparkles" = chars 4–16
const Q_SAME_END      = 16;
const Q_SHINE_START   = 127;  // "shine" = chars 127–131
const Q_SHINE_END     = 131;
const Q_HIDE_START    = 150;
const Q_HIDE_END      = 153;
const QUOTE_TOTAL     = QUOTE_TEXT.length; // 155

// ─────────────────────────────────────────────────────────────────────────────

function vw(px: number): string {
  return `${((px / CANVAS_W) * 100).toFixed(3)}vw`;
}
function vh(px: number): string {
  return `${((px / CANVAS_H) * 100).toFixed(3)}vh`;
}
function playClip(path: string, volume: number): void {
  const a = new Audio(path);
  a.volume = volume;
  a.play().catch(() => {});
}

const PHOTOS = [
  { src: "/assets/light/light1.png", x: 96,      y: 110,    w: 780,     h: 436,     parallax:  0.03 },
  { src: "/assets/light/light3.png", x: 545,     y: 246,    w: 464,     h: 451,     parallax: -0.02 },
  { src: "/assets/light/light2.png", x: 157,     y: 472,    w: 444.565, h: 296.377, parallax:  0.04 },
  { src: "/assets/light/light5.png", x: 444.11,  y: 693.67, w: 489.778, h: 367.333, parallax: -0.03 },
  { src: "/assets/light/light4.png", x: 876,     y: 43,     w: 384.316, h: 288.237, parallax:  0.05 },
  { src: "/assets/light/light7.png", x: 1173.55, y: 256.52, w: 386.483, h: 289.476, parallax: -0.04 },
  { src: "/assets/light/light6.png", x: 876,     y: 492,    w: 477,     h: 357.75,  parallax:  0.03 },
] as const;

const PHOTOS_LEN = PHOTOS.length;      // 7
const NUM_LAYERS = PHOTOS_LEN + 1;     // 8

// ─────────────────────────────────────────────────────────────────────────────

export function S08LightSection() {
  const sectionRef   = useRef<HTMLElement | null>(null);
  const trackRef     = useRef<HTMLDivElement | null>(null);
  const photoRefs    = useRef<(HTMLDivElement | null)[]>([]);
  const cardGroupRef = useRef<HTMLDivElement | null>(null);

  // Card typewriter (Phase 2)
  const charSpansRef = useRef<(HTMLSpanElement | null)[]>([]);
  const sparkWordRef = useRef<HTMLSpanElement | null>(null);
  const hideWordRef  = useRef<HTMLSpanElement | null>(null);

  // Quote typewriter (Phase 4)
  const quoteSpansRef = useRef<(HTMLSpanElement | null)[]>([]);
  const quoteSameRef  = useRef<HTMLSpanElement | null>(null);   // "same sparkles" group
  const quoteShineRef = useRef<HTMLSpanElement | null>(null);   // "shine" group
  const quoteHideRef  = useRef<HTMLSpanElement | null>(null);   // "hide" group

  // Scroll-tick state (no re-render)
  const audioUnlocked    = useRef(false);
  const lastRevealed     = useRef(0);
  const sparkApplied     = useRef(false);
  const hideApplied      = useRef(false);
  const quoteLastRev     = useRef(0);
  const quoteSameApplied  = useRef(false);
  const quoteShineApplied = useRef(false);
  const quoteHideApplied  = useRef(false);
  const paperPlayed      = useRef<boolean[]>(Array(NUM_LAYERS).fill(false));
  const twCooldown       = useRef(0);

  // ── Audio unlock ───────────────────────────────────────────────────────────
  useEffect(() => {
    const unlock = () => { audioUnlocked.current = true; };
    const evts = ["scroll", "wheel", "pointerdown", "touchstart", "keydown"] as const;
    evts.forEach(e => window.addEventListener(e, unlock, { once: true }));
    return () => evts.forEach(e => window.removeEventListener(e, unlock));
  }, []);

  // ── GSAP ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const section = sectionRef.current;
    const track   = trackRef.current;
    const card    = cardGroupRef.current;
    if (!section || !track || !card) return;

    const cardSpans  = charSpansRef.current;
    const quoteSpans = quoteSpansRef.current;

    const photos = photoRefs.current
      .slice(0, PHOTOS_LEN)
      .filter((el): el is HTMLDivElement => el !== null);
    const layers: HTMLDivElement[] = [...photos, card];

    gsap.set(layers, { autoAlpha: 0, scale: 0.97, y: 8, filter: "blur(4px)" });

    const STEP = REVEAL_FRAC / NUM_LAYERS;
    const DUR  = STEP * 1.1;

    const au = audioUnlocked;
    const pp = paperPlayed;
    const cd = twCooldown;

    const playPaper = () => { if (au.current) playClip("/assets/sounds/sfx/paper-place.mp3",    0.30); };
    const playSpark = () => { if (au.current) playClip("/assets/sounds/sfx/sparkle.mp3",        0.35); };
    const playKey   = () => {
      if (!au.current) return;
      const now = Date.now();
      if (now - cd.current < 80) return;
      cd.current = now;
      playClip("/assets/sounds/sfx/typewriter-key.mp3", 0.25);
    };

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger:             section,
          pin:                 true,
          scrub:               1.5,
          end:                 `+=${TOTAL_SCROLL}`,
          invalidateOnRefresh: true,

          onUpdate(self) {
            const p = self.progress;

            // ── PHASE 1: paper sounds ────────────────────────────────────
            for (let i = 0; i < NUM_LAYERS; i++) {
              const thresh = (i + 0.7) * STEP;
              if (p >= thresh && !pp.current[i]) {
                pp.current[i] = true;
                playPaper();
              } else if (p < thresh && pp.current[i]) {
                pp.current[i] = false;
              }
            }

            // ── PHASE 2: card typewriter ─────────────────────────────────
            let cTarget: number;
            if (p < REVEAL_FRAC) {
              cTarget = 0;
            } else if (p >= CARD_END_FRAC) {
              cTarget = TW_TOTAL;
            } else {
              cTarget = Math.min(
                TW_TOTAL,
                Math.floor(((p - REVEAL_FRAC) / CARD_PIN_FRAC) * TW_TOTAL),
              );
            }

            if (cTarget !== lastRevealed.current) {
              const lo = Math.min(cTarget, lastRevealed.current);
              const hi = Math.max(cTarget, lastRevealed.current);
              const fw = cTarget > lastRevealed.current;
              for (let ci = lo; ci < hi; ci++) {
                const s = cardSpans[ci];
                if (s) s.style.visibility = fw ? "visible" : "hidden";
              }
              if (fw && p >= REVEAL_FRAC && p < CARD_END_FRAC) playKey();

              const sparkDone = cTarget > SPARK_END;
              if (sparkDone && !sparkApplied.current) {
                sparkApplied.current = true;
                sparkWordRef.current?.classList.add("s08-spark-active");
              } else if (!sparkDone && sparkApplied.current) {
                sparkApplied.current = false;
                sparkWordRef.current?.classList.remove("s08-spark-active");
              }

              const hideDone = cTarget > TW_HIDE_END;
              if (hideDone && !hideApplied.current) {
                hideApplied.current = true;
                setTimeout(() => {
                  if (hideApplied.current) hideWordRef.current?.classList.add("s08-hide-blur");
                }, 600);
              } else if (!hideDone && hideApplied.current) {
                hideApplied.current = false;
                hideWordRef.current?.classList.remove("s08-hide-blur");
              }

              lastRevealed.current = cTarget;
            }

            // ── PHASE 3: parallax ────────────────────────────────────────
            // hp is clamped to [0,1] within the horizontal scroll window;
            // stays at 1.0 during Phase 4 (track is already at final position).
            if (p > CARD_END_FRAC) {
              const hp     = Math.min(1, (p - CARD_END_FRAC) / HSCROLL_FRAC);
              const travel = track.scrollWidth - window.innerWidth;
              photoRefs.current.forEach((el, i) => {
                if (!el) return;
                gsap.set(el, { x: hp * travel * PHOTOS[i].parallax });
              });
            }

            // ── PHASE 4: quote typewriter ────────────────────────────────
            if (p < HSCROLL_END_FRAC) {
              if (quoteLastRev.current > 0) {
                quoteSpans.forEach(s => { if (s) s.style.visibility = "hidden"; });
                quoteLastRev.current      = 0;
                quoteSameApplied.current  = false;
                quoteShineApplied.current = false;
                quoteHideApplied.current  = false;
                quoteSameRef.current?.classList.remove("s08q-same-active");
                quoteShineRef.current?.classList.remove("s08q-shine-active");
                quoteHideRef.current?.classList.remove("s08q-hide-blur");
              }
            } else {
              const qProg   = Math.min(1, (p - HSCROLL_END_FRAC) / (1 - HSCROLL_END_FRAC));
              const qTarget = Math.min(QUOTE_TOTAL, Math.floor(qProg * QUOTE_TOTAL));

              if (qTarget !== quoteLastRev.current) {
                const lo = Math.min(qTarget, quoteLastRev.current);
                const hi = Math.max(qTarget, quoteLastRev.current);
                const fw = qTarget > quoteLastRev.current;
                for (let ci = lo; ci < hi; ci++) {
                  const s = quoteSpans[ci];
                  if (s) s.style.visibility = fw ? "visible" : "hidden";
                }
                if (fw) playKey();

                // "same sparkles" glimmer — fires once the full phrase is typed
                const sameDone = qTarget > Q_SAME_END;
                if (sameDone && !quoteSameApplied.current) {
                  quoteSameApplied.current = true;
                  quoteSameRef.current?.classList.add("s08q-same-active");
                  playSpark();
                } else if (!sameDone && quoteSameApplied.current) {
                  quoteSameApplied.current = false;
                  quoteSameRef.current?.classList.remove("s08q-same-active");
                }

                // "shine" soft shimmer — fires once the word is fully typed
                const shineDone = qTarget > Q_SHINE_END;
                if (shineDone && !quoteShineApplied.current) {
                  quoteShineApplied.current = true;
                  quoteShineRef.current?.classList.add("s08q-shine-active");
                  playSpark();
                } else if (!shineDone && quoteShineApplied.current) {
                  quoteShineApplied.current = false;
                  quoteShineRef.current?.classList.remove("s08q-shine-active");
                }

                // "hide" blur-fade
                const qHideDone = qTarget > Q_HIDE_END;
                if (qHideDone && !quoteHideApplied.current) {
                  quoteHideApplied.current = true;
                  setTimeout(() => {
                    if (quoteHideApplied.current) quoteHideRef.current?.classList.add("s08q-hide-blur");
                  }, 600);
                } else if (!qHideDone && quoteHideApplied.current) {
                  quoteHideApplied.current = false;
                  quoteHideRef.current?.classList.remove("s08q-hide-blur");
                }

                quoteLastRev.current = qTarget;
              }
            }
          },
        },
      });

      // Phase 1: layer reveals
      layers.forEach((el, i) => {
        tl.fromTo(
          el,
          { autoAlpha: 0, scale: 0.97, filter: "blur(4px)", y: 8 },
          { autoAlpha: 1, scale: 1,    filter: "blur(0px)", y: 0,
            duration: DUR, ease: "power2.out" },
          i * STEP,
        );
      });

      // Phase 3: horizontal scroll — runs [CARD_END_FRAC, HSCROLL_END_FRAC]
      // Phase 4 has no track tween; GSAP holds the track at its final x position.
      tl.to(
        track,
        {
          x:        () => -(track.scrollWidth - window.innerWidth),
          ease:     "none",
          duration: HSCROLL_FRAC,
        },
        CARD_END_FRAC,
      );
    }, section);

    return () => {
      ctx.revert();
      cardSpans.forEach(s =>  { if (s) s.style.visibility = "hidden"; });
      quoteSpans.forEach(s => { if (s) s.style.visibility = "hidden"; });
      lastRevealed.current      = 0;
      sparkApplied.current      = false;
      hideApplied.current       = false;
      quoteLastRev.current       = 0;
      quoteSameApplied.current   = false;
      quoteShineApplied.current  = false;
      quoteHideApplied.current   = false;
      pp.current                = Array(NUM_LAYERS).fill(false);
    };
  }, []);

  // ── Build quote char spans ─────────────────────────────────────────────────
  // "same sparkles" (chars 4–16) wrapped in quoteSameRef group.
  // "shine" (chars 127–131) wrapped in quoteShineRef group.
  // "hide" (chars 150–153) wrapped in quoteHideRef group.
  // '\n' at 42, 99, 133 → <br> (no span).
  const buildQuoteContent = (): React.ReactNode[] => {
    const chars = QUOTE_TEXT.split("");
    const nodes: React.ReactNode[] = [];

    // chars 0–3: "The "
    for (let i = 0; i < Q_SAME_START; i++) {
      const ci = i;
      nodes.push(
        <span key={ci} ref={el => { quoteSpansRef.current[ci] = el; }} style={{ visibility: "hidden" }}>
          {chars[ci]}
        </span>,
      );
    }

    // chars 4–16: "same sparkles" — grouped for glimmer
    const sameKids: React.ReactNode[] = [];
    for (let i = Q_SAME_START; i <= Q_SAME_END; i++) {
      const ci = i;
      sameKids.push(
        <span key={ci} ref={el => { quoteSpansRef.current[ci] = el; }} style={{ visibility: "hidden" }}>
          {chars[ci]}
        </span>,
      );
    }
    nodes.push(
      <span key="qsame" ref={quoteSameRef} className="s08q-same-word" style={{ position: "relative", display: "inline" }}>
        {sameKids}
      </span>,
    );

    // chars 17–126: normal text (with '\n' at 42, 99 → <br>)
    for (let i = Q_SAME_END + 1; i < Q_SHINE_START; i++) {
      const ci = i;
      const c  = chars[ci];
      if (c === "\n") {
        nodes.push(<br key={`nl${ci}`} />);
      } else {
        nodes.push(
          <span key={ci} ref={el => { quoteSpansRef.current[ci] = el; }} style={{ visibility: "hidden" }}>
            {c}
          </span>,
        );
      }
    }

    // chars 127–131: "shine" — grouped for soft shimmer
    const shineKids: React.ReactNode[] = [];
    for (let i = Q_SHINE_START; i <= Q_SHINE_END; i++) {
      const ci = i;
      shineKids.push(
        <span key={ci} ref={el => { quoteSpansRef.current[ci] = el; }} style={{ visibility: "hidden" }}>
          {chars[ci]}
        </span>,
      );
    }
    nodes.push(
      <span key="qshine" ref={quoteShineRef} className="s08q-shine-word" style={{ position: "relative", display: "inline" }}>
        {shineKids}
      </span>,
    );

    // chars 132–149: normal text (with '\n' at 133 → <br>)
    for (let i = Q_SHINE_END + 1; i < Q_HIDE_START; i++) {
      const ci = i;
      const c  = chars[ci];
      if (c === "\n") {
        nodes.push(<br key={`nl${ci}`} />);
      } else {
        nodes.push(
          <span key={ci} ref={el => { quoteSpansRef.current[ci] = el; }} style={{ visibility: "hidden" }}>
            {c}
          </span>,
        );
      }
    }

    // chars 150–153: "hide" — grouped for blur
    const hideKids: React.ReactNode[] = [];
    for (let i = Q_HIDE_START; i <= Q_HIDE_END; i++) {
      const ci = i;
      hideKids.push(
        <span key={ci} ref={el => { quoteSpansRef.current[ci] = el; }} style={{ visibility: "hidden" }}>
          {chars[ci]}
        </span>,
      );
    }
    nodes.push(
      <span key="qhide" ref={quoteHideRef} className="s08q-hide-word" style={{ display: "inline" }}>
        {hideKids}
      </span>,
    );

    // char 154: "."
    nodes.push(
      <span key={154} ref={el => { quoteSpansRef.current[154] = el; }} style={{ visibility: "hidden" }}>
        {chars[154]}
      </span>,
    );

    return nodes;
  };

  const twChars = TW_TEXT.split("");

  return (
    <>
      <style>{`
        /* CARD "spark" — amber glow */
        .s08-spark-word.s08-spark-active { animation: s08SparkGlow 3s ease-out forwards; }
        @keyframes s08SparkGlow {
          0%   { text-shadow: none; filter: none; }
          12%  { text-shadow: 0 0 14px rgba(240,210,130,.95), 0 0 4px rgba(255,235,170,.7);
                 filter: brightness(1.3); }
          50%  { text-shadow: 0 0 7px rgba(240,210,130,.35); filter: brightness(1.08); }
          100% { text-shadow: none; filter: none; }
        }
        /* CARD "hide" — blur-fade */
        .s08-hide-word.s08-hide-blur { animation: s08HideBlur 2.2s cubic-bezier(.4,0,1,1) forwards; }
        @keyframes s08HideBlur {
          0%   { opacity:1; filter:blur(0); }
          35%  { opacity:.55; filter:blur(2.5px); }
          100% { opacity:0; filter:blur(12px); }
        }
        /* QUOTE "shine" — same warm glimmer as "same sparkles" */
        .s08q-shine-word.s08q-shine-active { animation: s08qShineGlow 4s ease-out forwards; }
        @keyframes s08qShineGlow {
          0%   { text-shadow: none; filter: none; }
          8%   { text-shadow: 0 0 22px rgba(255,248,210,.95),
                              0 0 8px  rgba(255,238,170,.85),
                              0 0 2px  rgba(255,255,230,.7);
                 filter: brightness(1.45); }
          30%  { text-shadow: 0 0 12px rgba(255,242,185,.45);
                 filter: brightness(1.12); }
          100% { text-shadow: none; filter: none; }
        }
        /* QUOTE "same sparkles" — delicate warm flash, like light catching fabric */
        .s08q-same-word.s08q-same-active { animation: s08qSameGlow 4s ease-out forwards; }
        @keyframes s08qSameGlow {
          0%   { text-shadow: none; filter: none; }
          8%   { text-shadow: 0 0 22px rgba(255,248,210,.95),
                              0 0 8px  rgba(255,238,170,.85),
                              0 0 2px  rgba(255,255,230,.7);
                 filter: brightness(1.45); }
          30%  { text-shadow: 0 0 12px rgba(255,242,185,.45);
                 filter: brightness(1.12); }
          100% { text-shadow: none; filter: none; }
        }
        /* QUOTE "hide" — blur and vanish */
        .s08q-hide-word.s08q-hide-blur { animation: s08qHideBlur 2.8s cubic-bezier(.4,0,1,1) forwards; }
        @keyframes s08qHideBlur {
          0%   { opacity:1; filter:blur(0); }
          30%  { opacity:.6; filter:blur(3px); }
          100% { opacity:0; filter:blur(16px); }
        }
      `}</style>

      <section
        ref={sectionRef}
        aria-label="S08 Light"
        style={{ position: "relative", height: "100vh", width: "100%", overflow: "hidden", background: "#181818" }}
      >
        <div
          ref={trackRef}
          style={{ position: "absolute", top: 0, left: 0, width: "200vw", height: "100%", background: "#181818", willChange: "transform" }}
        >

          {/* ── LAYERS 1–7: photo collage ─────────────────────────────────── */}
          {PHOTOS.map((photo, i) => (
            <div
              key={photo.src}
              ref={(el: HTMLDivElement | null) => { photoRefs.current[i] = el; }}
              style={{
                position:    "absolute",
                left:        vw(photo.x),
                top:         vh(photo.y),
                width:       vw(photo.w),
                aspectRatio: `${photo.w} / ${photo.h}`,
              }}
            >
              <Image
                src={photo.src}
                alt=""
                aria-hidden="true"
                fill
                sizes={`${((photo.w / CANVAS_W) * 100).toFixed(1)}vw`}
                style={{ objectFit: "cover" }}
              />
            </div>
          ))}

          {/* ── LAYER 8: card group ───────────────────────────────────────── */}
          <div
            ref={cardGroupRef}
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          >
            <div
              style={{
                position:       "absolute",
                left:           vw(879.3),
                top:            vh(285.03),
                width:          vw(376.691),
                height:         vh(319.014),
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
              }}
            >
              <div style={{ transform: "rotate(3.54deg)", position: "relative", width: vw(359.033), aspectRatio: "359.033 / 297.442", flexShrink: 0 }}>
                <Image src="/assets/light/light8.png" alt="" aria-hidden="true" fill
                  sizes={`${((359.033 / CANVAS_W) * 100).toFixed(1)}vw`} style={{ objectFit: "contain" }} />
              </div>
            </div>

            <div style={{ position: "absolute", left: vw(932.97), top: vh(369), width: vw(273.739), transform: "rotate(1.92deg)", transformOrigin: "top left" }}>
              <p style={{ fontFamily: "var(--font-courier-prime)", fontSize: "clamp(10px, 1.146vw, 22px)", lineHeight: 1.32, letterSpacing: "-0.44px", color: "#292929", textTransform: "capitalize", margin: 0 }}>
                {twChars.slice(0, SPARK_START).map((c, j) => (
                  <span key={j} ref={el => { charSpansRef.current[j] = el; }} style={{ visibility: "hidden" }}>{c}</span>
                ))}
                <span ref={sparkWordRef} className="s08-spark-word" style={{ position: "relative", display: "inline" }}>
                  {twChars.slice(SPARK_START, SPARK_END + 1).map((c, j) => {
                    const ci = SPARK_START + j;
                    return <span key={ci} ref={el => { charSpansRef.current[ci] = el; }} style={{ visibility: "hidden" }}>{c}</span>;
                  })}
                </span>
                {twChars.slice(SPARK_END + 1, TW_HIDE_START).map((c, j) => {
                  const ci = SPARK_END + 1 + j;
                  if (c === "\n") return <br key={`nl${ci}`} />;
                  return <span key={ci} ref={el => { charSpansRef.current[ci] = el; }} style={{ visibility: "hidden" }}>{c}</span>;
                })}
                <span ref={hideWordRef} className="s08-hide-word" style={{ display: "inline" }}>
                  {twChars.slice(TW_HIDE_START, TW_HIDE_END + 1).map((c, j) => {
                    const ci = TW_HIDE_START + j;
                    return <span key={ci} ref={el => { charSpansRef.current[ci] = el; }} style={{ visibility: "hidden" }}>{c}</span>;
                  })}
                </span>
                <span ref={el => { charSpansRef.current[TW_HIDE_END + 1] = el; }} style={{ visibility: "hidden" }}>{twChars[TW_HIDE_END + 1]}</span>
              </p>
            </div>
          </div>

          {/* ── QUOTE TEXT — right viewport, centered (Phase 4 typewriter) ── */}
          {/* Positioned to fill the 100vw right half of the 200vw track.     */}
          {/* When the track is fully scrolled left, this region is visible    */}
          {/* and the text sits perfectly centered on screen.                  */}
          <div
            style={{
              position:       "absolute",
              left:           "100vw",     // = vw(1920): right viewport starts here
              width:          "100vw",     // fills the right viewport exactly
              height:         "100%",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
            }}
          >
            <div style={{ textAlign: "center", maxWidth: "60vw" }}>
              <p
                className="font-cormorant"
                style={{
                  fontWeight:    400,
                  fontSize:      "clamp(26px, 3.75vw, 72px)",
                  lineHeight:    1.45,
                  letterSpacing: "-0.02em",
                  color:         "#c9a76e",
                  margin:        0,
                }}
              >
                {buildQuoteContent()}
              </p>
            </div>
          </div>

          {/* Film grain + vignette */}
          <div aria-hidden="true" className="mo-archival-grain" style={{ zIndex: 200 }} />
          <div
            aria-hidden="true"
            className="pointer-events-none"
            style={{ position: "absolute", inset: 0, zIndex: 201, background: "radial-gradient(ellipse 80% 90% at 50% 50%, transparent 40%, rgba(0,0,0,0.68) 100%)" }}
          />
        </div>
      </section>
    </>
  );
}
