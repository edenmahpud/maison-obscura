import Image from "next/image";

type S04America1950sProps = {
  progress: number;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function S04America1950s({ progress }: S04America1950sProps) {
  // Stage the arrival as: white exposure hold -> image slowly appears.
  const sceneOpacity = clamp01(progress / 0.32);
  const imageReveal = clamp01((progress - 0.18) / 0.82);
  const whiteOverlayOpacity = 1 - clamp01((progress - 0.28) / 0.72);

  return (
    <section
      aria-label="S04 America in the 1950s"
      className="absolute inset-0"
      style={{ opacity: sceneOpacity }}
    >
      <Image
        src="/assets/S04-1950s-america/ideal-america-1950s.jpg"
        alt="Idealized 1950s American atmosphere"
        fill
        priority
        sizes="100vw"
        className="object-cover"
        style={{
          opacity: imageReveal,
          filter: `brightness(${0.9 + imageReveal * 0.24}) contrast(${0.94 + imageReveal * 0.16})`,
          transform: `scale(${1.03 - imageReveal * 0.03})`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-white"
        style={{ opacity: whiteOverlayOpacity }}
      />
    </section>
  );
}
