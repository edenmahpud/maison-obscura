import Image from "next/image";

type S01PhotographAppearsProps = {
  progress: number;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function S01PhotographAppears({ progress }: S01PhotographAppearsProps) {
  const revealStart = 0.1;
  const revealEnd = 0.56;
  const fadeStart = 0.75;
  const fadeEnd = 0.9;

  const fadeIn = clamp01((progress - revealStart) / (revealEnd - revealStart));
  const fadeOut = clamp01((progress - fadeStart) / (fadeEnd - fadeStart));
  const opacity = fadeIn * (1 - fadeOut);

  const settle = clamp01((progress - revealStart) / 0.5);
  const scale = 1.09 - settle * 0.09;
  const blur = 8 - settle * 8;
  const afterimageVeil = 0.94 - settle * 0.94;
  const centerGlow = 0.78 - settle * 0.78;

  return (
    <section
      aria-label="S01 The Photograph Appears"
      className="absolute inset-0"
      style={{ opacity }}
    >
      <Image
        src="/assets/S01-photograph/women-hiding-hero.jpg"
        alt="Archival photograph revealing women in plain sight"
        fill
        priority
        sizes="100vw"
        className="object-cover grayscale brightness-[0.84] contrast-[1.06] sepia-[0.16]"
        style={{ transform: `scale(${scale})`, filter: `blur(${blur}px)` }}
      />

      <div className="mo-vignette mo-grain absolute inset-0 opacity-85" />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(255,255,255,0.98)_0%,rgba(255,252,244,0.76)_28%,rgba(246,240,229,0.32)_55%,rgba(234,227,216,0)_76%)]"
        style={{ opacity: centerGlow }}
      />
      <div
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(252,247,238,0.96)_0%,rgba(248,242,232,0.68)_42%,rgba(235,230,220,0.3)_68%,rgba(227,221,211,0)_100%)]"
        style={{ opacity: afterimageVeil }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,transparent_40%,rgba(0,0,0,0.52)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(0,0,0,0.24)_58%,rgba(0,0,0,0.58)_100%)]" />
    </section>
  );
}
