"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function S04America1950s() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const imgWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const imgWrap = imgWrapRef.current;
    if (!section || !imgWrap) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "+=2000",
        pin: true,
        scrub: true,
        onUpdate: (self) => {
          imgWrap.style.filter = `blur(${20 * (1 - self.progress)}px)`;
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
      <div
        ref={imgWrapRef}
        className="absolute inset-0"
        style={{ filter: "blur(20px)" }}
      >
        <Image
          src="/assets/S04-1950s-america/the_perfect.png"
          alt="The perfect America"
          fill
          sizes="100vw"
          className="object-cover"
        />
      </div>
    </section>
  );
}
