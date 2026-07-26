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

// ...and drops it again once the scene is well past. Assigning `src` is only
// half the problem: the page is ~97,000px tall, so by the bottom every video
// visited on the way down is still holding its decoded buffer. Releasing far
// off-screen keeps memory flat during a full scroll instead of accumulating.
// This margin is deliberately much larger than the load margin so the two
// never fight at the boundary — a video is only released long after it has
// left, and re-attaches well before it could be seen again.
const DEFAULT_RELEASE_MARGIN = "2500px 0px 2500px 0px";

export function useLazyVideoSrc(
  videoRef: RefObject<HTMLVideoElement | null>,
  triggerRef: RefObject<HTMLElement | null>,
  src: string,
  rootMargin: string = DEFAULT_ROOT_MARGIN,
  releaseMargin: string = DEFAULT_RELEASE_MARGIN
) {
  useEffect(() => {
    const video = videoRef.current;
    const trigger = triggerRef.current;
    if (!video || !trigger) return;

    const attach = () => {
      if (!video.getAttribute("src")) video.src = src;
    };

    const release = () => {
      // Guard on the attribute, not `video.src` — the property resolves to an
      // absolute URL and would read as the page URL once the attribute is gone.
      if (!video.getAttribute("src")) return;
      video.pause();
      // removeAttribute + load() is what actually frees the buffer. Setting
      // src="" instead makes the browser resolve the empty string against the
      // document and re-request the page itself.
      video.removeAttribute("src");
      video.load();
    };

    const loadObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) attach();
      },
      { rootMargin }
    );

    const releaseObserver = new IntersectionObserver(
      (entries) => {
        if (entries.every((entry) => !entry.isIntersecting)) release();
      },
      { rootMargin: releaseMargin }
    );

    loadObserver.observe(trigger);
    releaseObserver.observe(trigger);

    return () => {
      loadObserver.disconnect();
      releaseObserver.disconnect();
    };
  }, [videoRef, triggerRef, src, rootMargin, releaseMargin]);
}
