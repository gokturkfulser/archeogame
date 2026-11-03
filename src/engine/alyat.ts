/* Alyat, the guide lion of Sardes. A jointed cut-paper puppet (head with mane, torso, tail, four legs) that walks beside
   Deniz along the ground line. Same idea as Kurunta; the parts are Higgsfield cut-outs written by scripts/process-assets.mjs.
   He is dignified: he walks with his head high, and his tail does the talking. */
import { Ctx, RM, TAU, W, assetUrl, clamp, lamp, stage } from './core';
import { loadImage } from './layers';
import { deniz } from './deniz';

export const lion = {
  on: false,
  x: 0,
  face: 1 as 1 | -1,
  speed: 0,
  phase: 0,
  /** 0..1 fade-in after appearing (the debut drives it by hand). */
  a: 0,
  /** Mane shimmer, 0..1: his gold flakes catch the light of the lit spot. */
  glow: 0.3,
  /** Brief head lift, set by `perk()`. */
  perk: 0,
  /** Extra x position (scenes can park him elsewhere). */
  park: null as number | null,
  /** The debut holds him still and fades him in on its own. */
  hold: false,
  /** Offset from the default spot beside Deniz; the puzzles that need him elsewhere set `park`. */
  gap: 350,
  /** Extra tail swish, 0..1 (happy / proud). */
  swish: 0,
};

interface PartMeta {
  file: string;
  w: number;
  h: number;
  pivot: [number, number];
  hipJ?: [number, number];
  shoulderJ?: [number, number];
  neck?: [number, number];
  tailJ?: [number, number];
  foot?: [number, number];
}
let skin: { meta: Record<string, PartMeta>; img: Record<string, HTMLImageElement> } | null = null;

/** Lion size relative to the 0.3-scaled parts: his mane tops out about 330 world units above the ground. */
const SC = 0.78;
const MAX_SPEED = 250;

export function useAlyatImages() {
  fetch(assetUrl('characters/alyat/parts.json'))
    .then((r) => r.json() as Promise<Record<string, PartMeta>>)
    .then(async (meta) => {
      const keys = Object.keys(meta);
      const imgs = await Promise.all(keys.map((k) => loadImage(meta[k].file)));
      skin = { meta, img: Object.fromEntries(keys.map((k, i) => [k, imgs[i]])) };
    })
    .catch((e) => console.warn('Alyat images not loaded', e));
}

export const alyatReady = () => skin !== null;

/** Makes him appear beside Deniz (scene start or the moment he arrives). */
export function placeLion(at?: number) {
  lion.on = true;
  side = deniz.face === 1 ? -1 : 1;
  pendingFace = deniz.face;
  faceTimer = 0;
  lion.x = at ?? deniz.x + side * lion.gap;
  lion.face = deniz.face;
  lion.speed = 0;
  lion.a = 0;
  lion.park = null;
  lion.hold = false;
}

export function hideLion() {
  lion.on = false;
}

export const perkLion = () => (lion.perk = 1);

let side: 1 | -1 = -1;
let pendingFace: 1 | -1 = 1;
let faceTimer = 0;

export function updateLion(dt: number) {
  if (!lion.on) return;
  const { Mx } = stage;
  if (!lion.hold) lion.a = Math.min(1, lion.a + dt * 1.6);
  lion.perk = Math.max(0, lion.perk - dt * 0.9);
  lion.swish = Math.max(0, lion.swish - dt * 0.5);
  if (lion.hold) {
    lion.speed = 0;
    return;
  }
  if (deniz.face !== pendingFace) {
    pendingFace = deniz.face;
    faceTimer = 0;
  } else faceTimer += dt;
  if (faceTimer > 1.6) side = pendingFace === 1 ? -1 : 1;
  let target = lion.park ?? deniz.x + side * lion.gap;
  if (lion.park === null) {
    if (target < 150 || target > W - 150) target = clamp(deniz.x - side * lion.gap, 150, W - 150);
  }
  target = clamp(target, -Mx + 80, W + Mx - 80);
  const dx = target - lion.x;
  const want = Math.abs(dx) < 8 ? 0 : clamp(dx * 1.6, -MAX_SPEED, MAX_SPEED);
  lion.speed += (want - lion.speed) * Math.min(1, dt * 3.5);
  if (want === 0 && Math.abs(lion.speed) < 5) lion.speed = 0;
  lion.x += lion.speed * dt;
  lion.phase += Math.abs(lion.speed) * dt * 0.045;
  // he faces the way he walks; standing still, he looks towards the lit spot
  if (Math.abs(lion.speed) > 30) lion.face = lion.speed > 0 ? 1 : -1;
  else if (Math.abs(lamp.x - lion.x) > 110) lion.face = lamp.x > lion.x ? 1 : -1;
}

function leg(g: Ctx, key: string, jx: number, jy: number, ang: number) {
  const m = skin!.meta[key];
  g.save();
  g.translate(jx, jy);
  g.rotate(ang);
  g.drawImage(skin!.img[key], -m.pivot[0], -m.pivot[1], m.w, m.h);
  g.restore();
}

let buf: HTMLCanvasElement | null = null;

/** The body, drawn in the scene right beside Deniz. While he fades in he is drawn as one piece into a buffer, so the
    overlapping parts do not show through each other. */
export function drawLion(g: Ctx, ground: number) {
  if (!lion.on || !skin || lion.a <= 0) return;
  if (lion.a >= 0.999) return body(g, ground);
  const cv = g.canvas;
  if (!buf) buf = document.createElement('canvas');
  if (buf.width !== cv.width || buf.height !== cv.height) {
    buf.width = cv.width;
    buf.height = cv.height;
  }
  const bg = buf.getContext('2d')!;
  bg.setTransform(1, 0, 0, 1, 0, 0);
  bg.clearRect(0, 0, buf.width, buf.height);
  bg.setTransform(g.getTransform());
  body(bg, ground);
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = lion.a;
  g.drawImage(buf, 0, 0);
  g.restore();
}

function body(g: Ctx, ground: number) {
  const { meta, img } = skin!;
  const T = stage.T;
  const t = meta.torso;
  const moving = Math.min(1, Math.abs(lion.speed) / 120);
  const sw = Math.sin(lion.phase);
  const swing = sw * 0.42 * moving;
  const bob = Math.abs(sw) * 3 * moving + (RM ? 0 : Math.sin(T * 1.4) * 1.0 * (1 - moving));
  const legLen = (meta.legF.foot![1] - meta.legF.pivot[1] + (meta.legH.foot![1] - meta.legH.pivot[1])) / 2;
  const hipDrop = t.pivot[1] - t.hipJ![1];
  const oy = -(legLen - hipDrop) - bob;

  g.save();
  g.imageSmoothingQuality = 'high';
  g.translate(lion.x, ground);
  g.fillStyle = 'rgba(10,6,28,.35)';
  g.beginPath();
  g.ellipse(0, 2, 190 * SC, 13 * SC, 0, 0, TAU);
  g.fill();
  const pop = 0.92 + 0.08 * lion.a;
  g.scale(lion.face * SC * pop, SC * pop);
  g.translate(0, oy);

  const hip: [number, number] = [t.hipJ![0] - t.pivot[0], t.hipJ![1] - t.pivot[1]];
  const sho: [number, number] = [t.shoulderJ![0] - t.pivot[0], t.shoulderJ![1] - t.pivot[1]];
  const tj: [number, number] = [t.tailJ![0] - t.pivot[0], t.tailJ![1] - t.pivot[1]];

  // the far legs and the tail sit behind the torso
  leg(g, 'legHBack', hip[0] - 8, hip[1], swing);
  leg(g, 'legFBack', sho[0] - 8, sho[1], -swing);
  const tail = meta.tail;
  const flick = RM ? 0 : Math.sin(T * 1.7) * 0.07 + Math.sin(T * 3.1) * 0.03 + lion.swish * Math.sin(T * 6) * 0.22 + moving * Math.sin(lion.phase * 2) * 0.1;
  g.save();
  g.translate(tj[0], tj[1]);
  g.rotate(-0.05 + flick);
  g.drawImage(img.tail, -tail.pivot[0], -tail.pivot[1], tail.w, tail.h);
  g.restore();
  // the near legs go under the torso too, so its big haunch and shoulder discs overlap them like one body
  leg(g, 'legH', hip[0], hip[1], -swing);
  leg(g, 'legF', sho[0], sho[1], swing);
  g.drawImage(img.torso, -t.pivot[0], -t.pivot[1], t.w, t.h);

  // head: carried high, nods a little, turns up towards the lit spot, lifts when he perks up
  const h = meta.head;
  const aimUp = clamp((460 - lamp.y) / 1100, -0.12, 0.16);
  const nod = RM ? 0 : Math.sin(T * 1.1) * 0.02 + moving * Math.sin(lion.phase * 2) * 0.025;
  g.save();
  g.translate(t.neck![0] - t.pivot[0], t.neck![1] - t.pivot[1] + 6);
  g.rotate(nod - aimUp - lion.perk * 0.12);
  g.drawImage(img.head, -h.pivot[0], -h.pivot[1], h.w, h.h);
  g.restore();
  g.restore();
}

/** Where his mane is on screen (for particles and the glow): a point just behind his face. */
export function lionMane(ground: number) {
  return { x: lion.x + lion.face * -30 * SC, y: ground - 300 * SC };
}

/** A soft glow around the mane, drawn on top of the darkness so he shines a little in dark places. */
export function drawLionGlow(g: Ctx, ground: number) {
  if (!lion.on || !skin || lion.glow <= 0 || lion.a <= 0) return;
  const m = lionMane(ground);
  const near = clamp(1 - Math.hypot(lamp.x - m.x, lamp.y - m.y) / 520, 0, 1);
  const pulse = RM ? 1 : 0.92 + Math.sin(stage.T * 2) * 0.08;
  const R = 230 * SC * 1.5 * pulse;
  g.save();
  g.globalCompositeOperation = 'screen';
  g.globalAlpha = (lion.glow + near * 0.35) * lion.a;
  const gr = g.createRadialGradient(m.x, m.y, 6, m.x, m.y, R);
  gr.addColorStop(0, 'rgba(255,214,120,.5)');
  gr.addColorStop(0.5, 'rgba(255,190,90,.16)');
  gr.addColorStop(1, 'rgba(255,190,90,0)');
  g.fillStyle = gr;
  g.beginPath();
  g.arc(m.x, m.y, R, 0, TAU);
  g.fill();
  g.restore();
}
