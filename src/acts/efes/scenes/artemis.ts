/* IV. Artemis Tapınağı: hold the lamp where the hanging paper fragments throw the temple’s shadow together. */
import { Ctx, H, W, TAU, clamp, lamp, sstep, stage, wait, withPar } from '../../../engine/core';
import { buzz, chime } from '../../../engine/audio';
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
  ground = 862;
  backImage = 'efes/artemis-sky.webp';
  ambience = { base: 73.42, noiseFreq: 900, noiseVol: 0.05, noiseLfo: 0.08 };

  /** 0..1: how close the lamp is to LS (darkens the dotted outlines). */
  private close = 0;
  private hold = 0;
  private lockAmt = 0;
  private glow = 0;
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
      g.fillStyle = this.glow > 0 ? `rgba(${(52 + 150 * this.glow) | 0},${(26 + 100 * this.glow) | 0},58,${0.5 + 0.3 * this.glow})` : 'rgba(52,26,58,.5)';
      g.fill(f.eo ? 'evenodd' : 'nonzero');
      g.restore();
    });
    if (this.glow > 0) {
      const gc2 = `rgba(255,236,170,${this.glow * 0.95})`;
      FRAGS.forEach((f) => {
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
      this.glow = Math.min(1, this.glow + dt * 0.6);
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
    Object.assign(this, { close: 0, hold: 0, lockAmt: 0, glow: 0, solved: false, locking: false, solvedLamp: null });
    await say(T.intro);
    setGoal(T.goal);
    const auto = setTimeout(() => {
      if (!this.solved && !dialogOpen()) this.hint();
    }, 28000);
    await new Promise<void>((r) => (this.solve = r));
    clearTimeout(auto);
    lamp.lock = null;
    clearGoal();
    chime();
    setTimeout(chime, 500);
    await wait(1600);
    await say(T.solved);
    await award('ef');
    await card(T.card.title, T.card.facts, 'ef');
    await finale();
  }
}
