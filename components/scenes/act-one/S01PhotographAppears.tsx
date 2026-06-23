import Image from "next/image";

type S01PhotographAppearsProps = {
  progress: number;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

const GRAIN_SVG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function S01PhotographAppears({ progress }: S01PhotographAppearsProps) {
  // Entrance is handled by FlashIntro's image layer — S01 starts fully visible
  // and only fades out as S02 takes over.
  const fadeOut = clamp01((progress - 0.75) / (0.9 - 0.75));
  const opacity = 1 - fadeOut;

  return (
    <section
      aria-label="S01 The Photograph Appears"
      className="absolute inset-0 flex items-center justify-center"
      style={{ opacity, background: "#050505" }}
    >
      <div style={{ position: "relative", width: "70vw", height: "70vh" }}>
        <Image
          src="/assets/S01-photograph/women-hiding-hero.jpg"
          alt="Archival photograph revealing women in plain sight"
          fill
          priority
          sizes="70vw"
          style={{ objectFit: "contain", objectPosition: "center" }}
        />
      </div>

      {/* Dark radial vignette */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 10,
          background:
            "radial-gradient(circle at 50% 46%, transparent 40%, rgba(0,0,0,0.55) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Cinematic bottom shadow */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 10,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.22) 60%, rgba(0,0,0,0.55) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Film grain */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 20,
          opacity: 0.18,
          mixBlendMode: "screen",
          backgroundImage: GRAIN_SVG,
          backgroundSize: "200px 200px",
          pointerEvents: "none",
        }}
      />
    </section>
  );
}
