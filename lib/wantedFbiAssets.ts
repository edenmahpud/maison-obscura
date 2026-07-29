// ─────────────────────────────────────────────────────────────────────────────
// Asset manifest for the Wanted → FBI transition.
//
// Its own module rather than an export from either component: FBISection
// already imports handCircle() from S12InvestigationBoard, so having
// S12InvestigationBoard import the FBI board's asset list back would close an
// import cycle. Both sides depend on this instead, and nothing depends on both.
//
// Every entry ships as a WebP with the original PNG kept beside it as a
// <picture> fallback. The re-encodes are q90 with alpha preserved (several of
// these have real transparency for torn edges), measured at 38–40 dB PSNR
// against the originals — visually lossless on document text and faces, and
// about 6× lighter across the set.
// ─────────────────────────────────────────────────────────────────────────────

export type ImagePair = { webp: string; png: string };

const pair = (base: string): ImagePair => ({ webp: `${base}.webp`, png: `${base}.png` });

/** The wanted poster itself — S12's full-screen zoom target and an FBI board piece. */
export const WANTED_POSTER: ImagePair = pair("/assets/WANTED");

/**
 * The FBI board's own imagery, keyed by the slot each fills. The whole board
 * fades in as one, so all of these are needed at the same instant — there's no
 * useful "above the fold" subset to prioritise within it.
 */
export const FBI_TITLE_STRIP: ImagePair = pair("/assets/fbi/fbi1");
export const FBI_PARTY_SCENE: ImagePair = pair("/assets/fbi/fbi4");
export const FBI_MAN_IN_COAT: ImagePair = pair("/assets/sad/sad7");
export const FBI_STREET_CORNER: ImagePair = pair("/assets/fbi/fbi5");
export const FBI_MAN_IN_FEDORA: ImagePair = pair("/assets/fbi/fbi3");
export const FBI_NOTES_CARD: ImagePair = pair("/assets/happy/happy1");

/** Everything the transition paints, in roughly the order it becomes visible. */
export const WANTED_FBI_ASSETS: readonly ImagePair[] = [
  WANTED_POSTER,
  FBI_PARTY_SCENE,
  FBI_TITLE_STRIP,
  FBI_MAN_IN_COAT,
  FBI_STREET_CORNER,
  FBI_MAN_IN_FEDORA,
  FBI_NOTES_CARD,
];

/**
 * The two the transition genuinely cannot begin without: the poster the
 * close-up zooms out of, and the first image of the board it hands off to.
 * The rest are preloaded alongside these but are not gating — the board's
 * fade-in has a long head start, so a straggler among the later pieces can
 * still land in time without holding the whole sequence.
 */
export const WANTED_FBI_CRITICAL: readonly string[] = [
  WANTED_POSTER.webp,
  FBI_PARTY_SCENE.webp,
];

/** Flat WebP list, for bulk preloading. */
export const WANTED_FBI_PRELOAD: readonly string[] = WANTED_FBI_ASSETS.map((a) => a.webp);
