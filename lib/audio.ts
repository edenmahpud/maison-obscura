"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Global AudioManager — centralizes background music, SFX playback, and
// video-priority ducking so every scene's sound behaves as one coherent mix.
//
// Module-level singleton (not React Context): the site has exactly one
// mounted tree (ActOnePrototype), so a plain module avoids provider nesting.
// Call initAudioManager() once from that root; import playSfx/duckMusic/
// restoreMusic directly from any scene component.
// ─────────────────────────────────────────────────────────────────────────────

// Every name here must have a real file under public/assets/sounds/sfx/.
// A name with no file behind it produces a 404 per play attempt and a rejected
// play() promise, so this union is the single place that decides what exists.
export type SfxName =
  | "typewriter"
  | "flash"
  | "door"
  | "redCircle"
  | "paper";

const SFX_PATHS: Record<SfxName, string> = {
  typewriter: "/assets/sounds/sfx/typewriter-key.mp3",
  flash:      "/assets/sounds/sfx/flash.mp3",
  door:       "/assets/sounds/sfx/door-open.mp3",
  redCircle:  "/assets/sounds/sfx/red-circle-draw.mp3",
  paper:      "/assets/sounds/sfx/paper-place.mp3",
};

const SFX_VOLUME: Record<SfxName, number> = {
  typewriter: 0.22,
  flash:      0.65,
  door:       0.55,
  redCircle:  0.45,
  paper:      0.3,
};

// How long (ms) music stays ducked after this SFX fires. 0 = no auto-duck —
// used for typewriter, which fires too rapidly to duck without flickering.
const SFX_DUCK_MS: Record<SfxName, number> = {
  typewriter: 0,
  flash:      900,
  door:       1200,
  redCircle:  700,
  paper:      450,
};

// Minimum time (ms) between plays of the same SFX — prevents spam.
const SFX_COOLDOWN_MS: Record<SfxName, number> = {
  typewriter: 70,
  flash:      400,
  door:       800,
  redCircle:  500,
  paper:      180,
};

// How long (ms) stopSfx takes to fade a clip out. Short enough to read as
// "the sound ends here", long enough not to click.
const SFX_FADE_MS = 180;

const MUSIC_SRC = "/assets/sounds/music/main-ambience.mp3";
const MUSIC_BASE_VOLUME = 0.22;
const MUSIC_VIDEO_DUCK_VOLUME = 0.065;
const MUSIC_SFX_DUCK_FACTOR = 0.55;
// Per-frame approach factor toward the target volume — lower = slower/gentler fade.
const MUSIC_LERP = 0.045;

let musicEl: HTMLAudioElement | null = null;
let mounted = false;
let unlocked = false;
let muted = false;
let rafId: number | null = null;

const lastPlayedAt: Partial<Record<SfxName, number>> = {};

// One reused <audio> element per SFX, created lazily on first play. The old
// `new Audio()` per call meant a clip longer than its own cooldown could stack
// on top of itself — several copies of the same sound audible at once, and no
// handle on any of them to stop it again. One element per name makes a second
// play inherently a rewind of the first, and gives stopSfx something to hold.
const sfxClips: Partial<Record<SfxName, HTMLAudioElement>> = {};
// Names currently fading out, so a fade can't be started twice or fight a
// replay that lands mid-fade.
const fadingOut = new Set<SfxName>();

function getClip(name: SfxName): HTMLAudioElement | null {
  const existing = sfxClips[name];
  if (existing) return existing;

  try {
    const clip = new Audio(SFX_PATHS[name]);
    clip.loop = false;
    clip.preload = "auto";
    clip.addEventListener("error", () => {
      console.warn(`[AudioManager] failed to load SFX "${name}":`, SFX_PATHS[name]);
    });
    sfxClips[name] = clip;
    return clip;
  } catch {
    return null;
  }
}
// reason -> expiresAt (ms epoch); Infinity = persistent until restoreMusic() is called.
// Reasons starting with "video" get top ducking priority (Priority 1 in the mix).
const duckReasons = new Map<string, number>();

function computeTargetVolume(): number {
  if (muted) return 0;

  const now = Date.now();
  let hasVideo = false;
  let hasOther = false;

  for (const [reason, expiresAt] of duckReasons) {
    if (expiresAt !== Infinity && expiresAt <= now) {
      duckReasons.delete(reason);
      continue;
    }
    if (reason.startsWith("video")) hasVideo = true;
    else hasOther = true;
  }

  if (hasVideo) return MUSIC_VIDEO_DUCK_VOLUME;
  if (hasOther) return MUSIC_BASE_VOLUME * MUSIC_SFX_DUCK_FACTOR;
  return MUSIC_BASE_VOLUME;
}

function tick() {
  if (musicEl) {
    const target = computeTargetVolume();
    const cur = musicEl.volume;
    musicEl.volume = Math.abs(target - cur) > 0.003
      ? cur + (target - cur) * MUSIC_LERP
      : target;
  }
  rafId = requestAnimationFrame(tick);
}

function startMusic() {
  if (!musicEl) return;
  musicEl.volume = 0;
  musicEl.play().catch((err) => {
    console.warn("[AudioManager] background music failed to start:", err);
  });
}

function handleUnlock() {
  if (unlocked) return;
  unlocked = true;
  startMusic();
}

/** Call once from the app root. Returns a cleanup function. */
export function initAudioManager(): () => void {
  if (typeof window === "undefined" || mounted) return () => {};
  mounted = true;

  try {
    musicEl = new Audio(MUSIC_SRC);
    musicEl.loop = true;
    musicEl.preload = "auto";
    musicEl.volume = 0;
    musicEl.addEventListener("error", () => {
      console.warn("[AudioManager] failed to load background music:", MUSIC_SRC);
    });
  } catch {
    musicEl = null;
  }

  const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "wheel", "touchstart"];
  events.forEach((e) => window.addEventListener(e, handleUnlock, { passive: true }));

  rafId = requestAnimationFrame(tick);

  return () => {
    events.forEach((e) => window.removeEventListener(e, handleUnlock));
    if (rafId !== null) cancelAnimationFrame(rafId);
    musicEl?.pause();
    musicEl = null;

    // Stop and release every cached SFX element too. These are module-level,
    // so without this they'd outlive the tree that created them — still
    // holding decoded audio, and still playing whatever was mid-clip at unmount.
    (Object.keys(sfxClips) as SfxName[]).forEach((name) => {
      const clip = sfxClips[name];
      if (!clip) return;
      clip.pause();
      clip.src = "";
      delete sfxClips[name];
    });
    fadingOut.clear();

    mounted = false;
    unlocked = false;
    duckReasons.clear();
  };
}

/** Play a named SFX, respecting global mute, unlock state, and per-type cooldown. */
export function playSfx(name: SfxName): void {
  if (muted || !unlocked || typeof window === "undefined") return;

  const now = Date.now();
  const cooldown = SFX_COOLDOWN_MS[name];
  if (now - (lastPlayedAt[name] ?? 0) < cooldown) return;
  lastPlayedAt[name] = now;

  const clip = getClip(name);
  if (!clip) return;

  // Cancel any fade still running on this clip, then rewind: a replay is
  // always deliberate, so it starts from the top at full volume rather than
  // resuming wherever the last one was cut off.
  fadingOut.delete(name);
  clip.volume = SFX_VOLUME[name];
  try {
    clip.currentTime = 0;
  } catch {
    // Seeking before metadata exists throws in some browsers; the clip simply
    // starts from 0 on its own in that case.
  }

  // play() rejects on autoplay policy, on a mid-flight pause(), and on a
  // missing file. None of those are worth a console error here — a missing
  // file is already reported once by the "error" listener in getClip().
  void clip.play().catch(() => {});

  const duckMs = SFX_DUCK_MS[name];
  if (duckMs > 0) duckReasons.set(`sfx:${name}`, now + duckMs);
}

/**
 * Fade out and rewind a playing SFX — for cues tied to a visible animation
 * that finishes before the audio file does. No-op if it isn't playing.
 */
export function stopSfx(name: SfxName, fadeMs: number = SFX_FADE_MS): void {
  const clip = sfxClips[name];
  if (!clip || clip.paused || fadingOut.has(name)) return;

  // Release the duck immediately: the cue is over, so the music shouldn't stay
  // held down for the remainder of a duck window the full-length clip earned.
  duckReasons.delete(`sfx:${name}`);

  const settle = () => {
    clip.pause();
    try {
      clip.currentTime = 0;
    } catch {
      /* pre-metadata seek; harmless */
    }
    clip.volume = SFX_VOLUME[name]; // restore for the next deliberate play
    fadingOut.delete(name);
  };

  if (fadeMs <= 0) {
    settle();
    return;
  }

  fadingOut.add(name);
  const startVol = clip.volume;
  const startedAt = performance.now();

  const step = () => {
    // A replay (which clears the flag) takes precedence — abandon the fade and
    // leave the volume playSfx just set.
    if (!fadingOut.has(name)) return;
    const t = (performance.now() - startedAt) / fadeMs;
    if (t >= 1 || clip.paused) {
      settle();
      return;
    }
    clip.volume = startVol * (1 - t);
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Duck background music for `reason` until restoreMusic(reason) is called. */
export function duckMusic(reason: string): void {
  duckReasons.set(reason, Infinity);
}

/** Release a previously-set duck reason. */
export function restoreMusic(reason: string): void {
  duckReasons.delete(reason);
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

export function setMuted(value: boolean): void {
  muted = value;
}

export function toggleMuted(): boolean {
  muted = !muted;
  return muted;
}

export function isMuted(): boolean {
  return muted;
}
