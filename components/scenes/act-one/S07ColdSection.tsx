"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ── Figma frame 818-1238: original canvas 1920 × 2205 ────────────────────────
const CANVAS_W = 1920;

function vw(px: number): string {
  return `${((px / CANVAS_W) * 100).toFixed(3)}vw`;
}

// ── Red investigation oval drawn around "wardrobes." ─────────────────────────
const OVAL_COLOR = "#C1001A";
const OVAL_PATH =
  "M 95 16 C 96 3 78 0 62 1 C 46 2 27 -1 13 5 C -1 11 -2 18 2 25 " +
  "C 6 32 15 38 31 39 C 47 40 66 40 81 38 C 96 36 100 29 99 22 " +
  "C 98 15 96 15 95 16 Z";

// ── Y offsets (from Figma) shifted up by 115px because sad9 now sits at ──────
// top:0 instead of the original top:115px, so all subsequent elements must
// match the same relative gap they had in the Figma design.
const Y = {
  quote: 605,      // was 720  (720 − 115 = 605; preserves 88px gap below sad9)
  label: 1044,     // was 1159 (1159 − 115)
  video: 1110.59,  // was 1225.59
  card:  1581.03,  // was 1696.03
};

// ─────────────────────────────────────────────────────────────────────────────

export function S07ColdSection() {
  const sectionRef   = useRef<HTMLElement | null>(null);

  // Fixed relay — position:fixed, holds the flags at viewport top during the
  // ~100vh window where S06 is scrolling out and S07 is scrolling in.
  const fixedSad9Ref = useRef<HTMLDivElement | null>(null);

  // Destination — the flags in S07's normal flow (absolute, top:0).
  // Starts hidden; revealed when S07's top reaches viewport top.
  const sad9DestRef  = useRef<HTMLDivElement | null>(null);

  const quoteRef     = useRef<HTMLDivElement | null>(null);
  const labelRef     = useRef<HTMLDivElement | null>(null);
  const videoWrapRef = useRef<HTMLDivElement | null>(null);
  const cardRef      = useRef<HTMLDivElement | null>(null);
  const videoRef     = useRef<HTMLVideoElement | null>(null);
  const ovalRef      = useRef<SVGPathElement | null>(null);

  // ── Sad9 relay: S06 bridge → fixed overlay → S07 dest ────────────────────
  useEffect(() => {
    const section  = sectionRef.current;
    const fixedEl  = fixedSad9Ref.current;
    const destEl   = sad9DestRef.current;
    if (!section || !fixedEl || !destEl) return;

    const onBridgeLeave     = () => { fixedEl.style.opacity = "1"; };
    const onBridgeEnterBack = () => {
      fixedEl.style.opacity = "0";
      destEl.style.opacity  = "0";
    };
    window.addEventListener("sad9-bridge-leave",      onBridgeLeave);
    window.addEventListener("sad9-bridge-enter-back", onBridgeEnterBack);

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        onEnter: () => {
          fixedEl.style.opacity = "0";
          destEl.style.opacity  = "1";
        },
        onLeaveBack: () => {
          fixedEl.style.opacity = "1";
          destEl.style.opacity  = "0";
        },
      });
    }, section);

    return () => {
      window.removeEventListener("sad9-bridge-leave",      onBridgeLeave);
      window.removeEventListener("sad9-bridge-enter-back", onBridgeEnterBack);
      ctx.revert();
    };
  }, []);

  // ── Cold content: fade-in triggered the moment S07 enters the viewport ───────
  // "top bottom" fires as soon as S07's top edge crosses the viewport bottom,
  // so by the time the user scrolls to the quote/video/card they are already
  // fully revealed — no "new page" pop.
  // gsap.set handles the initial state so it never conflicts with CSS transforms
  // used for centering (margin:auto — no translateX involved).
  useEffect(() => {
    const section = sectionRef.current;
    const els = [quoteRef, labelRef, videoWrapRef, cardRef]
      .map(r => r.current)
      .filter((el): el is HTMLDivElement => el !== null);
    if (!section || els.length === 0) return;

    els.forEach(el => gsap.set(el, { opacity: 0, y: 16, filter: "blur(3px)" }));

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: "top bottom",
        onEnter: () => {
          els.forEach((el, i) => {
            gsap.to(el, {
              opacity:   1,
              y:         0,
              filter:    "blur(0px)",
              duration:  0.7,
              delay:     i * 0.12,
              ease:      "power2.out",
              overwrite: "auto",
            });
          });
        },
        onLeaveBack: () => {
          els.forEach(el => gsap.set(el, { opacity: 0, y: 16, filter: "blur(3px)" }));
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  // ── Video: loop muted while in viewport ───────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const obs = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.25 },
    );
    obs.observe(video);
    return () => obs.disconnect();
  }, []);

  // ── "wardrobes." oval: scroll-driven stroke draw ──────────────────────────
  useEffect(() => {
    const oval    = ovalRef.current;
    const quoteEl = quoteRef.current;
    if (!oval || !quoteEl) return;

    oval.setAttribute("stroke-dashoffset", "1");
    oval.style.visibility = "visible";

    const ctx = gsap.context(() => {
      gsap.to(oval, {
        attr: { "stroke-dashoffset": 0 },
        ease: "none",
        scrollTrigger: {
          trigger: quoteEl,
          start: "top 65%",
          end:   "top 18%",
          scrub: 1.2,
        },
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    /*
     * S07 is ONE section with position:relative and an explicit height.
     * Everything is absolutely positioned inside this single section — no
     * inner wrapper div with its own background, which was creating a visible
     * "new block" seam as the section scrolled in.
     *
     * Centered elements use  left:0 / right:0 / margin:"0 auto"  instead of
     * left:50% + translateX(-50%).  The transform approach shifts the layout
     * box past the right edge of the section (layout is pre-transform), which
     * was causing horizontal overflow and page-width shift.
     * overflowX:hidden on the section is the final safety net.
     */
    <section
      ref={sectionRef}
      aria-label="S07 Cold War"
      style={{
        position:  "relative",
        background: "#181818",
        height:    "2050px",
        width:     "100%",
        overflowX: "hidden",
      }}
    >

      {/* ── FIXED RELAY — sits above everything while S06 → S07 handoff plays ──
          position:fixed does not contribute to document layout width so it
          cannot cause horizontal overflow regardless of centering technique. */}
      <div
        ref={fixedSad9Ref}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: vw(1129),
          maxWidth: "90vw",
          height: "517px",
          zIndex: 9000,
          opacity: 0,
          pointerEvents: "none",
        }}
      >
        <Image
          src="/assets/sad/sad9.png"
          alt=""
          aria-hidden="true"
          fill
          sizes="(max-width: 1920px) 58.8vw, 1129px"
          style={{ objectFit: "contain" }}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          sad9.png DESTINATION — absolute at top:0, initially hidden.
          margin:"0 auto" + left:0/right:0 keeps the layout box within the
          section so it never adds horizontal scrollbar width.
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        ref={sad9DestRef}
        style={{
          position: "absolute",
          top: "0px",
          left: 0,
          right: 0,
          margin: "0 auto",
          width: vw(1129),
          maxWidth: "90vw",
          height: "517px",
          zIndex: 2,
          opacity: 0,
        }}
      >
        <Image
          src="/assets/sad/sad9.png"
          alt="Soviet and American flags — the two poles of the Cold War"
          fill
          sizes="(max-width: 1920px) 58.8vw, 1129px"
          style={{ objectFit: "contain" }}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          QUOTE — centred, 88px below sad9.
          margin:auto centering so the layout box stays within 100vw.
          Font: Cormorant Garamond, clamp(28px, 3.6vw, 68px).
          "wardrobes." oval is scroll-drawn by GSAP ScrollTrigger.
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        ref={quoteRef}
        style={{
          position: "absolute",
          top: `${Y.quote}px`,
          left: 0,
          right: 0,
          margin: "0 auto",
          width: "min(85vw, 1050px)",
          textAlign: "center",
          zIndex: 3,
        }}
      >
        <p
          className="font-cormorant"
          style={{
            fontWeight: 400,
            fontSize: "clamp(28px, 3.6vw, 68px)",
            lineHeight: 1.48,
            letterSpacing: "-0.02em",
            color: "#bd9969",
            textTransform: "capitalize",
          }}
        >
          The Cold War Was Not Only Fought Across Borders.
          <br />
          It Entered Homes, Workplaces, Newspapers And{" "}
          <span
            style={{
              color: "#ffffff",
              position: "relative",
              display: "inline-block",
            }}
          >
            wardrobes.
            <svg
              aria-hidden="true"
              viewBox="0 0 100 40"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                left: "-10%",
                top: "-30%",
                width: "120%",
                height: "160%",
                overflow: "visible",
                pointerEvents: "none",
              }}
            >
              <path
                ref={ovalRef}
                d={OVAL_PATH}
                fill="none"
                stroke={OVAL_COLOR}
                strokeWidth={3.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset="1"
                style={{ visibility: "hidden" }}
              />
            </svg>
          </span>
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          cold1.png LABEL STRIP — torn paper banner.
          Figma: left 273, w 611, h 102.
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        ref={labelRef}
        style={{
          position: "absolute",
          left: vw(273),
          top: `${Y.label}px`,
          width: vw(611),
          height: "102px",
          zIndex: 4,
        }}
      >
        <Image
          src="/assets/cold/cold1.png"
          alt=""
          aria-hidden="true"
          fill
          sizes={`${((611 / CANVAS_W) * 100).toFixed(1)}vw`}
          style={{ objectFit: "fill" }}
        />
        <div
          style={{
            position: "absolute",
            left: vw(50),
            top: "28.87px",
            pointerEvents: "none",
          }}
        >
          <p
            className="font-cormorant"
            style={{
              fontWeight: 400,
              fontSize: "40px",
              lineHeight: 1.09,
              letterSpacing: "-0.8px",
              color: "#414141",
              whiteSpace: "nowrap",
            }}
          >
            Unusual Light Reflection
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          VIDEO — looped muted footage.
          objectFit:contain so full frame is visible without cropping.
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        ref={videoWrapRef}
        style={{
          position: "absolute",
          left: vw(395.68),
          top: `${Y.video}px`,
          width: vw(1143),
          aspectRatio: "1143 / 640",
          zIndex: 3,
        }}
      >
        <video
          ref={videoRef}
          src="/assets/cold/video.mp4"
          muted
          loop
          playsInline
          preload="auto"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          cold2.png NOTE CARD — rotated 3.54°.
          Figma: outer flex left 189.85, w 426.887 / h 361.524.
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        ref={cardRef}
        style={{
          position: "absolute",
          left: vw(189.85),
          top: `${Y.card}px`,
          width: vw(426.887),
          aspectRatio: "426.887 / 361.524",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 6,
        }}
      >
        <div
          style={{
            transform: "rotate(3.54deg)",
            position: "relative",
            width: vw(406.877),
            aspectRatio: "406.877 / 337.078",
            flexShrink: 0,
          }}
        >
          <Image
            src="/assets/cold/cold2.png"
            alt=""
            aria-hidden="true"
            fill
            sizes={`${((406.877 / CANVAS_W) * 100).toFixed(1)}vw`}
            style={{ objectFit: "contain" }}
          />
          <div
            style={{
              position: "absolute",
              left: "12.5%",
              top: "26%",
              width: "77%",
              pointerEvents: "none",
              transform: "rotate(0.8deg)",
              transformOrigin: "top left",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-courier-prime)",
                fontSize: "clamp(11px, 1.042vw, 20px)",
                lineHeight: 1.4,
                letterSpacing: "-0.4px",
                color: "#292929",
              }}
            >
              A sudden flash interrupts the footage.
              <br />
              The light appears to bounce back toward the camera, as if the fabric itself is refusing to be captured.
            </p>
          </div>
        </div>
      </div>

      {/* Film grain + vignette cover the full 2050px section */}
      <div aria-hidden="true" className="mo-archival-grain" style={{ zIndex: 200 }} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.5) 100%)",
          zIndex: 201,
        }}
      />

    </section>
  );
}
