/* III. Celsus Kütüphanesi: put the four virtue statues in the niche whose engraved letter starts their Greek name. */
import { Ctx, TAU, rv, wait, withPar } from '../../../engine/core';
import { chime, pluck } from '../../../engine/audio';
import { clearGoal, dialogOpen, say, setGoal } from '../../../engine/dialogue';
import { go } from '../../../engine/game';
import { award, card } from '../../../engine/hud';
import { LayerSpec } from '../../../engine/layers';
import { archPath, column, cut, dot, makeStars, perfArc, perfLine, skyFill, stars } from '../../../engine/paper';
import type { Hotspot, Scene } from '../../../engine/scene';
import { drawStatue } from '../statues';
import { TEXT } from '../text';

const T = TEXT.kutuphane;
const STARS = makeStars(60, 300, 31);

const NICHES = [450, 650, 950, 1150];
const LETTERS = ['Σ', 'Α', 'Ε', 'Ε'];
const VIRTUES = [
  { gr: 'ΣΟΦΙΑ', lat: 'Sophia', tr: 'Bilgelik' },
  { gr: 'ΑΡΕΤΗ', lat: 'Arete', tr: 'Erdem' },
  { gr: 'ΕΝΝΟΙΑ', lat: 'Ennoia', tr: 'Düşünce' },
  { gr: 'ΕΠΙΣΤΗΜΗ', lat: 'Episteme', tr: 'Bilgi' },
];
const NOTES = [293.66, 311.13, 369.99, 392.0, 440.0];

export class Kutuphane implements Scene {
  id = 'kutuphane';
  num = T.num;
  name = T.name;
  dark = 0.4;
  lamp0: [number, number] = [800, 600];
  ground = 872;
  backImage = 'efes/kutuphane-sky.webp';
  ambience = { base: 65.41, noiseFreq: 400, noiseVol: 0.025, noiseLfo: 0.08, crickets: true };

  /** Which statue stands in each niche (null = empty). The right answer is slots[i] === i. */
  slots: (number | null)[] = [null, null, null, null];
  /** The statue picked up from the tray or from a niche. */
  sel: number | null = null;
  done = false;
  private solve: (() => void) | null = null;

  back = (g: Ctx) => {
    skyFill(g, [
      [0, '#10153f'],
      [0.55, '#2b357f'],
      [0.8, '#b0603e'],
      [0.92, '#e0904a'],
    ]);
    stars(g, STARS, 0.7);
    withPar(g, 0.03, () => {
      const gr = g.createRadialGradient(800, 430, 40, 800, 430, 640);
      gr.addColorStop(0, 'rgba(255,196,120,.42)');
      gr.addColorStop(1, 'rgba(255,196,120,0)');
      g.fillStyle = gr;
      dot(g, 800, 430, 640);
    });
  };

  layers: LayerSpec[] = [
    { d: 0.06, image: 'efes/kutuphane-far.webp' },
    { d: 0.2, image: 'efes/kutuphane-mid.webp' },
    {
      d: 0.42,
      draw: (g) => {
        g.fillStyle = '#c4822f';
        g.fillRect(380, 460, 840, 300);
        g.fillRect(410, 220, 780, 240);
        g.fillStyle = '#2d1712';
        g.beginPath();
        archPath(g, 748, 552, 104, 208);
        archPath(g, 523, 610, 54, 150);
        archPath(g, 1023, 610, 54, 150);
        g.fill();
        g.beginPath();
        archPath(g, 521, 296, 58, 96);
        archPath(g, 768, 284, 64, 110);
        archPath(g, 1021, 296, 58, 96);
        g.fill();
        for (const cx of NICHES) {
          g.fillStyle = '#6d3a1a';
          g.beginPath();
          archPath(g, cx - 37, 486, 74, 204);
          g.fill();
          g.fillStyle = '#e2a656';
          g.fillRect(cx - 46, 690, 92, 42);
        }
        g.fillStyle = '#a8642a';
        g.fillRect(330, 760, 940, 30);
        g.fillStyle = '#93561f';
        g.fillRect(290, 790, 1020, 36);
        g.fillStyle = '#7d481b';
        g.fillRect(250, 826, 1100, 40);
      },
      glow: (g) => {
        perfLine(g, 416, 240, 1184, 240, 12, 1.7, 'rgba(255,232,170,.8)');
        for (const cx of NICHES) perfArc(g, cx, 523, 44, 44, Math.PI, TAU, 9, 1.5, 'rgba(255,232,170,.75)');
      },
    },
    {
      d: 0.5,
      draw: (g) => {
        g.fillStyle = '#f0c47e';
        for (const cx of NICHES) {
          for (const dx of [-56, 56]) {
            g.fillRect(cx + dx - 20, 712, 40, 48);
            column(g, cx + dx, 712, 252, 26, { cap: 'cor' });
          }
        }
        g.fillRect(372, 418, 856, 42);
        for (const cx of NICHES) g.fillRect(cx - 84, 412, 168, 54);
        for (const cx of [550, 800, 1050]) {
          column(g, cx - 42, 412, 192, 20, { cap: 'cor' });
          column(g, cx + 42, 412, 192, 20, { cap: 'cor' });
          g.fillRect(cx - 66, 192, 132, 30);
        }
        g.fillRect(395, 198, 810, 22);
        for (const cx of [550, 1050]) {
          g.beginPath();
          g.moveTo(cx - 72, 194);
          g.lineTo(cx + 72, 194);
          g.lineTo(cx, 148);
          g.closePath();
          g.fill();
        }
        g.beginPath();
        g.moveTo(800 - 74, 194);
        g.quadraticCurveTo(800, 128, 800 + 74, 194);
        g.closePath();
        g.fill();
        cut(g, () => {
          for (const cx of [550, 1050]) {
            g.beginPath();
            g.moveTo(cx - 48, 188);
            g.lineTo(cx + 48, 188);
            g.lineTo(cx, 160);
            g.closePath();
            g.fill();
          }
          g.beginPath();
          g.moveTo(800 - 50, 188);
          g.quadraticCurveTo(800, 148, 800 + 50, 188);
          g.closePath();
          g.fill();
          g.fillRect(380, 428, 840, 2);
        });
      },
      glow: (g) => perfLine(g, 376, 414, 1224, 414, 10, 1.5, 'rgba(255,240,200,.85)'),
    },
    { d: 0.82, image: 'efes/kutuphane-fg.webp', shA: 0.55 },
  ];

  after = (i: number, g: Ctx) => {
    if (i === 2) this.drawNiches(g);
    else if (i === 3) this.drawInscription(g);
  };

  /** Engraved letters (lit by the lamp) and the statues standing in the niches. */
  private drawNiches(g: Ctx) {
    withPar(g, 0.42, () => {
      for (let n = 0; n < 4; n++) {
        const cx = NICHES[n];
        const a = rv(cx, 712, 170);
        if (a > 0.01) {
          g.save();
          g.globalAlpha = a;
          g.font = '700 34px Alegreya, Georgia, serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillStyle = 'rgba(60,25,10,.7)';
          g.fillText(LETTERS[n], cx + 1.5, 714);
          g.fillStyle = '#fff1c9';
          g.shadowColor = 'rgba(255,200,110,.9)';
          g.shadowBlur = 14;
          g.fillText(LETTERS[n], cx, 711);
          g.restore();
        }
        const st = this.slots[n];
        if (st !== null) {
          drawStatue(g, st, cx, 688, 1.08, this.done ? '#fff3d8' : '#efe2c8');
          if (this.sel === st) {
            g.strokeStyle = 'rgba(255,200,90,.9)';
            g.lineWidth = 3;
            g.setLineDash([6, 6]);
            g.strokeRect(cx - 40, 500, 80, 188);
            g.setLineDash([]);
          }
        }
      }
    });
  }

  /** The advice carved above the niches, readable only where the lamp shines (or once solved). */
  private drawInscription(g: Ctx) {
    const text = T.inscription;
    withPar(g, 0.5, () => {
      g.font = '22px Marcellus, Georgia, serif';
      g.textBaseline = 'middle';
      const sp = 7;
      let wsum = 0;
      const ws = [...text].map((c) => {
        const w = g.measureText(c).width;
        wsum += w + sp;
        return w;
      });
      let x = 800 - wsum / 2;
      [...text].forEach((c, k) => {
        const a = this.done ? 1 : rv(x + ws[k] / 2, 444, 190);
        if (a > 0.01) {
          g.globalAlpha = a;
          g.fillStyle = '#5a2a0e';
          g.fillText(c, x + 1, 446);
          g.fillStyle = '#fff6dc';
          g.shadowColor = 'rgba(255,200,110,.9)';
          g.shadowBlur = 10;
          g.fillText(c, x, 444);
          g.shadowBlur = 0;
          g.globalAlpha = 1;
        }
        x += ws[k] + sp;
      });
    });
  }

  hotspots = (): Hotspot[] => NICHES.map((cx, n) => ({ x: cx - 42, y: 490, w: 84, h: 244, label: T.niche(n), act: () => this.niche(n) }));

  private niche(n: number) {
    if (this.done || dialogOpen()) return;
    if (this.sel === null) {
      if (this.slots[n] !== null) {
        this.sel = this.slots[n];
        this.refreshTray();
        pluck(392, 0, 0.15, 0.4);
      }
      return;
    }
    const s = this.sel;
    const from = this.slots.indexOf(s);
    const occ = this.slots[n];
    if (from === n) {
      this.sel = null;
      this.refreshTray();
      return;
    }
    if (from >= 0) this.slots[from] = occ;
    this.slots[n] = s;
    this.sel = null;
    pluck(NOTES[n], 0, 0.25, 0.5);
    this.refreshTray();
    if (this.slots.every((v) => v !== null)) this.check();
  }

  private check() {
    if (this.slots.every((v, i) => v === i)) {
      this.done = true;
      this.solve?.();
      return;
    }
    const lettersOk = this.slots.every((v, i) => VIRTUES[v!].gr[0] === LETTERS[i]);
    void say(lettersOk ? T.twoE : T.wrong);
  }

  private buildTray() {
    const tray = document.getElementById('tray') as HTMLElement;
    tray.innerHTML = '';
    tray.setAttribute('aria-label', T.tray);
    VIRTUES.forEach((v, i) => {
      const b = document.createElement('button');
      b.className = 'statue';
      b.dataset.i = String(i);
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', T.statue(v.lat, v.tr, v.gr));
      const c = document.createElement('canvas');
      c.width = 88;
      c.height = 132;
      drawStatue(c.getContext('2d')!, i, 40, 128, 0.72, '#4a2a3c', '#a0809a');
      b.append(c);
      const gr = document.createElement('span');
      gr.className = 'gr';
      gr.textContent = v.gr;
      const tr = document.createElement('span');
      tr.className = 'tr';
      tr.textContent = v.tr;
      b.append(gr, tr);
      b.onclick = () => {
        if (this.done) return;
        this.sel = this.sel === i ? null : i;
        this.refreshTray();
        pluck(330, 0, 0.12, 0.3);
      };
      tray.append(b);
    });
    tray.hidden = false;
    this.refreshTray();
  }

  private refreshTray() {
    document.querySelectorAll<HTMLElement>('.statue').forEach((b) => {
      const i = +b.dataset.i!;
      b.setAttribute('aria-pressed', String(this.sel === i));
      b.classList.toggle('placed', this.slots.includes(i) && this.sel !== i);
    });
  }

  hint = () => void say(T.hint);

  exit = () => {
    (document.getElementById('tray') as HTMLElement).hidden = true;
  };

  async enter() {
    this.slots = [null, null, null, null];
    this.sel = null;
    this.done = false;
    await say(T.intro);
    this.buildTray();
    setGoal(T.goal);
    await new Promise<void>((r) => (this.solve = r));
    clearGoal();
    chime();
    await wait(700);
    await say(T.solved);
    (document.getElementById('tray') as HTMLElement).hidden = true;
    await award('palmiye');
    await card(T.card.title, T.card.facts, 'palmiye');
    await go(3);
  }
}
