/* I. Liman Caddesi (Arkadiane): find the bee carved on a broken column with the lamp. */
import { Ctx, TAU, lamp, rv, withPar } from '../../../engine/core';
import { buzz, chime, glint, rumble } from '../../../engine/audio';
import { camMove, camReset, camShake } from '../../../engine/cinematic/camera';
import { startCine } from '../../../engine/cinematic';
import { celebrate, deniz } from '../../../engine/deniz';
import { clearGoal, dialogOpen, say, setGoal } from '../../../engine/dialogue';
import { go } from '../../../engine/game';
import { award, card } from '../../../engine/hud';
import { bee } from '../../../engine/melissa';
import { LayerSpec } from '../../../engine/layers';
import { column, cut, dot, glowDisk, makeStars, skyFill, stars } from '../../../engine/paper';
import type { Hotspot, Scene } from '../../../engine/scene';
import { TEXT } from '../text';

const T = TEXT.liman;
const STARS = makeStars(70, 330, 11);

const BEE_PARTS: [number, number, number, number, number][] = [
  [-0.24, -0.12, 0.22, 0.12, -0.5],
  [0.24, -0.12, 0.22, 0.12, 0.5],
  [-0.19, 0.07, 0.15, 0.08, -0.3],
  [0.19, 0.07, 0.15, 0.08, 0.3],
];

export class Liman implements Scene {
  id = 'liman';
  num = T.num;
  name = T.name;
  dark = 0.46;
  lamp0: [number, number] = [640, 470];
  focus: [number, number] = [1000, 560];
  ground = 838;
  backImage = 'efes/liman-sky.webp';
  ambience = { base: 73.42, noiseFreq: 600, noiseVol: 0.09, noiseLfo: 0.13 };

  private found = false;
  private carve = 1;
  private solve: (() => void) | null = null;
  /** Melissa’s debut: cracks of light in the carving (0..1), sparks gathering into the bee (0..1) and dust from the stone. */
  private wakeFx = 0;
  private gather = 0;
  private sparks: { x: number; y: number }[] = [];
  private motes: { x: number; y: number; vx: number; vy: number; life: number; max: number; s: number }[] = [];

  back = (g: Ctx) => {
    skyFill(g, [
      [0, '#141640'],
      [0.38, '#3b2560'],
      [0.56, '#8c3d5e'],
      [0.65, '#df7a45'],
      [0.7, '#f6b35c'],
    ]);
    stars(g, STARS, 0.8);
    withPar(g, 0.02, () => glowDisk(g, 1080, 592, 104, '#ffd88a', 'rgba(255,170,90,.45)'));
  };

  layers: LayerSpec[] = [
    { d: 0.08, image: 'efes/liman-far.webp' },
    { d: 0.34, image: 'efes/liman-mid.webp' },
    {
      // the broken column that hides the bee carving; the painted mid layer provides the street
      d: 0.6,
      draw: (g) => {
        g.fillStyle = '#84405a';
        column(g, 1210, 792, 336, 76, { broken: true, flutes: false });
        cut(g, () => {
          g.fillRect(1210 - 36, 700, 72, 2.5);
          g.fillRect(1210 - 36, 640, 72, 2.5);
          g.fillRect(1210 - 36, 560, 72, 2.5);
        });
        g.fillStyle = '#5a2639';
        g.beginPath();
        g.ellipse(1338, 782, 46, 20, 0.15, 0, TAU);
        g.fill();
        g.beginPath();
        g.ellipse(1080, 790, 34, 14, -0.2, 0, TAU);
        g.fill();
        g.fillStyle = '#4a1f33';
        g.fillRect(1290, 740, 40, 46);
      },
    },
    { d: 0.92, image: 'efes/liman-fg.webp', shA: 0.6 },
  ];

  /** The glowing bee carving, revealed by the lamp. */
  fx = (g: Ctx) => {
    this.drawCarving(g);
    this.drawWakeFx(g);
  };

  update = (dt: number) => {
    for (const m of this.motes) {
      m.life += dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.vy += 160 * dt;
    }
    this.motes = this.motes.filter((m) => m.life < m.max);
  };

  private dust(x: number, y: number, n = 1, up = 0) {
    for (let i = 0; i < n; i++)
      this.motes.push({ x, y, vx: (Math.random() - 0.5) * 70, vy: -up * Math.random() * 120 + Math.random() * 30, life: 0, max: 0.9 + Math.random() * 0.9, s: 1.2 + Math.random() * 2.2 });
  }

  /** Cracks of light across the carving, sparks flying into one point, and the dust shaken from the stone. */
  private drawWakeFx(g: Ctx) {
    const cx = 1210;
    const cy = 606;
    if (this.wakeFx > 0.01) {
      withPar(g, 0.6, () => {
        g.save();
        g.globalCompositeOperation = 'screen';
        const w = this.wakeFx;
        const gr = g.createRadialGradient(cx, cy, 6, cx, cy, 70 + 150 * w);
        gr.addColorStop(0, `rgba(255,236,170,${0.75 * w})`);
        gr.addColorStop(1, 'rgba(255,200,100,0)');
        g.fillStyle = gr;
        dot(g, cx, cy, 70 + 150 * w);
        g.strokeStyle = `rgba(255,232,160,${0.9 * Math.min(1, w * 1.6)})`;
        g.lineWidth = 2.4;
        g.lineCap = 'round';
        for (let i = 0; i < 11; i++) {
          const a = (i / 11) * TAU + 0.3;
          const len = (40 + ((i * 37) % 50)) * w * 1.6;
          const mx = cx + Math.cos(a) * len * 0.5 + Math.sin(i * 5) * 7;
          const my = cy + Math.sin(a) * len * 0.5 + Math.cos(i * 3) * 7;
          g.beginPath();
          g.moveTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30);
          g.lineTo(mx, my);
          g.lineTo(cx + Math.cos(a) * (30 + len), cy + Math.sin(a) * (30 + len));
          g.stroke();
        }
        g.restore();
      });
    }
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const m of this.motes) {
      g.globalAlpha = (1 - m.life / m.max) * 0.85;
      g.fillStyle = 'rgba(255,226,170,1)';
      dot(g, m.x, m.y, m.s);
    }
    if (this.gather > 0 && this.gather < 1) {
      for (const s of this.sparks) {
        const k = this.gather * this.gather;
        g.globalAlpha = 0.9;
        g.fillStyle = 'rgba(255,240,190,1)';
        dot(g, s.x + (cx - s.x) * k, s.y + (cy - s.y) * k, 3.2 - 1.6 * this.gather);
      }
    }
    g.restore();
  }

  private drawCarving(g: Ctx) {
    if (this.carve <= 0) return;
    withPar(g, 0.6, () => {
      const a = rv(1210, 605, 175) * this.carve;
      const cx = 1210;
      const cy = 606;
      if (a < 0.01) return;
      g.save();
      g.globalAlpha = a;
      const gr = g.createRadialGradient(cx, cy, 4, cx, cy, 90);
      gr.addColorStop(0, 'rgba(255,214,140,.5)');
      gr.addColorStop(1, 'rgba(255,214,140,0)');
      g.fillStyle = gr;
      dot(g, cx, cy, 90);
      g.translate(cx, cy);
      g.scale(70, 70);
      g.lineJoin = 'round';
      g.strokeStyle = '#ffe2a6';
      g.lineWidth = 0.045;
      g.fillStyle = 'rgba(255,226,166,.18)';
      for (const [x, y, rx, ry, an] of BEE_PARTS) {
        g.beginPath();
        g.ellipse(x, y, rx, ry, an, 0, TAU);
        g.fill();
        g.stroke();
      }
      g.beginPath();
      g.ellipse(0, 0.1, 0.12, 0.33, 0, 0, TAU);
      g.stroke();
      g.beginPath();
      g.arc(0, -0.3, 0.1, 0, TAU);
      g.stroke();
      for (const y of [0.02, 0.14, 0.26]) {
        g.beginPath();
        g.moveTo(-0.1, y);
        g.lineTo(0.1, y);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(-0.04, -0.38);
      g.quadraticCurveTo(-0.12, -0.5, -0.2, -0.5);
      g.moveTo(0.04, -0.38);
      g.quadraticCurveTo(0.12, -0.5, 0.2, -0.5);
      g.stroke();
      g.restore();
    });
  }

  hotspots = (): Hotspot[] => [
    {
      x: 1150,
      y: 540,
      w: 120,
      h: 130,
      label: T.spot,
      act: () => {
        if (this.found || dialogOpen()) return;
        if (rv(1210, 605, 175) > 0.3) {
          this.found = true;
          this.solve?.();
        } else void say(T.tooDark);
      },
    },
  ];

  hint = () => void say(T.hint);

  async enter() {
    this.found = false;
    this.carve = 1;
    await say(T.intro);
    setGoal(T.goal);
    const auto = setTimeout(() => {
      if (!this.found && !dialogOpen()) this.hint();
    }, 32000);
    await new Promise<void>((r) => (this.solve = r));
    clearTimeout(auto);
    clearGoal();
    await this.wake();
    await say(T.wake);
    await award('ari');
    await card(T.card.title, T.card.facts, 'ari');
    await go(1);
  }

  /** Melissa’s debut: the camera pushes in, the carving cracks with light, sparks gather into a bee that shakes off the dust,
   *  loops round the column and settles by Deniz’s flashlight. */
  private async wake() {
    const c = startCine();
    const cx = 1210;
    const cy = 606;
    lamp.lock = { x: cx, y: cy };
    void camMove(c, { z: 1.55, x: 1130, y: 585 }, 1500);
    await c.sleep(800);
    if (!c.skipped) rumble(1.6);
    void camShake(c, 4, 1700);
    await c.tween(1700, (t) => {
      this.wakeFx = t;
      if (Math.random() < 0.4) this.dust(cx + (Math.random() - 0.5) * 70, 700 - Math.random() * 90, 1, 0.4);
    });
    // sparks fly in from all sides
    this.sparks = Array.from({ length: 26 }, (_, i) => ({ x: cx + Math.cos(i * 2.4) * (120 + (i % 5) * 28), y: cy + Math.sin(i * 2.4) * (90 + (i % 4) * 26) }));
    if (!c.skipped) glint(2);
    await c.tween(650, (t) => (this.gather = t));
    this.gather = 0;
    this.sparks = [];
    // the bee appears where the carving was
    if (!c.skipped) {
      buzz();
      chime();
    }
    bee.on = true;
    bee.x = cx;
    bee.y = cy;
    bee.sc = 0.1;
    bee.hold = 999;
    this.dust(cx, cy, 16, 1);
    void c.tween(700, (t) => {
      this.carve = 1 - t;
      this.wakeFx = 1 - t;
    });
    // she shakes herself and loops around the column
    await c.tween(1700, (t) => {
      const a = -Math.PI / 2 + t * TAU * 1.25;
      const r = 68 * (1 - 0.25 * t);
      const nx = cx + Math.cos(a) * r;
      bee.face = nx >= bee.x ? 1 : -1;
      bee.x = nx;
      bee.y = cy - 30 - t * 70 + Math.sin(a) * r * 0.55;
      if (t < 0.5 && Math.random() < 0.3) this.dust(bee.x, bee.y, 1, 0);
    });
    // then she flies to Deniz’s flashlight while the camera pulls back
    const from = { x: bee.x, y: bee.y };
    await Promise.all([
      c.tween(1500, (t) => {
        const e = t * t * (3 - 2 * t);
        const l = deniz.lens ?? { x: cx - 200, y: cy };
        const tx = l.x + 30;
        const ty = l.y - 78 + Math.sin(t * Math.PI * 2) * 20;
        const nx = from.x + (tx - from.x) * e;
        if (Math.abs(nx - bee.x) > 0.5) bee.face = nx > bee.x ? 1 : -1;
        bee.x = nx;
        bee.y = from.y + (ty - from.y) * e;
      }),
      camMove(c, { z: 1, x: 800, y: 450 }, 1500),
    ]);
    celebrate(1.6);
    bee.hold = 0;
    bee.vx = bee.vy = 0;
    this.carve = 0;
    this.wakeFx = 0;
    camReset();
    lamp.lock = null;
    c.end();
  }
}
