"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SectionOverlayTitle } from "@/components/effects/SectionOverlayTitle";

// BLUR INTENSITY: maximum blur in pixels at the start of the section.
// Increase for a heavier initial blur, decrease for a softer one.
const MAX_BLUR_PX = 20;

// ENTRY TRANSITION: fraction of scroll over which the white entry overlay fades out.
// 0.07 = first 7% of scroll (~140px). Increase for a slower dissolve from the tunnel white.
const ENTRY_FADE_END = 0.07;

// SCROLL DISTANCE: how many pixels of scroll the de-blur experience lasts.
// Increase for a slower reveal, decrease for a faster one.
const SCROLL_DISTANCE = 2000;

gsap.registerPlugin(ScrollTrigger);

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

export function S04America1950s() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const imgWrapRef = useRef<HTMLDivElement | null>(null);
  const entryOverlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const imgWrap = imgWrapRef.current;
    if (!section || !imgWrap) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: `+=${SCROLL_DISTANCE}`,
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress;

          // Blur: MAX_BLUR_PX → 0 across the full scroll range
          imgWrap.style.filter = `blur(${MAX_BLUR_PX * (1 - p)}px)`;

          // Entry: white overlay inherited from tunnel exit dissolves away
          if (entryOverlayRef.current) {
            entryOverlayRef.current.style.opacity = String(
              1 - clamp01(p / ENTRY_FADE_END)
            );
          }
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="S04 The Perfect America"
      className="relative h-screen w-full overflow-hidden bg-black"
    >
      {/* z-0: blurred image layer — blur animated by scroll */}
      <div
        ref={imgWrapRef}
        className="absolute inset-0"
        style={{ zIndex: 0, filter: `blur(${MAX_BLUR_PX}px)` }}
      >
        <Image
          src="/assets/S04-1950s-america/the_perfect.png"
          alt="The perfect America"
          fill
          sizes="100vw"
          className="object-cover"
        />
      </div>

      {/*
        z-20: glass title — sits above image, outside the blur stacking context.
        TO CHANGE TEXT: edit the string below.
        TO REPOSITION: pass verticalPosition="55%" (or any %) to SectionOverlayTitle.
      */}
      <SectionOverlayTitle>The Perfect Decade</SectionOverlayTitle>

      {/* z-30: white entry overlay from tunnel exit — must cover title during transition */}
      <div
        ref={entryOverlayRef}
        className="pointer-events-none absolute inset-0 bg-white"
        style={{ zIndex: 30, opacity: 1 }}
      />
    </section>
  );
}
