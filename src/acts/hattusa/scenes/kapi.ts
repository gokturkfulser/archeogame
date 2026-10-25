/* I. Aslanlı Kapı: four worn reliefs only read in raking light (the lit spot beside the carving, not on top of it). */
import { Ctx, TAU, clamp, lamp, sstep, stage, wait, withPar } from '../../../engine/core';
import { pluck, rumble } from '../../../engine/audio';
import { clearGoal, dialogOpen, say, setGoal } from '../../../engine/dialogue';
import { go } from '../../../engine/game';
import { award, card } from '../../../engine/hud';
import { placeStag } from '../../../engine/kurunta';
import { LayerSpec } from '../../../engine/layers';
import { dot, glowDisk, makeStars, skyFill, stars } from '../../../engine/paper';
import type { Hotspot, Scene } from '../../../engine/scene';
import { carved } from '../glyphs';
import { TEXT } from '../text';

const T = TEXT.kapi;
const STARS = makeStars(60, 260, 5);

/** The four blank slabs painted into the mid layer, in world coordinates, and the carving hidden on each. */
const PANELS: { x: number; y: number; w: number; h: number; id: 'gunes' | 'geyik' | 'boga' | 'kartal' }[] = [
  { x: 0, y: 545, w: 145, h: 205, id: 'gunes' },
  { x: 180, y: 545, w: 153, h: 205, id: 'geyik' },
  { x: 1267, y: 545, w: 153, h: 205, id: 'boga' },
  { x: 1453, y: 545, w: 147, h: 205, id: 'kartal' },
];
const cx = (p: (typeof PANELS)[number]) => p.x + p.w / 2;
const cy = (p: (typeof PANELS)[number]) => p.y + p.h / 2;
const GLYPH = 118;
const NOTES = [392, 440, 494, 587];

/** 0..1: how well the lit spot rakes across panel `i`. Right on top it washes the carving out; far away it is dark. */
function rake(i: number): number {
  const p = PANELS[i];
  const dist = Math.hypot(lamp.x - cx(p), lamp.y - cy(p));
  const near = 1 - sstep(clamp((dist - 150) / 110, 0, 1));
  const flat = sstep(clamp((dist - 34) / 66, 0, 1));
  return near * flat;
}

export class Kapi implements Scene {
  id = 'kapi';
  num = T.num;
  name = T.name;
  dark = 0.4;
  lamp0: [number, number] = [470, 560];
  ground = 852;
  backImage = 'hattusa/kapi-sky.webp';
  ambience = { base: 98, noiseFreq: 520, noiseVol: 0.08, noiseLfo: 0.11 };

  private read = [false, false, false, false];
  private prog = [0, 0, 0, 0];
  private gate = 0;
  private done: (() => void) | null = null;

  back = (g: Ctx) => {
    skyFill(g, [
      [0, '#1a1a52'],
      [0.4, '#5a2f70'],
      [0.62, '#c9505a'],
      [0.8, '#f39a48'],
    ]);
    stars(g, STARS, 0.7);
    withPar(g, 0.02, () => glowDisk(g, 480, 640, 100, '#ffd88a', 'rgba(255,170,90,.45)'));
  };

  layers: LayerSpec[] = [
    { d: 0.08, image: 'hattusa/kapi-far.webp' },
    { d: 0.34, image: 'hattusa/kapi-mid.webp' },
    { d: 0.92, image: 'hattusa/kapi-fg.webp', shA: 0.6, rect: [-250, 190, 2100, 900] },
  ];

  after = (i: number, g: Ctx) => {
    if (i !== 1) return;
    withPar(g, 0.34, () => {
      PANELS.forEach((p, k) => {
        const r = this.read[k] ? 1 : rake(k);
        const dx = lamp.x - cx(p);
        const dy = lamp.y - cy(p);
        // light falling flat on the slab washes the relief out
        if (!this.read[k]) {
          const dist = Math.hypot(dx, dy);
          const wash = (1 - sstep(clamp((dist - 34) / 66, 0, 1))) * (1 - sstep(clamp((dist - 150) / 110, 0, 1)));
          if (wash > 0.02) {
            g.fillStyle = `rgba(255,236,190,${wash * 0.4})`;
            g.fillRect(p.x, p.y, p.w, p.h);
          }
        }
        if (this.read[k]) {
          g.save();
          g.globalCompositeOperation = 'lighter';
          const gr = g.createRadialGradient(cx(p), cy(p), 6, cx(p), cy(p), 110);
          gr.addColorStop(0, 'rgba(255,200,110,.38)');
          gr.addColorStop(1, 'rgba(255,200,110,0)');
          g.fillStyle = gr;
          dot(g, cx(p), cy(p), 110);
          g.restore();
        }
        g.save();
        g.beginPath();
        g.rect(p.x + 6, p.y + 6, p.w - 12, p.h - 12);
        g.clip();
        carved(g, p.id, cx(p), cy(p), GLYPH, dx || 1, dy, r);
        g.restore();
        if (!this.read[k] && this.prog[k] > 0.02) {
          g.strokeStyle = 'rgba(255,214,130,.95)';
          g.lineWidth = 4;
          g.lineCap = 'round';
          g.beginPath();
          g.arc(cx(p), p.y - 22, 14, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(this.prog[k], 0, 1));
          g.stroke();
        }
      });
    });
  };

  /** Warm light spilling from the opened gate, and Kurunta’s antlers shining inside it. */
  fx = (g: Ctx) => {
    if (this.gate <= 0) return;
    g.save();
    g.globalCompositeOperation = 'screen';
    g.globalAlpha = this.gate;
    const gr = g.createRadialGradient(800, 560, 10, 800, 560, 260);
    gr.addColorStop(0, 'rgba(255,214,130,.55)');
    gr.addColorStop(1, 'rgba(255,170,80,0)');
    g.fillStyle = gr;
    dot(g, 800, 560, 260);
    g.restore();
  };

  update = (dt: number) => {
    if (dialogOpen()) return;
    PANELS.forEach((_, k) => {
      if (this.read[k]) return;
      this.prog[k] = rake(k) > 0.55 ? this.prog[k] + dt : Math.max(0, this.prog[k] - dt * 0.6);
      if (this.prog[k] >= 1) {
        this.read[k] = true;
        pluck(NOTES[k], 0, 0.3, 0.7, true);
        void say(T.read[PANELS[k].id]).then(() => {
          if (this.read.every(Boolean)) this.done?.();
        });
      }
    });
  };

  hotspots = (): Hotspot[] =>
    PANELS.map((p, k) => ({
      x: p.x,
      y: p.y,
      w: p.w,
      h: p.h,
      label: T.spot(k),
      // for keyboard users: move the light to a raking spot beside the slab
      act: () => {
        if (dialogOpen()) return;
        lamp.tx = cx(p) + (cx(p) > 800 ? -120 : 120);
        lamp.ty = cy(p);
      },
    }));

  hint = () => void say(T.hint);

  async enter() {
    this.read = [false, false, false, false];
    this.prog = [0, 0, 0, 0];
    this.gate = 0;
    await say(T.intro);
    setGoal(T.goal);
    const auto = setTimeout(() => {
      if (!this.read.every(Boolean) && !dialogOpen()) this.hint();
    }, 30000);
    const flatNudge = setInterval(() => {
      if (dialogOpen()) return;
      // light parked right on top of an unread slab: remind how raking light works
      if (PANELS.some((p, k) => !this.read[k] && Math.hypot(lamp.x - cx(p), lamp.y - cy(p)) < 26) && this.prog.every((v) => v < 0.05)) {
        clearInterval(flatNudge);
        void say(T.flat);
      }
    }, 4000);
    await new Promise<void>((r) => (this.done = r));
    clearTimeout(auto);
    clearInterval(flatNudge);
    clearGoal();
    await wait(300);
    await say(T.open.slice(0, 1));
    rumble(2.2);
    const t0 = stage.T;
    await new Promise<void>((r) => {
      const iv = setInterval(() => {
        this.gate = clamp((stage.T - t0) / 1.6, 0, 1);
        if (this.gate >= 1) {
          clearInterval(iv);
          r();
        }
      }, 30);
    });
    placeStag(800);
    await wait(900);
    await say(T.open.slice(1));
    await award('aslan');
    await card(T.card.title, T.card.facts, 'aslan');
    await go(1);
  }
}
