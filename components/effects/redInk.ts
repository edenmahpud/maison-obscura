// Shared "red investigation ink" constants — the hand-drawn circles/ovals
// scroll-drawn on top of the layout in S07 (Cold) and S09 (Star).
//
// Each oval lives in its own SVG with preserveAspectRatio="none", stretched
// non-uniformly to fit whatever text/photo it circles. That means a raw
// strokeWidth number renders at a different actual pixel thickness in every
// instance (container size varies per annotation). vectorEffect=
// "non-scaling-stroke" on the <path> renders the stroke in real screen
// pixels, decoupled from that per-instance scale/stretch — so this single
// constant is what actually keeps every mark the same visual weight.
export const RED_INK_COLOR = "#C1001A";
export const RED_INK_STROKE_WIDTH = 3;
