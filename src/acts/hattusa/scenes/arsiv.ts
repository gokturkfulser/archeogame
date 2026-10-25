/* III. Kil Tablet Arşivi: three tablets are broken. Pick the fragment whose break edge fits the gap (touch a fragment, then
   a tablet). Then press a reed into fresh clay: touch the glowing dots in order to write a name in wedge marks. */
import { Ctx, clamp, lamp, rng, sstep, stage, wait, withPar } from '../../../engine/core';
import { chime, pluck, tok } from '../../../engine/audio';
import { clearGoal, dialogOpen, say, setGoal } from '../../../engine/dialogue';
import { go, placeHotspots } from '../../../engine/game';
import { award, card } from '../../../engine/hud';
import { LayerSpec } from '../../../engine/layers';
import { dot, skyFill } from '../../../engine/paper';
import type { Hotspot, Scene } from '../../../engine/scene';
import { wedge } from '../glyphs';
import { TEXT } from '../text';

const T = TEXT.arsiv;

/** Break-edge profiles: how far (0..20) the edge pushes into the gap at seven heights. */
const EDGES: number[][] = [
  [0, 16, 0, 16, 0, 16, 0], // 0: three teeth
  [10, 10, 0, 0, 20, 20, 10], // 1: steps
  [0, 0, 18, 6, 18, 0, 0], // 2: a bump with a notch
  [16, 0, 16, 0, 16, 0, 16], // 3: the inverse of 0 (looks close, does not fit)
  [0, 10, 20, 10, 0, 10, 20], // 4: saw
  [20, 10, 0, 10, 20, 0, 10], // 5: slope
];
/** Tray order: which edge each fragment has, and which tablet it belongs to (-1 = a decoy). */
const FRAGS: { edge: number; tablet: number }[] = [
  { edge: 3, tablet: -1 },
  { edge: 1, tablet: 1 },
  { edge: 4, tablet: -1 },
  { edge: 0, tablet: 0 },
  { edge: 5, tablet: -1 },
  { edge: 2, tablet: 2 },
];
const TAB_X = [390, 670, 950];
const TAB_Y = 385;
const TAB_W = 250;
const TAB_H = 150;
const BODY = 160; // body width before the break edge
const FRAG_W = 90;
const FRAG_Y = 600;
const fragX = (k: number) => 405 + k * 138;
const NOTES = [392, 440, 523];

const CLAY = '#b87a42';
const CLAY_DARK = '#8a5a30';
const CLAY_LIGHT = '#d49a60';

function edgeAt(edge: number, y: number): number {
  const e = EDGES[edge];
  const f = clamp(y / TAB_H, 0, 1) * 6;
  const i = Math.min(5, Math.floor(f));
  return e[i] + (e[i + 1] - e[i]) * (f - i);
}

/** Outline of a fragment in local coordinates (origin top-left of its box). Straight right edge, break edge on the left. */
function fragPath(g: Ctx, edge: number) {
  g.beginPath();
  const e = EDGES[edge];
  g.moveTo(e[0], 0);
  g.lineTo(FRAG_W, 0);
  g.lineTo(FRAG_W, TAB_H);
  for (let j = 6; j >= 0; j--) g.lineTo(e[j], (j * TAB_H) / 6);
  g.closePath();
}

/** Outline of a tablet in local coordinates, the right part missing. */
function tabletPath(g: Ctx, edge: number) {
  const e = EDGES[edge];
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(BODY + e[0], 0);
  for (let j = 1; j <= 6; j++) g.lineTo(BODY + e[j], (j * TAB_H) / 6);
  g.lineTo(0, TAB_H);
  g.closePath();
}

/** Rows of wedge marks, clipped to the current clay shape. */
function marks(g: Ctx, seed: number, x0: number, x1: number, a = 1) {
  const r = rng(seed);
  g.save();
  g.globalAlpha = a;
  for (let row = 0; row < 4; row++) {
    const y = 30 + row * 32;
    for (let x = x0; x < x1; x += 21 + r() * 7) {
      const ang = r() < 0.5 ? 0 : r() < 0.5 ? Math.PI / 2 : Math.PI / 4;
      wedge(g, x, y + (r() - 0.5) * 3, ang, 30, 'rgba(58,30,10,.95)', 'rgba(255,225,170,.6)');
    }
  }
  g.restore();
}

export class Arsiv implements Scene {
  id = 'arsiv';
  num = T.num;
  name = T.name;
  dark = 0.5;
  lamp0: [number, number] = [800, 520];
  ground = 846;
  denizHeight = 250;
  ambience = { base: 82.41, noiseFreq: 300, noiseVol: 0.03, noiseLfo: 0.08, crickets: true };

  private sel = -1;
  private mended = [false, false, false];
  /** Flight of fragment k onto its tablet: start time. */
  private fly: Record<number, number> = {};
  private shake: Record<number, number> = {};
  private phase = 0; // 0 idle, 1 mending, 2 writing, 3 done
  private dots = 0; // dots pressed in phase 2
  private press = [0, 0, 0, 0, 0]; // 0..1 animation of each pressed wedge group
  private wrongAt = -99;
  private mendedDone: (() => void) | null = null;
  private signedDone: (() => void) | null = null;

  back = (g: Ctx) => {
    skyFill(g, [
      [0, '#1c1208'],
      [1, '#33200f'],
    ]);
  };

  layers: LayerSpec[] = [
    { d: 0.06, image: 'hattusa/arsiv-far.webp' },
    { d: 0.3, image: 'hattusa/arsiv-mid.webp' },
    { d: 0.9, image: 'hattusa/arsiv-fg.webp', shA: 0.6 },
  ];

  /** Is (x, y) near the lamp? Used to light the clay and its marks. */
  private lit(x: number, y: number, r = 260) {
    return 1 - sstep(clamp(Math.hypot(lamp.x - x, lamp.y - y) / r, 0, 1));
  }

  after = (i: number, g: Ctx) => {
    if (i !== 1) return;
    withPar(g, 0.3, () => {
      this.drawTable(g);
      if (this.phase === 2 || this.phase === 3) this.drawSlab(g);
      else this.drawTablets(g);
      if (this.phase < 2) this.drawFragments(g);
    });
  };

  private drawTable(g: Ctx) {
    g.fillStyle = '#5a3a20';
    g.fillRect(360, 548, 880, 22);
    g.fillStyle = '#42281a';
    g.fillRect(372, 570, 856, 190);
    g.fillStyle = '#6b4526';
    g.fillRect(372, 570, 856, 8);
    // reed mat on the front
    g.fillStyle = '#7d5530';
    g.fillRect(392, 584, 816, 168);
    g.strokeStyle = 'rgba(40,22,10,.4)';
    g.lineWidth = 2;
    for (let x = 400; x < 1208; x += 24) {
      g.beginPath();
      g.moveTo(x, 584);
      g.lineTo(x, 752);
      g.stroke();
    }
    g.fillStyle = '#5a3a20';
    g.fillRect(384, 752, 18, 36);
    g.fillRect(1198, 752, 18, 36);
  }

  private drawTablets(g: Ctx) {
    TAB_X.forEach((x0, t) => {
      const edge = FRAGS.find((f) => f.tablet === t)!.edge;
      const lit = this.lit(x0 + TAB_W / 2, TAB_Y + TAB_H / 2);
      g.save();
      g.translate(x0, TAB_Y);
      tabletPath(g, edge);
      g.fillStyle = CLAY;
      g.fill();
      g.lineWidth = 3;
      g.strokeStyle = CLAY_DARK;
      g.stroke();
      g.save();
      tabletPath(g, edge);
      g.clip();
      marks(g, 11 + t * 7, 14, BODY + 24, 0.45 + lit * 0.5);
      g.restore();
      if (this.mended[t]) {
        // the fragment has joined: draw it in place
        const f = FRAGS.findIndex((q) => q.tablet === t);
        g.save();
        g.translate(BODY, 0);
        fragPath(g, FRAGS[f].edge);
        g.fillStyle = CLAY_LIGHT;
        g.fill();
        g.lineWidth = 2;
        g.strokeStyle = CLAY_DARK;
        g.stroke();
        g.save();
        fragPath(g, FRAGS[f].edge);
        g.clip();
        marks(g, 11 + t * 7 + 99, 4, FRAG_W, 0.7 + lit * 0.3);
        g.restore();
        g.restore();
        // a thin gold seam where the break healed
        g.strokeStyle = 'rgba(255,214,130,.8)';
        g.lineWidth = 2;
        g.beginPath();
        for (let y = 0; y <= TAB_H; y += 5) g.lineTo(BODY + edgeAt(edge, y), y);
        g.stroke();
      } else {
        // the gap: a dashed outline that pulses when a fragment is in hand
        const pulse = this.sel >= 0 ? 0.5 + Math.sin(stage.T * 5) * 0.35 : 0.22;
        g.setLineDash([7, 7]);
        g.strokeStyle = `rgba(255,214,140,${pulse})`;
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(BODY + edgeAt(edge, 0), 0);
        g.lineTo(TAB_W, 0);
        g.lineTo(TAB_W, TAB_H);
        for (let y = TAB_H; y >= 0; y -= 5) g.lineTo(BODY + edgeAt(edge, y), y);
        g.stroke();
        g.setLineDash([]);
      }
      g.restore();
    });
  }

  private drawFragments(g: Ctx) {
    FRAGS.forEach((f, k) => {
      if (f.tablet >= 0 && this.mended[f.tablet] && this.fly[k] === undefined) return;
      let x = fragX(k);
      let y = FRAG_Y;
      const sel = this.sel === k;
      if (this.fly[k] !== undefined) {
        const t = clamp((stage.T - this.fly[k]) / 0.55, 0, 1);
        const e = 1 - Math.pow(1 - t, 3);
        const tx = TAB_X[f.tablet] + BODY;
        x += (tx - x) * e;
        y += (TAB_Y - y) * e - Math.sin(t * Math.PI) * 60;
        if (t >= 1) return;
      }
      if (sel) y -= 12;
      const sh = this.shake[k] ? Math.sin((stage.T - this.shake[k]) * 50) * 6 * Math.max(0, 1 - (stage.T - this.shake[k]) * 3) : 0;
      const lit = this.lit(x + FRAG_W / 2, y + TAB_H / 2, 230);
      g.save();
      g.translate(x + sh, y);
      fragPath(g, f.edge);
      g.fillStyle = CLAY_LIGHT;
      g.fill();
      g.lineWidth = sel ? 4 : 2.5;
      g.strokeStyle = sel ? 'rgba(255,226,150,1)' : CLAY_DARK;
      g.stroke();
      g.save();
      fragPath(g, f.edge);
      g.clip();
      marks(g, 11 + (f.tablet < 0 ? 40 + k : f.tablet * 7) + 99, 4, FRAG_W, 0.5 + lit * 0.5);
      g.restore();
      if (sel) {
        g.globalCompositeOperation = 'lighter';
        const gr = g.createRadialGradient(45, 75, 6, 45, 75, 120);
        gr.addColorStop(0, 'rgba(255,200,110,.45)');
        gr.addColorStop(1, 'rgba(255,200,110,0)');
        g.fillStyle = gr;
        dot(g, 45, 75, 120);
      }
      g.restore();
    });
  }

  /** The fresh slab for the name: five dots, each becoming a small cluster of wedges. */
  private drawSlab(g: Ctx) {
    const x0 = 500;
    const y0 = 340;
    const w = 600;
    const h = 200;
    g.save();
    g.translate(x0, y0);
    g.fillStyle = CLAY;
    g.beginPath();
    g.roundRect(0, 0, w, h, 16);
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = CLAY_DARK;
    g.stroke();
    g.fillStyle = 'rgba(255,225,170,.08)';
    g.fillRect(14, 14, w - 28, 6);
    for (let k = 0; k < 5; k++) {
      const cx = 70 + k * 115;
      const cy = h / 2;
      const p = this.press[k];
      if (k < this.dots) {
        // pressed: a cluster of wedges grows in
        g.save();
        g.globalAlpha = clamp(p, 0, 1);
        const r = rng(500 + k * 31);
        const n = 3 + (k % 3);
        for (let q = 0; q < n; q++) {
          const ang = [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4, Math.PI][Math.floor(r() * 5)];
          wedge(g, cx - 40 + q * 24 + (r() - 0.5) * 6, cy - 34 + (q % 2) * 56 + (r() - 0.5) * 8, ang, 64, 'rgba(58,30,10,.95)', 'rgba(255,225,170,.6)');
        }
        g.restore();
      } else if (k === this.dots && this.phase === 2) {
        const pulse = 0.55 + Math.sin(stage.T * 5) * 0.35;
        g.globalCompositeOperation = 'lighter';
        const gr = g.createRadialGradient(cx, cy, 2, cx, cy, 50);
        gr.addColorStop(0, `rgba(255,214,130,${pulse})`);
        gr.addColorStop(1, 'rgba(255,170,80,0)');
        g.fillStyle = gr;
        dot(g, cx, cy, 50);
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = 'rgba(255,236,170,.95)';
        dot(g, cx, cy, 9);
      } else {
        g.fillStyle = 'rgba(80,46,20,.5)';
        dot(g, cx, cy, 6);
      }
    }
    // the reed stylus rests on the slab
    g.strokeStyle = '#7a8a3c';
    g.lineWidth = 9;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(w - 50, h + 16);
    g.lineTo(w + 40, h - 40);
    g.stroke();
    g.restore();
  }

  hotspots = (): Hotspot[] => {
    if (this.phase === 1) {
      return [
        ...FRAGS.map((_, k) => ({
          x: fragX(k),
          y: FRAG_Y - 6,
          w: FRAG_W,
          h: TAB_H + 12,
          label: T.fragment(k),
          act: () => this.pick(k),
        })),
        ...TAB_X.map((x, t) => ({
          x: x + BODY - 6,
          y: TAB_Y - 6,
          w: TAB_W - BODY + 12,
          h: TAB_H + 12,
          label: T.tablet(t),
          act: () => this.place(t),
        })),
      ];
    }
    if (this.phase === 2) {
      return Array.from({ length: 5 }, (_, k) => ({
        x: 500 + 70 + k * 115 - 45,
        y: 340 + 100 - 45,
        w: 90,
        h: 90,
        label: T.dot(k),
        act: () => this.pressDot(k),
      }));
    }
    return [];
  };

  private pick(k: number) {
    if (dialogOpen() || this.phase !== 1) return;
    const f = FRAGS[k];
    if (f.tablet >= 0 && this.mended[f.tablet]) return;
    tok(260, 0.18);
    this.sel = this.sel === k ? -1 : k;
  }

  private place(t: number) {
    if (dialogOpen() || this.phase !== 1 || this.mended[t]) return;
    if (this.sel < 0) {
      void say(T.pickFirst);
      return;
    }
    const k = this.sel;
    if (FRAGS[k].tablet === t) {
      this.sel = -1;
      this.fly[k] = stage.T;
      setTimeout(() => {
        this.mended[t] = true;
        tok(150, 0.4);
        pluck(NOTES[t], 0, 0.3, 0.7, true);
        placeHotspotsSoon();
        if (this.mended.every(Boolean)) this.mendedDone?.();
      }, 560);
    } else {
      this.shake[k] = stage.T;
      this.sel = -1;
      tok(100, 0.2);
      if (stage.T - this.wrongAt > 6) {
        this.wrongAt = stage.T;
        void say(T.wrong);
      }
    }
  }

  private pressDot(k: number) {
    if (dialogOpen() || this.phase !== 2 || k !== this.dots) return;
    tok(210, 0.3);
    pluck(330 + k * 60, 0, 0.18, 0.7);
    this.press[k] = 0;
    this.dots++;
    const t0 = stage.T;
    const iv = setInterval(() => {
      this.press[k] = clamp((stage.T - t0) / 0.5, 0, 1);
      if (this.press[k] >= 1) clearInterval(iv);
    }, 30);
    placeHotspotsSoon();
    if (this.dots === 5) setTimeout(() => this.signedDone?.(), 700);
  }

  hint = () => void say(this.phase === 2 ? T.hint2 : T.hint);

  async enter() {
    this.sel = -1;
    this.mended = [false, false, false];
    this.fly = {};
    this.shake = {};
    this.dots = 0;
    this.press = [0, 0, 0, 0, 0];
    this.phase = 0;
    await say(T.intro);
    this.phase = 1;
    placeHotspotsSoon();
    setGoal(T.goal);
    const auto = setTimeout(() => {
      if (this.phase === 1 && !dialogOpen()) this.hint();
    }, 38000);
    await new Promise<void>((r) => (this.mendedDone = r));
    clearTimeout(auto);
    clearGoal();
    this.phase = 0;
    placeHotspotsSoon();
    chime();
    await wait(400);
    await say(T.mended.slice(0, 1));
    this.phase = 2;
    await say(T.mended.slice(1));
    placeHotspotsSoon();
    setGoal(T.goal2);
    await new Promise<void>((r) => (this.signedDone = r));
    clearGoal();
    this.phase = 3;
    placeHotspotsSoon();
    chime();
    await say(T.signed);
    await award('kil');
    await card(T.card.title, T.card.facts, 'kil');
    await go(3);
  }
}

/** Hotspots change with the phase; re-lay them out a moment after the state has changed. */
function placeHotspotsSoon() {
  setTimeout(placeHotspots, 0);
}
