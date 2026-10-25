/* Melissa, the bee from Ephesian coins. Appears in every act and hovers beside the lamp.
   Body and wings are Higgsfield cut-outs; the wings flap about their rivets. A code-drawn bee is the fallback. */
import { Ctx, RM, TAU, W, assetUrl, lamp, stage } from './core';
import { loadImage } from './layers';
import { dot } from './paper';

export const bee = { on: false, x: 0, y: 0, vx: 0, vy: 0, sc: 1, face: 1, hold: 0 };

export function updateBee(dt: number) {
  if (!bee.on) return;
  const T = stage.T;
  bee.sc += (1 - bee.sc) * Math.min(1, dt * 2.2);
  if (bee.hold > 0) {
    bee.hold -= dt;
    bee.y -= dt * 18;
    return;
  }
  const side = lamp.x > W * 0.7 ? -1 : 1;
  const tx = lamp.x + side * 95;
  const ty = lamp.y - 80 + Math.sin(T * 2.1) * 14;
  bee.vx += (tx - bee.x) * dt * 5;
  bee.vy += (ty - bee.y) * dt * 5;
  bee.vx *= Math.pow(0.04, dt);
  bee.vy *= Math.pow(0.04, dt);
  bee.x += bee.vx * dt * 2.2;
  bee.y += bee.vy * dt * 2.2;
  if (Math.abs(bee.vx) > 8) bee.face = bee.vx > 0 ? 1 : -1;
}

/* ---------- Higgsfield parts ---------- */
interface PartMeta {
  file: string;
  w: number;
  h: number;
  pivot?: [number, number];
  tip?: [number, number];
  root?: [number, number];
  center?: [number, number];
}
interface Wing {
  img: HTMLImageElement;
  m: PartMeta;
  /** Rotation that makes the wing’s own axis (pivot → tip) point straight up. */
  up: number;
}
let parts: { body: HTMLImageElement; bm: PartMeta; wingF: Wing; wingH: Wing } | null = null;
/** Bee height in world units (at scale 1). */
const BEE_H = 92;

export function useMelissaImages() {
  fetch(assetUrl('characters/melissa/parts.json'))
    .then((r) => r.json() as Promise<Record<string, PartMeta>>)
    .then(async (meta) => {
      const [body, f, h] = await Promise.all([loadImage(meta.body.file), loadImage(meta.wingF.file), loadImage(meta.wingH.file)]);
      const wing = (img: HTMLImageElement, m: PartMeta): Wing => ({ img, m, up: -Math.PI / 2 - Math.atan2(m.tip![1] - m.pivot![1], m.tip![0] - m.pivot![0]) });
      parts = { body, bm: meta.body, wingF: wing(f, meta.wingF), wingH: wing(h, meta.wingH) };
    })
    .catch((e) => console.warn('Melissa images not loaded, keeping drawn bee', e));
}

function drawWing(g: Ctx, w: Wing, root: [number, number], angle: number) {
  g.save();
  g.translate(root[0], root[1]);
  g.rotate(angle);
  g.rotate(w.up);
  g.drawImage(w.img, -w.m.pivot![0], -w.m.pivot![1], w.m.w, w.m.h);
  g.restore();
}

function drawImageBee(g: Ctx, p: NonNullable<typeof parts>, x: number, y: number, sc: number, face: number) {
  const T = stage.T;
  const S = BEE_H / p.bm.h;
  const c = p.bm.center!;
  const root: [number, number] = [p.bm.root![0] - c[0], p.bm.root![1] - c[1]];
  g.save();
  g.imageSmoothingQuality = 'high';
  g.translate(x, y);
  g.scale(sc * face * S, sc * S);
  const flap = RM ? 0 : Math.sin(T * 38);
  // wings sit behind the body and sweep back and up; the hindwing beats a little out of step
  drawWing(g, p.wingH, root, -0.95 + flap * 0.28);
  drawWing(g, p.wingF, root, -0.55 + flap * 0.38);
  g.drawImage(p.body, -c[0], -c[1], p.bm.w, p.bm.h);
  g.restore();
}

export function drawBee(g: Ctx, x: number, y: number, sc: number, face: number) {
  if (parts) return drawImageBee(g, parts, x, y, sc, face);
  const T = stage.T;
  g.save();
  g.translate(x, y);
  g.scale(sc * face, sc);
  const flap = RM ? 0 : Math.sin(T * 40) * 0.5;
  for (const [ang, dx] of [
    [-0.55 + flap, -4],
    [-1.05 + flap * 0.8, 7],
  ]) {
    g.save();
    g.translate(dx, -10);
    g.rotate(ang);
    g.fillStyle = 'rgba(232,244,255,.72)';
    g.strokeStyle = 'rgba(255,255,255,.95)';
    g.lineWidth = 1.4;
    g.beginPath();
    g.ellipse(0, -20, 11, 22, 0, 0, TAU);
    g.fill();
    g.stroke();
    g.restore();
  }
  g.save();
  g.beginPath();
  g.ellipse(0, 0, 26, 17, 0, 0, TAU);
  g.fillStyle = '#f0b43c';
  g.fill();
  g.clip();
  g.fillStyle = '#2b2659';
  for (const sx of [-15, -3, 9]) g.fillRect(sx, -20, 6, 40);
  g.restore();
  g.fillStyle = '#2b2659';
  dot(g, 28, -2, 12);
  g.restore();
}
