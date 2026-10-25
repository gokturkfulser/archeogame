/* IV. Yazılıkaya: twelve running gods are carved on the back wall. Sweep the light along them, left to right, holding it
   on each for a moment, and they wake in marching order. Then a stag-god appears with his name, and the gods witness the
   peace treaty of Kadesh. */
import { Ctx, TAU, clamp, lamp, sstep, stage, wait, withPar } from '../../../engine/core';
import { pluck, rumble } from '../../../engine/audio';
import { clearGoal, dialogOpen, say, setGoal } from '../../../engine/dialogue';
import { award, card } from '../../../engine/hud';
import { drawStagPose, perkStag } from '../../../engine/kurunta';
import { LayerSpec } from '../../../engine/layers';
import { dot, glowDisk, makeStars, skyFill, stars } from '../../../engine/paper';
import type { Hotspot, Scene } from '../../../engine/scene';
import { playFilm } from '../../../engine/cinematic/play-film';
import { assetUrl } from '../../../engine/url';
import { finale } from '../finale';
import { glyph, god } from '../glyphs';
import { TEXT } from '../text';

const T = TEXT.yazili;
const STARS = makeStars(120, 420, 41);

const N = 12;
const GX0 = 500;
const GDX = 58;
const GBASE = 612;
const GH = 150;
const gx = (i: number) => GX0 + i * GDX;
const WALL = { x0: 290, x1: 1310, top: 120, bottom: 772 };
const NOTES = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880, 988, 1175];
/** The round niche of the stag-god, high on the middle of the back wall, with his name plate under it. */
const NICHE = { x: 800, y: 244, r: 98 };

const STONE = 'rgba(176,132,92,.92)';

export class Yazili implements Scene {
  id = 'yazili';
  num = T.num;
  name = T.name;
  dark = 0.5;
  lamp0: [number, number] = [310, 520];
  ground = 832;
  backImage = 'hattusa/yazili-sky.webp';
  ambience = { base: 73.42, noiseFreq: 460, noiseVol: 0.05, noiseLfo: 0.1, crickets: true };

  private lit = new Array<number>(N).fill(0); // 0..1 glow of each god
  private next = 0;
  private charge = 0;
  private skipAt = -99;
  private skipT = 0;
  private active = false;
  private reveal = 0; // the stag-god relief
  private pulse = 0; // all gods glow together
  private allDone: (() => void) | null = null;

  back = (g: Ctx) => {
    skyFill(g, [
      [0, '#070a28'],
      [0.7, '#1b2a6e'],
      [1, '#3a3a80'],
    ]);
    stars(g, STARS, 0.9);
    withPar(g, 0.02, () => glowDisk(g, 1250, 150, 36, '#f6e8b8', 'rgba(220,220,255,.25)'));
  };

  layers: LayerSpec[] = [
    { d: 0.06, image: 'hattusa/yazili-far.webp' },
    { d: 0.2, draw: (g) => this.drawWall(g), rim: 'rgba(255,214,160,.5)' },
    { d: 0.34, image: 'hattusa/yazili-mid.webp' },
    { d: 0.92, image: 'hattusa/yazili-fg.webp', shA: 0.6 },
  ];

  /** The rear wall of the little gallery: pale limestone with a recessed band for the procession. */
  private drawWall(g: Ctx) {
    const { x0, x1, top, bottom } = WALL;
    const gr = g.createLinearGradient(0, top, 0, bottom);
    gr.addColorStop(0, '#a77a54');
    gr.addColorStop(1, '#d9ab74');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(x0, bottom);
    g.lineTo(x0, top + 160);
    g.quadraticCurveTo(x0, top, 800, top - 10);
    g.quadraticCurveTo(x1, top, x1, top + 160);
    g.lineTo(x1, bottom);
    g.closePath();
    g.fill();
    // recessed band
    g.fillStyle = 'rgba(120,80,50,.22)';
    g.fillRect(x0 + 40, 395, x1 - x0 - 80, 250);
    g.strokeStyle = 'rgba(80,50,30,.45)';
    g.lineWidth = 3;
    g.strokeRect(x0 + 40, 395, x1 - x0 - 80, 250);
  }

  private seen(x: number, y: number) {
    return 1 - sstep(clamp(Math.hypot(lamp.x - x, lamp.y - y) / 230, 0, 1));
  }

  after = (i: number, g: Ctx) => {
    if (i !== 1) return;
    withPar(g, 0.2, () => {
      // perforations along the band
      for (let x = WALL.x0 + 62; x < WALL.x1 - 50; x += 28) {
        const l = this.seen(x, 410);
        g.fillStyle = `rgba(255,214,140,${0.25 + l * 0.6})`;
        dot(g, x, 410, 3);
        dot(g, x, 630, 3);
      }
      for (let k = 0; k < N; k++) this.drawGod(g, k);
      this.drawStagGod(g);
    });
  };

  private drawGod(g: Ctx, k: number) {
    const x = gx(k);
    const s = this.seen(x, GBASE - 90);
    const l = this.lit[k] + this.pulse * 0.7;
    const stride = k % 2 ? 1 : -1;
    g.save();
    // carving: shadow below-left, highlight above-right (the torches stand to the sides)
    g.translate(-2, 2);
    god(g, x, GBASE, GH, `rgba(52,28,36,${0.55 + s * 0.2})`, stride);
    g.translate(4, -4);
    god(g, x, GBASE, GH, `rgba(255,236,190,${0.25 + s * 0.35})`, stride);
    g.translate(-2, 2);
    god(g, x, GBASE, GH, STONE, stride);
    if (l > 0.02) {
      g.globalCompositeOperation = 'lighter';
      const gr = g.createRadialGradient(x, GBASE - 95, 6, x, GBASE - 95, 120);
      gr.addColorStop(0, `rgba(255,196,100,${clamp(l, 0, 1) * 0.55})`);
      gr.addColorStop(1, 'rgba(255,170,80,0)');
      g.fillStyle = gr;
      dot(g, x, GBASE - 95, 120);
      g.globalCompositeOperation = 'source-over';
      god(g, x, GBASE, GH, `rgba(255,190,70,${clamp(l, 0, 1) * 0.95})`, stride);
    }
    if (k === this.next && this.charge > 0.03 && this.active) {
      g.strokeStyle = 'rgba(255,214,130,.95)';
      g.lineWidth = 4;
      g.lineCap = 'round';
      g.beginPath();
      g.arc(x, GBASE - GH - 24, 13, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(this.charge, 0, 1));
      g.stroke();
    }
    g.restore();
  }

  private stagCanvas: HTMLCanvasElement | null = null;
  private stagMask: HTMLCanvasElement | null = null;
  /** Kurunta’s puppet drawn once into a small canvas; null until his images have loaded. */
  private stagRelief(): HTMLCanvasElement | null {
    if (this.stagCanvas) return this.stagCanvas;
    const c = document.createElement('canvas');
    c.width = 240;
    c.height = 190;
    const g = c.getContext('2d')!;
    if (!drawStagPose(g, c.width / 2, c.height - 10, 0.27, 1)) return null;
    this.stagCanvas = c;
    this.stagMask = document.createElement('canvas');
    this.stagMask.width = c.width;
    this.stagMask.height = c.height;
    return c;
  }

  /** The god standing on a stag, cut into a round niche on the wall, with his brass name plate. */
  private drawStagGod(g: Ctx) {
    const a = this.reveal;
    if (a <= 0.01) return;
    const { x, y, r } = NICHE;
    g.save();
    g.globalAlpha = a;
    // the niche: a darker recess with a punched rim
    g.fillStyle = 'rgba(96,60,40,.55)';
    dot(g, x, y, r);
    g.strokeStyle = 'rgba(70,42,28,.7)';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.stroke();
    g.fillStyle = 'rgba(255,214,140,.9)';
    for (let q = 0; q < 28; q++) dot(g, x + Math.cos((q / 28) * TAU) * (r + 9), y + Math.sin((q / 28) * TAU) * (r + 9), 2.4);
    // the stag is Kurunta himself, carved: his own puppet art in a stone tint, with the god standing on his back
    const relief = this.stagRelief();
    const paint = (dx: number, dy: number, col: string) => {
      if (relief) {
        // a flat silhouette in `col`
        const m = this.stagMask!;
        const mg = m.getContext('2d')!;
        mg.clearRect(0, 0, m.width, m.height);
        mg.drawImage(relief, 0, 0);
        mg.globalCompositeOperation = 'source-in';
        mg.fillStyle = col;
        mg.fillRect(0, 0, m.width, m.height);
        mg.globalCompositeOperation = 'source-over';
        g.drawImage(m, x - m.width / 2 + dx, y - m.height / 2 + 4 + dy);
      } else glyph(g, 'geyik', x + dx, y + 34 + dy, 112, col);
      if (relief) god(g, x - 24 + dx, y + 42 + dy, 62, col, 0);
      else god(g, x - 4 + dx, y + 14 + dy, 96, col, 0);
    };
    paint(-2, 2, 'rgba(52,28,36,.85)');
    paint(2, -2, 'rgba(255,236,190,.95)');
    if (relief) {
      // the body: the puppet’s own shading, toned like carved stone
      g.save();
      g.filter = 'grayscale(1) sepia(.65) brightness(1.05) contrast(1.05)';
      g.globalAlpha = 0.95;
      g.drawImage(relief, x - relief.width / 2, y - relief.height / 2 + 4);
      g.restore();
      paint(0, 0, 'rgba(176,118,78,.28)');
    } else paint(0, 0, 'rgba(176,118,78,1)');
    g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(x, y, 10, x, y, r * 1.8);
    gr.addColorStop(0, 'rgba(255,200,110,.35)');
    gr.addColorStop(1, 'rgba(255,170,80,0)');
    g.fillStyle = gr;
    dot(g, x, y, r * 1.8);
    g.globalCompositeOperation = 'source-over';
    // brass name plate
    g.fillStyle = '#7a5a2a';
    g.beginPath();
    g.roundRect(x - 92, y + r + 18, 184, 40, 6);
    g.fill();
    g.strokeStyle = '#e9c46a';
    g.lineWidth = 2.5;
    g.stroke();
    g.fillStyle = '#fbe6a8';
    g.font = '700 23px Marcellus, Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('KURUNTA', x, y + r + 39);
    g.restore();
  }

  update = (dt: number) => {
    this.pulse = Math.max(0, this.pulse - dt * 0.5);
    for (let k = 0; k < N; k++) if (k < this.next) this.lit[k] = Math.min(1, this.lit[k] + dt * 3);
    if (!this.active || dialogOpen()) return;
    let j = -1;
    if (lamp.y > 330 && lamp.y < 700) {
      for (let k = 0; k < N; k++) if (Math.abs(lamp.x - gx(k)) < GDX * 0.5) j = k;
    }
    if (j === this.next) {
      this.charge += dt / 0.4;
      if (this.charge >= 1) {
        this.charge = 0;
        pluck(NOTES[this.next], 0, 0.28, 0.8, true);
        this.next++;
        if (this.next === N) this.allDone?.();
      }
      this.skipT = 0;
    } else if (j > this.next) {
      this.charge = Math.max(0, this.charge - dt);
      this.skipT += dt;
      // only a light that lingers on a later god counts as skipping ahead, not one passing by
      if (this.skipT > 1.1 && stage.T - this.skipAt > 8) {
        this.skipAt = stage.T;
        this.skipT = 0;
        void say(T.skip);
      }
    } else {
      this.charge = Math.max(0, this.charge - dt * 1.5);
      this.skipT = 0;
    }
  };

  hotspots = (): Hotspot[] =>
    Array.from({ length: N }, (_, k) => ({
      x: gx(k) - 29,
      y: GBASE - GH - 20,
      w: 58,
      h: GH + 30,
      label: T.god(k),
      act: () => {
        if (dialogOpen() || !this.active) return;
        lamp.tx = gx(k);
        lamp.ty = GBASE - 90;
      },
    }));

  hint = () => void say(T.hint);

  private async tween(set: (v: number) => void, secs: number) {
    const t0 = stage.T;
    await new Promise<void>((r) => {
      const iv = setInterval(() => {
        const v = clamp((stage.T - t0) / secs, 0, 1);
        set(v);
        if (v >= 1) {
          clearInterval(iv);
          r();
        }
      }, 30);
    });
  }

  async enter() {
    this.lit.fill(0);
    this.next = 0;
    this.charge = 0;
    this.reveal = 0;
    this.pulse = 0;
    await say(T.intro);
    setGoal(T.goal);
    this.active = true;
    const auto = setTimeout(() => {
      if (this.next < N && !dialogOpen()) this.hint();
    }, 36000);
    await new Promise<void>((r) => (this.allDone = r));
    clearTimeout(auto);
    this.active = false;
    clearGoal();
    this.pulse = 1;
    await wait(700);
    await say(T.allLit);
    rumble(1.8);
    await this.tween((v) => (this.reveal = v), 2.2);
    perkStag();
    await say(T.plaque);
    // the treaty of Kadesh is a film (video/src/Beat/KadesTreaty.tsx): the first line sets the scene, the film plays, the rest follows
    await say(T.treaty.slice(0, 1));
    await playFilm({ webm: assetUrl('hattusa/kades.webm'), mp4: assetUrl('hattusa/kades.mp4'), poster: assetUrl('hattusa/kades-poster.webp') }, 1500);
    this.pulse = 1;
    await say(T.treaty.slice(1));
    await award('tanri');
    await card(T.card.title, T.card.facts, 'tanri');
    await finale();
  }
}
