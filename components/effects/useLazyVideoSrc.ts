"use client";

import { useEffect, type RefObject } from "react";

// Videos never get `src` set directly in JSX — with preload="auto" that
// makes the browser fetch the whole file the moment the DOM node mounts,
// regardless of scroll position. Every scene here is a tall pinned/sticky
// section, so all videos mount on first paint even though most are only
// visible after hundreds of vh of scroll. This hook assigns `src` lazily,
// once the scene's outer scroll container (not the pinned/fixed inner
// layer, which stays permanently "in view") approaches the viewport.
const DEFAULT_ROOT_MARGIN = "800px 0px 800px 0px";

export function useLazyVideoSrc(
  videoRef: RefObject<HTMLVideoElement | null>,
  triggerRef: RefObject<HTMLElement | null>,
  src: string,
  rootMargin: string = DEFAULT_ROOT_MARGIN
) {
  useEffect(() => {
    const video = videoRef.current;
    const trigger = triggerRef.current;
    if (!video || !trigger || video.src) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          video.src = src;
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [videoRef, triggerRef, src, rootMargin]);
}
