"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLazyVideoSrc } from "@/components/effects/useLazyVideoSrc";

gsap.registerPlugin(ScrollTrigger);

// Shared styling with the original tunnel's year overlays in
// ActOnePrototype.tsx (same font, size, color, glow, position) so this reads
// as the same visual device run in reverse, not a new effect.
const YEAR_STYLE: CSSProperties = {
  position: "absolute", left: "50%", top: "50%",
  transform: "translate(-50%, -50%)",
  fontSize: "clamp(5rem, 10vw, 11rem)", fontWeight: 300,
  lineHeight: 1, textAlign: "center", whiteSpace: "nowrap",
  color: "rgba(255,248,232,0.85)", letterSpacing: "0.15em",
  textShadow: "0 0 40px rgba(255,240,200,0.2), 0 2px 12px rgba(0,0,0,0.5)",
  filter: "blur(0.4px)", userSelect: "none", opacity: 0,
};

function isDesignMode() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("designMode") === "true";
}

// ── Reverse tunnel — the same tunnel.mp4 asset scrubbed backwards, last
// frame to first frame, as the user scrolls forward: returning from the
// past (1957) back to the present (2026).
//
// Scroll map (section height 480vh):
//
//   video.currentTime is driven directly by raw scroll progress (0→1 across
//   the whole section) mapped to (duration→0) — see onUpdate below, not the
//   relative-unit timeline used for the fades.
//
//   0   –1.2  this whole layer fades in over ArrestSection fading out beneath
//   0   –0.4  "1957" fades in — the tunnel starts on the video's last frame
//   1.2 –2.5  "1957" fades out as the reverse scrub gets underway
//   6.0 –7.5  "2026" fades in as the tunnel nears the video's first frame
//   7.5 –8    hold before the section releases
//
export function ReverseTunnelSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const year1957Ref = useRef<HTMLDivElement | null>(null);
  const year2026Ref = useRef<HTMLDivElement | null>(null);

  useLazyVideoSrc(videoRef, sectionRef, "/assets/tunnel.mp4");

  useEffect(() => {
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    const video = videoRef.current;
    const year1957 = year1957Ref.current;
    const year2026 = year2026Ref.current;
    if (!section || !sticky || !video || !year1957 || !year2026) return;

    if (isDesignMode()) {
      gsap.set(sticky, { opacity: 1, filter: "blur(0px)" });
      gsap.set(year1957, { opacity: 0 });
      gsap.set(year2026, { opacity: 1 });
      return;
    }

    gsap.set(sticky, { opacity: 0, filter: "blur(20px)" });
    gsap.set(year1957, { opacity: 0 });
    gsap.set(year2026, { opacity: 0 });

    const tl = gsap.timeline();
    // Phase 0 — this whole layer fades in over the previous section fading out.
    tl.to(sticky, { opacity: 1, filter: "blur(0px)", ease: "power1.out", duration: 1.2 }, 0);
    // "1957" is present at the start, then fades out as the reverse scrub begins.
    tl.to(year1957, { opacity: 1, ease: "power1.out", duration: 0.4 }, 0);
    tl.to(year1957, { opacity: 0, ease: "power1.in", duration: 1.3 }, 1.2);
    // "2026" fades in as the tunnel nears the first frame.
    tl.to(year2026, { opacity: 1, ease: "power1.out", duration: 1.5 }, 6.0);
    // Hold before the section releases.
    tl.to({}, { duration: 0.5 }, 7.5);

    // Duration isn't known until metadata loads — video.currentTime must
    // not be touched before then.
    let dur = 0;
    const applyReverseTime = (progress: number) => {
      if (dur <= 0) return;
      const t = Math.min((1 - progress) * dur, dur - 0.001);
      video.currentTime = Math.max(t, 0);
    };

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: 1.2,
      invalidateOnRefresh: true,
      animation: tl,
      // Direct, scroll-linked video scrubbing — GSAP's ticker already runs
      // on requestAnimationFrame and `scrub` smooths/lags the progress
      // value, so no separate manual rAF loop is needed on top of it.
      onUpdate: (self) => applyReverseTime(self.progress),
    });

    const onMeta = () => {
      dur = video.duration;
      // Show the correct frame immediately once ready, rather than waiting
      // for the next scroll tick — avoids a flash of frame 0 on arrival.
      applyReverseTime(st.progress);
    };
    video.addEventListener("loadedmetadata", onMeta);
    if (video.readyState >= 1) onMeta();

    return () => {
      video.removeEventListener("loadedmetadata", onMeta);
      st.kill();
      tl.kill();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="Reverse Tunnel Section"
      style={{ position: "relative", height: "480vh", background: "#0d0b09", marginTop: "-50vh" }}
    >
      {/* Permanently position:fixed with an opacity fade-in — same technique
          used by every section since S12WantedTransition — so this
          crossfades in cleanly on top of ArrestSection's own fade-out with
          no gap, jump, or black frame. */}
      <div
        ref={stickyRef}
        style={{ position: "fixed", inset: 0, overflow: "hidden", zIndex: 70, pointerEvents: "none", background: "#0d0b09" }}
      >
        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />

        <div aria-hidden="true" className="mo-archival-grain" style={{ position: "absolute", inset: 0, zIndex: 5 }} />

        <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 10 }}>
          <div ref={year1957Ref} className="font-cormorant italic" style={YEAR_STYLE}>1957</div>
          <div ref={year2026Ref} className="font-cormorant italic" style={YEAR_STYLE}>2026</div>
        </div>
      </div>
    </section>
  );
}
