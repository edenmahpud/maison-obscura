type S00TheFlashProps = {
  progress: number;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function S00TheFlash({ progress }: S00TheFlashProps) {
  const fadeStart = 0.16;
  const fadeEnd = 0.38;
  const fadeOut = clamp01((progress - fadeStart) / (fadeEnd - fadeStart));
  const opacity = 1 - fadeOut;

  return (
    <section
      aria-label="S00 The Flash"
      className="absolute inset-0 overflow-hidden bg-[#f8f3e8]"
      style={{ opacity }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(255,255,255,1)_0%,rgba(255,255,255,0.96)_28%,rgba(250,245,235,0.92)_56%,rgba(241,235,225,0.86)_78%,rgba(223,218,211,0.82)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.97)_0%,rgba(255,255,255,0.64)_34%,rgba(255,255,255,0.16)_58%,rgba(255,255,255,0)_74%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(130%_110%_at_50%_48%,rgba(0,0,0,0)_64%,rgba(83,76,72,0.12)_100%)]" />
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "140px 140px",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-9 flex flex-col items-center gap-2 text-[0.58rem] tracking-[0.35em] text-zinc-700/72 uppercase">
        <span>SCROLL</span>
        <span aria-hidden="true" className="h-8 w-px bg-zinc-700/45" />
      </div>
    </section>
  );
}
