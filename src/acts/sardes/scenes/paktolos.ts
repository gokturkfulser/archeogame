/* I. Paktolos Çayı: seven gold flakes tumble down the river. A flake only flashes while it faces the beam, so the light has to
   stay on it until it does. Catch seven and they swirl into Alyat (his debut). Uses the engine’s glint system (reflect.ts). */
import { Ctx, H, RM, TAU, W, clamp, lamp, rng, sstep, stage, wait, withPar } from '../../../engine/core';
import { chime, glint, pluck, rumble } from '../../../engine/audio';
import { lion, placeLion } from '../../../engine/alyat';
import { startCine } from '../../../engine/cinematic';
import { camMove, camReset } from '../../../engine/cinematic/camera';
import { clearGoal, dialogOpen, say, setGoal } from '../../../engine/dialogue';
import { deniz } from '../../../engine/deniz';
import { award, card } from '../../../engine/hud';
import { LayerSpec } from '../../../engine/layers';
import { dot } from '../../../engine/paper';
import { drawGlint } from '../../../engine/reflect-draw';
import { Glint, glintLevel, traceBeam } from '../../../engine/reflect';
import type { Hotspot, Scene } from '../../../engine/scene';
import { TEXT } from '../text';

const T = TEXT.paktolos;
const TOTAL = 7;
/** How many flakes drift at once; the river never runs dry, a flake that leaves upstream-bound returns at the source. */
const SLOTS = 3;
/** The water, in world y. The far bank’s feet end under it, the near bank covers its lower edge. */
const RIVER = { top: 626, bottom: 790 };
const FLAKE_Y = [660, 748];
const SPAWN_X = -70;
/** Pitch of the seven catches: a rising D-minor-ish scale. */
const NOTES = [293.66, 329.63, 349.23, 392, 440, 466.16, 587.33];

interface Flake {
  x: number;
  y: number;
  vx: number;
  bob: number;
  rot: number;
  spin: number;
  /** 0..1: how long the light has stayed on it while it faces the beam. */
  meter: number;
  /** Seconds before it appears at the source; <0 = drifting. */
  wait: number;
  /** After a catch it flies to Deniz: 0..1 progress, from (cx, cy). */
  fly: number;
  cx: number;
  cy: number;
  level: number;
}

const rand = rng(41);

export class Paktolos implements Scene {
  id = 'paktolos';
  num = T.num;
  name = T.name;
  dark = 0.34;
  lamp0: [number, number] = [640, 690];
  focus: [number, number] = [700, 700];
  ground = 852;
  denizHeight = 300;
  /** Deniz is drawn after the near bank strip, before the foreground reeds. */
  denizAfter = 2;
  backImage = 'sardes/paktolos-sky.webp';
  ambience = { base: 87.31, noiseFreq: 760, noiseVol: 0.07, noiseLfo: 0.19 };
  assets = ['sardes/paktolos-far.webp', 'sardes/paktolos-mid.webp', 'sardes/paktolos-near.webp', 'sardes/paktolos-fg.webp'];

  /** Counted by tests and the goal tag. */
  caught = 0;
  flakes: Flake[] = [];
  private spec: { x: number; y: number; r: number; p: number }[] = [];
  private run = false;
  private done: (() => void) | null = null;
  private vortex = -1;
  private flash = 0;
  private burst: { a: number; r: number; w: number; tx: number; ty: number; s: number }[] = [];
  private fallback = 0;

  back = (g: Ctx) => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#1a1a52');
    gr.addColorStop(0.5, '#6a3a76');
    gr.addColorStop(1, '#f39a48');
    g.fillStyle = gr;
    g.fillRect(-300, -300, W + 600, H + 600);
  };

  layers: LayerSpec[] = [
    { d: 0.06, image: 'sardes/paktolos-far.webp' },
    { d: 0.2, image: 'sardes/paktolos-mid.webp' },
    // the near bank strip sits lower than it was painted so the water gets room
    { d: 0.62, image: 'sardes/paktolos-near.webp', rect: [-250, 62, 2100, 900], shA: 0.5 },
    { d: 0.95, image: 'sardes/paktolos-fg.webp', shA: 0.55, rect: [-250, 0, 2100, 900] },
  ];

  constructor() {
    for (let i = 0; i < 46; i++) this.spec.push({ x: rand() * 1900 - 150, y: RIVER.top + 8 + rand() * (RIVER.bottom - RIVER.top - 30), r: 1 + rand() * 1.7, p: rand() * TAU });
  }

  /** The flowing paper river: banded strips of lapis and rose that slide at different speeds, with gold dust glinting between. */
  private river(g: Ctx) {
    const { Mx } = stage;
    const T0 = RM ? 0 : stage.T;
    const x0 = -Mx - 120;
    const x1 = W + Mx + 120;
    const top = RIVER.top;
    const bot = RIVER.bottom + 30;
    // the water takes the colours of the sky: rose and gold at the far bank, lapis and indigo near
    const gr = g.createLinearGradient(0, top, 0, bot);
    gr.addColorStop(0, '#f08a5a');
    gr.addColorStop(0.22, '#b4506e');
    gr.addColorStop(0.6, '#3c3d86');
    gr.addColorStop(1, '#14143e');
    g.fillStyle = gr;
    g.fillRect(x0, top, x1 - x0, bot - top);

    // paper strips: each is a wavy ribbon, nearer ones are bigger and faster
    const bands = 9;
    for (let i = 0; i < bands; i++) {
      const f = i / (bands - 1);
      const y = top + 8 + f * (bot - top - 24);
      const amp = 2.5 + f * 6;
      const len = 150 + f * 230;
      const speed = 16 + f * 62;
      const off = (T0 * speed) % len;
      g.fillStyle = i % 2 ? `rgba(255,224,170,${0.1 + f * 0.1})` : `rgba(26,24,80,${0.18 + f * 0.18})`;
      g.beginPath();
      g.moveTo(x0, y + 10 + f * 6);
      for (let x = x0; x <= x1; x += 18) g.lineTo(x, y + Math.sin(((x - off) / len) * TAU) * amp);
      for (let x = x1; x >= x0; x -= 18) g.lineTo(x, y + 9 + f * 8 + Math.sin(((x - off) / len) * TAU + 0.9) * amp);
      g.closePath();
      g.fill();
      // a thin gold rim on the crest, like light along a cut edge
      g.strokeStyle = `rgba(255,214,140,${0.18 + f * 0.28})`;
      g.lineWidth = 1.2 + f * 1.2;
      g.beginPath();
      for (let x = x0; x <= x1; x += 18) {
        const yy = y + Math.sin(((x - off) / len) * TAU) * amp;
        if (x === x0) g.moveTo(x, yy);
        else g.lineTo(x, yy);
      }
      g.stroke();
    }
    // foam line where the water meets the far bank
    g.fillStyle = 'rgba(255,236,200,.22)';
    g.fillRect(x0, top, x1 - x0, 3);

    // tiny gold dust glitter, twinkling
    g.save();
    g.globalCompositeOperation = 'screen';
    for (const s of this.spec) {
      const tw = RM ? 0.6 : 0.5 + 0.5 * Math.sin(stage.T * 2.1 + s.p);
      if (tw < 0.25) continue;
      const x = ((s.x + T0 * (24 + (s.y - top) * 0.2)) % (x1 - x0)) + x0;
      g.fillStyle = `rgba(255,226,150,${0.5 * tw})`;
      dot(g, x, s.y, s.r);
    }
    g.restore();
  }

  /** The seven flakes in the water, drawn as dull gold leaves that tumble: wide when they face you, thin when they turn away. */
  private drawFlakes(g: Ctx) {
    for (const f of this.flakes) {
      if (f.wait >= 0 || f.fly > 0) continue;
      const face = Math.abs(Math.cos(f.rot * 0.5));
      g.save();
      g.translate(f.x, f.y + Math.sin(f.bob) * 4);
      // a small ripple under it
      g.strokeStyle = 'rgba(255,230,180,.26)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.ellipse(-4, 10, 20, 4.5, 0, 0, TAU);
      g.stroke();
      g.rotate(f.rot * 0.2);
      g.scale(1, 0.35 + 0.65 * face);
      g.fillStyle = `rgb(${206 + f.level * 49},${150 + f.level * 90},${62 + f.level * 50})`;
      g.shadowColor = 'rgba(255,200,100,.55)';
      g.shadowBlur = 10;
      g.beginPath();
      g.ellipse(0, 0, 19, 11, 0, 0, TAU);
      g.fill();
      g.strokeStyle = 'rgba(90,50,12,.55)';
      g.lineWidth = 1;
      g.stroke();
      g.restore();
    }
  }

  after = (i: number, g: Ctx) => {
    if (i !== 1) return;
    withPar(g, 0.28, () => {
      this.river(g);
      this.drawFlakes(g);
    });
  };

  /** Sparkles, catch rings, the flying flakes and the debut’s vortex: all on top of the darkness. */
  fx = (g: Ctx) => {
    const trace = traceBeam(deniz.lens ?? { x: lamp.x - 200, y: lamp.y }, lamp, []);
    for (const f of this.flakes) {
      if (f.wait >= 0) continue;
      if (f.fly > 0) {
        // the caught flake streaks to Deniz’s hand
        const t = sstep(f.fly);
        const tx = deniz.lens?.x ?? lamp.x - 160;
        const ty = deniz.lens?.y ?? lamp.y;
        const x = f.cx + (tx - f.cx) * t;
        const y = f.cy + (ty - f.cy) * t - Math.sin(t * Math.PI) * 70;
        g.save();
        g.globalCompositeOperation = 'screen';
        const gr = g.createRadialGradient(x, y, 0, x, y, 40);
        gr.addColorStop(0, 'rgba(255,240,190,.95)');
        gr.addColorStop(1, 'rgba(255,200,100,0)');
        g.fillStyle = gr;
        dot(g, x, y, 40);
        g.restore();
        continue;
      }
      const gl = this.glintOf(f);
      // `drawGlint` draws a hint of the flake and its four-point flash; the body is already in the water
      const lvl = drawGlint(g, { ...gl, r: 11 }, trace);
      f.level = lvl;
      if (f.meter > 0.02) {
        g.strokeStyle = 'rgba(255,224,150,.95)';
        g.lineWidth = 4;
        g.lineCap = 'round';
        g.beginPath();
        g.arc(f.x, f.y + Math.sin(f.bob) * 4 - 34, 14, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(f.meter, 0, 1));
        g.stroke();
      }
    }
    this.debutFx(g);
  };

  private glintOf(f: Flake): Glint {
    // a flake is a two-sided leaf: it flashes when either face points along the beam
    const beam = Math.atan2(lamp.y - (deniz.lens?.y ?? lamp.y), lamp.x - (deniz.lens?.x ?? lamp.x - 1));
    const d = Math.atan2(Math.sin(f.rot - beam), Math.cos(f.rot - beam));
    const flip = Math.abs(d) > Math.PI / 2 ? Math.PI : 0;
    return { x: f.x, y: f.y + Math.sin(f.bob) * 4, r: 10, angle: f.rot + flip, tol: 0.8 };
  }

  private spawn(f: Flake, first = false) {
    f.x = first ? 120 + rand() * 500 : SPAWN_X;
    f.y = FLAKE_Y[0] + rand() * (FLAKE_Y[1] - FLAKE_Y[0]);
    f.vx = 44 + rand() * 26;
    f.bob = rand() * TAU;
    f.rot = rand() * TAU;
    f.spin = (rand() < 0.5 ? -1 : 1) * (1.5 + rand() * 0.9);
    f.meter = 0;
    f.wait = -1;
    f.fly = 0;
    f.level = 0;
  }

  update = (dt: number) => {
    // the river keeps moving through dialogue, but nothing is caught while someone is talking
    const talking = dialogOpen();
    const live = Math.min(SLOTS, TOTAL - this.caught);
    for (let i = 0; i < this.flakes.length; i++) {
      const f = this.flakes[i];
      if (f.fly > 0) {
        f.fly += dt * 1.6;
        if (f.fly >= 1) {
          f.fly = 0;
          f.wait = i < live ? 1 + rand() * 1.5 : 999;
        }
        continue;
      }
      if (f.wait >= 900) continue;
      if (f.wait >= 0) {
        f.wait -= dt;
        if (f.wait < 0) this.spawn(f);
        continue;
      }
      f.x += f.vx * dt;
      f.bob += dt * 2.2;
      f.rot += f.spin * dt;
      if (f.x > W + stage.Mx + 80) {
        // carried off: it comes back at the source while flakes are still needed, nothing is lost
        f.wait = i < live ? 0.5 + rand() * 1.4 : 999;
        continue;
      }
      if (!this.run || talking || this.vortex >= 0 || this.caught >= TOTAL) continue;
      // a flake that is drifting may be caught: the light has to be on it and it has to face the beam
      const trace = traceBeam(deniz.lens ?? { x: lamp.x - 200, y: lamp.y }, lamp, []);
      const lvl = glintLevel(this.glintOf(f), trace, 54);
      f.level = lvl;
      const on = f.x > 30 && f.x < W - 30;
      if (on && lvl > 0.2) f.meter = Math.min(1, f.meter + dt * 3.4 * lvl);
      else f.meter = Math.max(0, f.meter - dt * 0.2);
      if (f.meter >= 1) this.catchFlake(f);
    }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 1.3);
  };

  private catchFlake(f: Flake) {
    if (this.caught >= TOTAL) return;
    this.caught++;
    f.cx = f.x;
    f.cy = f.y;
    f.fly = 0.001;
    f.meter = 0;
    pluck(NOTES[this.caught - 1], 0, 0.34, 0.7, true);
    glint(this.caught);
    setGoal(T.goal(this.caught, TOTAL));
    if (this.caught === 1) void say(T.first);
    else if (this.caught === 3) void say(T.halfway);
    if (this.caught >= TOTAL) this.done?.();
  }

  hotspots = (): Hotspot[] => [
    {
      x: 30,
      y: RIVER.top,
      w: W - 60,
      h: RIVER.bottom - RIVER.top,
      label: T.spot,
      // for keyboard users: lay the light on the nearest flake that is in the frame
      act: () => {
        if (dialogOpen()) return;
        const f = this.flakes.filter((q) => q.wait < 0 && q.fly <= 0 && q.x > 30 && q.x < W - 30).sort((p, q) => Math.abs(p.x - lamp.tx) - Math.abs(q.x - lamp.tx))[0];
        if (f) {
          lamp.tx = f.x;
          lamp.ty = f.y;
        }
      },
    },
  ];

  hint = () => void say(T.hint);

  /** Everything the debut draws: a vortex of gold particles that turns into Alyat’s shape, and a flash. */
  private debutFx(g: Ctx) {
    if (this.vortex < 0 && this.flash <= 0) return;
    g.save();
    g.globalCompositeOperation = 'screen';
    if (this.vortex >= 0 && this.vortex <= 1) {
      const p = this.vortex;
      const cx = this.vx;
      const cy = this.vy;
      const swirl = Math.min(1, p / 0.62);
      const gather = sstep(clamp((p - 0.58) / 0.42, 0, 1));
      for (const b of this.burst) {
        // out of Deniz’s hand, up into a spinning column, then in towards the lion’s shape
        const ang = b.a + p * (7 + b.s * 3);
        const rad = b.r * (0.35 + 0.65 * Math.sin(swirl * Math.PI * 0.5)) * (1 - gather * 0.8);
        const ox = cx + Math.cos(ang) * rad;
        const oy = cy - 60 - swirl * 130 * b.s + Math.sin(ang) * rad * 0.35;
        const lx = deniz.lens?.x ?? cx - 200;
        const ly = deniz.lens?.y ?? cy;
        const rise = sstep(clamp(p / 0.22, 0, 1));
        let x = lx + (ox - lx) * rise;
        let y = ly + (oy - ly) * rise;
        x += (b.tx - x) * gather;
        y += (b.ty - y) * gather;
        const alpha = 0.95 * (p > 0.9 ? 1 - (p - 0.9) / 0.1 : 1);
        // a soft glow first, then the flake itself in plain gold (not blended to white)
        g.globalCompositeOperation = 'screen';
        g.fillStyle = `rgba(255,170,60,${alpha * 0.16})`;
        dot(g, x, y, 15 + b.w * 8);
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = `rgba(${236 + b.w * 19},${168 + b.w * 50},${52 + b.w * 40},${alpha})`;
        g.save();
        g.translate(x, y);
        g.rotate(ang * 2);
        g.scale(1, 0.45 + 0.55 * Math.abs(Math.cos(ang * 3 + b.a)));
        g.beginPath();
        g.ellipse(0, 0, 6 + b.w * 6, 3.6 + b.w * 3, 0, 0, TAU);
        g.fill();
        g.restore();
        g.globalCompositeOperation = 'screen';
      }
    }
    if (this.flash > 0) {
      const gr = g.createRadialGradient(this.vx, this.vy, 10, this.vx, this.vy, 520);
      gr.addColorStop(0, `rgba(255,244,210,${this.flash * 0.95})`);
      gr.addColorStop(1, 'rgba(255,200,100,0)');
      g.fillStyle = gr;
      g.fillRect(-300, -300, W + 600, H + 600);
    }
    g.restore();
  }
  private vx = 1000;
  private vy = 640;

  /** The animal debut: the seven flakes burst, spin up into a vortex and settle into Alyat, who shakes his mane. */
  private async debut() {
    const c = startCine();
    // hold the light where it is, so Deniz settles before the lion is placed beside her
    lamp.lock = { x: lamp.x, y: lamp.y };
    await c.sleep(800);
    const sideRight = deniz.x < 760;
    const at = clamp(deniz.x + (sideRight ? 380 : -380), 330, 1270);
    this.vx = at;
    this.vy = this.ground - 280;
    this.burst = Array.from({ length: 150 }, () => {
      // targets spread over a lion’s outline: body, a big round mane and a tail
      const k = rand();
      let tx: number;
      let ty: number;
      const face = sideRight ? -1 : 1;
      if (k < 0.45) {
        tx = at + (rand() - 0.5) * 230 * 0.9;
        ty = this.ground - 150 + (rand() - 0.5) * 90;
      } else if (k < 0.88) {
        const a = rand() * TAU;
        const r = Math.sqrt(rand()) * 92;
        tx = at + face * 105 + Math.cos(a) * r;
        ty = this.ground - 250 + Math.sin(a) * r;
      } else {
        tx = at - face * (120 + rand() * 50);
        ty = this.ground - 200 + (rand() - 0.5) * 80;
      }
      return { a: rand() * TAU, r: 40 + rand() * 130, w: rand(), tx, ty, s: 0.4 + rand() * 0.6 };
    });
    await camMove(c, { z: 1.16, x: (deniz.x + at) / 2, y: this.ground - 250 }, 900);
    this.vortex = 0;
    rumble(2.4);
    for (let i = 0; i < 6; i++) pluck(220 * 1.5 ** (i / 2), i * 0.22, 0.14, 0.8);
    await c.tween(3400, (t) => {
      this.vortex = t * 0.98;
    });
    this.flash = 1;
    lion.hold = true;
    placeLion(at);
    lion.hold = true;
    lion.a = 0;
    lion.face = sideRight ? -1 : 1;
    lion.x = at;
    chime();
    pluck(146.83, 0, 0.4, 0.9, true);
    this.vortex = 1;
    await c.tween(1000, (t) => {
      lion.a = sstep(t);
      this.vortex = 1;
    });
    this.vortex = -1;
    lion.hold = false;
    lion.swish = 1;
    await c.sleep(600);
    await camMove(c, { z: 1, x: W / 2, y: H / 2 }, 800);
    camReset();
    lamp.lock = null;
    c.end();
  }

  async enter() {
    this.caught = 0;
    this.vortex = -1;
    this.flash = 0;
    this.run = false;
    this.flakes = Array.from({ length: SLOTS }, (_, i) => {
      const f = { x: 0, y: 0, vx: 0, bob: 0, rot: 0, spin: 0, meter: 0, wait: 0, fly: 0, cx: 0, cy: 0, level: 0 } as Flake;
      this.spawn(f, true);
      f.x = 160 + i * 330 + rand() * 80; // the first three are already in view
      return f;
    });
    await say(T.intro);
    this.run = true;
    setGoal(T.goal(0, TOTAL));
    const auto = setTimeout(() => {
      if (this.caught === 0 && !dialogOpen()) this.hint();
    }, 28000);
    const nudge = setInterval(() => {
      if (dialogOpen()) return;
      // the light has been on a flake for a good while but nothing happened: explain the flash
      if (this.flakes.some((f) => f.wait < 0 && f.fly <= 0 && f.level > 0.05) && this.caught === 0 && stage.T > this.fallback + 14) {
        this.fallback = stage.T;
        void say(T.flaky);
      }
    }, 6000);
    await new Promise<void>((r) => (this.done = r));
    clearTimeout(auto);
    clearInterval(nudge);
    clearGoal();
    await wait(900);
    await say(T.seven);
    await this.debut();
    await say(T.after);
    await award('damla');
    await card(T.card.title, T.card.facts, 'damla');
    // the other scenes of the act are not built yet
    await say(T.soon);
    location.href = '/';
  }
}
