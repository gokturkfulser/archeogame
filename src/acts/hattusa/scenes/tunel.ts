/* II. Yerkapı Tüneli: a dark corridor. Read the order of five pictures on the hanging plaque, then light the pictures
   on the walls in that order by holding the lit spot on each one. Kurunta’s antlers are a second, dimmer light. */
import { Ctx, TAU, clamp, lamp, sstep, stage, wait, withPar } from '../../../engine/core';
import { pluck, rumble, tok } from '../../../engine/audio';
import { clearGoal, dialogOpen, say, setGoal } from '../../../engine/dialogue';
import { go } from '../../../engine/game';
import { award, card } from '../../../engine/hud';
import { stag } from '../../../engine/kurunta';
import { LayerSpec } from '../../../engine/layers';
import { dot, skyFill } from '../../../engine/paper';
import type { Hotspot, Scene } from '../../../engine/scene';
import { GlyphId, glyph } from '../glyphs';
import { TEXT } from '../text';

const T = TEXT.tunel;

/** The order written on the plaque. The signs sit on the walls so that following it zig-zags across the tunnel. */
const ORDER: GlyphId[] = ['kus', 'gunes', 'aslan', 'dag', 'geyik'];
const SIGNS: Record<string, { x: number; y: number }> = {
  gunes: { x: 135, y: 410 },
  dag: { x: 175, y: 650 },
  geyik: { x: 365, y: 480 },
  aslan: { x: 1285, y: 510 },
  kus: { x: 1445, y: 640 },
};
const PLAQUE = { x: 610, y: 150, w: 380, h: 92 };
const DWELL = 0.85;
const NOTES = [330, 392, 440, 523, 587];

/** How strongly the lit spot sits on (x, y): 0..1 within about 90 units. */
const onSpot = (x: number, y: number) => 1 - sstep(clamp((Math.hypot(lamp.x - x, lamp.y - y) - 55) / 55, 0, 1));

export class Tunel implements Scene {
  id = 'tunel';
  num = T.num;
  name = T.name;
  dark = 0.84;
  lamp0: [number, number] = [800, 420];
  ground = 838;
  ambience = { base: 65.41, noiseFreq: 280, noiseVol: 0.05, noiseLfo: 0.07 };

  private next = 0;
  private lit = new Set<string>();
  private charge: Record<string, number> = {};
  private plaqueSeen = 0;
  private open = 0;
  private wrongAt = -99;
  private nudgedEarly = false;
  private solved: (() => void) | null = null;
  private active = false;

  back = (g: Ctx) => {
    skyFill(g, [
      [0, '#05061a'],
      [1, '#120f33'],
    ]);
  };

  layers: LayerSpec[] = [
    { d: 0.06, image: 'hattusa/tunel-far.webp' },
    { d: 0.3, image: 'hattusa/tunel-mid.webp' },
    { d: 0.9, image: 'hattusa/tunel-fg.webp', shA: 0.6 },
  ];

  /** How well a world point is lit, by the lamp or by the glow of Kurunta’s antlers. */
  private seen(x: number, y: number): number {
    const lampLight = 1 - sstep(clamp(Math.hypot(lamp.x - x, lamp.y - y) / 190, 0, 1));
    const sx = stag.x + stag.face * 25;
    const sy = this.ground - 380;
    const stagLight = stag.on ? 0.55 * stag.a * (1 - sstep(clamp(Math.hypot(sx - x, sy - y) / 300, 0, 1))) : 0;
    return Math.max(lampLight, stagLight);
  }

  after = (i: number, g: Ctx) => {
    if (i === 0) {
      this.drawDoor(g);
      this.drawFarGlow(g);
    }
    if (i !== 1) return;
    withPar(g, 0.3, () => {
      this.drawPlaque(g);
      for (const id of ORDER) this.drawSign(g, id);
    });
  };

  /** The stone door that shuts the far end of the tunnel until the five signs are lit; its two leaves slide apart. */
  private drawDoor(g: Ctx) {
    if (this.open >= 1) return;
    const slide = sstep(clamp(this.open * 1.5, 0, 1)) * 86;
    withPar(g, 0.06, () => {
      g.save();
      const arch = () => {
        g.beginPath();
        g.moveTo(722, 678);
        g.lineTo(722, 520);
        g.bezierCurveTo(724, 440, 770, 392, 800, 366);
        g.bezierCurveTo(830, 392, 876, 440, 878, 520);
        g.lineTo(878, 678);
        g.closePath();
      };
      arch();
      g.clip();
      for (const side of [-1, 1]) {
        g.save();
        g.translate(side * slide, 0);
        g.beginPath();
        g.rect(side < 0 ? 700 : 800, 340, 100, 350);
        g.clip();
        const gr = g.createLinearGradient(0, 366, 0, 678);
        gr.addColorStop(0, '#2a2358');
        gr.addColorStop(1, '#171236');
        g.fillStyle = gr;
        g.fillRect(700, 340, 200, 350);
        // planks and punched studs
        g.strokeStyle = 'rgba(8,6,28,.7)';
        g.lineWidth = 2;
        for (let x = side < 0 ? 740 : 820; x < (side < 0 ? 800 : 880); x += 20) {
          g.beginPath();
          g.moveTo(x, 360);
          g.lineTo(x, 680);
          g.stroke();
        }
        g.fillStyle = 'rgba(255,214,140,.75)';
        for (let y = 420; y < 670; y += 36) for (const dx of [14, 44]) dot(g, side < 0 ? 722 + dx : 878 - dx, y, 2.6);
        g.restore();
      }
      // the seam where the two leaves meet
      if (slide < 3) {
        g.strokeStyle = 'rgba(255,214,140,.55)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(800, 372);
        g.lineTo(800, 678);
        g.stroke();
      }
      g.restore();
    });
  }

  /** The end of the tunnel brightens when the way opens. */
  private drawFarGlow(g: Ctx) {
    if (this.open <= 0) return;
    withPar(g, 0.06, () => {
      g.save();
      g.globalCompositeOperation = 'screen';
      g.globalAlpha = this.open;
      const gr = g.createRadialGradient(800, 470, 6, 800, 470, 420);
      gr.addColorStop(0, 'rgba(255,224,150,.85)');
      gr.addColorStop(1, 'rgba(255,170,80,0)');
      g.fillStyle = gr;
      dot(g, 800, 470, 420);
      g.restore();
    });
  }

  private drawPlaque(g: Ctx) {
    const a = this.seen(PLAQUE.x + PLAQUE.w / 2, PLAQUE.y + PLAQUE.h / 2);
    g.save();
    g.strokeStyle = 'rgba(40,30,70,.9)';
    g.lineWidth = 3;
    for (const dx of [26, PLAQUE.w - 26]) {
      g.beginPath();
      g.moveTo(PLAQUE.x + dx, PLAQUE.y);
      g.lineTo(PLAQUE.x + dx + (dx < 100 ? 18 : -18), PLAQUE.y - 120);
      g.stroke();
    }
    g.fillStyle = 'rgba(78,66,120,.96)';
    g.beginPath();
    g.roundRect(PLAQUE.x, PLAQUE.y, PLAQUE.w, PLAQUE.h, 8);
    g.fill();
    g.strokeStyle = `rgba(255,214,140,${0.3 + a * 0.5})`;
    g.lineWidth = 2.5;
    g.stroke();
    ORDER.forEach((id, k) => {
      const x = PLAQUE.x + 48 + k * ((PLAQUE.w - 96) / 4);
      const y = PLAQUE.y + PLAQUE.h / 2;
      const done = k < this.next;
      glyph(g, id, x, y, 54, done ? 'rgba(255,214,130,.95)' : `rgba(255,232,180,${0.12 + a * 0.85})`);
      if (k > 0) {
        g.fillStyle = `rgba(255,214,140,${0.1 + a * 0.5})`;
        dot(g, x - (PLAQUE.w - 96) / 8, y, 3);
      }
    });
    g.restore();
  }

  private drawSign(g: Ctx, id: GlyphId) {
    const p = SIGNS[id];
    const lit = this.lit.has(id);
    const s = this.seen(p.x, p.y);
    g.save();
    // the stone the sign is cut into
    g.fillStyle = `rgba(30,22,64,${0.55})`;
    g.beginPath();
    g.roundRect(p.x - 52, p.y - 52, 104, 104, 12);
    g.fill();
    if (!lit) glyph(g, id, p.x, p.y, 74, `rgba(210,190,255,${0.1 + s * 0.6})`);
    const c = this.charge[id] ?? 0;
    if (!lit && c > 0.03) {
      g.strokeStyle = 'rgba(255,214,130,.95)';
      g.lineWidth = 5;
      g.lineCap = 'round';
      g.beginPath();
      g.arc(p.x, p.y, 62, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(c, 0, 1));
      g.stroke();
    }
    g.restore();
  }

  /** Lit signs glow above the darkness, so they stay bright however far the lamp is. */
  fx = (g: Ctx) => {
    withPar(g, 0.3, () => {
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (const id of ORDER) {
        if (!this.lit.has(id)) continue;
        const p = SIGNS[id];
        const gr = g.createRadialGradient(p.x, p.y, 4, p.x, p.y, 140);
        gr.addColorStop(0, 'rgba(255,196,100,.5)');
        gr.addColorStop(1, 'rgba(255,170,80,0)');
        g.fillStyle = gr;
        dot(g, p.x, p.y, 140);
        glyph(g, id, p.x, p.y, 74, 'rgba(255,226,150,.95)');
      }
      g.restore();
    });
  };

  update = (dt: number) => {
    if (!this.active || dialogOpen()) return;
    // reading the plaque
    if (Math.hypot(lamp.x - (PLAQUE.x + PLAQUE.w / 2), lamp.y - (PLAQUE.y + PLAQUE.h / 2)) < 190) this.plaqueSeen = Math.min(2, this.plaqueSeen + dt);
    for (const id of ORDER) {
      if (this.lit.has(id)) continue;
      const p = SIGNS[id];
      const on = onSpot(p.x, p.y) > 0.5;
      this.charge[id] = on ? (this.charge[id] ?? 0) + dt / DWELL : Math.max(0, (this.charge[id] ?? 0) - dt * 1.2);
      if (this.charge[id] < 1) continue;
      this.charge[id] = 0;
      if (this.plaqueSeen < 0.5) {
        if (!this.nudgedEarly) {
          this.nudgedEarly = true;
          void say(T.tooEarly);
        }
        continue;
      }
      if (ORDER[this.next] === id) {
        this.lit.add(id);
        pluck(NOTES[this.next], 0, 0.3, 0.8, true);
        this.next++;
        if (this.next === ORDER.length) this.solved?.();
      } else if (stage.T - this.wrongAt > 4) {
        this.wrongAt = stage.T;
        tok(120, 0.2);
        this.lit.clear();
        this.next = 0;
        void say(T.wrong);
      }
    }
  };

  hotspots = (): Hotspot[] => [
    {
      x: PLAQUE.x,
      y: PLAQUE.y,
      w: PLAQUE.w,
      h: PLAQUE.h,
      label: T.plaque,
      act: () => {
        if (dialogOpen()) return;
        lamp.tx = PLAQUE.x + PLAQUE.w / 2;
        lamp.ty = PLAQUE.y + PLAQUE.h / 2 + 30;
      },
    },
    ...ORDER.map((id) => ({
      x: SIGNS[id].x - 52,
      y: SIGNS[id].y - 52,
      w: 104,
      h: 104,
      label: T.sign(T.names[id as keyof typeof T.names]),
      act: () => {
        if (dialogOpen()) return;
        lamp.tx = SIGNS[id].x;
        lamp.ty = SIGNS[id].y;
      },
    })),
  ];

  hint = () => void say(T.hint);

  async enter() {
    this.next = 0;
    this.lit.clear();
    this.charge = {};
    this.plaqueSeen = 0;
    this.open = 0;
    this.nudgedEarly = false;
    this.wrongAt = -99;
    stag.glow = 0.95;
    await say(T.intro);
    setGoal(T.goal);
    this.active = true;
    const auto = setTimeout(() => {
      if (this.next < ORDER.length && !dialogOpen()) this.hint();
    }, 36000);
    await new Promise<void>((r) => (this.solved = r));
    clearTimeout(auto);
    this.active = false;
    clearGoal();
    await wait(500);
    rumble(2.4);
    const t0 = stage.T;
    await new Promise<void>((r) => {
      const iv = setInterval(() => {
        this.open = clamp((stage.T - t0) / 2.0, 0, 1);
        if (this.open >= 1) {
          clearInterval(iv);
          r();
        }
      }, 30);
    });
    await say(T.solved);
    await award('gunes');
    await card(T.card.title, T.card.facts, 'gunes');
    stag.glow = 0.35;
    await go(2);
  }
}
