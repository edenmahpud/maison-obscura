"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ── TRANSITION CONTROLS ──────────────────────────────────────────────────────
// Scroll distance (px) for the zoom-out animation.
// Increase for a slower, more cinematic transition; decrease for a snappier one.
const TRANSITION_SCROLL = 1600;

// Final scale of the previous full image at the end of the zoom-out.
// Calculated from actual image dims: 1 thumbnail ≈ 28% of full viewport width.
const TARGET_SCALE = 0.28;

// X offset at end of zoom-out, as % of element own width (= viewport width).
// Positive = rightward. Tune to align with bottom-right image in collage_perfect.png.
const TARGET_X_PERCENT = 21;

// Y offset at end of zoom-out, as % of element own height (= viewport height).
// Positive = downward.
const TARGET_Y_PERCENT = 12;

// Scroll progress fraction (0–1) at which the collage starts fading in.
// 0 = immediately, 0.3 = after 30% of the transition scroll.
const COLLAGE_FADE_START = 0.25;
// ─────────────────────────────────────────────────────────────────────────────

// Actual collage dimensions: 3140 × 2136 px
const COLLAGE_W = 3140;
const COLLAGE_H = 2136;

// TO CHANGE TITLE: edit the string below
const SECTION_TITLE = "The Perfect Decade";

// TO CHANGE BODY TEXT: edit the string below
const BODY_TEXT =
  "The 1950s looked like a dream polished to perfection. Pastel kitchens, shining cars, glowing diners, elegant dresses, and television screens that promised a brighter future. Everything felt clean, sweet, and beautifully arranged — a world built from smiles, chrome, soft colors, and the idea that life was finally becoming perfect.";

export function S05HappySide() {
  const transitionRef = useRef<HTMLDivElement>(null);
  const heroImgRef = useRef<HTMLDivElement>(null);
  const collageRevealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = transitionRef.current;
    const heroImg = heroImgRef.current;
    const collageReveal = collageRevealRef.current;
    if (!section || !heroImg || !collageReveal) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: `+=${TRANSITION_SCROLL}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });

      // Zoom the previous image down toward the bottom-right of the collage.
      // Adjust TARGET_X_PERCENT / TARGET_Y_PERCENT above to fine-tune landing.
      tl.to(
        heroImg,
        {
          scale: TARGET_SCALE,
          xPercent: TARGET_X_PERCENT,
          yPercent: TARGET_Y_PERCENT,
          ease: "power2.inOut",
          duration: 1,
        },
        0
      );

      // Fade the collage in as the zoom-out progresses.
      // Adjust COLLAGE_FADE_START above to change when it begins appearing.
      tl.fromTo(
        collageReveal,
        { opacity: 0 },
        {
          opacity: 1,
          ease: "power1.in",
          duration: 1 - COLLAGE_FADE_START,
        },
        COLLAGE_FADE_START
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <>
      {/* ── ZOOM-OUT TRANSITION ───────────────────────────────────────────── */}
      <div
        ref={transitionRef}
        className="relative h-screen overflow-hidden bg-[#0c0906]"
      >
        {/* Previous full image — starts at 100% scale, zooms toward bottom-right */}
        <div ref={heroImgRef} className="absolute inset-0">
          <Image
            src="/assets/S04-1950s-america/the_perfect.png"
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            aria-hidden="true"
          />
        </div>

        {/* Collage fades in around the shrinking image */}
        <div
          ref={collageRevealRef}
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: 0 }}
        >
          {/* COLLAGE SIZE in transition: adjust max-w-[85vw] here */}
          <div
            className="relative w-full max-w-[85vw]"
            style={{ aspectRatio: `${COLLAGE_W} / ${COLLAGE_H}` }}
          >
            <Image
              src="/assets/collage_perfect.png"
              alt="The Perfect Decade collage"
              fill
              sizes="85vw"
              className="object-contain"
            />
          </div>
        </div>
      </div>

      {/* ── CONTENT SECTION ───────────────────────────────────────────────── */}
      <section
        aria-label="S05 The Happy Side"
        className="bg-[#0c0906] font-cormorant flex flex-col items-center text-center px-6 pt-20 pb-24"
      >
        {/* COLLAGE HERO IMAGE ───────────────────────────────────────────────
            COLLAGE SIZE: adjust max-w-[85vw] here and in the transition above.  */}
        <div
          className="relative w-full max-w-[85vw] mb-14"
          style={{ aspectRatio: `${COLLAGE_W} / ${COLLAGE_H}` }}
        >
          <Image
            src="/assets/collage_perfect.png"
            alt="The Perfect Decade — archival collage"
            fill
            sizes="85vw"
            className="object-contain"
          />
        </div>

        {/* LABEL with horizontal rules: ─── The Happy Side ─── */}
        <div className="flex items-center gap-5 w-full max-w-sm mb-5">
          <div className="flex-1 h-px bg-[#c4b49a]/30" />
          <span className="font-josefin text-[#c4b49a]/60 text-[0.65rem] tracking-[0.28em] uppercase whitespace-nowrap">
            The Happy Side
          </span>
          <div className="flex-1 h-px bg-[#c4b49a]/30" />
        </div>

        {/* MAIN TITLE — Cormorant Garamond italic
            TO CHANGE FONT: swap font-cormorant with font-josefin, font-script, etc. */}
        <h2 className="font-cormorant italic text-[#e8dfc8] text-[clamp(2.8rem,6vw,6.5rem)] leading-[1.05] mb-7">
          {SECTION_TITLE}
        </h2>

        {/* DECORATIVE DIVIDER with red-brown star accent
            TO CHANGE COLOR: update #7c3226 below (both the lines and the ✦) */}
        <div className="flex items-center gap-3 w-full max-w-xs mb-11">
          <div className="flex-1 h-px bg-[#7c3226]/45" />
          <span
            className="text-[#7c3226] leading-none"
            style={{ fontSize: "0.5rem" }}
          >
            ✦
          </span>
          <div className="flex-1 h-px bg-[#7c3226]/45" />
        </div>

        {/* BODY TEXT — TO CHANGE: edit BODY_TEXT constant at top of file */}
        <p className="font-josefin text-[#b4a892]/60 text-[0.82rem] leading-[1.9] tracking-wide max-w-md mb-20">
          {BODY_TEXT}
        </p>

        {/* SCROLL INDICATOR */}
        <div className="flex flex-col items-center gap-3 opacity-30">
          <span className="font-josefin text-[#c4b49a] text-[0.58rem] tracking-[0.35em] uppercase">
            Scroll
          </span>
          <div className="w-px h-8 bg-[#c4b49a]" />
        </div>
      </section>
    </>
  );
}
