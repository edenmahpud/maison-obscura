"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ── Canvas — matches the Figma frame (node 801:953) 1:1 ─────────────────────
const BOARD_W = 1943;
const BOARD_H = 1080;

const TITLE = "Nikolai got Arrest";
// Figma applies `capitalize` to the source text via CSS; precomputed here so
// splitting it into per-letter spans for the typewriter doesn't depend on
// text-transform behaving correctly across sibling elements.
const SUBTITLE = "Last confirmed sighting: 1958.".replace(/\b\w/g, (c) => c.toUpperCase());

const ZOOM_END = 1.15; // background scale reached by the end of the pin

function isDesignMode() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("designMode") === "true";
}

// ── "Nikolai got Arrest" reveal — crossfades in on top of FBISection's own
// fade-out, then the background slowly zooms while the two lines of text
// type themselves in, scroll-controlled, letter by letter.
//
// Scroll map (section height 638vh):
//
//   0   –1.2  this whole layer fades in over FBISection fading out beneath
//   0   –7    background continuously, slowly zooms (scale 1 → 1.15)
//   1.5 –3.2  "Nikolai got Arrest" types in, letter by letter
//   3.4 –5.6  "Last Confirmed Sighting: 1958." types in, letter by letter
//   5.6 –7.8  hold before anything else moves
//   7.8 –9.3  this layer blurs and fades out, handing off to the reverse
//             tunnel (ReverseTunnelSection) fading in on top
//
export function ArrestSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const bgRef = useRef<HTMLDivElement | null>(null);
  const titleCharRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const subtitleCharRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    const bg = bgRef.current;
    const titleChars = titleCharRefs.current;
    const subtitleChars = subtitleCharRefs.current;
    if (!section || !sticky || !bg || titleChars.some((c) => !c) || subtitleChars.some((c) => !c)) return;

    if (isDesignMode()) {
      gsap.set(sticky, { opacity: 1 });
      gsap.set(bg, { scale: ZOOM_END });
      gsap.set(titleChars, { opacity: 1 });
      gsap.set(subtitleChars, { opacity: 1 });
      return;
    }

    gsap.set(sticky, { opacity: 0 });
    gsap.set(bg, { scale: 1 });
    gsap.set(titleChars, { opacity: 0 });
    gsap.set(subtitleChars, { opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: 1.2,
        invalidateOnRefresh: true,
      },
    });

    // Phase 0 — fade this layer in over FBISection's own fade-out.
    tl.to(sticky, { opacity: 1, ease: "power1.out", duration: 1.2 }, 0);

    // The background slowly, continuously enlarges — scroll-linked, not
    // eased, so it tracks scroll position directly rather than time.
    tl.to(bg, { scale: ZOOM_END, ease: "none", duration: 7 }, 0);

    // Phase 1 — the title types in, letter by letter.
    tl.to(titleChars, { opacity: 1, ease: "none", stagger: 0.09, duration: 0.05 }, 1.5);

    // Phase 2 — the subtitle types in right after.
    tl.to(subtitleChars, { opacity: 1, ease: "none", stagger: 0.07, duration: 0.05 }, 3.4);

    // Phase 3 — hold before anything else moves.
    tl.to({}, { duration: 0.8 }, 7.0);

    // Phase 4 — this layer blurs and fades out. The next section (a
    // separate, higher z-index fixed overlay) fades in on top of this, so
    // the two crossfade rather than leaving any gap.
    tl.to(sticky, { opacity: 0, filter: "blur(24px)", ease: "power1.in", duration: 1.5 }, 7.8);

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="Arrest Section"
      style={{ position: "relative", height: "638vh", background: "#181818", marginTop: "-50vh" }}
    >
      {/* Permanently position:fixed with an opacity fade-in — same technique
          used in S12WantedTransition and FBISection — so this crossfades in
          cleanly on top of FBISection's own fade-out with no gap. */}
      <div
        ref={stickyRef}
        style={{ position: "fixed", inset: 0, overflow: "hidden", zIndex: 60, pointerEvents: "none" }}
      >
        <div
          ref={bgRef}
          style={{ position: "absolute", inset: 0, transformOrigin: "center center", willChange: "transform" }}
        >
          <Image
            src="/assets/place/interior-preview.png"
            alt="A dark tailoring shop interior, seen down the hallway"
            fill
            unoptimized
            style={{ objectFit: "cover" }}
          />
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />

          {/* ── Two red case-file lines (Figma nodes 1186:186 / 1186:187) ──
              Nested inside the same zooming layer as the photo, matching
              Figma's own grouping, so they scale/pan with it as if drawn
              directly on the print. */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 0, top: `${(488 / BOARD_H) * 100}%`,
              width: `${(653.001 / BOARD_W) * 100}%`, height: 1,
              background: "#FF0000",
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: `${(697 / BOARD_W) * 100}%`, top: `${(608 / BOARD_H) * 100}%`,
              width: 1, height: `${(653.001 / BOARD_H) * 100}%`,
              background: "#FF0000",
            }}
          />
        </div>

        <div aria-hidden="true" className="mo-archival-grain" style={{ position: "absolute", inset: 0 }} />

        {/* ── Title ───────────────────────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            left: `${(673.157 / BOARD_W) * 100}%`, top: `${(433 / BOARD_H) * 100}%`,
            width: `${(489.156 / BOARD_W) * 100}%`, height: `${(106.724 / BOARD_H) * 100}%`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <p
            className="font-cormorant"
            style={{
              margin: 0, whiteSpace: "nowrap", fontWeight: 600, fontStyle: "italic",
              fontSize: "clamp(2.5rem, 4.12vw, 7.5rem)", lineHeight: 1.32,
              color: "#fff", letterSpacing: "-0.02em",
            }}
          >
            {Array.from(TITLE).map((ch, i) => (
              <span key={i} ref={(el) => { titleCharRefs.current[i] = el; }} style={{ display: "inline-block" }}>
                {ch === " " ? " " : ch}
              </span>
            ))}
          </p>
        </div>

        {/* ── Subtitle ────────────────────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            left: `${(687.078 / BOARD_W) * 100}%`, top: `${(539 / BOARD_H) * 100}%`,
            width: `${(461.078 / BOARD_W) * 100}%`, height: `${(53.683 / BOARD_H) * 100}%`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <p
            className="font-cormorant"
            style={{
              margin: 0, whiteSpace: "nowrap", fontWeight: 600,
              fontSize: "clamp(1rem, 2.06vw, 2.7rem)", lineHeight: 1.32,
              color: "#fff", letterSpacing: "-0.02em",
            }}
          >
            {Array.from(SUBTITLE).map((ch, i) => (
              <span key={i} ref={(el) => { subtitleCharRefs.current[i] = el; }} style={{ display: "inline-block" }}>
                {ch === " " ? " " : ch}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}
