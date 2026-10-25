/* IV. Yazılıkaya: twelve running gods are carved on the back wall. Sweep the light along them, left to right, holding it
   on each for a moment, and they wake in marching order. Then a stag-god appears with his name, and the gods witness the
   peace treaty of Kadesh. */
import { Ctx, TAU, clamp, lamp, sstep, stage, wait, withPar } from '../../../engine/core';
import { pluck, rumble } from '../../../engine/audio';
import { clearGoal, dialogOpen, say, setGoal } from '../../../engine/dialogue';
import { award, card } from '../../../engine/hud';
import { perkStag, stag } from '../../../engine/kurunta';
import { LayerSpec } from '../../../engine/layers';
import { dot, glowDisk, makeStars, skyFill, stars } from '../../../engine/paper';
import type { Hotspot, Scene } from '../../../engine/scene';
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
  private treaty = 0; // 0..1 meeting of the two rulers
  private swap = 0; // tablets exchanged, 0..1
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
    const paint = (dx: number, dy: number, col: string) => {
      glyph(g, 'geyik', x + dx, y + 34 + dy, 112, col);
      god(g, x - 4 + dx, y + 14 + dy, 96, col, 0);
    };
    paint(-2, 2, 'rgba(52,28,36,.85)');
    paint(2, -2, 'rgba(255,236,190,.95)');
    paint(0, 0, 'rgba(176,118,78,1)');
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

  /** The two rulers of the treaty as glowing shadow puppets, drawn above the darkness. */
  fx = (g: Ctx) => {
    if (this.treaty <= 0) return;
    const t = sstep(clamp(this.treaty, 0, 1));
    const base = 700;
    g.save();
    g.globalAlpha = clamp(this.treaty * 3, 0, 1);
    g.globalCompositeOperation = 'screen';
    const gl = g.createRadialGradient(800, 560, 20, 800, 560, 340);
    gl.addColorStop(0, `rgba(255,214,130,${0.35 + this.swap * 0.3})`);
    gl.addColorStop(1, 'rgba(255,170,80,0)');
    g.fillStyle = gl;
    dot(g, 800, 560, 340);
    g.globalCompositeOperation = 'source-over';
    this.ruler(g, 330 + t * 370, base, 1, 'hatti');
    this.ruler(g, 1270 - t * 370, base, -1, 'misir');
    // the silver tablets change hands
    const lx = 330 + t * 370 + 63;
    const rx = 1270 - t * 370 - 63;
    const sw = sstep(clamp(this.swap, 0, 1));
    this.tablet(g, lx + (rx - lx) * sw, 584 - Math.sin(sw * Math.PI) * 44);
    this.tablet(g, rx + (lx - rx) * sw, 584 - Math.sin(sw * Math.PI) * 44);
    g.restore();
  };

  private ruler(g: Ctx, x: number, base: number, face: number, kind: 'hatti' | 'misir') {
    const NAVY = '#1b1646';
    const GOLD = 'rgba(255,214,140,.92)';
    g.save();
    g.translate(x, base);
    g.scale(face * 0.95, 0.95);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    const fillGold = () => {
      g.fillStyle = NAVY;
      g.strokeStyle = GOLD;
      g.lineWidth = 3;
    };
    const dots = (y: number, x0: number, x1: number, step: number) => {
      g.fillStyle = GOLD;
      for (let dx = x0; dx <= x1; dx += step) dot(g, dx, y, 2.2);
    };
    fillGold();
    if (kind === 'hatti') {
      // long fringed robe with punched bands
      g.beginPath();
      g.moveTo(-30, -150);
      g.lineTo(30, -150);
      g.lineTo(48, 0);
      for (let dx = 48; dx > -48; dx -= 12) {
        g.lineTo(dx - 6, 11);
        g.lineTo(dx - 12, 0);
      }
      g.closePath();
      g.fill();
      g.stroke();
      g.strokeStyle = GOLD;
      for (const by of [-20, -62, -104]) {
        g.beginPath();
        g.moveTo(-36 + (by + 150) * 0.0, by);
        g.lineTo(36 + (by + 150) * 0.08, by);
        g.stroke();
      }
      dots(-41, -34, 34, 11);
      dots(-83, -30, 30, 11);
      // cape over the shoulders
      g.fillStyle = '#2b2470';
      g.beginPath();
      g.moveTo(-36, -150);
      g.quadraticCurveTo(0, -178, 36, -150);
      g.quadraticCurveTo(32, -118, 0, -114);
      g.quadraticCurveTo(-32, -118, -36, -150);
      g.fill();
      g.stroke();
      // staff with a curled top in the far hand
      g.strokeStyle = GOLD;
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(-44, 0);
      g.lineTo(-44, -112);
      g.arc(-36, -118, 9, Math.PI, Math.PI * 2.6);
      g.stroke();
    } else {
      // pleated kilt, bare chest with a wide gold collar
      fillGold();
      g.beginPath();
      g.moveTo(-26, -100);
      g.lineTo(26, -100);
      g.lineTo(36, -36);
      g.lineTo(-36, -36);
      g.closePath();
      g.fill();
      g.stroke();
      g.lineWidth = 1.6;
      for (const px of [-20, -8, 4, 16]) {
        g.beginPath();
        g.moveTo(px, -98);
        g.lineTo(px * 1.3, -38);
        g.stroke();
      }
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(-24, -100);
      g.lineTo(-30, -152);
      g.lineTo(30, -152);
      g.lineTo(24, -100);
      g.closePath();
      g.fill();
      g.stroke();
      g.lineWidth = 7;
      g.beginPath();
      g.ellipse(0, -152, 30, 20, 0, 0.05 * Math.PI, 0.95 * Math.PI);
      g.stroke();
      dots(-128, -22, 22, 11);
      // legs and sandals
      g.strokeStyle = NAVY;
      g.lineWidth = 15;
      g.beginPath();
      g.moveTo(-12, -36);
      g.lineTo(-12, -6);
      g.moveTo(14, -36);
      g.lineTo(16, -6);
      g.stroke();
      g.strokeStyle = GOLD;
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(-22, 0);
      g.lineTo(0, 0);
      g.moveTo(8, 0);
      g.lineTo(30, 0);
      g.stroke();
      // crook
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(-44, 0);
      g.lineTo(-44, -120);
      g.quadraticCurveTo(-44, -136, -30, -134);
      g.stroke();
    }
    // arm reaching out to hold the tablet
    g.strokeStyle = NAVY;
    g.lineWidth = 13;
    g.beginPath();
    g.moveTo(20, -138);
    g.lineTo(62, -122);
    g.stroke();
    g.fillStyle = NAVY;
    g.strokeStyle = GOLD;
    g.lineWidth = 2.5;
    dot(g, 66, -122, 7);
    g.stroke();
    // head in profile with a big nose, a gold eye, and the headdress
    fillGold();
    g.beginPath();
    g.arc(0, kind === 'hatti' ? -182 : -176, 22, 0, TAU);
    g.fill();
    g.stroke();
    const hy = kind === 'hatti' ? -182 : -176;
    g.beginPath();
    g.moveTo(19, hy - 4);
    g.lineTo(33, hy + 6);
    g.lineTo(19, hy + 8);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = GOLD;
    dot(g, 9, hy - 3, 2.6);
    if (kind === 'hatti') {
      fillGold();
      g.beginPath();
      g.moveTo(-17, -196);
      g.lineTo(-8, -262);
      g.lineTo(12, -266);
      g.lineTo(18, -196);
      g.closePath();
      g.fill();
      g.stroke();
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(14, -236);
      g.quadraticCurveTo(38, -244, 30, -268);
      g.stroke();
      dots(-214, -8, 10, 9);
    } else {
      g.fillStyle = '#b83a2a';
      g.strokeStyle = GOLD;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(-18, -190);
      g.lineTo(-12, -224);
      g.lineTo(16, -224);
      g.lineTo(20, -190);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = '#ece6f6';
      g.beginPath();
      g.moveTo(-10, -224);
      g.lineTo(-6, -288);
      g.quadraticCurveTo(2, -300, 10, -288);
      g.lineTo(14, -224);
      g.closePath();
      g.fill();
      g.stroke();
    }
    g.restore();
  }

  private tablet(g: Ctx, x: number, y: number) {
    g.save();
    g.fillStyle = '#dfe6f4';
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2;
    g.shadowColor = 'rgba(190,220,255,.9)';
    g.shadowBlur = 18;
    g.beginPath();
    g.roundRect(x - 22, y - 32, 44, 64, 5);
    g.fill();
    g.stroke();
    g.shadowBlur = 0;
    g.fillStyle = 'rgba(80,100,140,.6)';
    for (let r = 0; r < 5; r++) g.fillRect(x - 15, y - 22 + r * 11, 30, 3);
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
    this.treaty = 0;
    this.swap = 0;
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
    // the treaty of Kadesh: Deniz and Kurunta step aside to the edges so the two rulers can meet in the middle
    lamp.tx = 1420;
    lamp.ty = 520;
    stag.park = 230;
    await this.tween((v) => (this.treaty = v), 3.2);
    await say(T.treaty.slice(0, 1));
    await this.tween((v) => (this.swap = v), 2.0);
    this.pulse = 1;
    pluck(392, 0, 0.3, 0.8, true);
    pluck(587, 0.15, 0.25, 0.8, true);
    await say(T.treaty.slice(1));
    await this.tween((v) => (this.treaty = 1 - v), 1.2);
    stag.park = null;
    await award('tanri');
    await card(T.card.title, T.card.facts, 'tanri');
    await finale();
  }
}
