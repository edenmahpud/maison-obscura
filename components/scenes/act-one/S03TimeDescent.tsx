import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// SCROLL DISTANCE: controls how long the tunnel experience lasts.
// 4 = 400vh. Increase for a slower reveal, decrease for a faster one.
const TUNNEL_SCROLL_MULTIPLIER = 4;

// ENTRY TRANSITION: fraction of scroll over which the entry overlay fades out.
// 0.04 = first 4% of scroll (~16vh). Increase for a slower entry dissolve.
const ENTRY_FADE_END = 0.04;

// EXIT TRANSITION: fraction of scroll at which the white exit overlay starts fading in.
// 0.94 = starts at 94% through the tunnel (last ~24vh). Decrease to start the fade earlier.
const EXIT_FADE_START = 0.94;

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

export function S03TimeDescent() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const targetTimeRef = useRef(0);
  const durationRef = useRef(0);
  const entryOverlayRef = useRef<HTMLDivElement | null>(null);
  const exitOverlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    gsap.registerPlugin(ScrollTrigger);

    const onLoadedMetadata = () => {
      durationRef.current = Number.isFinite(video.duration) ? video.duration : 8;
      video.pause();
      video.currentTime = 0;
      targetTimeRef.current = 0;
    };

    if (video.readyState >= 1) {
      onLoadedMetadata();
    } else {
      video.addEventListener("loadedmetadata", onLoadedMetadata);
      video.load();
    }

    // RAF loop: directly seeks the video to the scroll-driven target time.
    // No easing — scroll position maps 1:1 to video time.
    const tick = () => {
      const target = targetTimeRef.current;
      if (durationRef.current > 0 && Math.abs(video.currentTime - target) > 0.002) {
        video.currentTime = target;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    const scrollDistance = window.innerHeight * TUNNEL_SCROLL_MULTIPLIER;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: `+=${scrollDistance}`,
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress;

          // Drive video time directly from scroll progress
          targetTimeRef.current = clamp01(p) * durationRef.current;

          // Entry: dark overlay dissolves away over the first ENTRY_FADE_END of scroll
          if (entryOverlayRef.current) {
            entryOverlayRef.current.style.opacity = String(
              1 - clamp01(p / ENTRY_FADE_END)
            );
          }

          // Exit: white overlay fades in from EXIT_FADE_START to 1.0
          if (exitOverlayRef.current) {
            exitOverlayRef.current.style.opacity = String(
              clamp01((p - EXIT_FADE_START) / (1 - EXIT_FADE_START))
            );
          }
        },
      });
    }, section);

    ScrollTrigger.refresh();

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      ctx.revert();
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.pause();
      durationRef.current = 0;
      targetTimeRef.current = 0;
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="S03 Time Descent"
      className="relative h-screen overflow-hidden bg-black"
    >
      <video
        ref={videoRef}
        src="/assets/tunnel.mp4"
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Entry overlay: softens the cut from the text screen into the tunnel */}
      <div
        ref={entryOverlayRef}
        className="pointer-events-none absolute inset-0 bg-black"
        style={{ opacity: 1 }}
      />

      {/* Exit overlay: white flash that bridges to the 1950s image section */}
      <div
        ref={exitOverlayRef}
        className="pointer-events-none absolute inset-0 bg-white"
        style={{ opacity: 0 }}
      />
    </section>
  );
}
