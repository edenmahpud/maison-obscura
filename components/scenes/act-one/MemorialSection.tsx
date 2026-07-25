"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ── Canvas — matches the Figma frame (node 801:703) 1:1 ─────────────────────
const BOARD_W = 1920;
const BOARD_H = 1080;

const GOLD = "#e7cea6";

const LABEL_TEXT = "In Memory Of";
const NAMES_TEXT = "Nikolai Volkov & Eleanor Voss";
const BRAND_TEXT = "Maison Obscure";

const TYPE_MS = 45; // ms per character
const LINE_PAUSE_MS = 500; // pause between one line finishing and the next starting

function isDesignMode() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("designMode") === "true";
}

// Shared styling for each line's *sizer* (invisible, always the full string)
// and its *visible* typed layer, factored out so both stay pixel-identical —
// any mismatch between them would make the typed text visibly misaligned
// against the space the sizer reserves.
type LineStyle = {
  top: number;
  fontStyle: "normal" | "italic";
  fontSize: string;
  color: string;
};

const LINES: { text: string; style: LineStyle }[] = [
  { text: LABEL_TEXT, style: { top: 268, fontStyle: "normal", fontSize: "clamp(1.25rem, 2.083vw, 2.5rem)", color: GOLD } },
  { text: NAMES_TEXT, style: { top: 334, fontStyle: "italic", fontSize: "clamp(2rem, 4.167vw, 5rem)", color: "#fff" } },
  { text: BRAND_TEXT, style: { top: 578.83, fontStyle: "italic", fontSize: "clamp(2rem, 4.167vw, 5rem)", color: GOLD } },
];

// ── "In Memory Of" — the closing text page. Text only, no imagery. Its own
// opaque background fades in on top of LifeSection, which is enough on its
// own to make the Life images and red thread "gradually leave the screen" —
// no changes needed to LifeSection itself, same technique every section in
// this chain already uses to crossfade over the one before it.
//
// The three lines then type themselves in, character by character, exactly
// once — triggered by scroll position (reaching the page), not scrubbed by
// it, since a typing speed only makes sense as a real-time animation.
//
// Scroll map (section height 300vh):
//
//   0 –1.3  this whole layer fades in over LifeSection fading out beneath
//           (scroll-scrubbed, reversible)
//
//   Once the section is reached (ScrollTrigger, once: true, independent of
//   the fade above): the three lines type in sequence at ~45ms/char, a
//   blinking cursor trailing whichever line is active, then the arrow
//   fades in once typing is fully complete. This part is real-time and
//   one-shot — it does not scrub or restart on further scrolling.
//
export function MemorialSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const textRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const cursorRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const arrowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    const arrow = arrowRef.current;
    const textEls = textRefs.current;
    const cursorEls = cursorRefs.current;
    if (!section || !sticky || !arrow || textEls.some((e) => !e) || cursorEls.some((e) => !e)) return;

    if (isDesignMode()) {
      gsap.set(sticky, { opacity: 1 });
      gsap.set(arrow, { opacity: 1 });
      LINES.forEach((line, i) => {
        textEls[i]!.textContent = line.text;
        cursorEls[i]!.style.display = "none";
      });
      return;
    }

    gsap.set(sticky, { opacity: 0 });
    gsap.set(arrow, { opacity: 0 });
    LINES.forEach((_, i) => {
      textEls[i]!.textContent = "";
      cursorEls[i]!.style.display = "none";
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: 1.2,
        invalidateOnRefresh: true,
      },
    });

    // The layer's own crossfade-in — scroll-scrubbed and reversible, same
    // technique as every other section in this chain.
    tl.to(sticky, { opacity: 1, ease: "power1.out", duration: 1.3 }, 0);

    // The typewriter itself: triggered once by scroll position, then runs
    // on its own clock. `once: true` means it never re-fires, satisfying
    // "do not loop or restart while the user remains on the page."
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const showCursorOn = (index: number | null) => {
      cursorEls.forEach((el, i) => {
        if (el) el.style.display = i === index ? "inline-block" : "none";
      });
    };

    const typeNext = (lineIndex: number, charIndex: number) => {
      if (cancelled) return;
      const line = LINES[lineIndex];
      if (charIndex === 0) showCursorOn(lineIndex);

      const nextCharIndex = charIndex + 1;
      textEls[lineIndex]!.textContent = line.text.slice(0, nextCharIndex);

      if (nextCharIndex < line.text.length) {
        timeoutId = setTimeout(() => typeNext(lineIndex, nextCharIndex), TYPE_MS);
        return;
      }

      const nextLine = lineIndex + 1;
      if (nextLine < LINES.length) {
        timeoutId = setTimeout(() => typeNext(nextLine, 0), LINE_PAUSE_MS);
      } else {
        showCursorOn(null);
        gsap.to(arrow, { opacity: 1, ease: "power2.out", duration: 0.8 });
      }
    };

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      once: true,
      onEnter: () => timeoutId = setTimeout(() => typeNext(0, 0), TYPE_MS),
    });

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      st.kill();
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="Memorial Section"
      style={{ position: "relative", height: "300vh", background: "#181818", marginTop: "-50vh" }}
    >
      {/* Permanently position:fixed with an opacity fade-in — same technique
          used by every section since S12WantedTransition — so this
          crossfades in cleanly on top of LifeSection's own fade-out with no
          gap, jump, or black frame. */}
      <div
        ref={stickyRef}
        style={{ position: "fixed", inset: 0, overflow: "hidden", zIndex: 90, pointerEvents: "none", background: "#181818" }}
      >
        <div aria-hidden="true" className="mo-archival-grain" style={{ position: "absolute", inset: 0, zIndex: 30 }} />

        {LINES.map((line, i) => (
          <div
            key={line.text}
            style={{
              position: "absolute", left: "50%", top: `${(line.style.top / BOARD_H) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            {/* Invisible sizer — always the full final string, so this
                wrapper's width (and therefore its centered position) is
                fixed from the very first frame and never shifts as the
                visible layer below types in. */}
            <p
              aria-hidden="true"
              className="font-cormorant"
              style={{
                visibility: "hidden",
                margin: 0, whiteSpace: "nowrap", fontWeight: 600, fontStyle: line.style.fontStyle,
                fontSize: line.style.fontSize, lineHeight: 1.32,
                letterSpacing: "-0.02em", color: line.style.color,
              }}
            >
              {line.text}
            </p>

            {/* Visible, typed layer — left-aligned within the fixed-width
                wrapper above, so characters grow left-to-right without
                moving the block itself. */}
            <p
              className="font-cormorant"
              style={{
                position: "absolute", left: 0, top: 0,
                margin: 0, whiteSpace: "nowrap", fontWeight: 600, fontStyle: line.style.fontStyle,
                fontSize: line.style.fontSize, lineHeight: 1.32,
                letterSpacing: "-0.02em", color: line.style.color,
              }}
            >
              <span ref={(el) => { textRefs.current[i] = el; }} />
              <span
                ref={(el) => { cursorRefs.current[i] = el; }}
                className="mo-typewriter-cursor"
                aria-hidden="true"
                style={{ display: "none" }}
              >
                |
              </span>
            </p>
          </div>
        ))}

        {/* ── Downward arrow (Figma node 863:133) — Figma's own export is a
            horizontal right-pointing arrow rotated 90deg via CSS; kept the
            same technique here rather than hand-deriving new coordinates. */}
        <div
          ref={arrowRef}
          aria-hidden="true"
          style={{
            position: "absolute", left: "50%", top: `${(814 / BOARD_H) * 100}%`,
            transform: "translateX(-50%)",
            width: `${(69 / BOARD_W) * 100}%`, height: `${(14.7279 / BOARD_H) * 100}%`,
          }}
        >
          <div style={{ width: "100%", height: "100%", transform: "rotate(90deg)" }}>
            <svg viewBox="0 0 70 14.7279" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M69.7071 8.07107C70.0976 7.68054 70.0976 7.04738 69.7071 6.65685L63.3431 0.292893C62.9526 -0.097631 62.3195 -0.097631 61.9289 0.292893C61.5384 0.683418 61.5384 1.31658 61.9289 1.70711L67.5858 7.36396L61.9289 13.0208C61.5384 13.4113 61.5384 14.0445 61.9289 14.435C62.3195 14.8256 62.9526 14.8256 63.3431 14.435L69.7071 8.07107ZM0 7.36396V8.36396H69V7.36396V6.36396H0V7.36396Z"
                fill="white"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
