"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ── Canvas — matches the Figma frame (node 801:703) 1:1 ─────────────────────
// Only the vertical axis is still referenced; the horizontal one went with the
// arrow, whose width was the last thing measured against it.
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
//   blinking cursor trailing whichever line is active, then the "back to
//   the beginning" button fades in once typing is fully complete. This part
//   is real-time and one-shot — it does not scrub or restart on further
//   scrolling.
//
export function MemorialSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const textRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const cursorRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const returnWrapRef = useRef<HTMLDivElement | null>(null);
  const veilRef = useRef<HTMLDivElement | null>(null);
  const returningRef = useRef(false);

  // ── "Back to the beginning" ───────────────────────────────────────────────
  // Fade to the site's own base black, jump, fade back — rather than scrolling
  // ~97,000px through every section, which would take minutes and replay the
  // whole film backwards.
  //
  // The jump is a plain scrollTo with no hash and no history entry, so the URL
  // never changes and nothing reloads: every scene is scroll-driven, so putting
  // the scroll position back at 0 *is* putting the site back at the beginning.
  const returnToBeginning = () => {
    const veil = veilRef.current;
    if (!veil || returningRef.current) return; // ignore repeat clicks mid-transition
    returningRef.current = true;

    gsap.timeline({ onComplete: () => { returningRef.current = false; } })
      .to(veil, { autoAlpha: 1, duration: 0.32, ease: "power2.in" })
      .add(() => {
        // `instant` matters even though the page sets no scroll-behavior:
        // a smooth jump of this distance is precisely what we're avoiding.
        window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });

        // Hand every trigger the new scroll position, then finish the scrub
        // tweens outright. Scrubbed triggers that drive a timeline ease toward
        // their target over their scrub duration, so without this the opening
        // would fade back in mid-rewind — visibly running the flash backwards.
        // Triggers with no animation (the flash intro's own among them) update
        // instantly and simply have no tween here to settle.
        ScrollTrigger.update();
        ScrollTrigger.getAll().forEach((st) => { st.getTween()?.progress(1); });
        ScrollTrigger.update();
      })
      // A beat on black lets the settled opening paint before it's uncovered.
      .to(veil, { autoAlpha: 0, duration: 0.55, ease: "power2.out" }, "+=0.12");
  };

  useEffect(() => {
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    const returnWrap = returnWrapRef.current;
    const textEls = textRefs.current;
    const cursorEls = cursorRefs.current;
    if (!section || !sticky || !returnWrap || textEls.some((e) => !e) || cursorEls.some((e) => !e)) return;

    if (isDesignMode()) {
      gsap.set(sticky, { autoAlpha: 1 });
      gsap.set(returnWrap, { opacity: 1 });
      LINES.forEach((line, i) => {
        textEls[i]!.textContent = line.text;
        cursorEls[i]!.style.display = "none";
      });
      return;
    }

    // autoAlpha, not opacity: this layer is fixed and covers the viewport for
    // the whole page lifetime, and now contains a real interactive control. At
    // plain opacity 0 that button would still be clickable and focusable — an
    // invisible "back to the beginning" sitting over the opening page. autoAlpha
    // adds visibility:hidden at 0, which removes it from hit-testing and the tab
    // order while it's faded out. Visually identical either way.
    gsap.set(sticky, { autoAlpha: 0 });
    gsap.set(returnWrap, { opacity: 0 });
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
    tl.to(sticky, { autoAlpha: 1, ease: "power1.out", duration: 1.3 }, 0);

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
        gsap.to(returnWrap, { opacity: 1, ease: "power2.out", duration: 0.8 });
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

        {/* ── "Back to the beginning" — replaces the downward arrow that used
            to sit here (Figma node 863:133). Centred on the arrow's own
            centre point, not its top edge, so the control occupies exactly
            the space the arrow did. pointerEvents has to be re-enabled: the
            sticky wrapper turns it off for the whole layer. */}
        <div
          ref={returnWrapRef}
          style={{
            position: "absolute", left: "50%",
            top: `${((814 + 14.7279 / 2) / BOARD_H) * 100}%`,
            transform: "translate(-50%, -50%)",
            pointerEvents: "auto",
          }}
        >
          <button type="button" className="mo-return-btn" onClick={returnToBeginning}>
            Back to the Beginning
          </button>
        </div>
      </div>

      {/* ── Return veil ────────────────────────────────────────────────────
          A sibling of the sticky layer, not a child: the sticky's opacity is
          scroll-scrubbed, so a veil inside it would fade out again the
          instant we jump to the top of the page — exactly when it needs to
          be covering the screen. Its own fixed layer at a z-index above every
          scene answers to nothing but the timeline below. */}
      <div
        ref={veilRef}
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0, zIndex: 9500,
          background: "#181818",
          opacity: 0, visibility: "hidden", pointerEvents: "none",
        }}
      />
    </section>
  );
}
