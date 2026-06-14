import { ReactNode, CSSProperties } from "react";

type SectionOverlayTitleProps = {
  children: ReactNode;
  // BLEND MODE: controls how the text fuses with the image underneath.
  // "soft-light" — gentle, archival glow. "overlay" — more contrast, more dramatic.
  blendMode?: CSSProperties["mixBlendMode"];
  // OPACITY: 0.45–0.65 keeps the title readable but printed-into-the-image feeling.
  opacity?: number;
  // POSITION: vertical alignment within the section. "center" | "55%" | etc.
  verticalPosition?: string;
  className?: string;
};

/**
 * SectionOverlayTitle
 *
 * A large connected-script title burned/blended directly onto a section's
 * image or visual. Reuse across every new topic section by swapping the text.
 *
 * Usage:
 *   <SectionOverlayTitle>The Perfect Decade</SectionOverlayTitle>
 *
 * Props to adjust per-section:
 *   blendMode        — default "soft-light"
 *   opacity          — default 0.55
 *   verticalPosition — default "52%" (slightly below center, more cinematic)
 */
export function SectionOverlayTitle({
  children,
  blendMode = "soft-light",
  opacity = 0.55,
  verticalPosition = "52%",
  className = "",
}: SectionOverlayTitleProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 flex justify-center ${className}`}
      style={{ alignItems: "flex-start", paddingTop: verticalPosition }}
    >
      <h2
        className="font-script text-center text-white"
        style={{
          // FONT SIZE: clamp(min, preferred-vw, max). Adjust for title length.
          fontSize: "clamp(3.2rem, 9.5vw, 8.5rem)",
          lineHeight: 1,
          letterSpacing: "0.01em",
          mixBlendMode: blendMode,
          opacity,
          // Faint warm glow ties it to the photograph rather than floating above it
          textShadow:
            "0 0 60px rgba(255, 248, 230, 0.25), 0 2px 12px rgba(0,0,0,0.08)",
          maxWidth: "82vw",
          transform: "translateY(-50%)",
        }}
      >
        {children}
      </h2>
    </div>
  );
}
