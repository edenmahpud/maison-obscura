import { ReactNode, CSSProperties } from "react";

type SectionOverlayTitleProps = {
  children: ReactNode;
  // BLEND MODE: "normal" = glass floating above image (default).
  // Try "screen" for a more luminous look, "soft-light" for blending into image.
  blendMode?: CSSProperties["mixBlendMode"];
  // OPACITY: overall element opacity. 0.82–0.95 for glass presence.
  opacity?: number;
  // VERTICAL POSITION: percentage from the top of the section.
  // "50%" = centered, "58%" = lower-center (more cinematic).
  verticalPosition?: string;
  className?: string;
};

/**
 * SectionOverlayTitle
 *
 * A large connected-script title printed as glass/pearl shimmer directly
 * over a section's image. Reuse on every new topic section — just swap the text.
 *
 * Usage:
 *   <SectionOverlayTitle>The Perfect Decade</SectionOverlayTitle>
 *   <SectionOverlayTitle opacity={0.9} verticalPosition="58%">Next Section</SectionOverlayTitle>
 *
 * Must be placed as a sibling of the image layer (NOT inside a div with filter: blur),
 * and inside the section with position: relative / overflow: hidden.
 */
export function SectionOverlayTitle({
  children,
  blendMode = "normal",
  opacity = 0.88,
  verticalPosition = "52%",
  className = "",
}: SectionOverlayTitleProps) {
  return (
    // Positioning wrapper — handles absolute placement and z-index
    <div
      aria-hidden="true"
      className={`pointer-events-none ${className}`}
      style={{
        position: "absolute",
        left: "50%",
        top: verticalPosition,
        transform: "translate(-50%, -50%)",
        // Z-INDEX: must sit above the image layer (z-0) and below
        // any transition overlays (z-30). Change here to reorder.
        zIndex: 20,
        width: "100%",
        textAlign: "center",
      }}
    >
      <h2
        className="font-script"
        style={{
          // FONT SIZE: clamp(mobile-min, viewport-scale, desktop-max).
          // Increase the middle value (11vw) to make the title wider-spanning.
          fontSize: "clamp(3.8rem, 11vw, 14rem)",
          lineHeight: 0.88,
          letterSpacing: "0.01em",
          maxWidth: "92vw",
          margin: "0 auto",
          display: "block",

          // GLASS / PEARL FILL
          // Gradient: bright white at top → warm pale gold at center → soft white at base.
          // To make it more gold: increase the rgba(255,242,195,...) stop.
          // To make it more pure white: reduce that stop or lower its opacity.
          background:
            "linear-gradient(168deg, rgba(255,255,255,1) 0%, rgba(255,244,200,0.9) 38%, rgba(255,255,255,0.96) 68%, rgba(228,212,176,0.88) 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",

          // STROKE: thin outline that reads as glass edge / engraving.
          // Reduce to "0px" to remove entirely.
          WebkitTextStroke: "0.5px rgba(255, 255, 255, 0.48)",

          opacity,
          mixBlendMode: blendMode,

          // GLOW / DROP SHADOW
          // Layer 1 (0 0 12px): tight white halo around letters — glass shine
          // Layer 2 (0 0 36px): wider warm gold bloom — pearl luminosity
          // Layer 3 (0 8px 28px): dark drop — anchors text to image, adds depth
          // To strengthen the glow: increase the rgba alpha values.
          // To reduce it: lower them or remove a layer.
          filter:
            "drop-shadow(0 0 12px rgba(255,255,255,0.55)) " +
            "drop-shadow(0 0 36px rgba(255,230,140,0.24)) " +
            "drop-shadow(0 8px 28px rgba(0,0,0,0.28))",
        }}
      >
        {children}
      </h2>
    </div>
  );
}
