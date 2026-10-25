/* I. Liman Caddesi (Arkadiane): find the bee carved on a broken column with the lamp. */
import { Ctx, TAU, clamp, rv, stage, withPar } from '../../../engine/core';
import { buzz, chime } from '../../../engine/audio';
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
  ground = 838;
  backImage = 'efes/liman-sky.webp';
  ambience = { base: 73.42, noiseFreq: 600, noiseVol: 0.09, noiseLfo: 0.13 };

  private found = false;
  private carve = 1;
  private solve: (() => void) | null = null;

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
  };

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
    buzz();
    chime();
    bee.on = true;
    bee.x = 1210;
    bee.y = 606;
    bee.sc = 0.25;
    bee.hold = 1.3;
    const t0 = stage.T;
    await new Promise<void>((r) => {
      const iv = setInterval(() => {
        this.carve = clamp(1 - (stage.T - t0) / 1.2, 0, 1);
        if (this.carve <= 0) {
          clearInterval(iv);
          r();
        }
      }, 30);
    });
    await say(T.wake);
    await award('ari');
    await card(T.card.title, T.card.facts, 'ari');
    await go(1);
  }
}
