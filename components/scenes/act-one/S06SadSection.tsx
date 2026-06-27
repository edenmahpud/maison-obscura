"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────────────────────────────────────
// S06 THE HIDDEN SIDE — dark archival collage, 2800 × 1080 px canvas.
// Follows S05Transition. sad6.png is the visual bridge from the video.
//
// OPENING COMPOSITION
// The opening view is a two-page archive spread:
//   Left page  → sad1.png  (photo page, rotate -3°)
//   Right page → sad2.png  (text paper, rotate +2°, text nested inside)
//
// Text lives INSIDE the sad2 card (same %-based safe-area as Happy section).
// This prevents the text from floating at random canvas coordinates.
// ─────────────────────────────────────────────────────────────────────────────

// ── SCROLL CONTROLS ──────────────────────────────────────────────────────────
const TOTAL_SCROLL = 6000;
const CANVAS_WIDTH = "2800px";

// ── VIEWPORT INSET ────────────────────────────────────────────────────────────
// Breathing room between canvas content and screen edges.
// Edit INSET_V (top + bottom) or INSET_H (left + right) to adjust.
// GSAP travel distance is measured from the inset container at runtime,
// so the horizontal scroll always reaches the right edge regardless of value.
const INSET_V = "clamp(48px, 7vh, 110px)";   /* ← top + bottom padding */
const INSET_H = "clamp(32px, 5vw,  80px)";   /* ← left + right padding */

// Global parallax depth multiplier.
const PARALLAX_SCALE = 0.45;

// S06 opens with a blur that clears over ENTRY_CLEAR fraction of scroll.
// No opacity fade — section is visible at full opacity from frame 0.
const ENTRY_CLEAR = 0.04;

// ── CONTENT ──────────────────────────────────────────────────────────────────
// TO EDIT: change TITLE and BODY here.
const TITLE = "The Age Of Secret";

const BODY =
  "The 1950s were not only pastel kitchens, polished smiles, and the promise of a perfect American dream. In the shadow of the Cold War, another world was growing beneath the surface — a world of closed doors, quiet meetings, hidden files, and people who learned how to disappear in plain sight. Suspicion became part of everyday life: a name, a letter, a conversation, or a political belief could turn into something dangerous. Behind the bright colors and perfect windows, the decade carried a darker rhythm — a beautiful surface, with secret lives moving underneath.";

// ── OPENING SPREAD CONTROLS ───────────────────────────────────────────────────
// These four constants control the two-page archive spread at section entry.
//
// LEFT PAGE (sad1 — photo page)
// SAD1_LEFT  — canvas x position.  Move right to slide away from edge.
// SAD1_TOP   — canvas y position.  Negative = bleeds above top of viewport.
// SAD1_WIDTH — displayed width in px.  Reduce to shrink the photo page.
// SAD1_ROT   — rotation in degrees.  Negative = tilts left (counter-clockwise).
const SAD1_LEFT  = "30px";
const SAD1_TOP   = "-2%";
const SAD1_WIDTH = 520;
const SAD1_ROT   = -3;

// RIGHT PAGE (sad2 — text paper)
// SAD2_LEFT  — canvas x position.  Should start just after sad1 right edge.
//              sad1 right edge ≈ parseInt(SAD1_LEFT) + SAD1_WIDTH = ~550px.
//              A gap of 0–10 px creates the book-spine effect.
// SAD2_TOP   — canvas y position.  Match SAD1_TOP for aligned spread.
// SAD2_WIDTH — displayed width in px.
// SAD2_ROT   — rotation in degrees.  Positive = tilts right (clockwise).
const SAD2_LEFT  = "545px";
const SAD2_TOP   = "-2%";
const SAD2_WIDTH = 580;
const SAD2_ROT   = 2;

// TEXT SAFE AREA inside the sad2 paper
// These are percentages of the sad2 card's rendered dimensions.
// They adapt automatically when SAD2_WIDTH changes.
// TO ADJUST PADDING: change left/top below.
// TO ADJUST COLUMN:  change width below.
// TO ADJUST HEIGHT CAP: change height below (raise if body text gets clipped).
const TEXT_LEFT   = "13%";   // left inset from paper edge
const TEXT_TOP    = "18%";   // top inset from paper edge
const TEXT_WIDTH  = "72%";   // text column width
const TEXT_HEIGHT = "72%";   // max height — hard clip (raise if text is cut off)

// ── COLLAGE ASSETS (everything except sad1 and sad2) ─────────────────────────
// sad1 and sad2 are rendered separately above to support the card layout.
// All other sad assets live in this map.
//
// left     — px from left edge of 2800 px canvas
// top      — % of canvas height: Figma_y / 1080 × 100 (maps to 100 vh)
// width    — displayed width in px
// rotate   — degrees; negative = counter-clockwise
// z        — z-index, back → front
// parallax — extra horizontal drift per 1 vw × progress
// vDrift   — vertical float in px over the full scroll
// ─────────────────────────────────────────────────────────────────────────────
type SadAsset = {
  id: string;
  src: string;
  left: string;
  top: string;
  width: number;
  rotate: number;
  z: number;
  parallax: number;
  vDrift: number;
  opacity?: number;
};

const ASSETS: SadAsset[] = [
  // z:3 — small rotated portrait cluster (lower centre)
  { id: "sad3", src: "/assets/sad/sad3.png", left: "961px",  top: "74.1%", width: 259, rotate: -13.28, z: 3,  parallax: -6,  vDrift: 3  },
  // z:4 — near-upright portrait card
  { id: "sad4", src: "/assets/sad/sad4.png", left: "1216px", top: "37.2%", width: 333, rotate: 1.82,   z: 4,  parallax: 5,   vDrift: 2  },
  // z:5 — wide newsreel/photo strip at top
  { id: "sad5", src: "/assets/sad/sad5.png", left: "1304px", top: "5.6%",  width: 754, rotate: 0,      z: 5,  parallax: 6,   vDrift: -2 },
  // z:6 — TRANSITION ANCHOR — matches final frame of next-transition.mp4
  { id: "sad6", src: "/assets/sad/sad6.png", left: "1473px", top: "62.9%", width: 532, rotate: 0,      z: 6,  parallax: 3,   vDrift: 1  },
  // z:7 — strongly tilted evidence photograph
  { id: "sad7", src: "/assets/sad/sad7.png", left: "1755px", top: "35.8%", width: 361, rotate: -16.98, z: 7,  parallax: 8,   vDrift: -3 },
  // z:8 — wide bottom photograph (far right of canvas)
  { id: "sad9", src: "/assets/sad/sad9.png", left: "2019px", top: "54.6%", width: 706, rotate: 0,      z: 8,  parallax: 10,  vDrift: 2  },
];

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

export function S06SadSection() {
  const sectionRef  = useRef<HTMLElement | null>(null);
  const blurWrapRef = useRef<HTMLDivElement | null>(null);
  const trackRef    = useRef<HTMLDivElement | null>(null);
  const vidRef      = useRef<HTMLVideoElement | null>(null);
  const vidUnlocked = useRef(false);

  // Inset viewport container — GSAP reads its clientWidth to compute travel distance
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // Parallax refs for the opening spread
  // sad1Inner — parallax on the photo page inner wrapper
  // cardInner — parallax on the sad2 text card inner wrapper
  const sad1Inner = useRef<HTMLDivElement | null>(null);
  const cardInner = useRef<HTMLDivElement | null>(null);

  // Parallax refs for collage assets (sad3–sad9)
  const assetRefs = useRef<(HTMLDivElement | null)[]>(new Array(ASSETS.length).fill(null));

  // ── Video sound unlock ────────────────────────────────────────────────────
  useEffect(() => {
    const unlock = () => {
      if (vidUnlocked.current) return;
      const v = vidRef.current;
      if (!v) return;
      vidUnlocked.current = true;
      v.muted = false;
      v.volume = 0.5;
      if (v.paused) v.play().catch(() => {});
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // ── GSAP ScrollTrigger ────────────────────────────────────────────────────
  useEffect(() => {
    const section  = sectionRef.current;
    const blurWrap = blurWrapRef.current;
    const track    = trackRef.current;
    if (!section || !blurWrap || !track) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: `+=${TOTAL_SCROLL}`,
        pin: true,
        scrub: 1.2,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p    = self.progress;
          const vwPx = window.innerWidth / 100;

          // ── Entry blur (no opacity) — no black gap ────────────────────────
          const entryP = clamp01(p / ENTRY_CLEAR);
          blurWrap.style.filter = [
            `blur(${10 * (1 - entryP)}px)`,
            `brightness(${1 + 0.4 * (1 - entryP)})`,
          ].join(" ");

          // ── Horizontal scroll ─────────────────────────────────────────────
          const hP       = clamp01((p - ENTRY_CLEAR) / (1 - ENTRY_CLEAR));
          // Use inset viewport's measured width so GSAP travel accounts for padding
          const viewW    = viewportRef.current?.clientWidth ?? window.innerWidth;
          const travelPx = track.scrollWidth - viewW;
          gsap.set(track, { x: -(hP * travelPx) });

          // ── Opening spread parallax ───────────────────────────────────────
          // sad1 (photo page) — leads slightly (negative = approaches)
          if (sad1Inner.current) {
            gsap.set(sad1Inner.current, {
              x: hP * -8 * PARALLAX_SCALE * vwPx,
              y: hP * -2,
            });
          }
          // sad2 card (text page) — same plane, slightly slower
          if (cardInner.current) {
            gsap.set(cardInner.current, {
              x: hP * 4 * PARALLAX_SCALE * vwPx,
              y: hP * 2,
            });
          }

          // ── Collage asset parallax ────────────────────────────────────────
          ASSETS.forEach((asset, i) => {
            const el = assetRefs.current[i];
            if (!el) return;
            gsap.set(el, {
              x: hP * asset.parallax * PARALLAX_SCALE * vwPx,
              y: hP * asset.vDrift,
            });
          });
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="S06 The Hidden Side"
      className="relative h-screen w-full overflow-hidden"
      style={{ background: "#050505" }}
    >
      {/* ── Entry blur wrapper ─────────────────────────────────────────────
          opacity is always 1 — section visible from the first frame (no black gap).
          Only the filter animates. Initial filter matches p=0 in onUpdate.
          DO NOT add opacity: 0 here.                                          */}
      <div
        ref={blurWrapRef}
        style={{ position: "absolute", inset: 0, filter: "blur(10px) brightness(1.4)" }}
      >
        {/* ── Padded viewport — insets canvas from screen edges ─────────────
            INSET_V (top/bottom) and INSET_H (left/right) are the constants
            at the top of this file. GSAP reads clientWidth at scroll time
            so horizontal travel always reaches the right edge correctly.     */}
        <div
          ref={viewportRef}
          style={{
            position: "absolute",
            inset: `${INSET_V} ${INSET_H}`,
            overflow: "hidden",
          }}
        >

        {/* ── 2800 px horizontal canvas ─────────────────────────────────── */}
        <div
          ref={trackRef}
          style={{
            position: "absolute",
            top: 0, left: 0,
            height: "100%",
            width: CANVAS_WIDTH,
            willChange: "transform",
          }}
        >

          {/* ════════════════════════════════════════════════════════════════
              OPENING SPREAD — two-page archive layout
              Left page:  sad1 (photo)   →  SAD1_* constants above
              Right page: sad2 (text)    →  SAD2_* constants above
              Text safe-area:            →  TEXT_* constants above
              ════════════════════════════════════════════════════════════ */}

          {/* ── LEFT PAGE — sad1 photo page ──────────────────────────────
              TO MOVE:   change SAD1_LEFT / SAD1_TOP above.
              TO RESIZE: change SAD1_WIDTH above.
              TO ROTATE: change SAD1_ROT above.                            */}
          <div
            style={{
              position: "absolute",
              left: SAD1_LEFT,
              top: SAD1_TOP,
              zIndex: 1,
              transform: `rotate(${SAD1_ROT}deg)`,
              transformOrigin: "center center",
            }}
          >
            <div ref={sad1Inner} style={{ willChange: "transform" }}>
              <Image
                src="/assets/sad/sad1.png"
                alt="" aria-hidden="true"
                width={1200} height={900}
                sizes={`${SAD1_WIDTH}px`}
                style={{ width: `${SAD1_WIDTH}px`, height: "auto", display: "block" }}
              />
            </div>
          </div>

          {/* ── RIGHT PAGE — sad2 text paper with nested text ────────────
              The card uses position: relative so the text overlay uses
              % of the card's rendered size — same pattern as S04 Happy card.
              TO MOVE:   change SAD2_LEFT / SAD2_TOP above.
              TO RESIZE: change SAD2_WIDTH above.
              TO ROTATE: change SAD2_ROT above.
              ─────────────────────────────────────────────────────────────
              TEXT CONTROLS (all in TEXT_* constants above):
              Padding:    TEXT_LEFT / TEXT_TOP
              Column:     TEXT_WIDTH
              Height cap: TEXT_HEIGHT  (raise if body text is clipped)
              ─────────────────────────────────────────────────────────────
              FONT CONTROLS (below in the h2 / p elements):
              Heading size: fontSize clamp on h2
              Body size:    fontSize clamp on p
              Both use the same font-variable system as the Happy section.  */}
          <div
            style={{
              position: "absolute",
              left: SAD2_LEFT,
              top: SAD2_TOP,
              zIndex: 2,
              transform: `rotate(${SAD2_ROT}deg)`,
              transformOrigin: "center center",
            }}
          >
            {/* Inner wrapper receives GSAP parallax */}
            <div ref={cardInner} style={{ position: "relative", willChange: "transform" }}>
              <Image
                src="/assets/sad/sad2.png"
                alt="" aria-hidden="true"
                width={SAD2_WIDTH} height={Math.round(SAD2_WIDTH * 1.37)}
                style={{ width: `${SAD2_WIDTH}px`, height: "auto", display: "block" }}
              />

              {/* ── Text safe area — % of card dimensions ────────────────
                  No extra rotation here — text inherits SAD2_ROT from
                  the outer card div, matching the paper angle exactly.    */}
              <div
                style={{
                  position: "absolute",
                  left:     TEXT_LEFT,   /* ← left padding inside paper  */
                  top:      TEXT_TOP,    /* ← top padding inside paper   */
                  width:    TEXT_WIDTH,  /* ← text column width          */
                  height:   TEXT_HEIGHT, /* ← max height (hard clip)     */
                  overflow: "hidden",
                  zIndex: 1,
                }}
              >
                {/* ── Heading — Cormorant Garamond Bold Italic ─────────────
                    TO CHANGE SIZE:  edit the clamp() in fontSize below.
                    TO CHANGE COLOR: edit color below (currently #7c031c).  */}
                <h2
                  className="font-cormorant italic"
                  style={{
                    fontWeight: 700,
                    fontSize: "clamp(2.4rem, 3.0vw, 3.8rem)",  /* ← heading size */
                    lineHeight: 1.0,
                    color: "#7c031c",
                    opacity: 0.85,
                    letterSpacing: "-0.02em",
                    marginBottom: "1.2rem",
                  }}
                >
                  {TITLE}
                </h2>

                {/* ── Body — Courier Prime ──────────────────────────────────
                    Uses var(--font-courier-prime) as inline style for highest
                    CSS specificity — same approach as S04 Happy paper body.
                    TO CHANGE SIZE:  edit the clamp() in fontSize below.
                    TO EDIT TEXT:    change BODY constant at top of file.    */}
                <p
                  style={{
                    fontFamily: "var(--font-courier-prime)",    /* ← Courier Prime */
                    fontSize: "clamp(0.88rem, 0.95vw, 1.1rem)", /* ← body size    */
                    lineHeight: 1.45,
                    color: "#1e1712",                           /* ← ink color     */
                  }}
                >
                  {BODY}
                </p>
              </div>
              {/* end text safe area */}
            </div>
            {/* end cardInner */}
          </div>
          {/* end sad2 card */}

          {/* ════════════════════════════════════════════════════════════════
              COLLAGE — remaining sad assets (sad3–sad9 + video)
              These are rendered from the ASSETS array above.
              Individual positions: edit each entry in ASSETS.
              ════════════════════════════════════════════════════════════ */}
          {ASSETS.map((asset, i) => (
            <div
              key={asset.id}
              style={{
                position: "absolute",
                left: asset.left,
                top: asset.top,
                zIndex: asset.z,
                transform: `rotate(${asset.rotate}deg)`,
                transformOrigin: "center center",
                opacity: asset.opacity ?? 1,
              }}
            >
              <div
                ref={(el) => { assetRefs.current[i] = el; }}
                style={{ willChange: "transform" }}
              >
                <Image
                  src={asset.src}
                  alt="" aria-hidden="true"
                  width={1200} height={900}
                  sizes={`${asset.width}px`}
                  style={{ width: `${asset.width}px`, height: "auto", display: "block" }}
                />
              </div>
            </div>
          ))}

          {/* ── sad8 — propaganda / archival video clip ──────────────────
              Position: left 2086 px, top 9.8 %, w 593 px, rotate +0.28°.
              Figma opacity: 0.8. Starts muted; first gesture unlocks.     */}
          <div
            style={{
              position: "absolute",
              left: "2086px",
              top: "9.8%",
              zIndex: 9,
              transform: "rotate(0.28deg)",
              transformOrigin: "center center",
              opacity: 0.8,
            }}
          >
            <video
              ref={vidRef}
              src="/assets/sad/sad8.mp4"
              autoPlay muted loop playsInline
              style={{ width: "593px", height: "auto", display: "block" }}
            />
          </div>

        </div>
        {/* end trackRef */}

        </div>
        {/* end viewportRef / padded viewport */}
      </div>
      {/* end blurWrapRef */}

      {/* ── Film grain — shared archival texture ──────────────────────────── */}
      <div aria-hidden="true" className="mo-archival-grain" style={{ zIndex: 200 }} />

      {/* ── Vignette — draws the eye inward, reinforces dark mood ─────────── */}
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
