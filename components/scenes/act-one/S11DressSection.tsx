"use client";

import { useEffect, useRef } from "react";
import type { Group as ThreeGroup, PointLight as ThreePointLight, MeshStandardMaterial as ThreeMSM } from "three";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ── Scroll phases (0–1 over 600vh) ───────────────────────────────────────────
// No black entry — section opens with a 14 px blur that clears in 6%, so the
// Place→Dress transition is a soft blur/scale reveal, not a hard black gap.
const P = {
  BLUR_CLEAR:  0.06,   // entry blur + scale fully resolved
  S1_OUT:      0.20,   // state 1 starts leaving
  S1_GONE:     0.26,   // state 1 gone / canvas A faded
  S2_OUT:      0.44,   // state 2 starts leaving
  S2_GONE:     0.50,   // state 2 gone / canvas B faded
  S3_OUT:      0.68,   // state 3 starts leaving
  S3_GONE:     0.74,   // state 3 gone / canvas C dims for state 4
  EXIT_START:  0.94,   // exit overlay begins
};

function lerp01(p: number, lo: number, hi: number): number {
  return Math.min(1, Math.max(0, (p - lo) / (hi - lo)));
}

// ── Three.js dress viewer (lazy-loaded per canvas) ────────────────────────────
type FlashMode = "standard" | "subtle" | "intense";

async function mountViewer(
  canvas: HTMLCanvasElement,
  src: string,
  mode: FlashMode = "standard",
): Promise<() => void> {
  const [THREE, { GLTFLoader }] = await Promise.all([
    import("three"),
    import("three/examples/jsm/loaders/GLTFLoader.js"),
  ]);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
  camera.position.set(0, 0.15, 3.8);
  camera.lookAt(0, 0, 0);

  // Warm vintage base lighting
  const baseAmbient = new THREE.AmbientLight(0xfff4e0, 0.38);
  scene.add(baseAmbient);
  // Intense mode gets stronger directionals so the metallic fabric has
  // enough light to produce visible specular highlights
  const key = new THREE.DirectionalLight(0xffe8d0, mode === "intense" ? 2.0 : 0.82);
  key.position.set(0.6, 2.5, 2.0);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffd8a8, mode === "intense" ? 0.35 : 0.11);
  fill.position.set(-2.0, 0.5, 0.5);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xfff0c0, 0.07);
  rim.position.set(0, -1, -1.5);
  scene.add(rim);

  // Flash lights — build per mode
  type FlashEntry = { light: ThreePointLight; phase: number; nextFire: number; maxIntensity: number };
  const flashLights: FlashEntry[] = [];
  let minInterval = 2.0, maxInterval = 5.0, decay = 0.78, ambientPulse = 0;

  if (mode === "subtle") {
    // Two soft frontal flashes — infrequent, quick burst
    const configs: [[number, number, number], number][] = [
      [[-1.5, 0.6, 2.0], 2.2],
      [[ 1.3, -0.2, 1.8], 1.8],
    ];
    minInterval = 2.2; maxInterval = 5.5; decay = 0.78; ambientPulse = 0.08;
    configs.forEach(([pos, maxI], i) => {
      const pl = new THREE.PointLight(0xfff8f0, 0, 10);
      pl.position.set(...pos);
      scene.add(pl);
      flashLights.push({ light: pl, phase: 0, nextFire: i * 1.8 + Math.random() * 2, maxIntensity: maxI });
    });
  } else if (mode === "intense") {
    // Metallic materials reflect PointLights as sharp specular highlights —
    // higher intensities here because the flash bounces off the fabric surface
    const configs: [[number, number, number], number][] = [
      [[ 0.0,  0.4,  2.2], 16.0],
      [[-2.0,  1.0,  1.5], 13.0],
      [[ 2.0, -0.4,  1.5], 13.0],
      [[ 0.4,  2.2,  0.6], 11.0],
      [[-0.3, -0.8,  2.5], 15.0],
    ];
    minInterval = 0.35; maxInterval = 1.4; decay = 0.88; ambientPulse = 0.45;
    configs.forEach(([pos, maxI], i) => {
      const pl = new THREE.PointLight(0xfffaf5, 0, 14);
      pl.position.set(...pos);
      scene.add(pl);
      flashLights.push({ light: pl, phase: 0, nextFire: i * 0.25 + Math.random() * 0.6, maxIntensity: maxI });
    });
  }

  // Orbiting specular lights — sweep moving hotspots across the fabric surface.
  // subtle → 1 gentle sweep for 3d2; intense → 3 fast sweeps for 3d3.
  const reflectiveMats: ThreeMSM[] = [];
  let orb1: ThreePointLight | null = null;
  let orb2: ThreePointLight | null = null;
  let orb3: ThreePointLight | null = null;

  if (mode === "subtle") {
    orb1 = new THREE.PointLight(0xfff8f0, 0, 3.0);
    scene.add(orb1);
  } else if (mode === "intense") {
    orb1 = new THREE.PointLight(0xffffff, 0, 3.5);
    orb2 = new THREE.PointLight(0xfff4e8, 0, 3.2);
    orb3 = new THREE.PointLight(0xfff8f0, 0, 2.8);
    scene.add(orb1, orb2, orb3);
  }

  let ambientBoost = 0;
  const BASE_AMBIENT = 0.38;

  let root: ThreeGroup | null = null;
  let baseY = 0;
  let raf = 0;
  let dead = false;

  const syncSize = () => {
    const el = canvas.parentElement;
    if (!el || el.clientWidth === 0 || el.clientHeight === 0) return;
    renderer.setSize(el.clientWidth, el.clientHeight, false);
    camera.aspect = el.clientWidth / el.clientHeight;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(syncSize);
  if (canvas.parentElement) ro.observe(canvas.parentElement);
  syncSize();

  new GLTFLoader().load(src, (gltf) => {
    if (dead) return;
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    model.position.sub(box.getCenter(new THREE.Vector3()));
    const size = box.getSize(new THREE.Vector3());
    model.scale.setScalar(2.2 / Math.max(size.x, size.y, size.z));
    baseY = model.position.y;
    root = new THREE.Group();
    root.add(model);
    scene.add(root);

    // Modify materials to be reflective so lights produce visible specular hits.
    // subtle (3d2): glamorous sheen, dress stays readable.
    // intense (3d3): near-mirror surface — fabric returns flash aggressively.
    const applyReflection = (roughness: number, metalness: number, emissiveHex: number, emissiveBase: number) => {
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m) => {
            if (m instanceof THREE.MeshStandardMaterial) {
              const msm = m as ThreeMSM;
              msm.roughness = roughness;
              msm.metalness = metalness;
              msm.emissive.setHex(emissiveHex);
              msm.emissiveIntensity = emissiveBase;
              reflectiveMats.push(msm);
            }
          });
        }
      });
    };
    if (mode === "subtle")  applyReflection(0.18, 0.80, 0xfff8f0, 0.03);
    if (mode === "intense") applyReflection(0.04, 0.96, 0xfff8f0, 0.08);
  });

  const tick = () => {
    if (dead) return;
    raf = requestAnimationFrame(tick);
    if (root) {
      root.rotation.y += 0.003;
      root.position.y = baseY + Math.sin(Date.now() / 2800) * 0.045;
    }

    if (flashLights.length > 0) {
      const nowSec = Date.now() / 1000;
      let peakPhase = 0;
      flashLights.forEach((fl, i) => {
        if (nowSec >= fl.nextFire) {
          fl.phase = 1.0;
          fl.nextFire = nowSec + minInterval + Math.random() * (maxInterval - minInterval);
          // Intense mode: sometimes fire an adjacent light at the same moment
          if (mode === "intense" && Math.random() > 0.55 && i + 1 < flashLights.length) {
            const next = flashLights[i + 1];
            next.phase = 0.65 + Math.random() * 0.35;
            next.nextFire = nowSec + minInterval + Math.random() * (maxInterval - minInterval);
          }
        }
        fl.phase *= decay;
        fl.light.intensity = fl.phase * fl.maxIntensity;
        if (fl.phase > peakPhase) peakPhase = fl.phase;
      });
      // Smooth ambient pulse follows the brightest active flash
      ambientBoost += (peakPhase * ambientPulse - ambientBoost) * 0.12;
      baseAmbient.intensity = BASE_AMBIENT + ambientBoost;
    }

    // Gentle orbit + emissive pulse — subtle (3d2)
    if (mode === "subtle" && orb1) {
      const t = Date.now() / 1000;
      orb1.position.set(
        Math.sin(t * 0.52) * 1.20,
        Math.cos(t * 0.70) * 0.85,
        1.50 + Math.sin(t * 0.90) * 0.30,
      );
      orb1.intensity = 3.0 * (0.40 + 0.60 * Math.sin(t * 1.80));
      if (reflectiveMats.length > 0) {
        const e = 0.04 + Math.sin(t * 1.50) * 0.04 + Math.sin(t * 2.80 + 0.8) * 0.025 + Math.random() * 0.015;
        reflectiveMats.forEach((mat) => { mat.emissiveIntensity = Math.max(0, Math.min(0.12, e)); });
      }
    }

    // Orbiting specular sweep + emissive shimmer — intense (3d3)
    // Lights orbit at different angular speeds so they paint highlights across
    // all parts of the dress; intensities pulse so the shimmer feels organic.
    if (mode === "intense" && orb1 && orb2 && orb3) {
      const t = Date.now() / 1000;

      orb1.position.set(
        Math.sin(t * 0.72) * 1.30,
        Math.cos(t * 1.10) * 0.90,
        1.30 + Math.sin(t * 1.50) * 0.35,
      );
      orb2.position.set(
        Math.cos(t * 1.28) * 1.10,
        Math.sin(t * 0.80 + 1.5) * 1.10,
        1.10 + Math.cos(t * 0.92) * 0.42,
      );
      orb3.position.set(
        Math.sin(t * 1.90 + 2.2) * 0.85,
        Math.cos(t * 1.42 + 0.7) * 1.30,
        1.50 + Math.sin(t * 2.10) * 0.28,
      );

      orb1.intensity = 7.0 * (0.50 + 0.50 * Math.sin(t * 2.30));
      orb2.intensity = 6.0 * (0.45 + 0.55 * Math.sin(t * 3.10 + 1.2));
      orb3.intensity = 5.2 * (0.48 + 0.52 * Math.sin(t * 1.82 + 2.4));

      // Multi-frequency emissive pulse — different sine periods so the glow
      // never settles into a regular beat; random jitter adds grain
      if (reflectiveMats.length > 0) {
        const e =
          0.14 +
          Math.sin(t * 2.10) * 0.24 +
          Math.sin(t * 3.80 + 1.1) * 0.18 +
          Math.sin(t * 7.50 + 2.3) * 0.12 +
          Math.random() * 0.08;
        const emissive = Math.max(0, Math.min(0.80, e));
        reflectiveMats.forEach((mat) => { mat.emissiveIntensity = emissive; });
      }
    }

    renderer.render(scene, camera);
  };
  tick();

  return () => {
    dead = true;
    cancelAnimationFrame(raf);
    ro.disconnect();
    renderer.dispose();
    scene.clear();
  };
}

// ── Archival photo (absolutely positioned) ────────────────────────────────────
function Photo({
  src,
  style,
  rounded,
}: {
  src: string;
  style: React.CSSProperties;
  rounded?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        overflow: "hidden",
        borderRadius: rounded ? "clamp(16px, 2.5vw, 42px)" : 0,
        ...style,
      }}
    >
      <Image src={src} alt="" fill sizes="50vw" style={{ objectFit: "cover" }} />
    </div>
  );
}

// ── Note card — text printed directly onto the dress image ────────────────────
// Single element: dress photo fills the card, text overlaid on bottom via
// a warm gradient. No separate paper panel below the image.
function NoteCard({
  dressImg,
  layer,
  subtitle,
  body,
}: {
  dressImg: string;
  layer: string;
  subtitle?: string;
  body: string;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "4%",
        bottom: "10%",
        width: "clamp(180px, 19vw, 340px)",
        transform: "rotate(-11.5deg)",
        transformOrigin: "top left",
        zIndex: 6,
        userSelect: "none",
      }}
    >
      {/* The dress image IS the card */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "334/320",
          overflow: "hidden",
        }}
      >
        <Image src={dressImg} alt="" fill sizes="22vw" style={{ objectFit: "contain" }} />

        {/* Text block — shifted right and down, padded to wrap inside card */}
        <div
          style={{
            position: "absolute",
            bottom: "24%",
            left: 0,
            right: 0,
            padding: "0 22px 0 28px",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-courier)",
              fontSize: "clamp(13px, 1.1vw, 18px)",
              color: "#181818",
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            <strong>{layer}</strong>
            {subtitle && (
              <>
                <br />
                <em style={{ fontSize: "0.88em", color: "#3a2010" }}>{subtitle}</em>
              </>
            )}
            <br />
            {body}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Hand-drawn investigation circle (perturbed cubic Bézier, matches S05) ────
// pathLength="1" normalises dashoffset to 0–1 regardless of path geometry.
function makeHandCirclePath(cx: number, cy: number, rx: number, ry: number): string {
  const kx = rx * 0.5523;
  const ky = ry * 0.5523;
  return [
    `M ${cx + rx - 4} ${cy - 7}`,
    `C ${cx + rx + 5} ${cy - ky - 9} ${cx + kx + 8} ${cy - ry - 6} ${cx + 5} ${cy - ry - 8}`,
    `C ${cx - kx - 7} ${cy - ry - 4} ${cx - rx - 8} ${cy - ky + 6} ${cx - rx - 10} ${cy + 7}`,
    `C ${cx - rx - 4} ${cy + ky + 10} ${cx - kx + 6} ${cy + ry + 7} ${cx - 6} ${cy + ry + 6}`,
    `C ${cx + kx + 5} ${cy + ry + 3} ${cx + rx + 7} ${cy + ky - 5} ${cx + rx + 10} ${cy - 5}`,
  ].join(" ");
}

// ── Gold dot separator ────────────────────────────────────────────────────────
function GoldDot() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: 5,
        height: 5,
        borderRadius: "50%",
        background: "#bd9969",
        flexShrink: 0,
        alignSelf: "center",
      }}
    />
  );
}

// ── Flash reflection canvas — soft radial light bursts, no geometric shapes ───
// Each "flare" is a radial gradient circle drawn with mix-blend-mode screen so
// it adds light to the 3D render. The effect reads as flash reflecting off textile:
// warm/cool photographic hotspots that bloom outward from the dress surface.
function SparkleCanvas({ mode }: { mode: "subtle" | "intense" }) {
  const cvRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const p = cv.parentElement;
      if (!p || p.clientWidth === 0) return;
      cv.width  = p.clientWidth;
      cv.height = p.clientHeight;
    };
    const ro = new ResizeObserver(resize);
    if (cv.parentElement) ro.observe(cv.parentElement);
    resize();

    // Box-Muller Gaussian clamped to [lo, hi]
    const gauss = (mean: number, std: number, lo = 0.06, hi = 0.94) => {
      const z = Math.sqrt(-2 * Math.log(Math.max(1e-9, Math.random()))) *
                Math.cos(2 * Math.PI * Math.random());
      return Math.max(lo, Math.min(hi, mean + z * std));
    };

    type Flare = {
      xr: number;    // x as fraction of canvas width
      yr: number;    // y as fraction of canvas height
      rad: number;   // radius in px
      phase: number; // 0 = dead → 1 = peak
      decay: number;
      warm: boolean; // warm-white vs cool-white
    };

    const pool: Flare[] = [];

    const spawn = (): Flare => ({
      xr:  gauss(0.50, mode === "subtle" ? 0.14 : 0.15),
      yr:  gauss(0.44, mode === "subtle" ? 0.25 : 0.27),
      rad: mode === "subtle"
        ? 20 + Math.random() * 60
        : 35 + Math.random() * 130,
      phase: 1.0,
      decay: mode === "subtle"
        ? 0.88 + Math.random() * 0.05
        : 0.88 + Math.random() * 0.06,
      warm: Math.random() > 0.38,
    });

    // Pure radial gradient — no lines, no shapes, just soft circular light bleed
    const drawFlare = (x: number, y: number, rad: number, alpha: number, warm: boolean) => {
      if (alpha < 0.008) return;
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const grd = ctx.createRadialGradient(x, y, 0, x, y, rad);
      if (warm) {
        grd.addColorStop(0,    `rgba(255,255,235,${alpha.toFixed(3)})`);
        grd.addColorStop(0.28, `rgba(255,252,210,${(alpha * 0.70).toFixed(3)})`);
        grd.addColorStop(0.65, `rgba(255,246,180,${(alpha * 0.22).toFixed(3)})`);
        grd.addColorStop(1,    "rgba(255,244,160,0)");
      } else {
        grd.addColorStop(0,    `rgba(255,255,255,${alpha.toFixed(3)})`);
        grd.addColorStop(0.28, `rgba(248,252,255,${(alpha * 0.66).toFixed(3)})`);
        grd.addColorStop(0.65, `rgba(228,242,255,${(alpha * 0.20).toFixed(3)})`);
        grd.addColorStop(1,    "rgba(210,236,255,0)");
      }
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const MAX_POOL = mode === "subtle" ? 30 : 70;
    const SPAWN_MS = mode === "subtle" ? 80 : 20;

    let nextSpawn = Date.now();
    let rafId = 0;
    let alive = true;

    const tick = () => {
      if (!alive) return;
      rafId = requestAnimationFrame(tick);
      const now = Date.now();
      const w   = cv.width;
      const h   = cv.height;
      if (w === 0 || h === 0) return;

      while (pool.length < MAX_POOL && now >= nextSpawn) {
        pool.push(spawn());
        nextSpawn = now + SPAWN_MS + Math.random() * SPAWN_MS * 0.8;
      }

      ctx.clearRect(0, 0, w, h);

      // Intense: large persistent bloom centred on the dress — fabric core never
      // fully dims between individual flares; two overlapping pulses keep it alive
      if (mode === "intense") {
        const t  = now / 1000;
        const pb = 0.09 + Math.sin(t * 1.85) * 0.052 + Math.sin(t * 3.20) * 0.030;
        const cx = w * 0.50;
        const cy = h * 0.43;
        const blm = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.32);
        blm.addColorStop(0,    `rgba(255,255,245,${pb.toFixed(3)})`);
        blm.addColorStop(0.40, `rgba(255,252,230,${(pb * 0.46).toFixed(3)})`);
        blm.addColorStop(0.80, `rgba(255,248,205,${(pb * 0.13).toFixed(3)})`);
        blm.addColorStop(1,    "rgba(255,244,170,0)");
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = blm;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      for (let i = pool.length - 1; i >= 0; i--) {
        const f = pool[i];
        f.phase *= f.decay;
        if (f.phase < 0.008) { pool.splice(i, 1); continue; }
        drawFlare(f.xr * w, f.yr * h, f.rad, f.phase, f.warm);
      }
    };
    tick();

    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [mode]);

  return (
    <canvas
      ref={cvRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
        pointerEvents: "none",
        zIndex: 3,
      }}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function S11DressSection() {
  const sectionRef = useRef<HTMLElement>(null);

  // State layer refs
  const s1Ref = useRef<HTMLDivElement>(null);
  const s2Ref = useRef<HTMLDivElement>(null);
  const s3Ref = useRef<HTMLDivElement>(null);
  const s4Ref = useRef<HTMLDivElement>(null);

  // Content wrapper — blur/scale applied here for the blur-entry transition
  const contentRef = useRef<HTMLDivElement>(null);

  // 3D canvas refs — one per model (A=3d1, B=3d2, C=3d3)
  const wrapARef   = useRef<HTMLDivElement>(null);
  const wrapBRef   = useRef<HTMLDivElement>(null);
  const wrapCRef   = useRef<HTMLDivElement>(null);
  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);
  const canvasCRef = useRef<HTMLCanvasElement>(null);

  // Exit overlay ref
  const exitRef = useRef<HTMLDivElement>(null);

  // State 4 typewriter + blur refs
  const text1Ref      = useRef<HTMLParagraphElement>(null);
  const text2Ref      = useRef<HTMLSpanElement>(null);
  const goneRef       = useRef<HTMLSpanElement>(null);
  const goldLineRef   = useRef<HTMLDivElement>(null);
  const flashSpanRef  = useRef<HTMLSpanElement>(null);
  const circlePathRef = useRef<SVGPathElement>(null);

  // ── Mount 3D viewers ──────────────────────────────────────────────────────
  useEffect(() => {
    let cleanA: (() => void) | null = null;
    let cleanB: (() => void) | null = null;
    let cleanC: (() => void) | null = null;
    let alive = true;

    if (canvasARef.current)
      mountViewer(canvasARef.current, "/assets/dress/3d1.glb", "standard").then((fn) => {
        if (alive) cleanA = fn; else fn();
      });
    if (canvasBRef.current)
      mountViewer(canvasBRef.current, "/assets/dress/3d2.glb", "subtle").then((fn) => {
        if (alive) cleanB = fn; else fn();
      });
    if (canvasCRef.current)
      mountViewer(canvasCRef.current, "/assets/dress/3d3.glb", "intense").then((fn) => {
        if (alive) cleanC = fn; else fn();
      });

    return () => {
      alive = false;
      cleanA?.();
      cleanB?.();
      cleanC?.();
    };
  }, []);

  // ── Scroll-driven transitions ─────────────────────────────────────────────
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    // ── State 4 text ──────────────────────────────────────────────────────────
    // Line breaks match user spec exactly:
    //   line 1: "The coats were never only coats."
    //   line 2: "Beneath the silk, the shimmer, and the perfect"
    //   line 3: "silhouette, Maison Obscura built"
    //   line 4: "a system of disappearance."
    const TW1_TEXT =
      "The coats were never only coats.\nBeneath the silk, the shimmer, and the perfect\nsilhouette, Maison Obscura built\na system of disappearance.";
    // "Maison Obscura" occupies chars 92–105 (0-indexed, exclusive upper bound)
    const MO_START = 92;
    const MO_END   = 106;

    const TW2_PREFIX = "And suddenly, the woman was ";
    const TW2_SUFFIX = "gone.";
    const TW2_FULL   = TW2_PREFIX + TW2_SUFFIX;

    // ── State 4 scroll phases (p = 0.74 → 0.94) ──────────────────────────────
    const TW1_END     = 0.820;   // para 1 fully typed
    const MO_GLOW_S   = 0.800;   // "Maison Obscura" glow ramps up
    const MO_GLOW_PK  = 0.814;   // glow peak
    const MO_GLOW_E   = 0.850;   // glow settles to ambient
    const GOLD_IN_S   = 0.820;   // gold line fades in
    const GOLD_IN_E   = 0.842;
    const TW2_START   = 0.842;   // white sentence starts typing
    const TW2_END     = 0.905;
    const CIRC_S      = 0.905;   // red circle starts drawing
    const CIRC_E      = 0.930;   // circle complete
    const BL_START    = 0.930;   // "gone" + dress blur
    const BL_END      = 0.943;

    // Build innerHTML for para 1 — wraps "Maison Obscura" in a glow span when typed
    const buildPara1 = (chars: number, moGlow: number): string => {
      const visible = TW1_TEXT.slice(0, chars);
      if (chars <= MO_START) return visible.replace(/\n/g, "<br>");
      const before  = TW1_TEXT.slice(0, MO_START).replace(/\n/g, "<br>");
      const moSlice = TW1_TEXT.slice(MO_START, Math.min(chars, MO_END));
      const after   = chars > MO_END ? TW1_TEXT.slice(MO_END, chars).replace(/\n/g, "<br>") : "";
      const shadow  = moGlow > 0.01
        ? `color:#e8c87a;text-shadow:0 0 ${(moGlow*14).toFixed(1)}px rgba(205,175,100,${(moGlow*0.85).toFixed(2)}),0 0 ${(moGlow*28).toFixed(1)}px rgba(189,153,105,${(moGlow*0.45).toFixed(2)})`
        : "color:#bd9969";
      return `${before}<span style="${shadow}">${moSlice}</span>${after}`;
    };

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: 1.4,
        invalidateOnRefresh: true,
        onUpdate: ({ progress: p }) => {
          // ── Blur entry ────────────────────────────────────────────────────
          if (contentRef.current) {
            const t     = lerp01(p, 0, P.BLUR_CLEAR);
            const blur  = (1 - t) * 14;
            const scale = 1 - (1 - t) * 0.025;
            contentRef.current.style.filter    = blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : "";
            contentRef.current.style.transform = `scale(${scale.toFixed(4)})`;
          }

          // ── State layers ──────────────────────────────────────────────────
          if (s1Ref.current)
            s1Ref.current.style.opacity = String(1 - lerp01(p, P.S1_OUT, P.S1_GONE));
          if (s2Ref.current)
            s2Ref.current.style.opacity = String(
              lerp01(p, P.S1_OUT, P.S1_GONE) * (1 - lerp01(p, P.S2_OUT, P.S2_GONE)),
            );
          if (s3Ref.current)
            s3Ref.current.style.opacity = String(
              lerp01(p, P.S2_OUT, P.S2_GONE) * (1 - lerp01(p, P.S3_OUT, P.S3_GONE)),
            );
          if (s4Ref.current)
            s4Ref.current.style.opacity = String(lerp01(p, P.S3_OUT, P.S3_GONE));

          // ── 3D canvas wrappers ────────────────────────────────────────────
          if (wrapARef.current)
            wrapARef.current.style.opacity = String(1 - lerp01(p, P.S1_OUT, P.S1_GONE));
          if (wrapBRef.current)
            wrapBRef.current.style.opacity = String(
              lerp01(p, P.S1_OUT, P.S1_GONE) * (1 - lerp01(p, P.S2_OUT, P.S2_GONE)),
            );
          if (wrapCRef.current) {
            const fadeIn  = lerp01(p, P.S2_OUT, P.S2_GONE);
            const fadeOut = lerp01(p, P.EXIT_START, 1.0);
            const dim     = 1 - lerp01(p, P.S3_GONE, P.EXIT_START) * 0.45;
            const blurT   = lerp01(p, BL_START, BL_END);
            wrapCRef.current.style.opacity = String(fadeIn * (1 - fadeOut) * dim * (1 - blurT));
            wrapCRef.current.style.filter  = blurT > 0.01 ? `blur(${(blurT * 32).toFixed(1)}px)` : "";
          }

          // ── Para 1 typewriter + Maison Obscura glow ───────────────────────
          if (text1Ref.current) {
            const chars     = Math.round(lerp01(p, P.S3_GONE, TW1_END) * TW1_TEXT.length);
            const moGlowIn  = lerp01(p, MO_GLOW_S, MO_GLOW_PK);
            const moGlowOut = lerp01(p, MO_GLOW_E, BL_START) * 0.7;
            const moGlow    = moGlowIn * (1 - moGlowOut);
            text1Ref.current.innerHTML = buildPara1(chars, moGlow);
          }

          // ── Gold line fade-in ─────────────────────────────────────────────
          if (goldLineRef.current)
            goldLineRef.current.style.opacity = String(lerp01(p, GOLD_IN_S, GOLD_IN_E) * 0.82);

          // ── "flash" shimmer — peaks as gold line reaches full opacity ─────
          if (flashSpanRef.current) {
            const sIn  = lerp01(p, GOLD_IN_S + 0.005, GOLD_IN_E);
            const sOut = lerp01(p, GOLD_IN_E, GOLD_IN_E + 0.025);
            const sh   = sIn * (1 - sOut);
            flashSpanRef.current.style.textShadow = sh > 0.01
              ? `0 0 ${(sh*14).toFixed(1)}px rgba(230,200,120,${(sh*0.9).toFixed(2)}),0 0 ${(sh*28).toFixed(1)}px rgba(189,153,105,${(sh*0.5).toFixed(2)})`
              : "";
          }

          // ── White sentence typewriter ─────────────────────────────────────
          if (text2Ref.current) {
            const chars = Math.round(lerp01(p, TW2_START, TW2_END) * TW2_FULL.length);
            text2Ref.current.textContent = TW2_PREFIX.slice(0, Math.min(chars, TW2_PREFIX.length));
          }

          // ── "gone." typewriter + blur ─────────────────────────────────────
          if (goneRef.current) {
            const chars    = Math.round(lerp01(p, TW2_START, TW2_END) * TW2_FULL.length);
            const goneShow = Math.max(0, chars - TW2_PREFIX.length);
            goneRef.current.textContent = TW2_SUFFIX.slice(0, goneShow);
            const blurT = lerp01(p, BL_START, BL_END);
            goneRef.current.style.filter  = blurT > 0.01 ? `blur(${(blurT * 20).toFixed(1)}px)` : "";
            goneRef.current.style.opacity = blurT > 0.01 ? String(Math.max(0, 1 - blurT)) : "";
          }

          // ── Red investigation circle — draws around the full sentence ─────
          if (circlePathRef.current) {
            const circT = lerp01(p, CIRC_S, CIRC_E);
            circlePathRef.current.style.strokeDashoffset = String(1 - circT);
            circlePathRef.current.style.opacity = circT > 0.01 ? "1" : "0";
          }

          // ── Exit overlay ──────────────────────────────────────────────────
          if (exitRef.current)
            exitRef.current.style.opacity = String(lerp01(p, P.EXIT_START, 1));
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  // Shared canvas wrapper — large portrait frame, centered
  const canvasWrap: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -52%)",
    width: "clamp(300px, 46vw, 840px)",
    height: "clamp(380px, 88vh, 960px)",
    zIndex: 5,
    pointerEvents: "none",
    opacity: 0,
  };

  return (
    <section
      ref={sectionRef}
      aria-label="S11 Dress — The Collection"
      style={{ position: "relative", height: "600vh", background: "#181818" }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          width: "100%",
          overflow: "hidden",
          background: "#181818",
        }}
      >
        {/* ── Content wrapper — blur/scale applied for blur-entry transition ── */}
        <div
          ref={contentRef}
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: "center center",
          }}
        >
          {/* ════════════════════════════════════════════════════════════════
              STATE 1 — Layer 1: The Fabric   (3d1.glb)
          ════════════════════════════════════════════════════════════════ */}
          <div ref={s1Ref} style={{ position: "absolute", inset: 0, zIndex: 2 }}>
            <Photo
              src="/assets/dress/dress4.png"
              rounded
              style={{ left: "5.8%", top: "9.9%", width: "44.2%", height: "52.2%" }}
            />
            <Photo
              src="/assets/dress/dress5.png"
              style={{ left: "50%", top: "36.9%", width: "44.3%", height: "60.6%" }}
            />
            <NoteCard
              dressImg="/assets/dress/dress1.png"
              layer="layer 1"
              body="At first glance, the fabric looked like a classic 1950s textile — elegant, structured, and refined."
            />
          </div>

          {/* ════════════════════════════════════════════════════════════════
              STATE 2 — Layer 2: Reflective Core   (3d2.glb)
          ════════════════════════════════════════════════════════════════ */}
          <div ref={s2Ref} style={{ position: "absolute", inset: 0, zIndex: 2, opacity: 0 }}>
            <Photo
              src="/assets/dress/dress6.png"
              style={{ left: "5.9%", top: "7.7%", width: "47.2%", height: "63%" }}
            />
            <Photo
              src="/assets/dress/dress7.png"
              style={{ left: "50%", top: "39.2%", width: "44.3%", height: "49.2%" }}
            />
            <NoteCard
              dressImg="/assets/dress/dress2.png"
              layer="layer 2"
              subtitle="Reflective Core"
              body="Hidden threads catch the camera flash and scatter the light."
            />
          </div>

          {/* ════════════════════════════════════════════════════════════════
              STATE 3 — Layer 3: Inner Lining   (3d3.glb)
          ════════════════════════════════════════════════════════════════ */}
          <div ref={s3Ref} style={{ position: "absolute", inset: 0, zIndex: 2, opacity: 0 }}>
            <Photo
              src="/assets/dress/dress8.png"
              style={{ left: "5%", top: "5%", width: "42%", height: "50%" }}
            />
            <Photo
              src="/assets/dress/dress9.png"
              style={{ left: "50%", top: "32.8%", width: "45.2%", height: "60.2%" }}
            />
            <NoteCard
              dressImg="/assets/dress/dress3.png"
              layer="layer 3"
              subtitle="Inner Lining"
              body="A dark lining absorbs the body's outline, leaving only the flare behind."
            />
          </div>

          {/* ════════════════════════════════════════════════════════════════
              STATE 4 — The Reveal   (3d3.glb, text above canvas at zIndex 10)
          ════════════════════════════════════════════════════════════════ */}
          <div ref={s4Ref} style={{ position: "absolute", inset: 0, zIndex: 10, opacity: 0 }}>

            {/* Left paragraph — types in first */}
            <p
              ref={text1Ref}
              className="cinematic-text"
              style={{
                position: "absolute",
                left: "6.5%",
                top: "11%",
                width: "clamp(200px, 34vw, 580px)",
                color: "#bd9969",
                opacity: 0.88,
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            />

            {/* Gold line — "Three layers · One body · One flash" — lower right */}
            <div
              ref={goldLineRef}
              style={{
                position: "absolute",
                right: "6%",
                bottom: "23%",
                display: "flex",
                alignItems: "center",
                gap: "clamp(8px, 1.4vw, 26px)",
                opacity: 0,
              }}
            >
              {(["Three layers", "One body"] as const).map((label, i) => (
                <span key={label} style={{ display: "contents" }}>
                  {i > 0 && <GoldDot />}
                  <span
                    className="cinematic-text"
                    style={{
                      color: "#bd9969",
                      letterSpacing: "-0.01em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </span>
                </span>
              ))}
              <GoldDot />
              <span
                ref={flashSpanRef}
                className="cinematic-text"
                style={{
                  color: "#bd9969",
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                }}
              >
                One flash
              </span>
            </div>

            {/* White sentence — lower right, below gold line.
                The investigation circle SVG is absolutely positioned inside. */}
            <div
              style={{
                position: "absolute",
                right: "6%",
                bottom: "8%",
              }}
            >
              <div
                className="cinematic-text"
                style={{
                  position: "relative",
                  color: "#ffffff",
                  opacity: 0.9,
                  letterSpacing: "-0.02em",
                  whiteSpace: "nowrap",
                  textAlign: "right",
                }}
              >
                <span ref={text2Ref} />
                <span ref={goneRef} />

                {/* Hand-drawn red investigation circle — same approach as S05Transition.
                    pathLength="1" → dashoffset 1→0 in onUpdate. */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 400 50"
                  overflow="visible"
                  style={{
                    position: "absolute",
                    top: "-14px",
                    left: "-16px",
                    width: "calc(100% + 32px)",
                    height: "calc(100% + 28px)",
                    pointerEvents: "none",
                  }}
                >
                  <path
                    ref={circlePathRef}
                    pathLength="1"
                    d={makeHandCirclePath(200, 25, 185, 18)}
                    stroke="#7A1A1A"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    style={{
                      strokeDasharray: "1",
                      strokeDashoffset: "1",
                      opacity: 0,
                    }}
                  />
                </svg>
              </div>
            </div>

          </div>

          {/* ── Canvas A — 3d1.glb (state 1) ─────────────────────────────── */}
          <div ref={wrapARef} style={canvasWrap}>
            <canvas ref={canvasARef} style={{ width: "100%", height: "100%", display: "block" }} />
          </div>

          {/* ── Canvas B — 3d2.glb (state 2) ─────────────────────────────── */}
          <div ref={wrapBRef} style={{ ...canvasWrap, opacity: 0 }}>
            <canvas ref={canvasBRef} style={{ width: "100%", height: "100%", display: "block" }} />
            <SparkleCanvas mode="subtle" />
          </div>

          {/* ── Canvas C — 3d3.glb (states 3 + 4) ───────────────────────── */}
          <div ref={wrapCRef} style={{ ...canvasWrap, opacity: 0 }}>
            <canvas ref={canvasCRef} style={{ width: "100%", height: "100%", display: "block" }} />
            <SparkleCanvas mode="intense" />
          </div>

          {/* Film grain */}
          <div aria-hidden="true" className="mo-archival-grain" style={{ zIndex: 8 }} />

          {/* Vignette */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 9,
              pointerEvents: "none",
              background:
                "radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.5) 100%)",
            }}
          />
        </div>

        {/* ── Exit overlay — sits outside contentRef so it stays sharp ─────── */}
        <div
          ref={exitRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            background: "#181818",
            opacity: 0,
            pointerEvents: "none",
          }}
        />
      </div>
    </section>
  );
}
