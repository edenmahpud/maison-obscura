import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type S03TimeDescentProps = {
  onProgressChange?: (progress: number) => void;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function S03TimeDescent({
  onProgressChange,
}: S03TimeDescentProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const targetTimeRef = useRef(0);
  const durationRef = useRef(0);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const onLoadedMetadata = () => {
      durationRef.current = Number.isFinite(video.duration) ? video.duration : 0;
      video.pause();
      if (durationRef.current > 0.01) {
        video.currentTime = 0.01;
      }
      targetTimeRef.current = video.currentTime;
    };

    if (video.readyState >= 1) {
      onLoadedMetadata();
    } else {
      video.addEventListener("loadedmetadata", onLoadedMetadata);
      video.load();
    }

    const tick = () => {
      const duration = durationRef.current;
      if (duration > 0) {
        const target = clamp01(targetTimeRef.current / duration) * duration;
        const diff = target - video.currentTime;
        if (Math.abs(diff) > 0.001) {
          video.currentTime += diff * 0.085;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    triggerRef.current = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "+=8000",
      pin: true,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const duration = durationRef.current;
        const progress = self.progress;
        targetTimeRef.current = progress * duration;
        onProgressChange?.(progress);
      },
    });

    ScrollTrigger.refresh();

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (triggerRef.current) {
        triggerRef.current.kill();
        triggerRef.current = null;
      }
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.pause();
      video.currentTime = 0;
      durationRef.current = 0;
      targetTimeRef.current = 0;
    };
  }, [onProgressChange]);

  return (
    <section
      ref={sectionRef}
      aria-label="S03 Time Descent"
      className="relative h-screen overflow-hidden bg-black"
    >
      <video
        ref={videoRef}
        src="/assets/S03-time-descent/time-descent-tunnel-v01.mp4"
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </section>
  );
}
