/* Layer renderer. A layer is either code-drawn (cut-paper in canvas) or an image (WebP with alpha),
   and carries its own parallax depth `d` (0 = far / still, ~1 = near / moves most). */
import { Ctx, H, W, assetUrl, clamp, par, stage } from './core';
import { grain } from './paper';

export interface LayerBase {
  /** Parallax depth. Layers with d > 0.04 also cast a soft shadow on the layer behind. */
  d: number;
  /** Shadow opacity (default .5) and colour. */
  shA?: number;
  shCol?: string;
  /** Rim light colour for code-drawn layers. */
  rim?: string;
  /** Baked once per build, in world coordinates (e.g. glowing perforations). */
  glow?: (g: Ctx) => void;
}

export interface DrawnLayer extends LayerBase {
  draw: (g: Ctx) => void;
}

export interface ImageLayer extends LayerBase {
  /** Path under public/assets/ (e.g. "efes/liman-mid.webp"), or a data:/blob: URL. */
  image: string;
  /** World rectangle [x, y, w, h]. Default: full height, centred on the 1600-wide frame, aspect kept. */
  rect?: [number, number, number, number];
}

export type LayerSpec = DrawnLayer | ImageLayer;

/** A layer plus its runtime state. */
export type Layer = LayerSpec & {
  c?: HTMLCanvasElement | HTMLImageElement | null;
  /** World rectangle `c` is drawn into. */
  at?: [number, number, number, number];
  sh?: HTMLCanvasElement | null;
  /** Soft continuation of an image layer below the 900-unit frame, for viewports taller than 16:9. */
  ext?: HTMLCanvasElement | null;
  /** World height `ext` is drawn at, and where it starts: [x, y, w]. */
  extH?: number;
  extAt?: [number, number, number];
  gen?: number;
};

const isImage = (L: LayerSpec): L is ImageLayer => 'image' in L;

/* ---------- images ---------- */
const imgCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(path: string): Promise<HTMLImageElement> {
  let p = imgCache.get(path);
  if (!p) {
    const img = new Image();
    img.decoding = 'async';
    img.src = /^(data|blob|https?):/.test(path) ? path : assetUrl(path);
    p = img.decode().then(() => img);
    imgCache.set(path, p);
  }
  return p;
}

/** Warm the cache for the next scene. Failures are ignored here and surface when the layer builds. */
export function prefetch(paths: string[]) {
  for (const p of paths) loadImage(p).catch(() => imgCache.delete(p));
}

/* ---------- building ---------- */
const SHADOW_SCALE = 1 / 7;

function shadowCanvas(L: LayerSpec, drawSource: (g: Ctx, k: number) => void): HTMLCanvasElement {
  const { Mx, My, q } = stage;
  const sh = document.createElement('canvas');
  sh.width = Math.max(2, Math.ceil((W + 2 * Mx) * q * SHADOW_SCALE));
  sh.height = Math.max(2, Math.ceil((H + 2 * My) * q * SHADOW_SCALE));
  const sg = sh.getContext('2d')!;
  drawSource(sg, SHADOW_SCALE);
  sg.setTransform(1, 0, 0, 1, 0, 0);
  sg.globalCompositeOperation = 'source-in';
  sg.fillStyle = L.shCol || '#0a0620';
  sg.fillRect(0, 0, sh.width, sh.height);
  return sh;
}

function newLayerCanvas(): HTMLCanvasElement {
  const { Mx, My, q } = stage;
  const c = document.createElement('canvas');
  c.width = Math.ceil((W + 2 * Mx) * q);
  c.height = Math.ceil((H + 2 * My) * q);
  return c;
}

function buildDrawn(L: Layer & DrawnLayer) {
  const { Mx, My, q } = stage;
  const c = newLayerCanvas();
  const g = c.getContext('2d')!;
  g.setTransform(q, 0, 0, q, Mx * q, My * q);
  L.draw(g);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = g.createPattern(grain, 'repeat')!;
  g.fillRect(0, 0, c.width, c.height);
  const gr = g.createLinearGradient(0, 0, 0, c.height);
  gr.addColorStop(0, 'rgba(255,236,200,.10)');
  gr.addColorStop(1, 'rgba(10,0,30,.16)');
  g.fillStyle = gr;
  g.fillRect(0, 0, c.width, c.height);
  {
    const rim = document.createElement('canvas');
    rim.width = c.width;
    rim.height = c.height;
    const rg = rim.getContext('2d')!;
    rg.drawImage(c, 0, 0);
    rg.globalCompositeOperation = 'source-in';
    rg.fillStyle = L.rim || 'rgba(255,212,160,.6)';
    rg.fillRect(0, 0, rim.width, rim.height);
    rg.globalCompositeOperation = 'destination-out';
    rg.drawImage(c, 0, Math.max(1.5, 2.4 * q));
    g.drawImage(rim, 0, 0);
    rim.width = rim.height = 0;
  }
  g.globalCompositeOperation = 'source-over';
  if (L.glow) {
    g.setTransform(q, 0, 0, q, Mx * q, My * q);
    L.glow(g);
  }
  L.c = c;
  L.at = [-Mx, -My, W + 2 * Mx, H + 2 * My];
  L.sh = shadowCanvas(L, (sg) => sg.drawImage(c, 0, 0, Math.ceil(c.width * SHADOW_SCALE), Math.ceil(c.height * SHADOW_SCALE)));
}

/** Number of world units of the art's bottom edge that get mirrored into the extension. */
const MIRROR = 70;

/**
 * Continues an image layer downwards without smearing its last pixel row: a heavily blurred colour field made from
 * the bottom band (so there are no vertical streaks), with the band mirrored on top of it and fading out, plus the
 * same paper grain the drawn layers get.
 */
function bottomExtension(img: HTMLImageElement, rect: [number, number, number, number], extH: number): HTMLCanvasElement {
  const { q } = stage;
  const k = Math.min(q, 1);
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.ceil(rect[2] * k));
  c.height = Math.max(2, Math.ceil(extH * k));
  const g = c.getContext('2d')!;
  const unit = img.naturalHeight / rect[3];
  const band = Math.max(4, Math.round(MIRROR * unit));
  const srcY = img.naturalHeight - band;

  // colour field: bottom band averaged down to a tiny strip, then stretched (bilinear = smooth, no streaks)
  const mid = document.createElement('canvas');
  mid.width = 64;
  mid.height = 4;
  const mg = mid.getContext('2d')!;
  mg.imageSmoothingQuality = 'high';
  mg.drawImage(img, 0, srcY, img.naturalWidth, band, 0, 0, 64, 4);
  const tiny = document.createElement('canvas');
  tiny.width = 12;
  tiny.height = 1;
  const tg = tiny.getContext('2d')!;
  tg.imageSmoothingQuality = 'high';
  tg.drawImage(mid, 0, 0, 64, 4, 0, 0, 12, 1);
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(tiny, 0, 0, c.width, c.height);

  // mirrored band, fading out
  const mh = Math.min(c.height, Math.round(MIRROR * k));
  const m = document.createElement('canvas');
  m.width = c.width;
  m.height = mh;
  const mc = m.getContext('2d')!;
  mc.imageSmoothingQuality = 'high';
  mc.translate(0, mh);
  mc.scale(1, -1);
  mc.drawImage(img, 0, srcY, img.naturalWidth, band, 0, 0, c.width, mh);
  mc.setTransform(1, 0, 0, 1, 0, 0);
  mc.globalCompositeOperation = 'destination-in';
  const fade = mc.createLinearGradient(0, 0, 0, mh);
  fade.addColorStop(0, 'rgba(0,0,0,.9)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  mc.fillStyle = fade;
  mc.fillRect(0, 0, m.width, mh);
  g.drawImage(m, 0, 0);
  m.width = m.height = mid.width = mid.height = tiny.width = tiny.height = 0;

  // a little darker towards the bottom, then paper grain on top
  g.globalCompositeOperation = 'source-atop';
  const dark = g.createLinearGradient(0, 0, 0, c.height);
  dark.addColorStop(0, 'rgba(10,0,30,0)');
  dark.addColorStop(1, 'rgba(10,0,30,.3)');
  g.fillStyle = dark;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = g.createPattern(grain, 'repeat')!;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

async function buildImage(L: Layer & ImageLayer, gen: number) {
  const { Mx, My, q } = stage;
  const img = await loadImage(L.image);
  if (L.gen !== gen) return;
  const aspect = img.naturalWidth / img.naturalHeight;
  const rect = L.rect ?? ([W / 2 - (H * aspect) / 2, 0, H * aspect, H] as [number, number, number, number]);
  if (L.glow) {
    // Needs a canvas so the glow can be baked on top of the art.
    const c = newLayerCanvas();
    const g = c.getContext('2d')!;
    g.setTransform(q, 0, 0, q, Mx * q, My * q);
    g.drawImage(img, rect[0], rect[1], rect[2], rect[3]);
    L.glow(g);
    L.c = c;
    L.at = [-Mx, -My, W + 2 * Mx, H + 2 * My];
  } else {
    L.c = img;
    L.at = rect;
  }
  if (rect[1] + rect[3] >= H - 1) {
    L.ext = bottomExtension(img, rect, (L.extH = My + 90));
    L.extAt = [rect[0], rect[1] + rect[3], rect[2]];
  }
  if (L.d > 0.04) {
    L.sh = shadowCanvas(L, (sg, k) => {
      sg.setTransform(q * k, 0, 0, q * k, Mx * q * k, My * q * k);
      sg.drawImage(img, rect[0], rect[1], rect[2], rect[3]);
    });
  }
}

/** Builds (or rebuilds) a layer. Image layers resolve once the image has decoded. */
export function buildLayer(L: Layer): Promise<void> {
  const gen = (L.gen = (L.gen ?? 0) + 1);
  if (isImage(L)) return buildImage(L as Layer & ImageLayer, gen);
  buildDrawn(L as Layer & DrawnLayer);
  return Promise.resolve();
}

export function buildLayers(layers: Layer[]): Promise<void[]> {
  return Promise.all(layers.map(buildLayer));
}

export function freeLayers(layers: Layer[]) {
  for (const L of layers) {
    L.gen = (L.gen ?? 0) + 1;
    if (L.c instanceof HTMLCanvasElement) L.c.width = L.c.height = 0;
    if (L.sh) L.sh.width = L.sh.height = 0;
    if (L.ext) L.ext.width = L.ext.height = 0;
    L.ext = null;
    L.c = null;
    L.sh = null;
    L.at = undefined;
  }
}

/* ---------- drawing ---------- */
export function drawLayer(g: Ctx, L: Layer, light: { x: number; y: number }) {
  if (!L.c || !L.at) return;
  const { Mx, My } = stage;
  const o = par(L.d);
  if (L.d > 0.04 && L.sh) {
    const k = 0.45 + L.d;
    const sx = clamp((W * 0.5 - light.x) / W, -0.8, 0.8) * 34 * k;
    const sy = clamp((H * 0.42 - light.y) / H, -0.8, 0.8) * 26 * k + 7 * k;
    g.globalAlpha = L.shA ?? 0.5;
    g.imageSmoothingQuality = 'high';
    g.drawImage(L.sh, -Mx + o.x + sx, -My + o.y + sy, W + 2 * Mx, H + 2 * My);
    g.globalAlpha = 1;
  }
  g.drawImage(L.c, L.at[0] + o.x, L.at[1] + o.y, L.at[2], L.at[3]);
  if (L.ext && L.extH && L.extAt) g.drawImage(L.ext, L.extAt[0] + o.x, L.extAt[1] + o.y - 1, L.extAt[2], L.extH);
}

/** Paints a backdrop image to cover the whole visible world (sky). */
export function drawCover(g: Ctx, img: HTMLImageElement, d = 0.02) {
  const { Mx, My } = stage;
  const o = par(d);
  const vw = W + 2 * Mx;
  const vh = H + 2 * My;
  const k = Math.max(vw / img.naturalWidth, vh / img.naturalHeight);
  const w = img.naturalWidth * k;
  const h = img.naturalHeight * k;
  g.drawImage(img, W / 2 - w / 2 + o.x, H / 2 - h / 2 + o.y, w, h);
}
