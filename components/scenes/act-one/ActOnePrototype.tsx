"use client";

import { useEffect, useRef, useState } from "react";
import { S00TheFlash } from "./S00TheFlash";
import { S01PhotographAppears } from "./S01PhotographAppears";
import { S02TheQuestion } from "./S02TheQuestion";
import { S03TimeDescent } from "./S03TimeDescent";
import { S04America1950s } from "./S04America1950s";

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

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function log(...args: unknown[]) {
  if (DEBUG_SOUND) console.log("[Sound]", ...args);
}

export function ActOnePrototype() {
  const introRef = useRef<HTMLElement | null>(null);
  const [introProgress, setIntroProgress] = useState(0);

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
