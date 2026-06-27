"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FlashIntro } from "./FlashIntro";
import { S02TheQuestion } from "./S02TheQuestion";
import { S04America1950s } from "./S04America1950s";
import { S05Transition } from "./S05Transition";
import { S06SadSection } from "./S06SadSection";

// ── SOUND CONTROLS ────────────────────────────────────────────────────────────
// Asset path served from /public. Edit here to swap the audio file.
const AUDIO_SRC = "/assets/sounds/sfx/flash.mp3";

// Playback volume — range 0–1.
const AUDIO_VOLUME = 0.8;

// introProgress fraction (0–1) at which the fade-out begins.
// S01 photograph is fully settled at ~0.56; 0.45 fades the sound as it lands.
// Lower to fade earlier; raise to let the sound play longer.
const SOUND_FADE_AT = 0.45;

// Duration of the volume fade-out in milliseconds.
const SOUND_FADE_MS = 900;

// ── DEBUG — set to false once sound is confirmed working ─────────────────────
const DEBUG_SOUND = true;
// ─────────────────────────────────────────────────────────────────────────────

// ── SECTION SIZING ────────────────────────────────────────────────────────────
// Total: 300vh question/transition + 400vh scroll-scrubbed tunnel = 700vh.
// QUESTION_PHASE is that 300vh fraction of 700vh total.
const QUESTION_PHASE = 300 / 700; // ≈ 0.4286

// ── TUNNEL TRANSITION CONTROLS ────────────────────────────────────────────────
// All values are fractions of total section scroll (0–1 over 700vh).
// Derived by multiplying old 300vh-relative values × QUESTION_PHASE.
const TUNNEL_OVERLAY_IN_START  = 0.309; // 0.72 × QUESTION_PHASE
const TUNNEL_OVERLAY_IN_END    = 0.356; // 0.83 × QUESTION_PHASE
const TUNNEL_OVERLAY_OUT_START = 0.356; // 0.83 × QUESTION_PHASE
const TUNNEL_OVERLAY_OUT_END   = 0.403; // 0.94 × QUESTION_PHASE
const TUNNEL_IN_START  = 0.343;         // 0.80 × QUESTION_PHASE
const TUNNEL_IN_END    = 0.403;         // 0.94 × QUESTION_PHASE — fully revealed
const TUNNEL_BLUR_MAX  = 28;
const TUNNEL_SCALE_MAX = 1.04;

// ── TUNNEL SCROLL-SCRUB CONTROLS ──────────────────────────────────────────────
// After TUNNEL_IN_END the tunnel is clear; remaining scroll scrubs the video.
const TUNNEL_SCROLL_START = TUNNEL_IN_END; // 0.403

// ── YEAR OVERLAY CONTROLS ─────────────────────────────────────────────────────
// Global fractions (0–1 over 700vh). Converted from original tunnel-relative
// fractions: global = tunnelFrac × (1 − TUNNEL_SCROLL_START) + TUNNEL_SCROLL_START
const YEAR_2026_FADE_IN_START = TUNNEL_SCROLL_START; // 0.403
const YEAR_2026_FADE_IN_END   = 0.421;
const YEAR_2026_HOLD_END      = 0.451;
const YEAR_2026_GONE_BY       = 0.534;
const YEAR_1953_APPEAR        = 0.851;
const YEAR_1953_FULL          = 0.940;

// ── EXIT OVERLAY ──────────────────────────────────────────────────────────────
// Rises near the end of the tunnel scroll. Color matches S04's entry overlay so
// the section boundary is invisible (warm cream → warm cream → image reveals).
const EXIT_FADE_START = 0.90;
// ─────────────────────────────────────────────────────────────────────────────

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function log(...args: unknown[]) {
  if (DEBUG_SOUND) console.log("[Sound]", ...args);
}

export function ActOnePrototype() {
  const introRef = useRef<HTMLElement | null>(null);
  const [introProgress, setIntroProgress] = useState(0);

  // ── Tunnel transition refs ────────────────────────────────────────────────
  const tunnelLayerRef       = useRef<HTMLDivElement | null>(null);
  const tunnelVideoWrapRef   = useRef<HTMLDivElement | null>(null);
  const tunnelVideoRef       = useRef<HTMLVideoElement | null>(null);
  const transitionOverlayRef = useRef<HTMLDivElement | null>(null);

  // ── Year / exit overlay refs ──────────────────────────────────────────────
  const year2026Ref   = useRef<HTMLDivElement | null>(null);
  const year1953Ref   = useRef<HTMLDivElement | null>(null);
  const exitOverlayRef = useRef<HTMLDivElement | null>(null);

  // ── Audio refs ────────────────────────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasStartedRef = useRef(false); // true once play() has been called
  const isFadingRef = useRef(false);   // true while fade-out RAF is running
  const progressRef = useRef(0);       // stable ref for use inside event callbacks
  const playStartTimeRef = useRef(0);  // timestamp when play() succeeded

  // Initialize audio on mount and attach unlock listeners
  useEffect(() => {
    log("Creating Audio object from:", AUDIO_SRC);
    const audio = new Audio(AUDIO_SRC);
    audio.preload = "auto";
    audio.muted = false;
    audio.volume = AUDIO_VOLUME;
    audioRef.current = audio;

    audio.addEventListener("canplaythrough", () => {
      log("canplaythrough — file loaded OK, duration:", audio.duration);
    });
    audio.addEventListener("error", (e) => {
      console.error("[Sound] Audio load error:", e, audio.error);
    });

    // ── Unlock + play ──────────────────────────────────────────────────────
    // pointerdown is a trusted gesture in all browsers (mouse, touch, pen).
    // keydown covers keyboard users.
    // wheel is attempted for scroll-wheel but may not unlock autoplay in Chrome.
    const tryPlay = (e: Event) => {
      log("tryPlay called by:", e.type, "| hasStarted:", hasStartedRef.current, "| progress:", progressRef.current.toFixed(3));

      if (hasStartedRef.current) {
        log("→ blocked: already started");
        return;
      }
      if (progressRef.current > 0.05) {
        log("→ blocked: already past intro start (progress > 0.05)");
        return;
      }

      hasStartedRef.current = true;
      audio.currentTime = 0;
      audio.volume = AUDIO_VOLUME;
      log("→ calling audio.play(), volume:", audio.volume, "muted:", audio.muted);

      audio.play()
        .then(() => {
          playStartTimeRef.current = performance.now();
          log("→ play() succeeded ✓, volume:", audio.volume);
        })
        .catch((err) => {
          console.error("[Sound] → play() FAILED:", err);
          // Reset so another gesture can retry
          hasStartedRef.current = false;
        });
    };

    // pointerdown is the most reliable trusted gesture for autoplay
    window.addEventListener("pointerdown", tryPlay);
    window.addEventListener("keydown", tryPlay);
    window.addEventListener("wheel", tryPlay, { passive: true });

    return () => {
      audio.pause();
      audioRef.current = null;
      window.removeEventListener("pointerdown", tryPlay);
      window.removeEventListener("keydown", tryPlay);
      window.removeEventListener("wheel", tryPlay);
    };
  }, []);

  // Keep progressRef in sync so event callbacks read the latest value
  useEffect(() => {
    progressRef.current = introProgress;
  }, [introProgress]);

  // Fade out when first image section becomes visible
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const elapsed = performance.now() - playStartTimeRef.current;

    // Only fade if the sound has been audible for at least 300 ms
    // (prevents an instant fade if the user scrolls fast)
    if (
      introProgress >= SOUND_FADE_AT &&
      !audio.paused &&
      !isFadingRef.current &&
      elapsed > 300
    ) {
      log("Starting fade-out at progress:", introProgress.toFixed(3));
      isFadingRef.current = true;
      const startVol = audio.volume;
      const startTime = performance.now();

      const tick = (now: number) => {
        const t = Math.min(1, (now - startTime) / SOUND_FADE_MS);
        if (audioRef.current) {
          audioRef.current.volume = startVol * (1 - t);
        }
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.volume = AUDIO_VOLUME; // restore for potential replay
          }
          isFadingRef.current = false;
          log("Fade-out complete, audio paused");
        }
      };
      requestAnimationFrame(tick);
    }

    // Reset if user scrolls back to the very beginning
    if (introProgress < 0.02 && hasStartedRef.current && audio.paused) {
      log("Reset — user returned to top, sound ready to play again");
      hasStartedRef.current = false;
      audio.currentTime = 0;
      audio.volume = AUDIO_VOLUME;
    }
  }, [introProgress]);

  // ── Tunnel GSAP ScrollTrigger ─────────────────────────────────────────────
  // Drives: tunnel reveal blur/scale, video.currentTime, years, exit overlay.
  // Trigger is the full 700vh introRef section; progress 0–1 covers it all.
  // CSS sticky keeps the viewport pinned — no GSAP pin needed.
  useEffect(() => {
    const intro = introRef.current;
    const video = tunnelVideoRef.current;
    if (!intro || !video) return;

    gsap.registerPlugin(ScrollTrigger);

    let dur = 0;
    const onMeta = () => { dur = video.duration; };
    video.addEventListener("loadedmetadata", onMeta);
    if (video.readyState >= 1) dur = video.duration;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: intro,
        start: "top top",
        end: "bottom bottom",
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress;

          // ── Tunnel reveal (transition from question) ────────────────────
          const overlayIn  = clamp01((p - TUNNEL_OVERLAY_IN_START)  / (TUNNEL_OVERLAY_IN_END  - TUNNEL_OVERLAY_IN_START));
          const overlayOut = clamp01((p - TUNNEL_OVERLAY_OUT_START) / (TUNNEL_OVERLAY_OUT_END - TUNNEL_OVERLAY_OUT_START));
          if (transitionOverlayRef.current)
            transitionOverlayRef.current.style.opacity = String(overlayIn * (1 - overlayOut));
          const tunnelP     = clamp01((p - TUNNEL_IN_START) / (TUNNEL_IN_END - TUNNEL_IN_START));
          const tunnelBlur  = TUNNEL_BLUR_MAX  * (1 - tunnelP);
          const tunnelScale = TUNNEL_SCALE_MAX - tunnelP * (TUNNEL_SCALE_MAX - 1);
          if (tunnelLayerRef.current)
            tunnelLayerRef.current.style.opacity = String(tunnelP);
          if (tunnelVideoWrapRef.current) {
            tunnelVideoWrapRef.current.style.transform = `scale(${tunnelScale})`;
            tunnelVideoWrapRef.current.style.filter    = tunnelBlur > 0.3 ? `blur(${tunnelBlur}px)` : "";
          }

          // ── Video scroll-scrub ──────────────────────────────────────────
          if (dur > 0) {
            const tf = clamp01((p - TUNNEL_SCROLL_START) / (1 - TUNNEL_SCROLL_START));
            video.currentTime = Math.min(tf * dur, dur - 0.001);
          }

          // ── Year labels ─────────────────────────────────────────────────
          if (year2026Ref.current) {
            const i = clamp01((p - YEAR_2026_FADE_IN_START) / (YEAR_2026_FADE_IN_END - YEAR_2026_FADE_IN_START));
            const o = clamp01((p - YEAR_2026_HOLD_END)      / (YEAR_2026_GONE_BY      - YEAR_2026_HOLD_END));
            year2026Ref.current.style.opacity = String(i * (1 - o));
          }
          if (year1953Ref.current) {
            year1953Ref.current.style.opacity = String(
              clamp01((p - YEAR_1953_APPEAR) / (YEAR_1953_FULL - YEAR_1953_APPEAR))
            );
          }

          // ── Exit overlay ────────────────────────────────────────────────
          if (exitOverlayRef.current) {
            exitOverlayRef.current.style.opacity = String(
              clamp01((p - EXIT_FADE_START) / (1 - EXIT_FADE_START))
            );
          }
        },
      });
    }, intro);

    return () => {
      video.removeEventListener("loadedmetadata", onMeta);
      ctx.revert();
    };
  }, []);

  // ── Scroll progress tracking ──────────────────────────────────────────────
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
      // S02TheQuestion expects 0–1 over the question phase only
      setIntroProgress(clamp01(scrolled / QUESTION_PHASE));
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
    <div className="relative bg-[#050505]">
      <FlashIntro />
      <section ref={introRef} className="relative min-h-[700vh] bg-black">
        <div className="sticky top-0 h-screen overflow-hidden bg-[#050505]">
          <S02TheQuestion progress={introProgress} />
          {/* Tunnel layer — z-5, above S02 (z-auto) */}
          <div
            ref={tunnelLayerRef}
            style={{ position: "absolute", inset: 0, zIndex: 5, opacity: 0, overflow: "hidden", pointerEvents: "none" }}
          >
            <div
              ref={tunnelVideoWrapRef}
              style={{ position: "absolute", inset: 0, transform: `scale(${TUNNEL_SCALE_MAX})`, transformOrigin: "center center" }}
            >
              <video
                ref={tunnelVideoRef}
                src="/assets/tunnel.mp4"
                muted
                playsInline
                preload="auto"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>

            {/* Year labels — inside tunnel layer, above video */}
            <div
              aria-hidden="true"
              className="pointer-events-none"
              style={{ position: "absolute", inset: 0, zIndex: 50 }}
            >
              <div
                ref={year2026Ref}
                className="font-cormorant italic"
                style={{
                  position: "absolute", left: "50%", top: "50%",
                  transform: "translate(-50%, -50%)",
                  fontSize: "clamp(5rem, 10vw, 11rem)", fontWeight: 300,
                  lineHeight: 1, textAlign: "center", whiteSpace: "nowrap",
                  color: "rgba(255,248,232,0.85)", letterSpacing: "0.15em",
                  textShadow: "0 0 40px rgba(255,240,200,0.2), 0 2px 12px rgba(0,0,0,0.5)",
                  filter: "blur(0.4px)", userSelect: "none", opacity: 0,
                }}
              >
                2026
              </div>
              <div
                ref={year1953Ref}
                className="font-cormorant italic"
                style={{
                  position: "absolute", left: "50%", top: "50%",
                  transform: "translate(-50%, -50%)",
                  fontSize: "clamp(5rem, 10vw, 11rem)", fontWeight: 300,
                  lineHeight: 1, textAlign: "center", whiteSpace: "nowrap",
                  color: "rgba(255,248,232,0.85)", letterSpacing: "0.15em",
                  textShadow: "0 0 40px rgba(255,240,200,0.2), 0 2px 12px rgba(0,0,0,0.5)",
                  filter: "blur(0.4px)", userSelect: "none", opacity: 0,
                }}
              >
                1953
              </div>
            </div>
          </div>

          {/* Warm exposure overlay — z-15, peaks between question fade and tunnel reveal */}
          <div
            ref={transitionOverlayRef}
            aria-hidden="true"
            style={{ position: "absolute", inset: 0, zIndex: 15, background: "#FCF1DA", opacity: 0, pointerEvents: "none" }}
          />

          {/* Warm exit overlay — z-20, fades in at end of tunnel scroll.      */}
          {/* Color matches S04's entry overlay for a seamless section handoff. */}
          <div
            ref={exitOverlayRef}
            aria-hidden="true"
            className="pointer-events-none"
            style={{ position: "absolute", inset: 0, zIndex: 20, background: "#FCF1DA", opacity: 0 }}
          />
        </div>
      </section>
      <S04America1950s />
      <S05Transition />
      <S06SadSection />

      {/* ── DEBUG TEST BUTTON — remove when sound is confirmed working ───────
          Click this to bypass scroll and play the sound directly.
          If this plays but scroll does not, the issue is the gesture unlock.
          If this does not play either, the issue is the file path or format. */}
      {DEBUG_SOUND && (
        <button
          onClick={() => {
            log("Test button clicked");
            const a = audioRef.current;
            if (!a) { log("No audio object"); return; }
            a.currentTime = 0;
            a.volume = AUDIO_VOLUME;
            a.muted = false;
            log("Calling play() from test button");
            a.play()
              .then(() => log("Test button play() succeeded ✓"))
              .catch((err) => console.error("[Sound] Test button play() failed:", err));
          }}
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 9999,
            padding: "8px 14px",
            background: "rgba(255,255,255,0.9)",
            color: "#000",
            fontSize: 11,
            fontFamily: "monospace",
            border: "1px solid #999",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Test Sound
        </button>
      )}
    </div>
  );
}
