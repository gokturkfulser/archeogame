/* Kurunta, the guide stag of Hattuşa. A jointed cut-paper puppet (head with antlers, torso, four legs) that walks
   behind Deniz along the ground line. The parts are Higgsfield cut-outs written by scripts/process-assets.mjs. */
import { Ctx, RM, TAU, W, assetUrl, clamp, lamp, stage } from './core';
import { loadImage } from './layers';
import { deniz } from './deniz';

export const stag = {
  on: false,
  x: 0,
  face: 1 as 1 | -1,
  speed: 0,
  phase: 0,
  /** 0..1 fade/scale-in after appearing. */
  a: 0,
  /** Antler glow, 0..1 (the lanterns on his antlers light dark places). */
  glow: 0.35,
  /** Brief head lift, set by `perk()`. */
  perk: 0,
  /** Extra x offset from the default spot behind Deniz (scenes can park him elsewhere). */
  park: null as number | null,
};

interface PartMeta {
  file: string;
  w: number;
  h: number;
  pivot: [number, number];
  hipJ?: [number, number];
  shoulderJ?: [number, number];
  neck?: [number, number];
  foot?: [number, number];
}
let skin: { meta: Record<string, PartMeta>; img: Record<string, HTMLImageElement> } | null = null;

/** Stag size relative to the 0.3-scaled parts: antlers end up about 330 world units above the ground. */
const SC = 0.62;
const MAX_SPEED = 260;

export function useKurundaImages() {
  fetch(assetUrl('characters/kurunta/parts.json'))
    .then((r) => r.json() as Promise<Record<string, PartMeta>>)
    .then(async (meta) => {
      const keys = Object.keys(meta);
      const imgs = await Promise.all(keys.map((k) => loadImage(meta[k].file)));
      skin = { meta, img: Object.fromEntries(keys.map((k, i) => [k, imgs[i]])) };
    })
    .catch((e) => console.warn('Kurunta images not loaded', e));
}

/** Makes him appear beside Deniz (scene start or the moment he wakes). */
export function placeStag(at?: number) {
  stag.on = true;
  side = deniz.face === 1 ? -1 : 1;
  pendingFace = deniz.face;
  faceTimer = 0;
  stag.x = at ?? deniz.x + side * 190;
  stag.face = deniz.face;
  stag.speed = 0;
  stag.a = 0;
  stag.park = null;
}

export function hideStag() {
  stag.on = false;
}

export const perkStag = () => (stag.perk = 1);

/** Which side of Deniz he keeps to (-1 = left). It only changes once her facing has settled, so he never runs through her. */
let side: 1 | -1 = -1;
let pendingFace: 1 | -1 = 1;
let faceTimer = 0;

export function updateStag(dt: number) {
  if (!stag.on) return;
  const { Mx } = stage;
  stag.a = Math.min(1, stag.a + dt * 1.6);
  stag.perk = Math.max(0, stag.perk - dt * 0.9);
  if (deniz.face !== pendingFace) {
    pendingFace = deniz.face;
    faceTimer = 0;
  } else faceTimer += dt;
  if (faceTimer > 1.6) side = pendingFace === 1 ? -1 : 1;
  let target = stag.park ?? deniz.x + side * 190;
  if (stag.park === null) {
    // keep him in the frame: if that spot is off screen he waits at her other side for now
    if (target < 110 || target > W - 110) target = clamp(deniz.x - side * 190, 110, W - 110);
  }
  target = clamp(target, -Mx + 60, W + Mx - 60);
  const dx = target - stag.x;
  const want = Math.abs(dx) < 8 ? 0 : clamp(dx * 1.7, -MAX_SPEED, MAX_SPEED);
  stag.speed += (want - stag.speed) * Math.min(1, dt * 4);
  if (want === 0 && Math.abs(stag.speed) < 5) stag.speed = 0;
  stag.x += stag.speed * dt;
  stag.phase += Math.abs(stag.speed) * dt * 0.05;
  // he faces the way he walks; standing still, he looks towards the lit spot
  if (Math.abs(stag.speed) > 30) stag.face = stag.speed > 0 ? 1 : -1;
  else if (Math.abs(lamp.x - stag.x) > 90) stag.face = lamp.x > stag.x ? 1 : -1;
}

function leg(g: Ctx, key: string, jx: number, jy: number, ang: number) {
  const m = skin!.meta[key];
  g.save();
  g.translate(jx, jy);
  g.rotate(ang);
  g.drawImage(skin!.img[key], -m.pivot[0], -m.pivot[1], m.w, m.h);
  g.restore();
}

/** The body, drawn in the scene right beside Deniz. */
export function drawStag(g: Ctx, ground: number) {
  if (!stag.on || !skin) return;
  const { meta, img } = skin;
  const T = stage.T;
  const t = meta.torso;
  const moving = Math.min(1, Math.abs(stag.speed) / 120);
  const sw = Math.sin(stag.phase);
  const swing = sw * 0.5 * moving;
  const bob = Math.abs(sw) * 3.5 * moving + (RM ? 0 : Math.sin(T * 1.6) * 1.1 * (1 - moving));
  // torso origin sits one leg length above the ground
  const legLen = (meta.legF.foot![1] - meta.legF.pivot[1] + (meta.legH.foot![1] - meta.legH.pivot[1])) / 2;
  const hipDrop = t.pivot[1] - t.hipJ![1];
  const oy = -(legLen - hipDrop) - bob;

  g.save();
  g.imageSmoothingQuality = 'high';
  g.globalAlpha = stag.a;
  g.translate(stag.x, ground);
  g.fillStyle = 'rgba(10,6,28,.35)';
  g.beginPath();
  g.ellipse(0, 2, 150 * SC, 12 * SC, 0, 0, TAU);
  g.fill();
  g.scale(stag.face * SC * (0.9 + 0.1 * stag.a), SC * (0.9 + 0.1 * stag.a));
  g.translate(0, oy);

  const hip: [number, number] = [t.hipJ![0] - t.pivot[0], t.hipJ![1] - t.pivot[1]];
  const sho: [number, number] = [t.shoulderJ![0] - t.pivot[0], t.shoulderJ![1] - t.pivot[1]];
  leg(g, 'legHBack', hip[0] - 7, hip[1], swing);
  leg(g, 'legFBack', sho[0] - 7, sho[1], -swing);
  g.drawImage(img.torso, -t.pivot[0], -t.pivot[1], t.w, t.h);
  leg(g, 'legH', hip[0], hip[1], -swing);
  leg(g, 'legF', sho[0], sho[1], swing);

  // head: nods gently, turns up a little towards the lit spot, lifts when he perks up
  const h = meta.head;
  const aimUp = clamp((420 - lamp.y) / 900, -0.15, 0.2); // head height is roughly constant, so a fixed y will do
  const nod = RM ? 0 : Math.sin(T * 1.3) * 0.025 + moving * Math.sin(stag.phase * 2) * 0.03;
  g.save();
  g.translate(t.neck![0] - t.pivot[0], t.neck![1] - t.pivot[1] + 8);
  g.rotate(nod - aimUp - stag.perk * 0.14);
  g.drawImage(img.head, -h.pivot[0], -h.pivot[1], h.w, h.h);
  g.restore();
  g.restore();
}

/** Kurunta standing still, for carvings and plaques: feet on `base`, centred on `cx`, `sc` raw-part units to world units. */
export function drawStagPose(g: Ctx, cx: number, base: number, sc: number, face: 1 | -1 = 1): boolean {
  if (!skin) return false;
  const { meta, img } = skin;
  const t = meta.torso;
  const legLen = (meta.legF.foot![1] - meta.legF.pivot[1] + (meta.legH.foot![1] - meta.legH.pivot[1])) / 2;
  const oy = -(legLen - (t.pivot[1] - t.hipJ![1]));
  g.save();
  g.imageSmoothingQuality = 'high';
  g.translate(cx, base);
  g.scale(face * sc, sc);
  g.translate(-(t.neck![0] - t.pivot[0]) * 0.25, oy);
  const hip: [number, number] = [t.hipJ![0] - t.pivot[0], t.hipJ![1] - t.pivot[1]];
  const sho: [number, number] = [t.shoulderJ![0] - t.pivot[0], t.shoulderJ![1] - t.pivot[1]];
  leg(g, 'legHBack', hip[0] - 7, hip[1], 0.12);
  leg(g, 'legFBack', sho[0] - 7, sho[1], -0.12);
  g.drawImage(img.torso, -t.pivot[0], -t.pivot[1], t.w, t.h);
  leg(g, 'legH', hip[0], hip[1], -0.1);
  leg(g, 'legF', sho[0], sho[1], 0.1);
  const h = meta.head;
  g.translate(t.neck![0] - t.pivot[0], t.neck![1] - t.pivot[1] + 8);
  g.rotate(-0.05);
  g.drawImage(img.head, -h.pivot[0], -h.pivot[1], h.w, h.h);
  g.restore();
  return true;
}

/** A soft glow around the antlers, drawn on top of the darkness so he lights dark places. */
export function drawStagGlow(g: Ctx, ground: number) {
  if (!stag.on || !skin || stag.glow <= 0) return;
  const cx = stag.x + stag.face * 40 * SC;
  const cy = ground - 400 * SC;
  const pulse = RM ? 1 : 0.9 + Math.sin(stage.T * 2.2) * 0.1;
  const R = 260 * SC * 1.6 * pulse;
  g.save();
  g.globalCompositeOperation = 'screen';
  g.globalAlpha = stag.glow * stag.a;
  const gr = g.createRadialGradient(cx, cy, 6, cx, cy, R);
  gr.addColorStop(0, 'rgba(255,214,120,.55)');
  gr.addColorStop(0.5, 'rgba(255,190,90,.18)');
  gr.addColorStop(1, 'rgba(255,190,90,0)');
  g.fillStyle = gr;
  g.beginPath();
  g.arc(cx, cy, R, 0, TAU);
  g.fill();
  g.restore();
}
