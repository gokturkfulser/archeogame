/* Deniz as a jointed cut-paper puppet, rigged in code, always in side profile (facing right in rig space).
 *
 * Every piece carries a brass rivet at its pivot, and the rig turns each piece about exactly that rivet: shoulder, elbow,
 * hip, knee. The legs are solved with two-bone IK from the hip rivet to a foot target, so she can stand with her weight on
 * one leg and walk with bending knees; the tool arm reaches for the pointer with its own two-bone solve. Joints are hidden
 * by overlap: each lower limb piece is drawn on top of the piece it hangs from, and its rounded end covers the seam.
 *
 * Poses (all side view): neutral, talk (a small nod while a dialogue is open), idle (after 3 s without input: breathing,
 * blinks and a glance around) and cheer (tool arm raised, a small hop).
 * `deniz.lens` is the flashlight lens in world coordinates; flashlight.ts draws the soft cone from it.
 */
import { Ctx, RM, TAU, W, assetUrl, clamp, lamp, stage } from './core';
import { dialogOpen } from './dialogue';
import { loadImage } from './layers';

export type Pose = 'neutral' | 'idle' | 'talk' | 'cheer';

export const deniz = {
  x: 300,
  face: 1 as 1 | -1,
  /** Which side of the lit spot she stands on: -1 = left of it. */
  side: -1 as 1 | -1,
  speed: 0,
  phase: 0,
  pose: 'neutral' as Pose,
  /** Flashlight lens in world coordinates (set while drawing; null before the first frame). */
  lens: null as { x: number; y: number } | null,
};

/* ---------- loading ---------- */
type Pt = [number, number];
interface PartMeta {
  file: string;
  w: number;
  h: number;
  pivot: Pt;
  tip?: Pt;
  neck?: Pt;
  shoulder?: Pt;
  lens?: Pt;
  sole?: Pt;
  eye?: Pt;
  hair?: Pt;
  hip?: Pt;
  waist?: Pt;
}
type Meta = Record<string, PartMeta>;
interface PartSet {
  meta: Meta;
  img: Record<string, HTMLImageElement>;
}
let sideSet: PartSet | null = null;

async function loadSet(dir: string): Promise<PartSet> {
  const meta = (await (await fetch(assetUrl(`characters/deniz/${dir}/parts.json`))).json()) as Meta;
  const keys = Object.keys(meta);
  const imgs = await Promise.all(keys.map((k) => loadImage(meta[k].file)));
  return { meta, img: Object.fromEntries(keys.map((k, i) => [k, imgs[i]])) };
}

/** Loads the rig. Until the parts are in she is not drawn (the title screen covers the first moments). */
export function useImageSkin() {
  loadSet('side')
    .then((set) => {
      sideSet = set;
      buildSide();
    })
    .catch((e) => console.warn('Deniz parts not loaded', e));
}

/* ---------- side rig geometry (rig units: feet at the origin, facing +x, up is -y) ---------- */
const S_STRIDE = 48; // half the foot travel under the hip while walking
const S_LIFT = 22; // how high the swinging foot rises
const S_BOB = 5; // the hips sink this far when both feet are down
const S_SOFT = 0.985; // standing hip height uses this fraction of the leg, so the knees stay soft

/** Per-piece size correction of the side art: legs are drawn shorter (the sheet’s legs came out long), torso, head and arms a little larger. */
const LEG_K = 0.88;
/** The pelvis piece is drawn a little narrower than its art so it fits the shirt above it. */
const PELVIS_KX = 0.85;
/** Where the hip joint and the pelvis sit on the torso art (torso art px; the waistband is tucked under the shirt hem). */
const HIP_JOINT: Pt = [48, 112];
const PELVIS_TOP: Pt = [46, 76];
const TORSO_K = 1.14;
const HEAD_K = 1.3;
const ARM_K = 1.12;
const SCALE: Record<string, Pt> = {
  torso: [TORSO_K, TORSO_K],
  head: [HEAD_K, HEAD_K],
  upperArm: [ARM_K, ARM_K],
  upperArmBack: [ARM_K, ARM_K],
  foreArmLight: [ARM_K, ARM_K],
  foreArmFree: [ARM_K, ARM_K],
  pelvis: [PELVIS_KX, 1],
  thigh: [1, LEG_K],
  thighBack: [1, LEG_K],
  shin: [1, LEG_K],
  shinBack: [1, LEG_K],
};
const scaledLen = (m: PartMeta, to: Pt, key: string) => {
  const [kx, ky] = SCALE[key] ?? [1, 1];
  return Math.hypot((to[0] - m.pivot[0]) * kx, (to[1] - m.pivot[1]) * ky);
};

const side = {
  lt: 119, // thigh: hip rivet to knee
  ls: 143, // shin: knee rivet to ankle
  ankleH: 33, // ankle to sole
  footDX: 8, // the foot art sits this far ahead of the shin axis
  hipH: 288,
  neckDX: 0,
  neckDY: 0,
  shDX: 0,
  shDY: 0,
  jdx: 0,
  jdy: 0,
  pdx: 0,
  pdy: 0,
  upper: 67,
  fore: 96,
  height: 520,
  ready: false,
};

function buildSide() {
  const m = sideSet!.meta;
  side.lt = scaledLen(m.thigh, m.thigh.tip!, 'thigh');
  side.ls = scaledLen(m.shin, m.shin.tip!, 'shin');
  side.ankleH = (m.shin.sole![1] - m.shin.tip![1]) * LEG_K;
  side.footDX = m.shin.tip![0] - m.shin.pivot[0];
  side.hipH = side.ankleH + S_SOFT * (side.lt + side.ls);
  side.neckDX = (m.torso.neck![0] - m.torso.pivot[0]) * TORSO_K;
  side.neckDY = (m.torso.neck![1] - m.torso.pivot[1]) * TORSO_K;
  side.jdx = (HIP_JOINT[0] - m.torso.pivot[0]) * TORSO_K;
  side.jdy = (HIP_JOINT[1] - m.torso.pivot[1]) * TORSO_K;
  side.pdx = (PELVIS_TOP[0] - m.torso.pivot[0]) * TORSO_K;
  side.pdy = (PELVIS_TOP[1] - m.torso.pivot[1]) * TORSO_K;
  side.shDX = (m.torso.shoulder![0] - m.torso.pivot[0]) * TORSO_K;
  side.shDY = (m.torso.shoulder![1] - m.torso.pivot[1]) * TORSO_K;
  side.upper = scaledLen(m.upperArm, m.upperArm.tip!, 'upperArm');
  side.fore = scaledLen(m.foreArmLight, m.foreArmLight.lens!, 'foreArmLight');
  side.height = side.hipH - (side.neckDY - side.jdy) + m.head.pivot[1] * HEAD_K;
  side.ready = true;
}

/** World scale that makes her about `height` world units tall. */
export const denizScaleFor = (height: number) => height / (side.ready ? side.height : 520);

/* ---------- state ---------- */
const STAND = 300;
const MAX_SPEED = 340;
const IDLE_AFTER = 3;

let idleT = 0;
let lastPX = 0;
let lastPY = 0;
let cheerT = 0;
let cheerAge = 0;
let cheerHold = false;
/** 0..1 blend of the cheer pose, so she raises the arm and settles back smoothly. */
let cheerW = 0;
/** 0..1 blend of the idle glance. */
let idleW = 0;
/** Test hook (dev builds only): force a blink. */
export const debug = { blink: (on: boolean) => { blinkT = on ? 0 : -1; blinkAt = stage.T + (on ? 99 : 2); } };
let blinkAt = 2.5;
let blinkT = -1;

/** Happy reaction (after a puzzle): the tool arm goes up and she hops once or twice. */
export function celebrate(seconds = 2.4) {
  if (cheerT <= 0) cheerAge = 0;
  cheerT = Math.max(cheerT, seconds);
}
/** Keeps her cheering (the act finale) until switched off. */
export function holdCheer(on: boolean) {
  if (on && !cheerHold) cheerAge = 0;
  cheerHold = on;
}

/** Puts her beside the lit spot straight away (scene start). */
export function placeDeniz() {
  deniz.side = lamp.x < 260 ? 1 : -1;
  deniz.x = lamp.x + deniz.side * STAND;
  deniz.speed = 0;
  deniz.face = deniz.side < 0 ? 1 : -1;
  deniz.lens = null;
  idleT = 0;
  cheerT = 0;
  cheerW = 0;
  idleW = 0;
  lastPX = lamp.tx;
  lastPY = lamp.ty;
}

/** Walk towards the spot beside the lit area, turn to face it, and decide which pose she should show. */
export function updateDeniz(dt: number) {
  const { Mx } = stage;
  if (deniz.side < 0 && lamp.x < 260) deniz.side = 1;
  else if (deniz.side > 0 && lamp.x > 440) deniz.side = -1;
  const target = clamp(lamp.x + deniz.side * STAND, -Mx + 50, W + Mx - 50);
  const dx = target - deniz.x;
  const want = Math.abs(dx) < 4 ? 0 : clamp(dx * 3.2, -MAX_SPEED, MAX_SPEED);
  deniz.speed += (want - deniz.speed) * Math.min(1, dt * 8);
  if (want === 0 && Math.abs(deniz.speed) < 6) deniz.speed = 0;
  deniz.x += deniz.speed * dt;
  // one full step cycle covers 4 × S_STRIDE rig units of ground, so the planted foot does not slide
  deniz.phase += (Math.abs(deniz.speed) * dt * TAU) / (0.6 * 4 * S_STRIDE);
  const fx = lamp.x - deniz.x;
  if (Math.abs(fx) > 24) deniz.face = fx > 0 ? 1 : -1;

  const moved = Math.hypot(lamp.tx - lastPX, lamp.ty - lastPY) > 3;
  lastPX = lamp.tx;
  lastPY = lamp.ty;
  if (moved || Math.abs(deniz.speed) > 8) idleT = 0;
  else idleT += dt;
  if (cheerT > 0 || cheerHold) cheerAge += dt;
  cheerT = Math.max(0, cheerT - dt);

  const cheering = cheerHold || cheerT > 0;
  const talking = !cheering && dialogOpen();
  const idle = !cheering && !talking && idleT > IDLE_AFTER && Math.abs(deniz.speed) < 8;
  deniz.pose = cheering ? 'cheer' : talking ? 'talk' : idle ? 'idle' : 'neutral';
  const k = Math.min(1, dt * 9);
  cheerW += ((cheering ? 1 : 0) - cheerW) * k;
  idleW += ((idle ? 1 : 0) - idleW) * Math.min(1, dt * 3);

  // blinking (a little more often while idle)
  if (!RM) {
    if (blinkT >= 0) {
      blinkT += dt;
      if (blinkT > 0.14) {
        blinkT = -1;
        blinkAt = stage.T + (idle ? 1.2 : 2.2) + Math.random() * 2.6;
      }
    } else if (stage.T > blinkAt) blinkT = 0;
  }
}

/* ---------- drawing helpers ---------- */
const restAngle = (m: PartMeta, to?: Pt) => (to ? Math.atan2(to[1] - m.pivot[1], to[0] - m.pivot[0]) : 0);

/** Draws a piece with its pivot at (x, y), turned so that its own rest axis points along `angle`. */
function piece(g: Ctx, set: PartSet, key: string, x: number, y: number, angle: number, rest = 0) {
  const m = set.meta[key];
  const [kx, ky] = set === sideSet ? (SCALE[key] ?? [1, 1]) : [1, 1];
  g.save();
  g.translate(x, y);
  g.rotate(angle - rest);
  g.scale(kx, ky);
  g.drawImage(set.img[key], -m.pivot[0], -m.pivot[1], m.w, m.h);
  g.restore();
}

/** Two-bone solve. Returns the middle joint for bones a (root → joint) and b (joint → end) reaching (tx, ty). */
function solve2(rx: number, ry: number, tx: number, ty: number, a: number, b: number, bend: 1 | -1) {
  const d = clamp(Math.hypot(tx - rx, ty - ry), Math.abs(a - b) + 0.5, a + b - 0.3);
  const base = Math.atan2(ty - ry, tx - rx);
  const A = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
  const ja = base + bend * A;
  const jx = rx + a * Math.cos(ja);
  const jy = ry + a * Math.sin(ja);
  return { jx, jy, rootAngle: ja, endAngle: Math.atan2(ty - jy, tx - jx) };
}

/** A brass rivet, drawn at a joint. */
function rivet(g: Ctx, x: number, y: number, r = 6.2) {
  const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  gr.addColorStop(0, '#f1d58a');
  gr.addColorStop(0.55, '#b98a3a');
  gr.addColorStop(1, '#6e4a1c');
  g.fillStyle = gr;
  g.strokeStyle = '#3b2610';
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
  g.stroke();
}

/* ---------- side view ---------- */
function drawSide(g: Ctx, sc: number, ground: number) {
  const set = sideSet!;
  const m = set.meta;
  const T = stage.T;
  const moving = Math.min(1, Math.abs(deniz.speed) / 120);
  const ph = deniz.phase;
  const fwd = clamp((deniz.speed * deniz.face) / MAX_SPEED, -1, 1);

  // hips: breathing and a relaxed weight shift while standing; a rock and a dip with each step while walking
  const breath = RM ? 0 : Math.sin(T * 1.7) * 1.1 * (1 - moving);
  const shift = RM ? 0 : Math.sin(T * 0.45) * 2.5;
  const hx = shift * (1 - moving) + Math.sin(ph) * 3.5 * moving;
  // cheer: a small hop (two hops, then she holds the pose with the arm up)
  const hop = RM || cheerW < 0.05 ? 0 : 16 * Math.abs(Math.sin(Math.PI * Math.min(cheerAge, 1.1) * 1.8)) * (cheerAge < 1.1 || cheerHold ? 1 : 0) * cheerW;
  const hy = -side.hipH + S_BOB * moving * (0.5 + 0.5 * Math.cos(2 * ph)) + breath - hop;

  // foot targets: standing with the weight on the far (back) leg, or walking with the swing foot lifting
  const foot = (cyc: number, standX: number, standLift: number) => {
    const s = (((ph / TAU + cyc) % 1) + 1) % 1;
    let wx: number;
    let lift = 0;
    if (s < 0.5) wx = S_STRIDE - 2 * S_STRIDE * (s / 0.5);
    else {
      const u = (s - 0.5) / 0.5;
      wx = -S_STRIDE + 2 * S_STRIDE * u;
      lift = S_LIFT * Math.sin(Math.PI * u);
    }
    return { x: standX * (1 - moving) + wx * moving - side.footDX, y: -side.ankleH - standLift * (1 - moving) - lift * moving - hop * 0.8 };
  };
  const nf = foot(0, 22, 2); // the front foot a little ahead: its knee bends slightly
  const ff = foot(0.5, 3, 0); // the weight leg stays almost straight under the hip
  const nearLeg = solve2(hx, hy, nf.x, nf.y, side.lt, side.ls, -1);
  const farLeg = solve2(hx, hy, ff.x, ff.y, side.lt, side.ls, -1);

  // torso leans into the walk and counter-rocks with the stride; neck and shoulder ride on it
  const lean = RM ? 0 : fwd * 0.1 + Math.sin(ph) * 0.03 * moving;
  const cl = Math.cos(lean);
  const sl = Math.sin(lean);
  // the torso turns about the hip joint; torso-art offsets are given from the art pivot, so subtract the joint's own offset
  const onTorso = (dx: number, dy: number): Pt => {
    const ox = dx - side.jdx;
    const oy = dy - side.jdy;
    return [hx + ox * cl - oy * sl, hy + ox * sl + oy * cl];
  };
  const [nx, ny] = onTorso(side.neckDX, side.neckDY);
  const [sx, sy] = onTorso(side.shDX, side.shDY);

  // the tool arm reaches for the lit spot; the hand stops a little short of it and the elbow always bends down
  const tx0 = ((lamp.x - deniz.x) * deniz.face) / sc;
  const ty0 = (lamp.y - ground) / sc;
  // while cheering the arm points straight up instead of at the pointer
  const tx = tx0 + (sx + 30 - tx0) * cheerW;
  const ty = ty0 + (sy - 400 - ty0) * cheerW;
  const aim0 = Math.atan2(ty - sy, tx - sx);
  const dist = Math.hypot(tx - sx, ty - sy);
  const reach = side.upper + side.fore;
  const dh = clamp(dist - 60, reach * 0.45, reach * 0.93);
  const arm = solve2(sx, sy, sx + dh * Math.cos(aim0), sy + dh * Math.sin(aim0), side.upper, side.fore, Math.cos(aim0) >= 0 ? 1 : -1);
  let aim = Math.atan2(ty - arm.jy, tx - arm.jx);
  let lx = arm.jx + side.fore * Math.cos(aim);
  let ly = arm.jy + side.fore * Math.sin(aim);
  if (Math.hypot(tx - lx, ty - ly) > 30) {
    aim = Math.atan2(ty - ly, tx - lx);
    lx = arm.jx + side.fore * Math.cos(aim);
    ly = arm.jy + side.fore * Math.sin(aim);
  }
  deniz.lens = { x: deniz.x + deniz.face * lx * sc, y: ground + ly * sc };

  // the free arm hangs and swings against the legs
  const swing = RM ? 0 : -Math.sin(ph) * 0.5 * moving;
  const freeUp = Math.PI / 2 + 0.07 - swing;
  const freeFore = freeUp - 0.28 - Math.max(0, swing) * 0.5;
  const fsx = sx - 4;
  const fex = fsx + side.upper * Math.cos(freeUp);
  const fey = sy + side.upper * Math.sin(freeUp);

  const aimUp = Math.atan2(ty - ny, Math.max(40, tx - nx));
  const talkNod = deniz.pose === 'talk' && !RM ? Math.sin(T * 5.5) * 0.025 + 0.03 : 0;
  // idle: the head slowly looks ahead, then back, then up
  const glance = RM ? 0 : idleW * (Math.sin(T * 0.8) * 0.1 - 0.04 + Math.sin(T * 0.37) * 0.06);
  const tilt = 0.05 + clamp(aimUp * 0.3, -0.25, 0.3) * (1 - cheerW * 0.5) - cheerW * 0.12 + talkNod + glance + (RM ? 0 : Math.sin(T * 1.1) * 0.02);

  const up = Math.PI / 2;
  const R = (k: string) => restAngle(m[k], m[k].tip);
  g.save();
  g.imageSmoothingQuality = 'high';
  // free arm and far leg sit behind the torso
  piece(g, set, 'upperArmBack', fsx, sy, freeUp, R('upperArmBack'));
  piece(g, set, 'foreArmFree', fex, fey, freeFore, R('foreArmFree'));
  piece(g, set, 'thighBack', hx, hy, farLeg.rootAngle, R('thighBack'));
  piece(g, set, 'shinBack', farLeg.jx, farLeg.jy, farLeg.endAngle, up);
  // near thigh under the pelvis piece: its round top end is hidden by the trouser top at any leg angle
  piece(g, set, 'thigh', hx, hy, nearLeg.rootAngle, R('thigh'));
  // pelvis and torso move as one, turned about the hip joint; the shirt hem overlaps the waistband
  g.save();
  g.translate(hx, hy);
  g.rotate(lean);
  g.translate(-side.jdx, -side.jdy);
  const pv = m.pelvis;
  g.save();
  g.translate(side.pdx, side.pdy);
  g.scale(PELVIS_KX, 1);
  g.drawImage(set.img.pelvis, -pv.pivot[0], -pv.pivot[1], pv.w, pv.h);
  g.restore();
  g.scale(TORSO_K, TORSO_K);
  g.drawImage(set.img.torso, -m.torso.pivot[0], -m.torso.pivot[1], m.torso.w, m.torso.h);
  g.restore();
  // the hip rivet sits at the real joint, over the pelvis, drawn in code so the thigh can tuck under the trousers
  rivet(g, hx, hy);
  // near shin on the knee
  piece(g, set, 'shin', nearLeg.jx, nearLeg.jy, nearLeg.endAngle, up);
  // head on the neck, with a blink lid
  const hd = m.head;
  g.save();
  g.translate(nx, ny);
  g.rotate(tilt);
  g.scale(HEAD_K, HEAD_K);
  g.drawImage(set.img.head, -hd.pivot[0], -hd.pivot[1], hd.w, hd.h);
  if (blinkT >= 0) {
    const ex = hd.eye![0] - hd.pivot[0];
    const ey = hd.eye![1] - hd.pivot[1];
    g.fillStyle = '#e49a55';
    g.beginPath();
    g.ellipse(ex - 0.5, ey + 0.5, 6.4, 5.6, 0, 0, TAU);
    g.fill();
    g.strokeStyle = '#3b1a0e';
    g.lineWidth = 1.6;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(ex, ey - 2.5, 6, 0.3, Math.PI - 0.5);
    g.stroke();
  }
  g.restore();
  // tool arm on top: upper arm on the shoulder rivet, forearm on the elbow rivet
  piece(g, set, 'upperArm', sx, sy, arm.rootAngle, R('upperArm'));
  piece(g, set, 'foreArmLight', arm.jx, arm.jy, aim, restAngle(m.foreArmLight, m.foreArmLight.lens));
  g.restore();
}

/** Draws Deniz standing on `ground`, `sc` world units per rig unit. */
export function drawDeniz(g: Ctx, ground: number, sc: number) {
  if (!sideSet || !side.ready) return;
  g.save();
  g.translate(deniz.x, ground);
  g.fillStyle = 'rgba(10,6,28,.35)'; // contact shadow
  g.beginPath();
  g.ellipse(0, 2, side.height * 0.17 * sc, side.height * 0.035 * sc, 0, 0, TAU);
  g.fill();
  g.scale(deniz.face * sc, sc);
  drawSide(g, sc, ground);
  g.restore();
}
