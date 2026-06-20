// TO CHANGE HEADING: edit the string below
const SECTION_HEADING = "The Perfect Decade";

// TO CHANGE BODY TEXT: edit the string below
const BODY_TEXT =
  "The 1950s looked like a dream polished to perfection. Pastel kitchens, shining cars, glowing diners, elegant dresses, and television screens that promised a brighter future. Everything felt clean, sweet, and beautifully arranged — a world built from smiles, chrome, soft colors, and the idea that life was finally becoming perfect.";

export function S05HappySide() {
  return (
    <section
      aria-label="S05 The Happy Side"
      className="bg-[#0c0906] font-cormorant flex flex-col items-center text-center px-6 pt-20 pb-24"
    >
      {/* LABEL with horizontal rules: ─── The Happy Side ─── */}
      <div className="flex items-center gap-5 w-full max-w-sm mb-6">
        <div className="flex-1 h-px bg-[#c4b49a]/30" />
        <span className="font-josefin text-[#c4b49a]/60 text-[0.65rem] tracking-[0.28em] uppercase whitespace-nowrap">
          The Happy Side
        </span>
        <div className="flex-1 h-px bg-[#c4b49a]/30" />
      </div>

      {/*
        MAIN HEADING — Cormorant Garamond italic.
        TO CHANGE FONT SIZE: edit the clamp() values in fontSize.
        TO CHANGE TEXT: edit SECTION_HEADING constant at top of file.
      */}
      <h2
        className="font-cormorant italic text-[#e8dfc8]"
        style={{
          fontSize: "clamp(3rem, 6vw, 6rem)",
          lineHeight: 1,
          fontWeight: 600,
          marginBottom: "1.5rem",
        }}
      >
        {SECTION_HEADING}
      </h2>

      {/* DECORATIVE DIVIDER — red-brown star accent.
          TO CHANGE COLOR: update #7c3226 below (lines and ✦). */}
      <div className="flex items-center gap-3 w-full max-w-xs mb-12">
        <div className="flex-1 h-px bg-[#7c3226]/45" />
        <span
          className="text-[#7c3226] leading-none"
          style={{ fontSize: "0.5rem" }}
        >
          ✦
        </span>
        <div className="flex-1 h-px bg-[#7c3226]/45" />
      </div>

      {/*
        BODY TEXT — TO CHANGE CONTENT: edit BODY_TEXT constant at top of file.
        TO CHANGE SIZE: edit the clamp() values in fontSize.
        TO CHANGE WIDTH: edit maxWidth.
      */}
      <p
        className="font-josefin text-[#b4a892]/70 tracking-wide"
        style={{
          fontSize: "clamp(1.2rem, 1.5vw, 1.65rem)",
          lineHeight: 1.65,
          maxWidth: "780px",
          margin: "0 auto 5rem",
        }}
      >
        {BODY_TEXT}
      </p>

      {/* SCROLL INDICATOR */}
      <div className="flex flex-col items-center gap-3 opacity-30">
        <span className="font-josefin text-[#c4b49a] text-[0.58rem] tracking-[0.35em] uppercase">
          Scroll
        </span>
        <div className="w-px h-8 bg-[#c4b49a]" />
      </div>
    </section>
  );
}
