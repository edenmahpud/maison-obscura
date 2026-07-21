"use client";

import {
  useEffect, useRef, useState, useCallback, useMemo,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  PIECES as S12_PIECES,
  CIRCLES as S12_CIRCLES,
  THREADS as S12_THREADS,
  BOARD_W, BOARD_H,
  handCircle,
} from "@/components/scenes/act-one/S12InvestigationBoard";
import { RED_INK_STROKE_WIDTH } from "@/components/effects/redInk";

// Design Mode mutates element position/size directly (bypassing GSAP), which
// can leave a pinned section's ScrollTrigger holding stale pin-spacer
// measurements from before the mutation — the classic cause of a pinned
// section appearing to "lock" the page. Call this after any bulk apply.
function refreshScrollTriggers() {
  try { ScrollTrigger.refresh(); } catch { /* GSAP not ready yet — harmless */ }
}

// ── Storage key ───────────────────────────────────────────────────────────────
const STORAGE_KEY = "maison-obscura-design-config";

// ── Element state types ───────────────────────────────────────────────────────

interface PieceState {
  cx: number; cy: number; w: number;
  rot: number; z: number; opacity: number;
}

interface CircleState {
  cx: number; cy: number;
  rx: number; ry: number;
  rot: number; strokeWidth: number; opacity: number;
}

interface ThreadState {
  sx: number; sy: number;
  c1x: number; c1y: number;
  c2x: number; c2y: number;
  ex: number; ey: number;
  strokeWidth: number; opacity: number;
}

interface GenericState {
  tx: number; ty: number;
  scale: number; rotate: number;
  opacity: number; zIndex: number;
}

// ── Star section (S09) — one unified section, mixed element kinds ─────────────
// Star elements don't have a static authored coordinate array like S12's
// PIECES/CIRCLES/THREADS — S09 positions everything through a rotated Figma
// conversion (vw()/btop()). Rather than reverse that math, Design Mode reads
// each element's live rendered box (offsetLeft/Top/Width/Height) once as its
// baseline, then edits are stored as absolute overrides on top of that.

type StarKind = "image" | "circle" | "thread" | "line" | "text";

interface StarElemDef { key: string; label: string; kind: StarKind; }

interface StarImageState { cx: number; cy: number; w: number; rot: number; z: number; opacity: number; }
interface StarShapeState { cx: number; cy: number; w: number; h: number; rot: number; strokeWidth: number; z: number; opacity: number; }
interface StarLineState  { x1: number; y1: number; x2: number; y2: number; strokeWidth: number; z: number; opacity: number; }
interface StarTextState  { dx: number; dy: number; fontSize: number; lineHeight: number; rot: number; z: number; opacity: number; color: string; }

type StarOverride = Partial<StarImageState & StarShapeState & StarLineState & StarTextState>;

const STAR_ELEMENTS: StarElemDef[] = [
  { key: "img-0",  label: "star2.png — flags",                kind: "image" },
  { key: "img-1",  label: "star4.png — medal",                 kind: "image" },
  { key: "img-2",  label: "star3.png — US roundel",            kind: "image" },
  { key: "img-3",  label: "star5.png — tilted portrait",       kind: "image" },
  { key: "img-4",  label: "star7.png — angled photo",          kind: "image" },
  { key: "img-5",  label: "star6.png — angled photo",          kind: "image" },
  { key: "img-6",  label: "star8.png — oval portrait",         kind: "image" },
  { key: "img-7",  label: "image 564.png — archive photo",     kind: "image" },
  { key: "img-8",  label: "star12.png — angled photo",         kind: "image" },
  { key: "img-9",  label: "satr9.png — founders portrait",     kind: "image" },
  { key: "img-10", label: "star13.png — newspaper",            kind: "image" },
  { key: "img-11", label: "star10.png — ID card / newspaper",  kind: "image" },
  { key: "img-12", label: "star11.png — ID card photo",        kind: "image" },
  { key: "img-13", label: "star14.png — founders couple",      kind: "image" },
  { key: "img-14", label: "star15.png — archive photo",        kind: "image" },
  { key: "img-15", label: "star-video.mp4",                    kind: "image" },
  { key: "img-16", label: "star1.png — banner (top strip)",    kind: "image" },
  { key: "img-17", label: "star1.png — banner (founders strip)", kind: "image" },
  { key: "img-18", label: "star20.png — founders outside tailor shop", kind: "image" },
  { key: "circle-0", label: "Red circle 1 — near star4 / medal",    kind: "circle" },
  { key: "circle-1", label: "Red circle 2 — near image564",         kind: "circle" },
  { key: "circle-2", label: "Red circle 3 — near star13 / newspaper", kind: "circle" },
  { key: "thread-0", label: "Investigation thread (full board spine)", kind: "thread" },
  { key: "line-0", label: "Red line 1 — horizontal (enters left of title)", kind: "line" },
  { key: "line-1", label: "Red line 2 — vertical (below text block)",      kind: "line" },
  { key: "text-title", label: "Title text — “Nikolai And Eleanor”",       kind: "text" },
  { key: "text-body",  label: "Body text — “In a world divided…”",   kind: "text" },
];

// The user-facing "element type" filter groups the investigation thread
// (kind: "thread") in with circles — it shares the exact same control set
// (cx/cy/w/h/rot/strokeWidth/z/opacity) and is a red hand-drawn mark like
// the circles, even though visually it reads more like a connecting line.
type StarTypeFilter = "image" | "text" | "circle" | "line";
function matchesStarType(def: StarElemDef, type: StarTypeFilter): boolean {
  if (type === "circle") return def.kind === "circle" || def.kind === "thread";
  return def.kind === type;
}

// ── Full localStorage config ───────────────────────────────────────────────────

interface FullConfig {
  "investigation-board"?: Record<number, Partial<PieceState>>;
  "s12-circles"?: Record<number, Partial<CircleState>>;
  "s12-threads"?: Record<number, Partial<ThreadState>>;
  generic?: Record<string, Partial<GenericState>>;
  star?: Record<string, StarOverride>;
}

type SectionKey =
  | "s12-images" | "s12-circles" | "s12-threads"
  | "star"
  | "cold" | "light" | "dress" | "fbi" | "place"
  | "generic";

// Human-readable name shown in the "no editable elements" fallback message
// for scenes that are listed in the section dropdown but don't have a
// wired-up element registry yet (only "star" and the S12 board do today).
const SECTION_DISPLAY_NAME: Partial<Record<SectionKey, string>> = {
  cold: "Cold section",
  light: "Light section",
  dress: "Dress section",
  fbi: "FBI section",
  place: "Place section",
};

// ── Thread path helpers ───────────────────────────────────────────────────────

function parseThread(d: string): Omit<ThreadState, "strokeWidth" | "opacity"> {
  const n = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  return {
    sx: n[0] ?? 0, sy: n[1] ?? 0,
    c1x: n[2] ?? 0, c1y: n[3] ?? 0,
    c2x: n[4] ?? 0, c2y: n[5] ?? 0,
    ex: n[6] ?? 0, ey: n[7] ?? 0,
  };
}

function buildThreadPath(t: ThreadState): string {
  return `M ${t.sx} ${t.sy} C ${t.c1x} ${t.c1y} ${t.c2x} ${t.c2y} ${t.ex} ${t.ey}`;
}

// ── Persistence helpers ───────────────────────────────────────────────────────

function loadConfig(): FullConfig {
  if (typeof window === "undefined") return {};
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    // Guard against a syntactically-valid but wrong-shaped value (a bare
    // string/number/array) — treat anything that isn't a plain object as
    // "no config" rather than letting it crash a downstream .forEach/[key].
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      console.warn("[DesignMode] Ignoring invalid saved config (unexpected shape).");
      return {};
    }
    return parsed as FullConfig;
  } catch {
    console.warn("[DesignMode] Ignoring invalid saved config (bad JSON).");
    return {};
  }
}

function saveConfig(cfg: FullConfig) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch { /**/ }
}

function clearStoredConfig() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /**/ }
}

// ── State resolvers ───────────────────────────────────────────────────────────

function resolvePiece(idx: number, ov?: Record<number, Partial<PieceState>>): PieceState {
  const p = S12_PIECES[idx];
  if (!p) return { cx: 0, cy: 0, w: 100, rot: 0, z: 5, opacity: 1 };
  const o = ov?.[idx] ?? {};
  return { cx: o.cx ?? p.cx, cy: o.cy ?? p.cy, w: o.w ?? p.w, rot: o.rot ?? p.rot, z: o.z ?? p.z, opacity: o.opacity ?? 1 };
}

function resolveCircle(idx: number, ov?: Record<number, Partial<CircleState>>): CircleState {
  const c = S12_CIRCLES[idx];
  if (!c) return { cx: 740, cy: 490, rx: 100, ry: 80, rot: 0, strokeWidth: 1.7, opacity: 1 };
  const o = ov?.[idx] ?? {};
  return {
    cx: o.cx ?? c.cx, cy: o.cy ?? c.cy,
    rx: o.rx ?? c.rx, ry: o.ry ?? c.ry,
    rot: o.rot ?? c.rot,
    strokeWidth: o.strokeWidth ?? (idx === 0 ? 2.2 : 1.7),
    opacity: o.opacity ?? 1,
  };
}

function resolveThread(idx: number, ov?: Record<number, Partial<ThreadState>>): ThreadState {
  const d = S12_THREADS[idx] ?? "";
  const parsed = parseThread(d);
  const o = ov?.[idx] ?? {};
  return {
    sx: o.sx ?? parsed.sx, sy: o.sy ?? parsed.sy,
    c1x: o.c1x ?? parsed.c1x, c1y: o.c1y ?? parsed.c1y,
    c2x: o.c2x ?? parsed.c2x, c2y: o.c2y ?? parsed.c2y,
    ex: o.ex ?? parsed.ex, ey: o.ey ?? parsed.ey,
    strokeWidth: o.strokeWidth ?? (idx < 7 ? 1.55 : 1.15),
    opacity: o.opacity ?? 1,
  };
}

function resolveGeneric(key: string, ov?: Record<string, Partial<GenericState>>): GenericState {
  const o = ov?.[key] ?? {};
  return { tx: o.tx ?? 0, ty: o.ty ?? 0, scale: o.scale ?? 1, rotate: o.rotate ?? 0, opacity: o.opacity ?? 1, zIndex: o.zIndex ?? 0 };
}

// ── DOM element finders ───────────────────────────────────────────────────────

const getPieceEl  = (i: number) => document.querySelector<HTMLElement>(`[data-piece-index="${i}"]`);
const getCircleEl = (i: number) => document.querySelector<SVGPathElement>(`[data-design-circle-idx="${i}"]`);
const getThreadEl = (i: number) => document.querySelector<SVGPathElement>(`[data-design-thread-idx="${i}"]`);

function getBoardScale(): number {
  const board = document.querySelector<HTMLElement>("[data-design-board]");
  if (!board) return 1;
  const m = board.style.transform.match(/scale\(([^)]+)\)/);
  return m ? parseFloat(m[1]) : 1;
}

// ── DOM apply functions ───────────────────────────────────────────────────────

function applyPiece(idx: number, st: PieceState) {
  const el = getPieceEl(idx); if (!el) return;
  el.style.left    = `${st.cx - st.w / 2}px`;
  el.style.top     = `${st.cy - st.w * 0.46}px`;
  el.style.width   = `${st.w}px`;
  el.style.zIndex  = String(st.z);
  el.style.opacity = String(st.opacity);
  const inner = el.querySelector<HTMLElement>(".rot-inner");
  if (inner) inner.style.transform = `rotate(${st.rot}deg)`;
}

function applyCircle(idx: number, st: CircleState) {
  const el = getCircleEl(idx); if (!el) return;
  el.setAttribute("d", handCircle(st.cx, st.cy, st.rx, st.ry, st.rot));
  el.setAttribute("stroke-width", String(st.strokeWidth));
  el.style.opacity = String(st.opacity);
}

function applyThread(idx: number, st: ThreadState) {
  const el = getThreadEl(idx); if (!el) return;
  el.setAttribute("d", buildThreadPath(st));
  el.setAttribute("stroke-width", String(st.strokeWidth));
  el.style.opacity = String(st.opacity);
}

function applyGeneric(el: HTMLElement, st: GenericState) {
  el.style.transform = `translate(${st.tx}px, ${st.ty}px) scale(${st.scale}) rotate(${st.rotate}deg)`;
  el.style.opacity   = String(st.opacity);
  el.style.zIndex    = st.zIndex !== 0 ? String(st.zIndex) : "";
}

// ── Star (S09) element helpers ─────────────────────────────────────────────────

const getStarEl = (key: string) => document.querySelector<HTMLElement>(`[data-design-star-key="${key}"]`);

// Images: rotation lives on whatever the immediate child wrapper is (the
// pattern is inconsistent across the file — sometimes it carries data-s09,
// sometimes not — but it is always the first child), never the outer
// positioned wrapper itself.
const getStarImageInner = (el: HTMLElement) => el.firstElementChild as HTMLElement | null;
const getStarShapeInner = (el: HTMLElement) => el.querySelector<SVGPathElement>("path");
const getStarLineInner  = (el: HTMLElement) => el.querySelector<SVGLineElement>("line");

interface StarBaseline { left: number; top: number; width: number; height: number; strokeWidth: number; z: number; }
const starBaselineCache = new Map<string, StarBaseline>();

function captureStarBaseline(def: StarElemDef): StarBaseline {
  const cached = starBaselineCache.get(def.key);
  if (cached) return cached;
  const el = getStarEl(def.key);
  const fallback: StarBaseline = { left: 0, top: 0, width: 200, height: 150, strokeWidth: RED_INK_STROKE_WIDTH, z: def.kind === "image" ? 3 : 6 };
  if (!el) return fallback;
  const inner = def.kind === "circle" || def.kind === "thread" ? getStarShapeInner(el) : def.kind === "line" ? getStarLineInner(el) : null;
  const sw = inner ? parseFloat(inner.getAttribute("stroke-width") ?? "") || RED_INK_STROKE_WIDTH : RED_INK_STROKE_WIDTH;
  const z = parseInt(el.style.zIndex || "0", 10) || fallback.z;
  const baseline: StarBaseline = { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight, strokeWidth: sw, z };
  starBaselineCache.set(def.key, baseline);
  return baseline;
}

function resolveStarElem(def: StarElemDef, ov?: StarOverride):
  StarImageState | StarShapeState | StarLineState | StarTextState {
  const b = captureStarBaseline(def);
  const o = ov ?? {};
  if (def.kind === "image") {
    return {
      cx: o.cx ?? b.left + b.width / 2,
      cy: o.cy ?? b.top + b.height / 2,
      w:  o.w  ?? b.width,
      rot: o.rot ?? 0,
      z:   o.z   ?? b.z,
      opacity: o.opacity ?? 1,
    } as StarImageState;
  }
  if (def.kind === "circle" || def.kind === "thread") {
    return {
      cx: o.cx ?? b.left + b.width / 2,
      cy: o.cy ?? b.top + b.height / 2,
      w:  o.w  ?? b.width,
      h:  o.h  ?? b.height,
      rot: o.rot ?? 0,
      strokeWidth: o.strokeWidth ?? b.strokeWidth,
      z: o.z ?? b.z,
      opacity: o.opacity ?? 1,
    } as StarShapeState;
  }
  if (def.kind === "line") {
    return {
      x1: o.x1 ?? b.left,
      y1: o.y1 ?? b.top,
      x2: o.x2 ?? b.left + b.width,
      y2: o.y2 ?? b.top + b.height,
      strokeWidth: o.strokeWidth ?? b.strokeWidth,
      z: o.z ?? b.z,
      opacity: o.opacity ?? 1,
    } as StarLineState;
  }
  // text
  return {
    dx: o.dx ?? 0,
    dy: o.dy ?? 0,
    fontSize:   o.fontSize   ?? (def.key === "text-title" ? 80 : 40),
    lineHeight: o.lineHeight ?? (def.key === "text-title" ? 1.53 : 1.3),
    rot: o.rot ?? 0,
    z: o.z ?? 0,
    opacity: o.opacity ?? 1,
    color: o.color ?? "#bd9969",
  } as StarTextState;
}

function applyStarElem(def: StarElemDef, st: StarImageState | StarShapeState | StarLineState | StarTextState) {
  const el = getStarEl(def.key);
  if (!el) return;

  if (def.kind === "image") {
    const s = st as StarImageState;
    // Height is derived from the cached baseline's aspect ratio, never from
    // a live offsetHeight read — reading layout right after writing style
    // forces a synchronous reflow, which is the main source of drag jank.
    const b = captureStarBaseline(def);
    const h = b.width > 0 ? b.height * (s.w / b.width) : b.height;
    el.style.left    = `${s.cx - s.w / 2}px`;
    el.style.top     = `${s.cy - h / 2}px`;
    el.style.width   = `${s.w}px`;
    el.style.zIndex  = String(s.z);
    el.style.opacity = String(s.opacity);
    const inner = getStarImageInner(el);
    if (inner) inner.style.transform = `rotate(${s.rot}deg)`;
    return;
  }

  if (def.kind === "circle" || def.kind === "thread") {
    const s = st as StarShapeState;
    el.style.left      = `${s.cx - s.w / 2}px`;
    el.style.top       = `${s.cy - s.h / 2}px`;
    el.style.width     = `${s.w}px`;
    el.style.height    = `${s.h}px`;
    el.style.zIndex    = String(s.z);
    el.style.opacity   = String(s.opacity);
    el.style.transform = s.rot ? `rotate(${s.rot}deg)` : "";
    const path = getStarShapeInner(el);
    if (path) path.setAttribute("stroke-width", String(s.strokeWidth));
    return;
  }

  if (def.kind === "line") {
    const s = st as StarLineState;
    el.style.left      = `${Math.min(s.x1, s.x2)}px`;
    el.style.top       = `${Math.min(s.y1, s.y2)}px`;
    el.style.width     = `${Math.max(1, Math.abs(s.x2 - s.x1))}px`;
    el.style.height    = `${Math.max(1, Math.abs(s.y2 - s.y1))}px`;
    el.style.zIndex    = String(s.z);
    el.style.opacity   = String(s.opacity);
    const line = getStarLineInner(el);
    if (line) line.setAttribute("stroke-width", String(s.strokeWidth));
    return;
  }

  // text
  const s = st as StarTextState;
  el.style.transform   = `translate(${s.dx}px, ${s.dy}px) rotate(${s.rot}deg)`;
  el.style.fontSize     = `${s.fontSize}px`;
  el.style.lineHeight   = String(s.lineHeight);
  el.style.opacity      = String(s.opacity);
  el.style.color        = s.color;
  el.style.zIndex       = s.z !== 0 ? String(s.z) : "";
}

// ── Drag ref shape ────────────────────────────────────────────────────────────

interface DragRef {
  idx: number; startW: number;
  prevX: number; prevY: number;
  currentCx: number; currentCy: number;
  moved: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Gate component — renders nothing in production or without the URL flag
// ─────────────────────────────────────────────────────────────────────────────

export function DesignModePanel() {
  const [active, setActive]   = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isLocal =
      process.env.NODE_ENV === "development" ||
      ["localhost", "127.0.0.1"].includes(window.location.hostname) ||
      window.location.hostname.startsWith("192.168.");
    setActive(isLocal && new URLSearchParams(window.location.search).get("designMode") === "true");
  }, []);

  if (!mounted || !active) return null;
  return createPortal(<Panel />, document.body);
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel
// ─────────────────────────────────────────────────────────────────────────────

function Panel() {
  const [collapsed,    setCollapsed]    = useState(false);
  const [section,      setSection]      = useState<SectionKey>("s12-images");
  const [selectedIdx,  setSelectedIdx]  = useState(0);
  const [config,       setConfig]       = useState<FullConfig>(() => loadConfig());
  const [importText,   setImportText]   = useState("");
  const [importError,  setImportError]  = useState("");
  const [flash,        setFlash]        = useState("");
  const [genericEl,    setGenericEl]    = useState<HTMLElement | null>(null);
  const [genericKey,   setGenericKey]   = useState("");
  const [starKey,      setStarKey]      = useState(STAR_ELEMENTS[0].key);
  const [starType,     setStarType]     = useState<StarTypeFilter>("image");

  const configRef        = useRef(config);
  const genericElRef     = useRef<HTMLElement | null>(null);
  const genericKeyRef    = useRef("");
  const genericCounter   = useRef(0);
  const dragRef          = useRef<DragRef | null>(null);
  const starDragRef      = useRef<{
    key: string; cx: number; cy: number; w: number; rot: number; z: number; opacity: number;
    prevX: number; prevY: number; moved: boolean;
  } | null>(null);

  useEffect(() => { configRef.current = config; }, [config]);

  // ── Apply stored config to DOM after mount ────────────────────────────────
  // Delayed enough for every scene's own GSAP/ScrollTrigger setup (pins,
  // pin-spacers) to have run first; refreshed afterward so no pinned section
  // is left holding stale measurements from before Design Mode's edits.
  useEffect(() => {
    const t = setTimeout(() => {
      const cfg = loadConfig();
      S12_PIECES.forEach((_, i) => applyPiece(i, resolvePiece(i, cfg["investigation-board"])));
      S12_CIRCLES.forEach((_, i) => applyCircle(i, resolveCircle(i, cfg["s12-circles"])));
      S12_THREADS.forEach((_, i) => applyThread(i, resolveThread(i, cfg["s12-threads"])));
      STAR_ELEMENTS.forEach((def) => applyStarElem(def, resolveStarElem(def, cfg.star?.[def.key])));
      refreshScrollTriggers();
    }, 600);
    return () => clearTimeout(t);
  }, []);

  // ── Outline selected element ──────────────────────────────────────────────
  useEffect(() => {
    document.querySelectorAll<HTMLElement>("[data-dm-outlined]").forEach((el) => {
      el.style.outline = ""; el.style.outlineOffset = "";
      delete el.dataset.dmOutlined;
    });
    const outline = (el: HTMLElement | null) => {
      if (!el) return;
      el.style.outline = "2px solid #e8c547";
      el.style.outlineOffset = "3px";
      el.dataset.dmOutlined = "1";
    };
    if (section === "s12-images") outline(getPieceEl(selectedIdx));
    if (section === "generic")    outline(genericElRef.current);
    if (section === "star")       outline(getStarEl(starKey));
    return () => {
      document.querySelectorAll<HTMLElement>("[data-dm-outlined]").forEach((el) => {
        el.style.outline = ""; el.style.outlineOffset = "";
        delete el.dataset.dmOutlined;
      });
    };
  }, [section, selectedIdx, genericEl, starKey]);

  // ── Drag to reposition (S12 images) ──────────────────────────────────────
  const updatePieceFields = useCallback((idx: number, updates: Partial<PieceState>) => {
    setConfig((prev) => {
      const p = S12_PIECES[idx]; if (!p) return prev;
      const newOv  = { ...(prev["investigation-board"]?.[idx] ?? {}), ...updates };
      const merged = resolvePiece(idx, { ...(prev["investigation-board"] ?? {}), [idx]: newOv });
      const next: FullConfig = { ...prev, "investigation-board": { ...(prev["investigation-board"] ?? {}), [idx]: newOv } };
      saveConfig(next); applyPiece(idx, merged); return next;
    });
  }, []);

  useEffect(() => {
    if (section !== "s12-images") return;
    let rafId = 0;
    const onDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-design-panel]")) return;
      const target = (e.target as HTMLElement).closest<HTMLElement>("[data-piece-index]");
      if (!target) return;
      const idx = parseInt(target.dataset.pieceIndex ?? "0", 10);
      setSelectedIdx(idx);
      const cur = resolvePiece(idx, configRef.current["investigation-board"]);
      dragRef.current = { idx, startW: cur.w, prevX: e.clientX, prevY: e.clientY, currentCx: cur.cx, currentCy: cur.cy, moved: false };
      e.preventDefault();
    };
    // Mousemove only accumulates the delta (cheap arithmetic); the actual
    // style write happens at most once per animation frame, so a fast mouse
    // firing hundreds of move events/sec can't force hundreds of layouts/sec.
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current; if (!d) return;
      const s = getBoardScale(), f = e.shiftKey ? 0.1 : 1;
      const dx = ((e.clientX - d.prevX) / s) * f;
      const dy = ((e.clientY - d.prevY) / s) * f;
      d.prevX = e.clientX; d.prevY = e.clientY;
      d.currentCx += dx; d.currentCy += dy;
      if (Math.abs(dx) + Math.abs(dy) > 0.3) d.moved = true;
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const cur = dragRef.current; if (!cur) return;
        const el = getPieceEl(cur.idx);
        if (el) { el.style.left = `${cur.currentCx - cur.startW / 2}px`; el.style.top = `${cur.currentCy - cur.startW * 0.46}px`; }
      });
    };
    const onUp = () => {
      const d = dragRef.current; if (!d) return;
      if (d.moved) updatePieceFields(d.idx, { cx: Math.round(d.currentCx), cy: Math.round(d.currentCy) });
      dragRef.current = null;
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [section, updatePieceFields]);

  // ── Arrow keys (S12 images) ───────────────────────────────────────────────
  const updatePieceField = useCallback((idx: number, key: keyof PieceState, val: number) => {
    setConfig((prev) => {
      const p = S12_PIECES[idx]; if (!p) return prev;
      const newOv  = { ...(prev["investigation-board"]?.[idx] ?? {}), [key]: val };
      const merged = resolvePiece(idx, { ...(prev["investigation-board"] ?? {}), [idx]: newOv });
      const next: FullConfig = { ...prev, "investigation-board": { ...(prev["investigation-board"] ?? {}), [idx]: newOv } };
      saveConfig(next); applyPiece(idx, merged); return next;
    });
  }, []);

  useEffect(() => {
    if (section !== "s12-images") return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const step = e.shiftKey ? 10 : 1;
      const cur  = resolvePiece(selectedIdx, configRef.current["investigation-board"]);
      if (e.key === "ArrowLeft")  { e.preventDefault(); updatePieceField(selectedIdx, "cx", cur.cx - step); }
      if (e.key === "ArrowRight") { e.preventDefault(); updatePieceField(selectedIdx, "cx", cur.cx + step); }
      if (e.key === "ArrowUp")    { e.preventDefault(); updatePieceField(selectedIdx, "cy", cur.cy - step); }
      if (e.key === "ArrowDown")  { e.preventDefault(); updatePieceField(selectedIdx, "cy", cur.cy + step); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [section, selectedIdx, updatePieceField]);

  // ── Star (S09) field update — works for every kind (image/circle/thread/line/text) ─
  const updateStarField = useCallback((key: string, field: string, val: number | string) => {
    const def = STAR_ELEMENTS.find((d) => d.key === key); if (!def) return;
    setConfig((prev) => {
      const newOv  = { ...(prev.star?.[key] ?? {}), [field]: val } as StarOverride;
      const merged = resolveStarElem(def, { ...(prev.star ?? {}), [key]: newOv }[key]);
      const next: FullConfig = { ...prev, star: { ...(prev.star ?? {}), [key]: newOv } };
      saveConfig(next); applyStarElem(def, merged); return next;
    });
  }, []);

  // ── Drag to reposition (star images only — per spec, other kinds are field-edited) ─
  useEffect(() => {
    if (section !== "star") return;
    let rafId = 0;
    const onDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-design-panel]")) return;
      const target = (e.target as HTMLElement).closest<HTMLElement>("[data-design-star-key]");
      if (!target) return;
      const key = target.dataset.designStarKey ?? "";
      const def = STAR_ELEMENTS.find((d) => d.key === key); if (!def) return;
      setStarKey(key);
      if (def.kind !== "image") return; // selection only; no drag for shapes/lines/text
      // Snapshot every field once at drag-start — the mousemove handler below
      // never calls resolveStarElem again, so it does no config/DOM reads at all.
      const cur = resolveStarElem(def, configRef.current.star?.[key]) as StarImageState;
      starDragRef.current = {
        key, cx: cur.cx, cy: cur.cy, w: cur.w, rot: cur.rot, z: cur.z, opacity: cur.opacity,
        prevX: e.clientX, prevY: e.clientY, moved: false,
      };
      e.preventDefault();
    };
    // Mousemove only accumulates the delta; the actual style write is
    // deferred to at most once per animation frame (see rafId below), and
    // never re-reads config or the DOM — both are the source of drag jank.
    const onMove = (e: MouseEvent) => {
      const d = starDragRef.current; if (!d) return;
      const f = e.shiftKey ? 0.1 : 1;
      const dx = (e.clientX - d.prevX) * f;
      const dy = (e.clientY - d.prevY) * f;
      d.prevX = e.clientX; d.prevY = e.clientY;
      d.cx += dx; d.cy += dy;
      if (Math.abs(dx) + Math.abs(dy) > 0.3) d.moved = true;
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const cur = starDragRef.current; if (!cur) return;
        const def = STAR_ELEMENTS.find((x) => x.key === cur.key); if (!def) return;
        applyStarElem(def, { cx: cur.cx, cy: cur.cy, w: cur.w, rot: cur.rot, z: cur.z, opacity: cur.opacity });
      });
    };
    const onUp = () => {
      const d = starDragRef.current; if (!d) return;
      if (d.moved) {
        updateStarField(d.key, "cx", Math.round(d.cx));
        updateStarField(d.key, "cy", Math.round(d.cy));
      }
      starDragRef.current = null;
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [section, updateStarField]);

  // ── Arrow keys (star images only) ─────────────────────────────────────────
  useEffect(() => {
    if (section !== "star") return;
    const def = STAR_ELEMENTS.find((d) => d.key === starKey);
    if (!def || def.kind !== "image") return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const step = e.shiftKey ? 10 : 1;
      const cur = resolveStarElem(def, configRef.current.star?.[starKey]) as StarImageState;
      if (e.key === "ArrowLeft")  { e.preventDefault(); updateStarField(starKey, "cx", cur.cx - step); }
      if (e.key === "ArrowRight") { e.preventDefault(); updateStarField(starKey, "cx", cur.cx + step); }
      if (e.key === "ArrowUp")    { e.preventDefault(); updateStarField(starKey, "cy", cur.cy - step); }
      if (e.key === "ArrowDown")  { e.preventDefault(); updateStarField(starKey, "cy", cur.cy + step); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [section, starKey, updateStarField]);

  // ── Circle field update ───────────────────────────────────────────────────
  const updateCircleField = useCallback((idx: number, key: keyof CircleState, val: number) => {
    setConfig((prev) => {
      const newOv  = { ...(prev["s12-circles"]?.[idx] ?? {}), [key]: val };
      const merged = resolveCircle(idx, { ...(prev["s12-circles"] ?? {}), [idx]: newOv });
      const next: FullConfig = { ...prev, "s12-circles": { ...(prev["s12-circles"] ?? {}), [idx]: newOv } };
      saveConfig(next); applyCircle(idx, merged); return next;
    });
  }, []);

  // ── Thread field update ───────────────────────────────────────────────────
  const updateThreadField = useCallback((idx: number, key: keyof ThreadState, val: number) => {
    setConfig((prev) => {
      const newOv  = { ...(prev["s12-threads"]?.[idx] ?? {}), [key]: val };
      const merged = resolveThread(idx, { ...(prev["s12-threads"] ?? {}), [idx]: newOv });
      const next: FullConfig = { ...prev, "s12-threads": { ...(prev["s12-threads"] ?? {}), [idx]: newOv } };
      saveConfig(next); applyThread(idx, merged); return next;
    });
  }, []);

  // ── Generic mode: click-to-select any element ─────────────────────────────
  const updateGenericField = useCallback((key: string, field: keyof GenericState, val: number) => {
    const el = genericElRef.current;
    setConfig((prev) => {
      const newOv  = { ...(prev.generic?.[key] ?? {}), [field]: val };
      const merged = resolveGeneric(key, { ...(prev.generic ?? {}), [key]: newOv });
      const next: FullConfig = { ...prev, generic: { ...(prev.generic ?? {}), [key]: newOv } };
      saveConfig(next); if (el) applyGeneric(el, merged); return next;
    });
  }, []);

  useEffect(() => {
    if (section !== "generic") return;
    const onDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-design-panel]")) return;
      e.preventDefault();
      const el = e.target as HTMLElement;
      if (!el || el === document.body) return;
      if (!el.dataset.genericDesignKey) {
        el.dataset.genericDesignKey = `gkey-${++genericCounter.current}`;
      }
      const key = el.dataset.genericDesignKey;
      genericElRef.current = el; genericKeyRef.current = key;
      setGenericEl(el); setGenericKey(key);
      const st = resolveGeneric(key, configRef.current.generic);
      applyGeneric(el, st);
    };
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-design-panel]")) return;
      e.preventDefault(); e.stopImmediatePropagation();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("click", onClick, true);
    };
  }, [section]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const pieceState   = resolvePiece(selectedIdx, config["investigation-board"]);
  const circleState  = resolveCircle(selectedIdx, config["s12-circles"]);
  const threadState  = resolveThread(selectedIdx, config["s12-threads"]);
  const genericState = resolveGeneric(genericKey, config.generic);
  const starDef       = STAR_ELEMENTS.find((d) => d.key === starKey) ?? STAR_ELEMENTS[0];
  const starOverride  = config.star?.[starKey];
  const starState     = useMemo(() => resolveStarElem(starDef, starOverride), [starDef, starOverride]);

  // ── Flash helper ──────────────────────────────────────────────────────────
  const showFlash = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(""), 1600); };

  // ── Clear Design Mode cache ────────────────────────────────────────────────
  // Removes only the maison-obscura-design-config localStorage key, then
  // reloads so every section reflects the untouched code defaults. Never
  // touches source files or the permanent layout — purely a runtime reset,
  // and only ever runs when this button is clicked.
  const clearDesignModeCache = () => {
    clearStoredConfig();
    showFlash("Cache cleared — reloading…");
    setTimeout(() => window.location.reload(), 400);
  };

  // ── Copy section ─────────────────────────────────────────────────────────
  const copySection = () => {
    let text = "";
    if (section === "s12-images") {
      const out = S12_PIECES.map((p, i) => {
        const o = config["investigation-board"]?.[i] ?? {};
        return { src: p.src, alt: p.alt, cx: o.cx ?? p.cx, cy: o.cy ?? p.cy, w: o.w ?? p.w, rot: o.rot ?? p.rot, z: o.z ?? p.z };
      });
      text = JSON.stringify(out, null, 2);
    } else if (section === "s12-circles") {
      const out = S12_CIRCLES.map((c, i) => {
        const o = config["s12-circles"]?.[i] ?? {};
        return { cx: o.cx ?? c.cx, cy: o.cy ?? c.cy, rx: o.rx ?? c.rx, ry: o.ry ?? c.ry, rot: o.rot ?? c.rot };
      });
      text = JSON.stringify(out, null, 2);
    } else if (section === "s12-threads") {
      const out = S12_THREADS.map((_, i) => buildThreadPath(resolveThread(i, config["s12-threads"])));
      text = JSON.stringify(out, null, 2);
    } else if (section === "generic" && genericEl) {
      const st = genericState;
      text = [
        `transform: translate(${st.tx}px, ${st.ty}px) scale(${st.scale}) rotate(${st.rotate}deg);`,
        `opacity: ${st.opacity};`,
        st.zIndex !== 0 ? `z-index: ${st.zIndex};` : "",
      ].filter(Boolean).join("\n");
    } else if (section === "star") {
      const out: Record<string, unknown> = {};
      STAR_ELEMENTS.forEach((def) => { out[def.key] = resolveStarElem(def, config.star?.[def.key]); });
      text = JSON.stringify(out, null, 2);
    }
    navigator.clipboard.writeText(text)
      .then(() => showFlash("Copied!")).catch(() => showFlash("Copy failed"));
  };

  const exportAll = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2))
      .then(() => showFlash("Exported!")).catch(() => showFlash("Export failed"));
  };

  const applyImport = () => {
    setImportError("");
    try {
      const raw: unknown = JSON.parse(importText);
      if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        setImportError("Invalid JSON (expected an object)");
        return;
      }
      const parsed = raw as FullConfig;
      setConfig(parsed); saveConfig(parsed);
      setTimeout(() => {
        S12_PIECES.forEach((_, i)  => applyPiece(i, resolvePiece(i, parsed["investigation-board"])));
        S12_CIRCLES.forEach((_, i) => applyCircle(i, resolveCircle(i, parsed["s12-circles"])));
        S12_THREADS.forEach((_, i) => applyThread(i, resolveThread(i, parsed["s12-threads"])));
        STAR_ELEMENTS.forEach((def) => applyStarElem(def, resolveStarElem(def, parsed.star?.[def.key])));
        refreshScrollTriggers();
      }, 50);
      showFlash("Imported!");
    } catch { setImportError("Invalid JSON"); }
  };

  // ── Reset helpers ─────────────────────────────────────────────────────────
  const resetSelected = () => {
    if (section === "s12-images") {
      const p = S12_PIECES[selectedIdx]; if (!p) return;
      applyPiece(selectedIdx, { cx: p.cx, cy: p.cy, w: p.w, rot: p.rot, z: p.z, opacity: 1 });
      setConfig((prev) => {
        const next: FullConfig = { ...prev, "investigation-board": { ...(prev["investigation-board"] ?? {}) } };
        delete next["investigation-board"]![selectedIdx]; saveConfig(next); return next;
      });
    } else if (section === "s12-circles") {
      applyCircle(selectedIdx, resolveCircle(selectedIdx, {}));
      setConfig((prev) => {
        const next: FullConfig = { ...prev, "s12-circles": { ...(prev["s12-circles"] ?? {}) } };
        delete next["s12-circles"]![selectedIdx]; saveConfig(next); return next;
      });
    } else if (section === "s12-threads") {
      applyThread(selectedIdx, resolveThread(selectedIdx, {}));
      setConfig((prev) => {
        const next: FullConfig = { ...prev, "s12-threads": { ...(prev["s12-threads"] ?? {}) } };
        delete next["s12-threads"]![selectedIdx]; saveConfig(next); return next;
      });
    } else if (section === "generic" && genericElRef.current && genericKey) {
      applyGeneric(genericElRef.current, resolveGeneric(genericKey, {}));
      setConfig((prev) => {
        const next: FullConfig = { ...prev, generic: { ...(prev.generic ?? {}) } };
        delete next.generic![genericKey]; saveConfig(next); return next;
      });
    } else if (section === "star") {
      applyStarElem(starDef, resolveStarElem(starDef, {}));
      setConfig((prev) => {
        const next: FullConfig = { ...prev, star: { ...(prev.star ?? {}) } };
        delete next.star![starKey]; saveConfig(next); return next;
      });
    }
  };

  const resetAll = () => {
    if (section === "s12-images") {
      S12_PIECES.forEach((p, i) => applyPiece(i, { cx: p.cx, cy: p.cy, w: p.w, rot: p.rot, z: p.z, opacity: 1 }));
      const next = { ...config, "investigation-board": {} }; setConfig(next); saveConfig(next);
    } else if (section === "s12-circles") {
      S12_CIRCLES.forEach((_, i) => applyCircle(i, resolveCircle(i, {})));
      const next = { ...config, "s12-circles": {} }; setConfig(next); saveConfig(next);
    } else if (section === "s12-threads") {
      S12_THREADS.forEach((_, i) => applyThread(i, resolveThread(i, {})));
      const next = { ...config, "s12-threads": {} }; setConfig(next); saveConfig(next);
    } else if (section === "generic") {
      const next = { ...config, generic: {} }; setConfig(next); saveConfig(next);
    } else if (section === "star") {
      STAR_ELEMENTS.forEach((def) => applyStarElem(def, resolveStarElem(def, {})));
      const next = { ...config, star: {} }; setConfig(next); saveConfig(next);
    }
    refreshScrollTriggers();
  };

  // ── Labels ────────────────────────────────────────────────────────────────
  const pieceLabel  = S12_PIECES[selectedIdx]?.src.split("/").pop() ?? `piece-${selectedIdx}`;
  const circleLabel = ["main (frames logo)", "top-right cluster", "left cluster"][selectedIdx] ?? `circle-${selectedIdx}`;
  const threadLabel = (() => {
    const n = (S12_THREADS[selectedIdx]?.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    return `Thread ${selectedIdx}: (${n[0]},${n[1]}) → (${n[6]},${n[7]})`;
  })();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      data-design-panel=""
      style={{ position: "fixed", top: 16, right: 16, width: 270, background: "#141414", border: "1px solid #2a2a2a", borderRadius: 6, zIndex: 99999, fontFamily: "'SF Mono','Fira Code','Consolas',monospace", fontSize: 11, color: "#ccc", boxShadow: "0 12px 40px rgba(0,0,0,0.85)", userSelect: "none" } as CSSProperties}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        onClick={() => setCollapsed((c) => !c)}
        style={{ display: "flex", alignItems: "center", padding: "7px 10px", cursor: "pointer", background: "#1c1c1c", borderRadius: "5px 5px 0 0", borderBottom: "1px solid #2a2a2a", fontSize: 10, letterSpacing: "0.08em", fontWeight: 700, color: "#e8c547" } as CSSProperties}
      >
        ✦ DESIGN MODE
        {flash && <span style={{ marginLeft: 8, color: "#7dda58", fontWeight: 400, fontSize: 9 }}>{flash}</span>}
        <span style={{ marginLeft: "auto", opacity: 0.4 }}>{collapsed ? "▸" : "▾"}</span>
      </div>

      {!collapsed && (
        <div style={{ padding: "8px 10px", overflowY: "auto", maxHeight: "calc(100vh - 80px)" } as CSSProperties}>

          {/* ── Clear cache — always visible, independent of section ──── */}
          <button
            style={{ ...LS.btn, width: "100%", color: "#ff7070", borderColor: "#3d1a1a", marginBottom: 8 }}
            onClick={() => {
              if (window.confirm("Clear Design Mode cache? This removes all saved position/style overrides (localStorage only) and reloads the page.")) {
                clearDesignModeCache();
              }
            }}
          >
            Clear Design Mode Cache
          </button>
          <hr style={LS.rule} />

          {/* ── Section selector ──────────────────────────────────────── */}
          <label style={LS.label}>Section</label>
          <select
            value={section}
            onChange={(e) => { setSection(e.target.value as SectionKey); setSelectedIdx(0); }}
            style={LS.select}
          >
            <optgroup label="Investigation Board (S12)">
              <option value="s12-images">S12 · Images (41 photos)</option>
              <option value="s12-circles">S12 · Red Circles (3)</option>
              <option value="s12-threads">S12 · Red Threads (10)</option>
            </optgroup>
            <optgroup label="Scenes">
              <option value="star">star — all elements</option>
              <option value="cold">cold</option>
              <option value="light">light</option>
              <option value="dress">dress</option>
              <option value="fbi">fbi</option>
              <option value="place">place</option>
            </optgroup>
            <optgroup label="Any Section">
              <option value="generic">Generic — click any element</option>
            </optgroup>
          </select>

          <hr style={LS.rule} />

          {/* ══════════════════════════════════════════════════════════════
              S12 IMAGES
          ══════════════════════════════════════════════════════════════ */}
          {section === "s12-images" && (
            <>
              <label style={LS.label}>Image</label>
              <select value={selectedIdx} onChange={(e) => setSelectedIdx(parseInt(e.target.value, 10))} style={LS.select}>
                {S12_PIECES.map((p, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, "0")}  {p.src.split("/").pop()}</option>
                ))}
              </select>
              <div style={LS.hint}>
                <span style={{ color: "#e8c547" }}>▪</span> {pieceLabel}
                <br />Drag image to move · ← → ↑ ↓ keys (Shift ±10px)
              </div>
              <hr style={LS.rule} />
              {([
                { key: "cx",      label: "cx (center X)",  min: -100,         max: BOARD_W + 100, step: 1    },
                { key: "cy",      label: "cy (center Y)",  min: -100,         max: BOARD_H + 100, step: 1    },
                { key: "w",       label: "width",           min: 40,           max: 500,           step: 1    },
                { key: "rot",     label: "rotation °",      min: -45,          max: 45,            step: 0.5  },
                { key: "z",       label: "z-index",         min: 1,            max: 50,            step: 1    },
                { key: "opacity", label: "opacity",         min: 0,            max: 1,             step: 0.01 },
              ] as Array<{ key: keyof PieceState; label: string; min: number; max: number; step: number }>).map(({ key: field, ...rest }) => (
                <ControlRow key={field} {...rest}
                  value={pieceState[field]}
                  onChange={(v) => updatePieceField(selectedIdx, field, v)}
                />
              ))}
              <hr style={LS.rule} />
              <ActionButtons
                onCopy={copySection} copyLabel="Copy PIECES array"
                onExport={exportAll}
                onResetOne={resetSelected} resetOneLabel="Reset Selected"
                onResetAll={resetAll} resetAllLabel="Reset All Images"
              />
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════
              S12 CIRCLES
          ══════════════════════════════════════════════════════════════ */}
          {section === "s12-circles" && (
            <>
              <label style={LS.label}>Circle</label>
              <select value={selectedIdx} onChange={(e) => setSelectedIdx(parseInt(e.target.value, 10))} style={LS.select}>
                {S12_CIRCLES.map((_, i) => (
                  <option key={i} value={i}>{i}: {["main (frames logo)", "top-right", "left"][i]}</option>
                ))}
              </select>
              <div style={LS.hint}><span style={{ color: "#e8c547" }}>▪</span> {circleLabel}</div>
              <hr style={LS.rule} />
              {([
                { key: "cx",          label: "cx (center X)",    min: 0,   max: BOARD_W, step: 1    },
                { key: "cy",          label: "cy (center Y)",    min: 0,   max: BOARD_H, step: 1    },
                { key: "rx",          label: "rx (half-width)",  min: 10,  max: 500,     step: 1    },
                { key: "ry",          label: "ry (half-height)", min: 10,  max: 500,     step: 1    },
                { key: "rot",         label: "rotation °",       min: -45, max: 45,      step: 0.5  },
                { key: "strokeWidth", label: "stroke width",     min: 0.5, max: 8,       step: 0.1  },
                { key: "opacity",     label: "opacity",          min: 0,   max: 1,       step: 0.01 },
              ] as Array<{ key: keyof CircleState; label: string; min: number; max: number; step: number }>).map(({ key: field, ...rest }) => (
                <ControlRow key={field} {...rest}
                  value={circleState[field]}
                  onChange={(v) => updateCircleField(selectedIdx, field, v)}
                />
              ))}
              <hr style={LS.rule} />
              <ActionButtons
                onCopy={copySection} copyLabel="Copy CIRCLES array"
                onExport={exportAll}
                onResetOne={resetSelected} resetOneLabel="Reset Selected"
                onResetAll={resetAll} resetAllLabel="Reset All Circles"
              />
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════
              S12 THREADS
          ══════════════════════════════════════════════════════════════ */}
          {section === "s12-threads" && (
            <>
              <label style={LS.label}>Thread</label>
              <select value={selectedIdx} onChange={(e) => setSelectedIdx(parseInt(e.target.value, 10))} style={LS.select}>
                {S12_THREADS.map((d, i) => {
                  const n = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
                  return <option key={i} value={i}>{i}: ({n[0]},{n[1]}) → ({n[6]},{n[7]})</option>;
                })}
              </select>
              <div style={LS.hint}><span style={{ color: "#e8c547" }}>▪</span> {threadLabel}</div>
              <hr style={LS.rule} />

              <div style={LS.subheading}>Start point</div>
              {([
                { key: "sx", label: "start X", min: 0, max: BOARD_W, step: 1 },
                { key: "sy", label: "start Y", min: 0, max: BOARD_H, step: 1 },
              ] as Array<{ key: keyof ThreadState; label: string; min: number; max: number; step: number }>).map(({ key: field, ...rest }) => (
                <ControlRow key={field} {...rest} value={threadState[field]} onChange={(v) => updateThreadField(selectedIdx, field, v)} />
              ))}

              <div style={LS.subheading}>Control points (curve shape)</div>
              {([
                { key: "c1x", label: "cp1 X", min: 0, max: BOARD_W, step: 1 },
                { key: "c1y", label: "cp1 Y", min: 0, max: BOARD_H, step: 1 },
                { key: "c2x", label: "cp2 X", min: 0, max: BOARD_W, step: 1 },
                { key: "c2y", label: "cp2 Y", min: 0, max: BOARD_H, step: 1 },
              ] as Array<{ key: keyof ThreadState; label: string; min: number; max: number; step: number }>).map(({ key: field, ...rest }) => (
                <ControlRow key={field} {...rest} value={threadState[field]} onChange={(v) => updateThreadField(selectedIdx, field, v)} />
              ))}

              <div style={LS.subheading}>End point</div>
              {([
                { key: "ex", label: "end X", min: 0, max: BOARD_W, step: 1 },
                { key: "ey", label: "end Y", min: 0, max: BOARD_H, step: 1 },
              ] as Array<{ key: keyof ThreadState; label: string; min: number; max: number; step: number }>).map(({ key: field, ...rest }) => (
                <ControlRow key={field} {...rest} value={threadState[field]} onChange={(v) => updateThreadField(selectedIdx, field, v)} />
              ))}

              <div style={LS.subheading}>Style</div>
              {([
                { key: "strokeWidth", label: "stroke width", min: 0.5, max: 5,   step: 0.05 },
                { key: "opacity",     label: "opacity",      min: 0,   max: 1,   step: 0.01 },
              ] as Array<{ key: keyof ThreadState; label: string; min: number; max: number; step: number }>).map(({ key: field, ...rest }) => (
                <ControlRow key={field} {...rest} value={threadState[field]} onChange={(v) => updateThreadField(selectedIdx, field, v)} />
              ))}

              <hr style={LS.rule} />
              <ActionButtons
                onCopy={copySection} copyLabel="Copy THREADS array"
                onExport={exportAll}
                onResetOne={resetSelected} resetOneLabel="Reset Selected"
                onResetAll={resetAll} resetAllLabel="Reset All Threads"
              />
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════
              STAR (S09) — one dropdown, all element kinds
          ══════════════════════════════════════════════════════════════ */}
          {section === "star" && (
            <>
              <button
                style={{ ...LS.btn, width: "100%", marginBottom: 8 }}
                onClick={() => {
                  document
                    .querySelector('section[aria-label="S09 Star — Investigative Board"]')
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                Jump to Star Section
              </button>

              <label style={LS.label}>Element type</label>
              <select
                value={starType}
                onChange={(e) => {
                  const t = e.target.value as StarTypeFilter;
                  setStarType(t);
                  const first = STAR_ELEMENTS.find((d) => matchesStarType(d, t));
                  if (first) setStarKey(first.key);
                }}
                style={LS.select}
              >
                <option value="image">Images ({STAR_ELEMENTS.filter((d) => matchesStarType(d, "image")).length})</option>
                <option value="text">Text ({STAR_ELEMENTS.filter((d) => matchesStarType(d, "text")).length})</option>
                <option value="circle">Red Circles ({STAR_ELEMENTS.filter((d) => matchesStarType(d, "circle")).length})</option>
                <option value="line">Red Lines ({STAR_ELEMENTS.filter((d) => matchesStarType(d, "line")).length})</option>
              </select>

              <label style={{ ...LS.label, marginTop: 6 }}>Element</label>
              <select value={starKey} onChange={(e) => setStarKey(e.target.value)} style={LS.select}>
                {STAR_ELEMENTS.filter((d) => matchesStarType(d, starType)).map((d) => (
                  <option key={d.key} value={d.key}>{d.label}</option>
                ))}
              </select>
              <div style={LS.hint}>
                <span style={{ color: "#e8c547" }}>▪</span> {starDef.label}
                {starDef.kind === "image" && <><br />Drag image to move · ← → ↑ ↓ keys (Shift ±10px)</>}
              </div>
              <hr style={LS.rule} />

              {starDef.kind === "image" && (([
                { key: "cx",      label: "cx (center X)", min: -200, max: 4000, step: 1    },
                { key: "cy",      label: "cy (center Y)", min: -200, max: 4000, step: 1    },
                { key: "w",       label: "width",         min: 20,   max: 2000, step: 1    },
                { key: "rot",     label: "rotation °",    min: -45,  max: 45,   step: 0.5  },
                { key: "z",       label: "z-index",       min: 1,    max: 50,   step: 1    },
                { key: "opacity", label: "opacity",       min: 0,    max: 1,    step: 0.01 },
              ] as Array<{ key: keyof StarImageState; label: string; min: number; max: number; step: number }>).map(({ key: field, ...rest }) => (
                <ControlRow key={field} {...rest}
                  value={(starState as StarImageState)[field]}
                  onChange={(v) => updateStarField(starKey, field, v)}
                />
              )))}

              {(starDef.kind === "circle" || starDef.kind === "thread") && (([
                { key: "cx",          label: "cx (center X)", min: -200, max: 4000, step: 1    },
                { key: "cy",          label: "cy (center Y)", min: -200, max: 4000, step: 1    },
                { key: "w",           label: "width",         min: 10,   max: 2000, step: 1    },
                { key: "h",           label: "height",        min: 10,   max: 4000, step: 1    },
                { key: "rot",         label: "rotation °",    min: -45,  max: 45,   step: 0.5  },
                { key: "strokeWidth", label: "stroke width",  min: 0.5,  max: 8,    step: 0.1  },
                { key: "z",           label: "z-index",       min: 1,    max: 50,   step: 1    },
                { key: "opacity",     label: "opacity",       min: 0,    max: 1,    step: 0.01 },
              ] as Array<{ key: keyof StarShapeState; label: string; min: number; max: number; step: number }>).map(({ key: field, ...rest }) => (
                <ControlRow key={field} {...rest}
                  value={(starState as StarShapeState)[field]}
                  onChange={(v) => updateStarField(starKey, field, v)}
                />
              )))}

              {starDef.kind === "line" && (([
                { key: "x1",          label: "start X",      min: -2000, max: 4000, step: 1    },
                { key: "y1",          label: "start Y",      min: -2000, max: 4000, step: 1    },
                { key: "x2",          label: "end X",        min: -2000, max: 4000, step: 1    },
                { key: "y2",          label: "end Y",        min: -2000, max: 4000, step: 1    },
                { key: "strokeWidth", label: "stroke width", min: 0.5,   max: 8,    step: 0.1  },
                { key: "z",           label: "z-index",      min: 1,     max: 50,   step: 1    },
                { key: "opacity",     label: "opacity",      min: 0,     max: 1,    step: 0.01 },
              ] as Array<{ key: keyof StarLineState; label: string; min: number; max: number; step: number }>).map(({ key: field, ...rest }) => (
                <ControlRow key={field} {...rest}
                  value={(starState as StarLineState)[field]}
                  onChange={(v) => updateStarField(starKey, field, v)}
                />
              )))}

              {starDef.kind === "text" && (
                <>
                  {([
                    { key: "dx",         label: "offset X",   min: -400, max: 400, step: 1    },
                    { key: "dy",         label: "offset Y",   min: -400, max: 400, step: 1    },
                    { key: "fontSize",   label: "font size",  min: 12,   max: 140, step: 1    },
                    { key: "lineHeight", label: "line height",min: 0.8,  max: 2,   step: 0.01 },
                    { key: "rot",        label: "rotation °", min: -45,  max: 45,  step: 0.5  },
                    { key: "z",          label: "z-index",    min: 0,    max: 50,  step: 1    },
                    { key: "opacity",    label: "opacity",    min: 0,    max: 1,   step: 0.01 },
                  ] as Array<{ key: keyof StarTextState; label: string; min: number; max: number; step: number }>).map(({ key: field, ...rest }) => (
                    <ControlRow key={field} {...rest}
                      value={(starState as StarTextState)[field] as number}
                      onChange={(v) => updateStarField(starKey, field, v)}
                    />
                  ))}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 9, color: "#666", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 2 }}>color</div>
                    <input
                      type="color"
                      value={(starState as StarTextState).color}
                      onChange={(e) => updateStarField(starKey, "color", e.target.value)}
                      style={{ width: "100%", height: 22, background: "#1e1e1e", border: "1px solid #2e2e2e", borderRadius: 3, cursor: "pointer" }}
                    />
                  </div>
                </>
              )}

              <hr style={LS.rule} />
              <ActionButtons
                onCopy={copySection} copyLabel="Copy Star Config"
                onExport={exportAll}
                onResetOne={resetSelected} resetOneLabel="Reset Selected"
                onResetAll={resetAll} resetAllLabel="Reset All Star"
              />
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════
              SCENES WITHOUT A WIRED-UP REGISTRY YET (cold/light/dress/fbi/place)
          ══════════════════════════════════════════════════════════════ */}
          {section in SECTION_DISPLAY_NAME && (
            <div style={{ fontSize: 10, color: "#888", lineHeight: 1.7, padding: "6px 2px" }}>
              <div style={{ color: "#e8c547", fontWeight: 700, marginBottom: 4 }}>
                No editable elements registered for this section.
              </div>
              {SECTION_DISPLAY_NAME[section]} is not yet wired into Design Mode&apos;s
              element registry — only <strong>star</strong> and the <strong>Investigation
              Board (S12)</strong> are. Use <strong>Generic — click any element</strong>{" "}
              below to position/scale/rotate anything on this page in the meantime.
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              GENERIC — click any element on the page
          ══════════════════════════════════════════════════════════════ */}
          {section === "generic" && (
            <>
              {!genericEl ? (
                <div style={{ fontSize: 10, color: "#666", lineHeight: 1.8, marginBottom: 6 }}>
                  → Click any element on the page to select it.
                  <br />Works across all sections.
                  <br /><span style={{ color: "#444", fontSize: 9 }}>Link clicks are blocked while active.</span>
                </div>
              ) : (
                <>
                  <div style={LS.hint}>
                    <span style={{ color: "#e8c547" }}>▪</span> {genericKey}
                    <br />Click another element to switch.
                  </div>
                  <hr style={LS.rule} />
                  {([
                    { key: "tx",      label: "translate X",  min: -600, max: 600, step: 1    },
                    { key: "ty",      label: "translate Y",  min: -600, max: 600, step: 1    },
                    { key: "scale",   label: "scale",        min: 0.05, max: 4,   step: 0.01 },
                    { key: "rotate",  label: "rotation °",   min: -180, max: 180, step: 1    },
                    { key: "opacity", label: "opacity",      min: 0,    max: 1,   step: 0.01 },
                    { key: "zIndex",  label: "z-index",      min: 0,    max: 100, step: 1    },
                  ] as Array<{ key: keyof GenericState; label: string; min: number; max: number; step: number }>).map(({ key: field, ...rest }) => (
                    <ControlRow key={field} {...rest}
                      value={genericState[field]}
                      onChange={(v) => updateGenericField(genericKey, field, v)}
                    />
                  ))}
                  <hr style={LS.rule} />
                  <ActionButtons
                    onCopy={copySection} copyLabel="Copy CSS Style"
                    onExport={exportAll}
                    onResetOne={resetSelected} resetOneLabel="Reset Element"
                    onResetAll={resetAll} resetAllLabel="Clear All Generic"
                  />
                </>
              )}
            </>
          )}

          <hr style={LS.rule} />

          {/* ── Import ─────────────────────────────────────────────────── */}
          <label style={LS.label}>Import JSON config</label>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Paste exported JSON..."
            style={{ width: "100%", background: "#1e1e1e", border: "1px solid #2e2e2e", borderRadius: 3, color: "#aaa", padding: "4px 5px", fontSize: 10, boxSizing: "border-box" as const, height: 52, resize: "vertical" as const, fontFamily: "inherit" }}
          />
          {importError && <div style={{ color: "#ff6b6b", fontSize: 9, marginTop: 2 }}>{importError}</div>}
          <button style={{ ...LS.btn, width: "100%", marginTop: 4 }} onClick={applyImport}>
            Apply Import
          </button>

          <div style={{ fontSize: 8, color: "#2e2e2e", marginTop: 10, textAlign: "center" as const }}>
            maison-obscura-design-config
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ControlRow({ label, min, max, step, value, onChange }: {
  label: string; min: number; max: number; step: number;
  value: number; onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
        <span style={{ fontSize: 9, color: "#666", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{label}</span>
        <input
          type="number"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v); }}
          style={{ width: 68, background: "#1e1e1e", border: "1px solid #2e2e2e", borderRadius: 3, color: "#e8c547", padding: "2px 5px", fontSize: 11, textAlign: "right" as const, boxSizing: "border-box" as const }}
        />
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "#e8c547", cursor: "pointer", display: "block" }}
      />
    </div>
  );
}

function ActionButtons({ onCopy, copyLabel, onExport, onResetOne, resetOneLabel, onResetAll, resetAllLabel }: {
  onCopy: () => void; copyLabel: string;
  onExport: () => void;
  onResetOne: () => void; resetOneLabel: string;
  onResetAll: () => void; resetAllLabel: string;
}) {
  return (
    <>
      <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
        <button style={LS.btn} onClick={onCopy}>{copyLabel}</button>
        <button style={LS.btn} onClick={onExport}>Export All</button>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        <button style={{ ...LS.btn, flex: 1 }} onClick={onResetOne}>{resetOneLabel}</button>
        <button style={{ ...LS.btn, flex: 1, color: "#ff7070", borderColor: "#3d1a1a" }} onClick={onResetAll}>{resetAllLabel}</button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Micro-styles
// ─────────────────────────────────────────────────────────────────────────────

const LS = {
  label:      { display: "block" as const, fontSize: 9, color: "#666", letterSpacing: "0.06em", textTransform: "uppercase" as const, marginBottom: 3 },
  select:     { width: "100%", background: "#1e1e1e", border: "1px solid #2e2e2e", borderRadius: 3, color: "#ddd", padding: "4px 5px", fontSize: 11, boxSizing: "border-box" as const, cursor: "pointer" },
  hint:       { fontSize: 9, color: "#444", lineHeight: 1.6, marginTop: 4 },
  rule:       { border: "none", borderTop: "1px solid #222", margin: "8px 0" },
  btn:        { flex: 1, background: "#1e1e1e", border: "1px solid #2e2e2e", borderRadius: 3, color: "#bbb", padding: "5px 6px", cursor: "pointer", fontSize: 10, letterSpacing: "0.02em" },
  subheading: { fontSize: 9, color: "#555", marginBottom: 4, marginTop: 6 },
};
