/* IV. Artemis Tapınağı: hold the lamp where the hanging paper fragments throw the temple’s shadow together. */
import { Ctx, H, W, TAU, clamp, lamp, sstep, stage, withPar } from '../../../engine/core';
import { buzz, chime, glint, pluck } from '../../../engine/audio';
import { camMove, camReset, camShake } from '../../../engine/cinematic/camera';
import { startCine } from '../../../engine/cinematic';
import { celebrate } from '../../../engine/deniz';
import { bee } from '../../../engine/melissa';
import { clearGoal, dialogOpen, say, setGoal } from '../../../engine/dialogue';
import { finale } from '../finale';
import { award, card } from '../../../engine/hud';
import { LayerSpec } from '../../../engine/layers';
import { dot, grain, perfLine, skyFill } from '../../../engine/paper';
import type { Scene } from '../../../engine/scene';
import { TEXT } from '../text';

const T = TEXT.artemis;

/** The lamp has to end up here (top right, “east”) for the shadows to fall into place. */
const LS = { x: 1245, y: 205 };
const COLX = [...Array(8)].map((_, i) => 630 + (i * 540) / 7);
type Pt = [number, number];
const RP = (x: number, y: number, w: number, h: number): Pt[] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];
const colPolys = (x: number) => [RP(x - 23, 606, 46, 14), RP(x - 17, 392, 34, 214), RP(x - 26, 380, 52, 13)];

interface Frag {
  /** Depth: how far this fragment hangs from the wall, i.e. how far its shadow shifts with the lamp. */
  k: number;
  col: string;
  polys: Pt[][];
  eo?: boolean;
  bb: [number, number, number, number];
  shape: (g: Ctx) => void;
}
const fragDefs: { k: number; col: string; polys: Pt[][]; eo?: boolean }[] = [
  { k: 0.35, col: '#d99a4a', polys: [RP(560, 672, 680, 28), RP(580, 646, 640, 27), RP(600, 620, 600, 27)] },
  { k: 1.0, col: '#e3b25c', polys: [...colPolys(COLX[0]), ...colPolys(COLX[1])] },
  { k: 1.55, col: '#c97a3e', polys: [...colPolys(COLX[2]), ...colPolys(COLX[3])] },
  { k: 0.6, col: '#d99a4a', polys: [...colPolys(COLX[4]), ...colPolys(COLX[5])] },
  { k: 1.25, col: '#e3b25c', polys: [...colPolys(COLX[6]), ...colPolys(COLX[7])] },
  { k: 1.9, col: '#c97a3e', polys: [RP(588, 334, 624, 46)] },
  {
    k: 2.5,
    col: '#d99a4a',
    polys: [
      [
        [580, 334],
        [1220, 334],
        [900, 216],
      ],
      [
        [640, 322],
        [900, 232],
        [1160, 322],
      ],
    ],
    eo: true,
  },
];
const FRAGS: Frag[] = fragDefs.map((f) => {
  const xs = f.polys.flat().map((p) => p[0]);
  const ys = f.polys.flat().map((p) => p[1]);
  return {
    ...f,
    bb: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
    shape: (g: Ctx) => {
      for (const pl of f.polys) {
        g.moveTo(pl[0][0], pl[0][1]);
        for (let i = 1; i < pl.length; i++) g.lineTo(pl[i][0], pl[i][1]);
        g.closePath();
      }
    },
  };
});

export class Artemis implements Scene {
  id = 'artemis';
  num = T.num;
  name = T.name;
  dark = 0.14;
  lamp0: [number, number] = [520, 520];
  focus: [number, number] = [900, 420];
  ground = 862;
  backImage = 'efes/artemis-sky.webp';
  ambience = { base: 73.42, noiseFreq: 900, noiseVol: 0.05, noiseLfo: 0.08 };

  /** 0..1: how close the lamp is to LS (darkens the dotted outlines). */
  private close = 0;
  private hold = 0;
  private lockAmt = 0;
  private glow = 0;
  /** Payoff (temple-shadows beat): each fragment lights up in turn, then the rays, then the letters ΕΦ rise. */
  private lit: number[] = FRAGS.map(() => 0);
  private glowGo = false;
  private rise = 0;
  private solved = false;
  private locking = false;
  solvedLamp: { x: number; y: number } | null = null;
  private solve: (() => void) | null = null;

  back = (g: Ctx) => {
    const { Mx, My } = stage;
    skyFill(g, [
      [0, '#f7ead0'],
      [0.6, '#f0d2a8'],
      [1, '#e7b48c'],
    ]);
    withPar(g, 0.02, () => {
      const gr = g.createRadialGradient(1300, 160, 10, 1300, 160, 180);
      gr.addColorStop(0, 'rgba(255,236,190,.9)');
      gr.addColorStop(1, 'rgba(255,236,190,0)');
      g.fillStyle = gr;
      dot(g, 1300, 160, 180);
      g.strokeStyle = 'rgba(214,150,96,.35)';
      g.lineWidth = 1.5;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        g.beginPath();
        g.moveTo(1300 + Math.cos(a) * 70, 160 + Math.sin(a) * 70);
        g.lineTo(1300 + Math.cos(a) * 110, 160 + Math.sin(a) * 110);
        g.stroke();
      }
    });
    g.save();
    g.globalAlpha = 0.08;
    g.fillStyle = g.createPattern(grain, 'repeat')!;
    g.fillRect(-Mx, -My, W + 2 * Mx, H + 2 * My);
    g.restore();
  };

  /** The wall: dotted outlines of the temple, the shadows of the fragments, and the golden rays once solved. */
  afterBack = (g: Ctx) => {
    const lockAmt = this.lockAmt;
    const L = this.solved || lockAmt > 0 ? { x: LS.x + (lamp.x - LS.x) * (1 - lockAmt), y: LS.y + (lamp.y - LS.y) * (1 - lockAmt) } : lamp;
    const ga = 0.16 + 0.5 * this.close;
    const gc = `rgba(150,70,50,${ga})`;
    FRAGS.forEach((f) => {
      for (const pl of f.polys) {
        for (let i = 0; i < pl.length; i++) {
          const a = pl[i];
          const b = pl[(i + 1) % pl.length];
          perfLine(g, a[0], a[1], b[0], b[1], 10, 1.5, gc);
        }
      }
    });
    if (this.glow > 0) {
      g.save();
      g.globalAlpha = this.glow * 0.5;
      g.strokeStyle = 'rgba(255,226,150,.9)';
      g.lineCap = 'round';
      for (let i = 0; i < 28; i++) {
        const a = Math.PI + (i / 27) * Math.PI + Math.sin(stage.T * 0.4) * 0.03;
        const l = 380 + (i % 2) * 160;
        g.lineWidth = i % 2 ? 3 : 6;
        g.beginPath();
        g.moveTo(900 + Math.cos(a) * 150, 330 + Math.sin(a) * 150);
        g.lineTo(900 + Math.cos(a) * l, 330 + Math.sin(a) * l);
        g.stroke();
      }
      g.restore();
      g.save();
      g.globalAlpha = this.glow;
      const gr = g.createRadialGradient(900, 460, 40, 900, 460, 520);
      gr.addColorStop(0, 'rgba(255,214,130,.9)');
      gr.addColorStop(1, 'rgba(255,214,130,0)');
      g.fillStyle = gr;
      dot(g, 900, 460, 520);
      g.restore();
    }
    FRAGS.forEach((f, i) => {
      const sw = this.sway(i);
      const dx = f.k * (LS.x - L.x) + sw * (1 + f.k);
      const dy = f.k * (LS.y - L.y);
      g.save();
      g.translate(dx, dy);
      g.beginPath();
      f.shape(g);
      const lt = Math.max(this.lit[i], this.glow);
      g.fillStyle = lt > 0 ? `rgba(${(52 + 150 * lt) | 0},${(26 + 100 * lt) | 0},58,${0.5 + 0.3 * lt})` : 'rgba(52,26,58,.5)';
      g.fill(f.eo ? 'evenodd' : 'nonzero');
      g.restore();
    });
    if (this.glow > 0 || this.lit.some((v) => v > 0)) {
      FRAGS.forEach((f, fi) => {
        const gc2 = `rgba(255,236,170,${Math.max(this.glow, this.lit[fi]) * 0.95})`;
        for (const pl of f.polys) {
          for (let i = 0; i < pl.length; i++) {
            const a = pl[i];
            const b = pl[(i + 1) % pl.length];
            perfLine(g, a[0], a[1], b[0], b[1], 10, 1.9, gc2);
          }
        }
      });
    }
  };

  /** The letters ΕΦ, the last coin piece, rising out of the finished temple. */
  fx = (g: Ctx) => {
    if (this.rise <= 0.01) return;
    const k = sstep(clamp(this.rise, 0, 1));
    const x = 900;
    const y = 490 - 170 * k;
    g.save();
    g.globalAlpha = Math.min(1, this.rise * 2) * (this.rise > 1.6 ? clamp(2.2 - this.rise, 0, 1) : 1);
    g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(x, y, 10, x, y, 190);
    gr.addColorStop(0, 'rgba(255,226,150,.8)');
    gr.addColorStop(1, 'rgba(255,200,100,0)');
    g.fillStyle = gr;
    dot(g, x, y, 190);
    g.globalCompositeOperation = 'source-over';
    g.font = '700 110px Marcellus, Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 6;
    g.strokeStyle = 'rgba(120,70,20,.9)';
    g.fillStyle = '#ffe9a8';
    g.strokeText('ΕΦ', x, y);
    g.fillText('ΕΦ', x, y);
    g.restore();
  };

  private sway(i: number): number {
    return Math.sin(stage.T * 0.8 + i * 1.9) * 7 * (1 - this.lockAmt);
  }

  layers: LayerSpec[] = [
    { d: 0.1, image: 'efes/artemis-far.webp' },
    { d: 0.45, image: 'efes/artemis-mid.webp' },
    { d: 0.9, image: 'efes/artemis-fg.webp', shA: 0.4 },
  ];

  /** The paper fragments hanging on strings in front of the wall. */
  after = (i: number, g: Ctx) => {
    if (i !== 1) return;
    withPar(g, 0.65, () => {
      const { My } = stage;
      FRAGS.forEach((f, n) => {
        const sw = this.sway(n);
        const sc = 1 / (1 + f.k);
        const [x0, y0, x1] = f.bb;
        const tx = LS.x + ((x0 + x1) / 2 - LS.x) * sc + sw;
        const ty = LS.y + (y0 - LS.y) * sc;
        g.strokeStyle = 'rgba(90,60,80,.55)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(tx, -My);
        g.lineTo(tx, ty);
        g.stroke();
        g.save();
        g.translate(sw, 0);
        g.translate(LS.x, LS.y);
        g.scale(sc, sc);
        g.translate(-LS.x, -LS.y);
        g.beginPath();
        f.shape(g);
        g.fillStyle = f.col;
        g.fill(f.eo ? 'evenodd' : 'nonzero');
        g.strokeStyle = 'rgba(255,240,200,.7)';
        g.lineWidth = 2 / sc;
        g.stroke();
        g.restore();
      });
    });
  };

  update = (dt: number) => {
    if (this.solved) {
      if (this.glowGo) this.glow = Math.min(1, this.glow + dt * 0.9);
      return;
    }
    const d = Math.hypot(lamp.x - LS.x, lamp.y - LS.y);
    this.close = sstep(clamp(1 - d / 520, 0, 1));
    if (this.locking) {
      this.lockAmt = Math.min(1, this.lockAmt + dt / 1.3);
      if (this.lockAmt >= 1) {
        this.solved = true;
        this.solvedLamp = { x: LS.x, y: LS.y };
        this.solve?.();
      }
      return;
    }
    if (d < 48 && !dialogOpen()) {
      this.hold += dt;
      if (this.hold > 0.45) {
        this.locking = true;
        lamp.lock = { x: LS.x, y: LS.y };
        buzz(0.6);
      }
    } else this.hold = 0;
  };

  hint = () => void say(T.hint);

  async enter() {
    Object.assign(this, { close: 0, hold: 0, lockAmt: 0, glow: 0, solved: false, locking: false, solvedLamp: null, glowGo: false, rise: 0, lit: FRAGS.map(() => 0) });
    await say(T.intro);
    setGoal(T.goal);
    const auto = setTimeout(() => {
      if (!this.solved && !dialogOpen()) this.hint();
    }, 28000);
    await new Promise<void>((r) => (this.solve = r));
    clearTimeout(auto);
    clearGoal();
    await this.payoff();
    await say(T.solved);
    await award('ef');
    await card(T.card.title, T.card.facts, 'ef');
    await finale();
  }

  /** The temple-shadows payoff: the shadows click into place and the temple lights up piece by piece from the steps to the
   *  roof; golden rays burst out, Melissa circles the temple, and the letters ΕΦ rise from it. */
  private async payoff() {
    const c = startCine();
    lamp.lock = { x: LS.x, y: LS.y };
    void camMove(c, { z: 1.22, x: 900, y: 470 }, 1400);
    await c.sleep(500);
    // 1. each piece lights in turn with a rising note
    const notes = [392, 440, 494, 587, 659, 784, 880];
    for (let i = 0; i < FRAGS.length; i++) {
      if (!c.skipped) pluck(notes[i], 0, 0.14, 0.8);
      const from = this.lit[i];
      void c.tween(380, (t) => (this.lit[i] = from + (1 - from) * t));
      await c.sleep(300);
    }
    await c.sleep(250);
    // 2. the rays burst, the camera shakes a little, Deniz cheers and Melissa circles the temple
    if (!c.skipped) {
      buzz(0.8);
      chime();
      glint(4);
    }
    this.glowGo = true;
    void camShake(c, 3, 900);
    celebrate(2.2);
    const from = { x: bee.x, y: bee.y };
    bee.on = true;
    bee.hold = 999;
    await c.tween(2400, (t) => {
      const e = t < 0.18 ? t / 0.18 : 1;
      const a = -Math.PI * 0.9 + t * TAU * 1.1;
      const tx = 900 + Math.cos(a) * 330;
      const ty = 400 + Math.sin(a) * 120;
      const x = from.x + (tx - from.x) * e;
      const y = from.y + (ty - from.y) * e;
      if (Math.abs(x - bee.x) > 0.5) bee.face = x > bee.x ? 1 : -1;
      bee.x = x;
      bee.y = y;
      if (t > 0.45) this.rise = (t - 0.45) / 0.55;
    });
    // 3. ΕΦ hangs in the light a moment, then is gone into the coin
    if (!c.skipped) chime();
    await c.tween(900, (t) => (this.rise = 1 + t * 1.2));
    this.rise = 0;
    bee.hold = 0;
    bee.vx = bee.vy = 0;
    await camMove(c, { z: 1, x: 800, y: 450 }, 800);
    camReset();
    lamp.lock = null;
    c.end();
  }
}
