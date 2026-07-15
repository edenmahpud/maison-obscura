"use client";

import {
  useEffect, useRef, useState, useCallback,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import {
  PIECES as S12_PIECES,
  CIRCLES as S12_CIRCLES,
  THREADS as S12_THREADS,
  BOARD_W, BOARD_H,
  handCircle,
} from "@/components/scenes/act-one/S12InvestigationBoard";

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

// ── Full localStorage config ───────────────────────────────────────────────────

interface FullConfig {
  "investigation-board"?: Record<number, Partial<PieceState>>;
  "s12-circles"?: Record<number, Partial<CircleState>>;
  "s12-threads"?: Record<number, Partial<ThreadState>>;
  generic?: Record<string, Partial<GenericState>>;
}

type SectionKey = "s12-images" | "s12-circles" | "s12-threads" | "generic";

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
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as FullConfig; }
  catch { return {}; }
}

function saveConfig(cfg: FullConfig) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch { /**/ }
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

  const configRef        = useRef(config);
  const genericElRef     = useRef<HTMLElement | null>(null);
  const genericKeyRef    = useRef("");
  const genericCounter   = useRef(0);
  const dragRef          = useRef<DragRef | null>(null);

  useEffect(() => { configRef.current = config; }, [config]);

  // ── Apply stored config to DOM after mount ────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      const cfg = loadConfig();
      S12_PIECES.forEach((_, i) => applyPiece(i, resolvePiece(i, cfg["investigation-board"])));
      S12_CIRCLES.forEach((_, i) => applyCircle(i, resolveCircle(i, cfg["s12-circles"])));
      S12_THREADS.forEach((_, i) => applyThread(i, resolveThread(i, cfg["s12-threads"])));
    }, 200);
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
    return () => {
      document.querySelectorAll<HTMLElement>("[data-dm-outlined]").forEach((el) => {
        el.style.outline = ""; el.style.outlineOffset = "";
        delete el.dataset.dmOutlined;
      });
    };
  }, [section, selectedIdx, genericEl]);

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
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current; if (!d) return;
      const s = getBoardScale(), f = e.shiftKey ? 0.1 : 1;
      const dx = ((e.clientX - d.prevX) / s) * f;
      const dy = ((e.clientY - d.prevY) / s) * f;
      d.prevX = e.clientX; d.prevY = e.clientY;
      d.currentCx += dx; d.currentCy += dy;
      if (Math.abs(dx) + Math.abs(dy) > 0.3) d.moved = true;
      const el = getPieceEl(d.idx);
      if (el) { el.style.left = `${d.currentCx - d.startW / 2}px`; el.style.top = `${d.currentCy - d.startW * 0.46}px`; }
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

  // ── Flash helper ──────────────────────────────────────────────────────────
  const showFlash = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(""), 1600); };

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
      const parsed = JSON.parse(importText) as FullConfig;
      setConfig(parsed); saveConfig(parsed);
      setTimeout(() => {
        S12_PIECES.forEach((_, i)  => applyPiece(i, resolvePiece(i, parsed["investigation-board"])));
        S12_CIRCLES.forEach((_, i) => applyCircle(i, resolveCircle(i, parsed["s12-circles"])));
        S12_THREADS.forEach((_, i) => applyThread(i, resolveThread(i, parsed["s12-threads"])));
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
    }
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
