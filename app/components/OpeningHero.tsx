export function OpeningHero() {
  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-black text-neutral-100">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.12),transparent_35%),radial-gradient(circle_at_75%_70%,rgba(255,255,255,0.09),transparent_40%),linear-gradient(180deg,rgba(22,22,22,0.88)_0%,rgba(7,7,7,0.96)_100%)] grayscale"
      />

      <div aria-hidden="true" className="mo-vignette mo-grain absolute inset-0" />
      <div aria-hidden="true" className="mo-flash" />

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 animate-[mo-fade-up_1s_ease-out_0.1s_both] text-[0.65rem] tracking-[0.36em] text-neutral-300/70 uppercase">
          Archive No. 01
        </p>
        <h1 className="animate-[mo-fade-up_1.2s_ease-out_0.25s_both] text-5xl tracking-[0.25em] text-neutral-100 uppercase sm:text-7xl md:text-8xl">
          MAISON OBSCURA
        </h1>
        <p className="mt-6 animate-[mo-fade-up_1.2s_ease-out_0.45s_both] text-xs tracking-[0.26em] text-neutral-300/90 uppercase sm:text-sm">
          Newark, New Jersey - 1957
        </p>
      </main>

      <p className="absolute inset-x-0 bottom-10 z-10 animate-[mo-scroll-cue_3.8s_ease-in-out_infinite] text-center text-[0.62rem] tracking-[0.3em] text-neutral-300/75 uppercase">
        Scroll to uncover the archive
      </p>
    </section>
  );
}
