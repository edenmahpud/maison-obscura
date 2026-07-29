"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Shared image preloader.
//
// Fetches AND decodes images ahead of the moment they're needed, then reports
// readiness. Decoding matters as much as fetching here: a fully-downloaded
// image still paints late if the browser has to decode it on the frame it
// first becomes visible, which on a large document is exactly the "appears
// partially / only after the animation started" symptom.
//
// Results are cached per URL, so several components can each ask for the same
// asset without triggering a second fetch — the second caller just awaits the
// first one's promise.
// ─────────────────────────────────────────────────────────────────────────────

const cache = new Map<string, Promise<void>>();

/** Fetch + decode one image. Resolves on success *and* on failure. */
export function preloadImage(src: string): Promise<void> {
  const cached = cache.get(src);
  if (cached) return cached;

  const task = new Promise<void>((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    const img = new window.Image();
    img.decoding = "async";
    img.fetchPriority = "high";

    img.onload = () => {
      // decode() resolves once the bitmap is ready to paint with no main-thread
      // work left. Older browsers without it are fine on load alone.
      if (typeof img.decode === "function") {
        img.decode().then(() => resolve(), () => resolve());
      } else {
        resolve();
      }
    };

    // Resolve rather than reject on error: a missing asset must never be able
    // to wedge a narrative gate shut and strand the viewer on a held frame.
    img.onerror = () => resolve();

    img.src = src;
  });

  cache.set(src, task);
  return task;
}

/** Fetch + decode several images. Resolves once all have settled. */
export function preloadImages(srcs: readonly string[]): Promise<void> {
  return Promise.all(srcs.map(preloadImage)).then(() => undefined);
}

/** True once this URL has been fetched and decoded in this session. */
export function isPreloaded(src: string): boolean {
  return cache.has(src);
}
