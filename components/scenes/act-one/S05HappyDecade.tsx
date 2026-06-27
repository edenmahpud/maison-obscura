"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────────────────────────────────────
// SECTION CONTROLS — tune everything about this section here.
// ─────────────────────────────────────────────────────────────────────────────

// Total vertical scroll (px) while the section is pinned.
// Increase for a slower, more spacious horizontal journey.
const SCROLL_DISTANCE = 5000;

// Total width of the horizontal canvas. Must be wider than 100vw.
// The user scrolls across (TRACK_WIDTH - 100vw) of horizontal content.
const TRACK_WIDTH = "400vw";

// Global multiplier for ALL parallax values below.
// 1.0 = values as written. 0.5 = half as much drift. 1.5 = more dramatic depth.
const PARALLAX_SCALE = 0.65;

// ── HERO IMAGE (the_perfect.png — continuous from S04 zoom-out) ───────────────
// This image visually "continues" from S04: it appears at the exact position
// and size S04's zoom-out ends, then scrolls as part of the collage.
//
// HOW THE POSITION IS DERIVED (from S04 constants):
//   S04 imgWrap = absolute inset-0 → 100vw × 100vh
//   At full zoom: scale 0.28, xPercent 21, yPercent 12
//   Visual center = (50vw + 21vw, 50vh + 12vh) = (71vw, 62vh)
//   Visual size   = 28vw × 28vh
//   → left edge: 71vw − 14vw = 57vw  →  HERO_LEFT
//   → top edge:  62vh − 14vh = 48vh  →  HERO_TOP
//
// TO ADJUST LANDING POSITION: edit HERO_LEFT and HERO_TOP.
//   If S04's TARGET_X_PERCENT or TARGET_Y_PERCENT change, recalculate above.
//
// TO ADJUST LANDING SIZE: edit HERO_W / HERO_H.
//   These should always match S04's TARGET_SCALE × 100vw/vh.
//
// TO ADJUST PARALLAX SPEED: edit HERO_PARALLAX.
//   Positive = drifts backward (slower than track = background feel).
//   Negative = drifts forward (faster = foreground feel).
const HERO_LEFT     = "57vw";   // left edge of the S04 landing position
const HERO_TOP      = "48%";    // top edge of the S04 landing position (48vh of 100vh)
const HERO_W        = "28vw";   // S04 TARGET_SCALE × 100vw
const HERO_H        = "28vh";   // S04 TARGET_SCALE × 100vh
const HERO_ROTATE   = 0;        // upright on entry — matches S04's unrotated state
const HERO_Z        = 8;        // above most happy images; below nothing
const HERO_PARALLAX = 20;       // slower drift = stays "pinned" as collage moves past
const HERO_VDRIFT   = 3;        // subtle vertical float (px over full scroll)

// ── TEXT CARD ─────────────────────────────────────────────────────────────────
// The archival paper card that floats in the middle of the collage.
const CARD_TITLE    = "The Perfect Decade";
const CARD_BODY     =
  "The 1950s looked like a dream polished to perfection. Pastel kitchens, shining cars, glowing diners, elegant dresses, and television screens that promised a brighter future. Everything felt clean, sweet, and beautifully arranged — a world built from smiles, chrome, soft colors, and the idea that life was finally becoming perfect.";
const CARD_LEFT     = "148vw";  // horizontal position within the track
const CARD_TOP      = "16%";   // vertical position
const CARD_W        = "26vw";  // card width
const CARD_ROTATE   = -1.5;    // degrees
const CARD_PARALLAX = 28;      // positive = slower (receding), negative = faster (near)
const CARD_Z        = 10;

// ── IMAGE CONFIGS ─────────────────────────────────────────────────────────────
// Each entry controls one happy*.png asset. Tune all values here:
//   left     — horizontal start from track origin (CSS string, e.g. "20vw")
//   top      — vertical position (CSS string, e.g. "12%")
//   w        — displayed width (CSS string, e.g. "24vw")
//   rotate   — rotation in degrees (negative = counter-clockwise)
//   z        — z-index stacking within the collage
//   parallax — extra horizontal drift as vw over the full scroll.
//              Positive = item drifts backward (slower, receding / background feel).
//              Negative = item drifts forward (faster, closer / foreground feel).
//   vDrift   — extra vertical drift in px over the full scroll (subtle float).
type ImgCfg = {
  id: number; left: string; top: string; w: string;
  rotate: number; z: number; parallax: number; vDrift: number;
};

const IMAGES: ImgCfg[] = [
  // ── Zone 1 — entry (0 – 80 vw) ────────────────────────────────────────────
  { id: 1,  left: "3vw",   top: "9%",  w: "25vw", rotate: -2,   z: 3, parallax: 32,  vDrift: 0   },
  { id: 2,  left: "20vw",  top: "53%", w: "17vw", rotate: 3.5,  z: 5, parallax: -26, vDrift: -14 },
  { id: 3,  left: "38vw",  top: "5%",  w: "30vw", rotate: -1,   z: 2, parallax: 48,  vDrift: 8   },
  // ── Zone 2 — mid-left (80 – 160 vw) ──────────────────────────────────────
  { id: 4,  left: "62vw",  top: "57%", w: "19vw", rotate: 4,    z: 6, parallax: -40, vDrift: -12 },
  { id: 5,  left: "80vw",  top: "11%", w: "27vw", rotate: -3,   z: 4, parallax: 36,  vDrift: 6   },
  { id: 6,  left: "106vw", top: "59%", w: "21vw", rotate: 2.5,  z: 3, parallax: -33, vDrift: -8  },
  { id: 7,  left: "120vw", top: "3%",  w: "29vw", rotate: -2,   z: 5, parallax: 52,  vDrift: 10  },
  // ── Zone 3 — centre / text card zone (160 – 240 vw) ──────────────────────
  { id: 8,  left: "154vw", top: "49%", w: "14vw", rotate: 5.5,  z: 7, parallax: -58, vDrift: -18 },
  { id: 9,  left: "188vw", top: "9%",  w: "23vw", rotate: -4,   z: 3, parallax: 40,  vDrift: 12  },
  // ── Zone 4 — mid-right (240 – 320 vw) ────────────────────────────────────
  { id: 10, left: "208vw", top: "55%", w: "19vw", rotate: 3,    z: 4, parallax: -28, vDrift: -6  },
  { id: 11, left: "226vw", top: "5%",  w: "33vw", rotate: -1.5, z: 2, parallax: 58,  vDrift: 5   },
  // ── Zone 5 — exit (320 – 400 vw) ─────────────────────────────────────────
  { id: 12, left: "258vw", top: "49%", w: "19vw", rotate: 2.5,  z: 6, parallax: -48, vDrift: -14 },
  { id: 13, left: "278vw", top: "13%", w: "35vw", rotate: -2.5, z: 3, parallax: 44,  vDrift: 8   },
];

// ─────────────────────────────────────────────────────────────────────────────

export function S05HappyDecade() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const trackRef   = useRef<HTMLDivElement | null>(null);
  const cardRef    = useRef<HTMLDivElement | null>(null);
  const heroRef    = useRef<HTMLDivElement | null>(null);
  // Inner wrappers receive GSAP x/y parallax; outer wrappers hold CSS rotation.
  const imgRefs = useRef<(HTMLDivElement | null)[]>(
    new Array(IMAGES.length).fill(null)
  );

  useEffect(() => {
    const section = sectionRef.current;
    const track   = trackRef.current;
    if (!section || !track) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: `+=${SCROLL_DISTANCE}`,
        pin: true,
        scrub: 1.2,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress;
          // Total horizontal travel = track width − one viewport width
          const travelPx = track.scrollWidth - window.innerWidth;

          // Move the entire track leftward
          gsap.set(track, { x: -(p * travelPx) });

          // Apply per-image parallax (x) and vertical drift (y)
          IMAGES.forEach((img, i) => {
            const el = imgRefs.current[i];
            if (!el) return;
            const extraX = p * img.parallax * PARALLAX_SCALE * window.innerWidth / 100;
            const extraY = p * img.vDrift;
            gsap.set(el, { x: extraX, y: extraY });
          });

          // Hero image parallax — the_perfect.png carried in from S04
          if (heroRef.current) {
            const extraX = p * HERO_PARALLAX * PARALLAX_SCALE * window.innerWidth / 100;
            const extraY = p * HERO_VDRIFT;
            gsap.set(heroRef.current, { x: extraX, y: extraY });
          }

          // Text card parallax
          if (cardRef.current) {
            const extraX = p * CARD_PARALLAX * PARALLAX_SCALE * window.innerWidth / 100;
            gsap.set(cardRef.current, { x: extraX });
          }
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="S05 The Happy Decade"
      className="relative h-screen overflow-hidden"
      style={{ background: "#0c0906" }}
    >
      {/* ── Horizontal track ──────────────────────────────────────────────── */}
      {/* All collage content lives inside here; GSAP moves it leftward. */}
      <div
        ref={trackRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          width: TRACK_WIDTH,
          willChange: "transform",
        }}
      >
        {/* ── Hero image — the_perfect.png carried in from S04 transition ── */}
        {/* Positioned to match exactly where S04's zoom-out lands.          */}
        {/* TO MOVE: edit HERO_LEFT and HERO_TOP above.                      */}
        {/* TO RESIZE: edit HERO_W and HERO_H above.                         */}
        <div
          style={{
            position: "absolute",
            left: HERO_LEFT,
            top: HERO_TOP,
            zIndex: HERO_Z,
            width: HERO_W,
            height: HERO_H,
            overflow: "hidden",
            transform: `rotate(${HERO_ROTATE}deg)`,
            transformOrigin: "center center",
          }}
        >
          <div
            ref={heroRef}
            style={{ position: "relative", width: "100%", height: "100%", willChange: "transform" }}
          >
            <Image
              src="/assets/S04-1950s-america/the_perfect1.png"
              alt=""
              aria-hidden="true"
              fill
              sizes={HERO_W}
              style={{ objectFit: "cover", objectPosition: "center" }}
            />
          </div>
        </div>

        {/* ── Images ──────────────────────────────────────────────────────── */}
        {/* Outer div = CSS positioning + rotation (never touched by GSAP).  */}
        {/* Inner div = ref for GSAP parallax x/y transform.                 */}
        {IMAGES.map((img, i) => (
          <div
            key={img.id}
            style={{
              position: "absolute",
              left: img.left,
              top: img.top,
              zIndex: img.z,
              transform: `rotate(${img.rotate}deg)`,
              transformOrigin: "center center",
            }}
          >
            <div
              ref={(el) => { imgRefs.current[i] = el; }}
              style={{ willChange: "transform" }}
            >
              <Image
                src={`/assets/happy/happy${img.id}.png`}
                alt=""
                aria-hidden="true"
                width={1200}
                height={900}
                sizes={img.w}
                style={{
                  width: img.w,
                  height: "auto",
                  maxHeight: "72vh",
                  objectFit: "contain",
                  objectPosition: "top center",
                  display: "block",
                  filter: "sepia(0.1) brightness(0.94) contrast(0.96)",
                }}
              />
            </div>
          </div>
        ))}

        {/* ── Text card ───────────────────────────────────────────────────── */}
        {/* Outer div = position + rotation. Inner div = GSAP parallax.      */}
        {/* TO MOVE THE CARD: edit CARD_LEFT and CARD_TOP above.             */}
        {/* TO RESIZE: edit CARD_W above.                                     */}
        <div
          style={{
            position: "absolute",
            left: CARD_LEFT,
            top: CARD_TOP,
            zIndex: CARD_Z,
            width: CARD_W,
            transform: `rotate(${CARD_ROTATE}deg)`,
            transformOrigin: "center center",
          }}
        >
          <div ref={cardRef} style={{ willChange: "transform" }}>
            {/* Aged parchment card */}
            <div
              style={{
                background: "rgba(242, 232, 208, 0.94)",
                border: "1px solid rgba(130, 100, 62, 0.22)",
                boxShadow:
                  "0 12px 48px rgba(0,0,0,0.65), 0 2px 10px rgba(0,0,0,0.35), inset 0 0 60px rgba(180,140,90,0.06)",
                padding: "clamp(1.4rem, 2.8vw, 2.6rem)",
              }}
            >
              {/* Section label */}
              <p
                className="font-josefin"
                style={{
                  fontSize: "0.52rem",
                  letterSpacing: "0.32em",
                  color: "#7a5e38",
                  textTransform: "uppercase",
                  marginBottom: "0.8rem",
                  opacity: 0.8,
                }}
              >
                The Happy Side
              </p>

              {/* Title — TO CHANGE: edit CARD_TITLE at top of file */}
              <h2
                className="font-cormorant italic"
                style={{
                  fontSize: "clamp(1.8rem, 3vw, 3.2rem)",
                  lineHeight: 1.05,
                  fontWeight: 600,
                  color: "#2e1e0e",
                  marginBottom: "0.9rem",
                  letterSpacing: "-0.01em",
                }}
              >
                {CARD_TITLE}
              </h2>

              {/* Divider */}
              <div
                style={{
                  width: "2.5rem",
                  height: "1px",
                  background: "#8c6e48",
                  opacity: 0.45,
                  marginBottom: "1rem",
                }}
              />

              {/* Body — TO CHANGE: edit CARD_BODY at top of file */}
              <p
                className="font-josefin"
                style={{
                  fontSize: "clamp(0.72rem, 0.85vw, 0.9rem)",
                  lineHeight: 1.8,
                  color: "#4a3318",
                  opacity: 0.88,
                }}
              >
                {CARD_BODY}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Grain overlay — archival texture above all content ────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 200,
          opacity: 0.22,
          mixBlendMode: "soft-light",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "160px 160px",
        }}
      />

      {/* ── Dark vignette — draws the eye inward ──────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 201,
          background:
            "radial-gradient(ellipse 90% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </section>
  );
}
