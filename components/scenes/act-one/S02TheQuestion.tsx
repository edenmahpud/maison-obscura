type S02TheQuestionProps = {
  progress: number;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function S02TheQuestion({ progress }: S02TheQuestionProps) {
  const revealStart = 0.6;
  const revealEnd = 0.83;
  const reveal = clamp01((progress - revealStart) / (revealEnd - revealStart));
  const fadeOutStart = 0.78;
  const fadeOutEnd = 1;
  const fadeOut = clamp01((progress - fadeOutStart) / (fadeOutEnd - fadeOutStart));
  const sceneOpacity = reveal * (1 - fadeOut);
  const pullIn = clamp01((progress - 0.76) / 0.24);

  return (
    <section
      aria-label="S02 The Question"
      className="absolute inset-0 flex items-center justify-center overflow-hidden px-6"
      style={{
        opacity: sceneOpacity,
        transform: `translateY(${(1 - reveal) * 18 - fadeOut * 16}px) scale(${1 + pullIn * 0.24})`,
        filter: `blur(${fadeOut * 7}px)`,
      }}
    >
      <div className="absolute inset-0 bg-[#090909]" />
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{
          opacity: 0.12 + fadeOut * 0.14,
          backgroundImage: "url('/assets/S01-photograph/women-hiding-hero.jpg')",
          filter: `blur(${11 + fadeOut * 8}px) grayscale(1) sepia(0.16) contrast(${0.7 - fadeOut * 0.12}) brightness(${0.48 - fadeOut * 0.12})`,
          transform: `scale(${1.08 + pullIn * 0.22})`,
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(95%_80%_at_52%_44%,rgba(188,182,169,0.12)_0%,rgba(42,40,37,0.28)_42%,rgba(8,8,8,0.86)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(182deg,rgba(210,203,190,0.08)_0%,rgba(15,15,15,0.44)_52%,rgba(4,4,4,0.8)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(140%_110%_at_50%_50%,rgba(0,0,0,0)_55%,rgba(0,0,0,0.62)_100%)]" />
      <div
        className="absolute inset-0 opacity-[0.12] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='170' height='170'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.86' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
          backgroundSize: "170px 170px",
        }}
      />

      <p
        className="font-cormorant italic relative z-10 max-w-3xl text-center text-3xl leading-[1.4] tracking-[0.01em] text-zinc-100/92 sm:text-4xl md:text-5xl"
        style={{ filter: `blur(${fadeOut * 6}px)` }}
      >
        What happened here?
      </p>
    </section>
  );
}
