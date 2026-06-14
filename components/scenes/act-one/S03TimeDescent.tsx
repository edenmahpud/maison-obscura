import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// TUNNEL SCROLL LENGTH: total scroll distance for the tunnel experience.
// 4 = 400vh (8s video across 400vh of scroll = 50vh per second).
// Decrease toward 3 for a faster ride, increase toward 5 for slower.
const TUNNEL_SCROLL_MULTIPLIER = 4;

// VIDEO SMOOTHING: easing factor applied per RAF frame (~60fps).
// 0.12 = cinematic lag, settles in ~16 frames (~270ms).
// Increase toward 0.4 for tighter/more direct scrubbing.
// Set to 1.0 to disable smoothing entirely (direct seek per frame).
const VIDEO_EASE = 0.12;

// BLACK ENTRY LENGTH: fraction of tunnel scroll over which the entry overlay fades.
// 0.01 = first 1% of tunnel scroll (~4vh at 400vh total) — almost instant.
// Increase toward 0.04 for a slightly longer soft-cut into the tunnel.
const ENTRY_FADE_END = 0.01;

// WHITE EXIT START: fraction of tunnel scroll where the exit overlay begins to appear.
// 0.94 = last 6% of scroll (~24vh). Decrease to start the white earlier.
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

    // RAF loop: smoothly interpolates video.currentTime toward the scroll-driven target.
    // Uses easing so abrupt scroll events (e.g. trackpad flicks) don't cause hard seeks.
    const tick = () => {
      if (durationRef.current > 0) {
        const target = targetTimeRef.current;
        const current = video.currentTime;
        const diff = target - current;

        // Only seek when the gap is meaningful — avoids thrashing the decoder.
        if (Math.abs(diff) > 0.01) {
          // SMOOTHING: adjust VIDEO_EASE above to change response speed.
          video.currentTime = current + diff * VIDEO_EASE;
        }
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

          // Update target — RAF loop eases toward this each frame.
          targetTimeRef.current = clamp01(p) * durationRef.current;

          // Entry: black overlay dissolves almost immediately at tunnel start.
          // Adjust ENTRY_FADE_END above to make this longer.
          if (entryOverlayRef.current) {
            entryOverlayRef.current.style.opacity = String(
              1 - clamp01(p / ENTRY_FADE_END)
            );
          }

          // Exit: white overlay fades in near the end of the tunnel.
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

      {/* Entry overlay: near-instant fade so tunnel video appears almost immediately */}
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
