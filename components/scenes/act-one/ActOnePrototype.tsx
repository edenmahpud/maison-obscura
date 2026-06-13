"use client";

import { useEffect, useRef, useState } from "react";
import { S00TheFlash } from "./S00TheFlash";
import { S01PhotographAppears } from "./S01PhotographAppears";
import { S02TheQuestion } from "./S02TheQuestion";
import { S03TimeDescent } from "./S03TimeDescent";
import { S04America1950s } from "./S04America1950s";

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function ActOnePrototype() {
  const introRef = useRef<HTMLElement | null>(null);
  const [introProgress, setIntroProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const updateProgress = () => {
      const intro = introRef.current;
      if (!intro) {
        setIntroProgress(0);
        return;
      }

      const rect = intro.getBoundingClientRect();
      const maxScroll = Math.max(rect.height - window.innerHeight, 1);
      const scrolled = clamp01(-rect.top / maxScroll);
      setIntroProgress(scrolled);
    };

    const queueUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateProgress);
    };

    queueUpdate();
    window.addEventListener("scroll", queueUpdate, { passive: true });
    window.addEventListener("resize", queueUpdate);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", queueUpdate);
      window.removeEventListener("resize", queueUpdate);
    };
  }, []);

  return (
    <div className="relative bg-black">
      <section ref={introRef} className="relative min-h-[320vh] bg-black">
        <div className="sticky top-0 h-screen overflow-hidden">
          <S00TheFlash progress={introProgress} />
          <S01PhotographAppears progress={introProgress} />
          <S02TheQuestion progress={introProgress} />
        </div>
      </section>
      <S03TimeDescent />
      <S04America1950s />
    </div>
  );
}
