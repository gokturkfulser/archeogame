/* II. Büyük Tiyatro: repeat the melody by touching the seat bands (a Simon-style echo puzzle). */
import { Ctx, TAU, rv, wait, withPar } from '../../../engine/core';
import { pluck } from '../../../engine/audio';
import { clearGoal, dialogOpen, say, setGoal } from '../../../engine/dialogue';
import { go } from '../../../engine/game';
import { award, card } from '../../../engine/hud';
import { LayerSpec } from '../../../engine/layers';
import { cut, dot, glowDisk, makeStars, perfArc, skyFill, stars } from '../../../engine/paper';
import type { Hotspot, Scene } from '../../../engine/scene';
import { TEXT } from '../text';

const T = TEXT.tiyatro;
const STARS = makeStars(140, 420, 23);

/** The cavea is a half-ellipse of seat bands centred here; BANDS are the radii between the five playable bands. */
const TCX = 800;
const TCY = 760;
const TK = 0.42;
const BANDS = [260, 396, 532, 668, 804, 940];
const NOTES = [293.66, 311.13, 369.99, 392.0, 440.0];

export class Tiyatro implements Scene {
  id = 'tiyatro';
  num = T.num;
  name = T.name;
  dark = 0.36;
  lamp0: [number, number] = [800, 520];
  ground = 852;
  backImage = 'efes/tiyatro-sky.webp';
  ambience = { base: 73.42, noiseFreq: 400, noiseVol: 0.025, noiseLfo: 0.08, crickets: true };

  private glowB = [0, 0, 0, 0, 0];
  private ripples: { r: number; a: number }[] = [];
  /** Receives the band the player touched while the puzzle is waiting for input. */
  private input: ((b: number) => void) | null = null;
  replay: (() => void) | null = null;
  /** The melody currently being asked (kept readable for the play-through test). */
  currentSeq: number[] = [];

  back = (g: Ctx) => {
    skyFill(g, [
      [0, '#0a0d2e'],
      [0.5, '#1a2766'],
      [1, '#2f478e'],
    ]);
    stars(g, STARS);
    withPar(g, 0.02, () => {
      glowDisk(g, 1290, 150, 50, '#f3e4b6', 'rgba(220,220,255,.25)');
      g.fillStyle = 'rgba(180,170,140,.35)';
      dot(g, 1275, 140, 9);
      dot(g, 1302, 168, 6);
    });
  };

  layers: LayerSpec[] = [
    { d: 0.06, image: 'efes/tiyatro-far.webp' },
    {
      d: 0.2,
      draw: (g) => {
        g.fillStyle = '#4b5fae';
        g.beginPath();
        g.ellipse(TCX, TCY, 940, 940 * TK, 0, Math.PI, TAU);
        g.lineTo(TCX + 940, TCY + 320);
        g.lineTo(TCX - 940, TCY + 320);
        g.closePath();
        g.fill();
        g.fillStyle = '#34468c';
        g.beginPath();
        g.ellipse(TCX, TCY, 255, 255 * TK, 0, Math.PI, TAU);
        g.lineTo(TCX + 255, TCY + 320);
        g.lineTo(TCX - 255, TCY + 320);
        g.fill();
        cut(g, () => {
          g.strokeStyle = '#000';
          g.lineWidth = 2.3;
          for (let rx = 276; rx < 936; rx += 17) {
            if (BANDS.some((b) => Math.abs(b - rx) < 9)) continue;
            g.beginPath();
            g.ellipse(TCX, TCY, rx, rx * TK, 0, Math.PI, TAU);
            g.stroke();
          }
          g.lineWidth = 6.5;
          for (const b of BANDS.slice(1, 5)) {
            g.beginPath();
            g.ellipse(TCX, TCY, b, b * TK, 0, Math.PI, TAU);
            g.stroke();
          }
          g.lineWidth = 3.2;
          for (let j = 1; j < 14; j++) {
            const a = Math.PI + (Math.PI * j) / 14;
            g.beginPath();
            g.moveTo(TCX + 262 * Math.cos(a), TCY + 262 * TK * Math.sin(a));
            g.lineTo(TCX + 938 * Math.cos(a), TCY + 938 * TK * Math.sin(a));
            g.stroke();
          }
        });
      },
      glow: (g) => perfArc(g, TCX, TCY, 948, 948 * TK + 6, Math.PI, TAU, 16, 2.2, 'rgba(255,214,140,.85)'),
    },
    { d: 0.5, image: 'efes/tiyatro-mid.webp' },
    { d: 0.88, image: 'efes/tiyatro-fg.webp', shA: 0.55 },
  ];

  after = (i: number, g: Ctx) => {
    if (i === 1) this.drawBandGlow(g);
    else if (i === 2) this.drawMasks(g);
  };

  private drawBandGlow(g: Ctx) {
    withPar(g, 0.2, () => {
      g.globalCompositeOperation = 'lighter';
      for (let b = 0; b < 5; b++) {
        const a = this.glowB[b];
        if (a < 0.01) continue;
        g.fillStyle = `rgba(255,186,84,${a * 0.62})`;
        g.beginPath();
        g.ellipse(TCX, TCY, BANDS[b + 1], BANDS[b + 1] * TK, 0, Math.PI, TAU);
        g.ellipse(TCX, TCY, BANDS[b], BANDS[b] * TK, 0, TAU, Math.PI, true);
        g.fill();
        const mid = (BANDS[b] + BANDS[b + 1]) / 2;
        perfArc(g, TCX, TCY, mid, mid * TK, Math.PI, TAU, 18, 3.2 * a + 0.5, `rgba(255,240,190,${a})`);
      }
      for (const rp of this.ripples) {
        g.strokeStyle = `rgba(255,226,170,${rp.a * 0.6})`;
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(TCX, TCY, rp.r, rp.r * TK, 0, Math.PI, TAU);
        g.stroke();
      }
      g.globalCompositeOperation = 'source-over';
    });
  }

  /** The two stage masks glow when the lamp comes near. */
  private drawMasks(g: Ctx) {
    withPar(g, 0.5, () => {
      for (const [mx, my, sad] of [
        [560, 834, 0],
        [1040, 834, 1],
      ]) {
        const a = rv(mx, my, 150);
        if (a < 0.01) continue;
        g.save();
        g.globalAlpha = a;
        g.translate(mx, my);
        g.strokeStyle = '#ffe2a6';
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(-26, -24);
        g.quadraticCurveTo(0, -36, 26, -24);
        g.quadraticCurveTo(30, 10, 0, 30);
        g.quadraticCurveTo(-30, 10, -26, -24);
        g.stroke();
        g.beginPath();
        g.ellipse(-10, -8, 6, 3, sad ? 0.3 : -0.3, 0, TAU);
        g.ellipse(10, -8, 6, 3, sad ? -0.3 : 0.3, 0, TAU);
        g.stroke();
        g.beginPath();
        if (sad) g.arc(0, 20, 9, Math.PI * 1.15, Math.PI * 1.85);
        else g.arc(0, 6, 10, 0.15 * Math.PI, 0.85 * Math.PI);
        g.stroke();
        g.restore();
      }
    });
  }

  update = (dt: number) => {
    for (let b = 0; b < 5; b++) this.glowB[b] = Math.max(0, this.glowB[b] - dt * 1.15);
    this.ripples.forEach((r) => {
      r.r += dt * 420;
      r.a -= dt * 0.7;
    });
    this.ripples = this.ripples.filter((r) => r.a > 0);
  };

  private bandAt(x: number, y: number): number {
    if (y > TCY) return -1;
    const r = Math.hypot(x - TCX, (y - TCY) / TK);
    for (let b = 0; b < 5; b++) if (r >= BANDS[b] && r < BANDS[b + 1]) return b;
    return -1;
  }

  private sound(b: number, vol = 0.38) {
    pluck(NOTES[b], 0, vol, 0.65, true);
    this.glowB[b] = 1;
    this.ripples.push({ r: BANDS[b], a: 0.8 });
  }

  private press(b: number) {
    if (!this.input || dialogOpen()) return;
    this.sound(b);
    this.input(b);
  }

  onClick = (x: number, y: number) => {
    const b = this.bandAt(x, y);
    if (b >= 0) this.press(b);
  };

  onKey = (e: KeyboardEvent) => {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 5) this.press(n - 1);
  };

  hotspots = (): Hotspot[] =>
    BANDS.slice(0, 5).map((b, i) => {
      const r = (b + BANDS[i + 1]) / 2;
      return { x: TCX - 40, y: TCY - r * TK - 18, w: 80, h: 36, label: T.band(i), act: () => this.press(i) };
    });

  hint = () => void say(T.hint);

  private async playSeq(seq: number[]) {
    this.input = null;
    await wait(450);
    for (const b of seq) {
      this.sound(b, 0.42);
      await wait(720);
    }
  }

  async enter() {
    this.input = null;
    this.replay = null;
    await say(T.intro);
    setGoal(T.goal, { replay: true });
    const lens = [4, 5];
    for (let round = 0; round < lens.length; round++) {
      const seq: number[] = [];
      for (let i = 0; i < lens[round]; i++) {
        let b: number;
        do b = Math.floor(Math.random() * 5);
        while (i > 0 && b === seq[i - 1]);
        seq.push(b);
      }
      this.currentSeq = seq;
      let ok: boolean | null = false;
      while (!ok) {
        await this.playSeq(seq);
        ok = await new Promise<boolean | null>((res) => {
          let k = 0;
          this.replay = () => {
            this.input = null;
            res(null);
          };
          this.input = (b) => {
            if (b !== seq[k]) {
              this.input = null;
              res(false);
              return;
            }
            k++;
            if (k === seq.length) {
              this.input = null;
              res(true);
            }
          };
        });
        if (ok === false) {
          await wait(500);
          await say(T.wrong);
        }
        if (ok === null) ok = false;
      }
      if (round === 0) {
        await wait(400);
        await say(T.round1);
      }
    }
    this.replay = null;
    this.currentSeq = [];
    clearGoal();
    for (let b = 0; b < 5; b++) setTimeout(() => this.sound(b, 0.3), b * 110);
    await wait(900);
    await say(T.solved);
    await award('geyik');
    await card(T.card.title, T.card.facts, 'geyik');
    await go(2);
  }
}
