/* Shared stage state, utilities and the lamp (pointer light). */

export const W = 1600;
export const H = 900;
export const TAU = Math.PI * 2;
export const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

export type Ctx = CanvasRenderingContext2D;

/** Viewport and timing state. `Mx`/`My` are the extra world margin visible beyond the 1600×900 frame. */
export const stage = {
  cv: document.getElementById('stage') as HTMLCanvasElement,
  ctx: null as unknown as Ctx,
  cw: 0,
  ch: 0,
  dpr: 1,
  s: 1,
  ox: 0,
  oy: 0,
  q: 1,
  Mx: 60,
  My: 60,
  T: 0,
};
stage.ctx = stage.cv.getContext('2d')!;

/** The light source. In the game it is the flame of the lamp in Deniz’s hand. */
export const lamp = {
  x: 800,
  y: 480,
  tx: 800,
  ty: 480,
  lock: null as { x: number; y: number } | null,
};

/** Parallax view offset, -1..1 on each axis, eased towards the lamp. */
export const view = { px: 0, py: 0 };

export function rng(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function nz(x: number, sd: number): number {
  return (
    (Math.sin(x + sd * 3.1) +
      0.55 * Math.sin(x * 2.31 + sd * 7.7) +
      0.3 * Math.sin(x * 4.73 + sd * 1.3) +
      0.15 * Math.sin(x * 9.1 + sd * 5.2)) /
    2
  );
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const sstep = (t: number) => t * t * (3 - 2 * t);
export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** How strongly the lamp lights a point (0..1, smooth). */
export function rv(x: number, y: number, r = 165): number {
  const d = Math.hypot(lamp.x - x, lamp.y - y);
  return sstep(clamp(1 - d / r, 0, 1));
}

/** Parallax offset for a layer of depth `d`. */
export function par(d: number) {
  return { x: -view.px * d * 22, y: -view.py * d * 11 };
}

export function withPar(g: Ctx, d: number, fn: () => void) {
  const o = par(d);
  g.save();
  g.translate(o.x, o.y);
  fn();
  g.restore();
}

export { assetUrl } from './url';
