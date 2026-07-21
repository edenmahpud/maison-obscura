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

export type SfxName =
  | "typewriter"
  | "flash"
  | "sparkle"
  | "door"
  | "redCircle"
  | "paper";

const SFX_PATHS: Record<SfxName, string> = {
  typewriter: "/assets/sounds/sfx/typewriter-key.mp3",
  flash:      "/assets/sounds/sfx/flash.mp3",
  sparkle:    "/assets/sounds/sfx/sparkle.mp3",
  door:       "/assets/sounds/sfx/door-open.mp3",
  redCircle:  "/assets/sounds/sfx/red-circle-draw.mp3",
  paper:      "/assets/sounds/sfx/paper-place.mp3",
};

const SFX_VOLUME: Record<SfxName, number> = {
  typewriter: 0.22,
  flash:      0.65,
  sparkle:    0.4,
  door:       0.55,
  redCircle:  0.45,
  paper:      0.3,
};

// How long (ms) music stays ducked after this SFX fires. 0 = no auto-duck —
// used for typewriter, which fires too rapidly to duck without flickering.
const SFX_DUCK_MS: Record<SfxName, number> = {
  typewriter: 0,
  flash:      900,
  sparkle:    600,
  door:       1200,
  redCircle:  700,
  paper:      450,
};

// Minimum time (ms) between plays of the same SFX — prevents spam.
const SFX_COOLDOWN_MS: Record<SfxName, number> = {
  typewriter: 70,
  flash:      400,
  sparkle:    150,
  door:       800,
  redCircle:  500,
  paper:      180,
};

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

  const path = SFX_PATHS[name];
  try {
    const clip = new Audio(path);
    clip.volume = SFX_VOLUME[name];
    clip.addEventListener("error", () => {
      console.warn(`[AudioManager] failed to load SFX "${name}":`, path);
    });
    clip.play().catch(() => {});
  } catch {
    console.warn(`[AudioManager] could not play SFX "${name}":`, path);
  }

  const duckMs = SFX_DUCK_MS[name];
  if (duckMs > 0) duckReasons.set(`sfx:${name}`, now + duckMs);
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
