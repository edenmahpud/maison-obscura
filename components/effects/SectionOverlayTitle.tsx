import { ReactNode, CSSProperties } from "react";

type SectionOverlayTitleProps = {
  children: ReactNode;
  // BLEND MODE: "normal" keeps the text fully visible (default).
  // "screen" makes it more luminous on dark images.
  blendMode?: CSSProperties["mixBlendMode"];
  // OPACITY: overall element opacity. 0.9–0.98 for a full, glossy feel.
  opacity?: number;
  // VERTICAL POSITION: percentage down from the top of the section.
  verticalPosition?: string;
  className?: string;
};

/**
 * SectionOverlayTitle
 *
 * A large glossy connected-script title placed above a section image.
 * Renders as creamy-white with a pearl shimmer — solid fill, not an outline.
 *
 * Usage:
 *   <SectionOverlayTitle>The Perfect Decade</SectionOverlayTitle>
 *   <SectionOverlayTitle verticalPosition="58%">Next Section</SectionOverlayTitle>
 *
 * Must be a sibling of the image layer (not inside a filter: blur div).
 * The parent section needs position: relative / overflow: hidden.
 */
export function SectionOverlayTitle({
  children,
  blendMode = "normal",
  opacity = 0.95,
  verticalPosition = "52%",
  className = "",
}: SectionOverlayTitleProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none ${className}`}
      style={{
        position: "absolute",
        left: "50%",
        top: verticalPosition,
        transform: "translate(-50%, -50%)",
        // Z-INDEX: above image (z-0), below entry transition overlay (z-30).
        // Increase here if other elements overlap unexpectedly.
        zIndex: 20,
        width: "100%",
        textAlign: "center",
      }}
    >
      {/*
        DARK BACKING: a barely-visible radial gradient that sits behind the
        text and prevents it from washing out on very bright areas of the image.
        Increase the rgba alpha (currently 0.22) for more contrast.
        Set to "none" on the background property to remove entirely.
      */}
      <div
        style={{
          position: "absolute",
          inset: "-30% -8%",
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 75% 55% at 50% 50%, rgba(10, 5, 0, 0.22) 0%, transparent 72%)",
        }}
      />

      <h2
        className={`font-cormorant italic`}
        style={{
          position: "relative",

          // FONT SIZE: clamp(mobile-min, viewport-scale, desktop-max).
          // Increase the middle value (12vw) to make the title span wider.
          fontSize: "clamp(4.2rem, 12vw, 16rem)",
          lineHeight: 0.88,
          // Script fonts should not have letter-spacing — keep at normal.
          letterSpacing: "normal",
          fontWeight: 400,
          display: "block",
          maxWidth: "92vw",
          margin: "0 auto",

          // FILL: solid creamy white — the main visible body of the text.
          // This is what was missing before (gradient clip removed the fill).
          // Adjust the last number (0.92) for more/less density.
          color: "rgba(255, 252, 240, 0.92)",

          mixBlendMode: blendMode,
          opacity,

          // STROKE: hair-thin engraving line that reads as a glass edge.
          // Use 0px to remove. Keep under 0.3px so it stays subtle.
          WebkitTextStroke: "0.2px rgba(255, 255, 255, 0.38)",

          // TEXT SHADOW — three layers:
          // 1. Warm dark drop: anchors the text, separates from image highlights.
          //    Increase rgba alpha (0.38) for stronger shadow / more separation.
          // 2. White inner halo: the close glass-shine on the letters.
          //    Increase for a brighter glow.
          // 3. Gold bloom: the wider pearl warmth. Adjust the gold tone in rgba.
          textShadow: [
            "0 2px 10px rgba(30, 15, 5, 0.38)",
            "0 0 12px rgba(255, 255, 255, 0.3)",
            "0 0 40px rgba(255, 232, 160, 0.2)",
          ].join(", "),
        }}
      >
        {children}
      </h2>
    </div>
  );
}
