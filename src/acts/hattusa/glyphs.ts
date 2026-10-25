/* Carved pictures of Act 2 (Hattuşa), drawn in code so the puzzles can light, dim and emboss them exactly.
   Every glyph is built in a unit box (-1..1) and painted with the current fill/stroke colour. */
import { Ctx, TAU } from '../../engine/core';

export type GlyphId = 'gunes' | 'dag' | 'geyik' | 'aslan' | 'kus' | 'boga' | 'kartal';

const line = (g: Ctx, pts: number[][], w: number) => {
  g.lineWidth = w;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
};
const blob = (g: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) => {
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, TAU);
  g.fill();
};

const GLYPHS: Record<GlyphId, (g: Ctx) => void> = {
  gunes(g) {
    blob(g, 0, 0, 0.36, 0.36);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      line(g, [[Math.cos(a) * 0.5, Math.sin(a) * 0.5], [Math.cos(a) * (i % 2 ? 0.78 : 0.92), Math.sin(a) * (i % 2 ? 0.78 : 0.92)]], 0.09);
    }
  },
  dag(g) {
    g.beginPath();
    g.moveTo(-0.95, 0.6);
    g.lineTo(-0.35, -0.35);
    g.lineTo(0.15, 0.6);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(-0.15, 0.6);
    g.lineTo(0.4, -0.7);
    g.lineTo(0.95, 0.6);
    g.closePath();
    g.fill();
    blob(g, -0.55, -0.62, 0.14, 0.14);
  },
  geyik(g) {
    blob(g, -0.1, 0.1, 0.5, 0.24);
    g.beginPath(); // neck and head
    g.moveTo(0.22, 0.02);
    g.lineTo(0.38, -0.46);
    g.lineTo(0.52, -0.42);
    g.lineTo(0.44, 0.06);
    g.fill();
    blob(g, 0.56, -0.5, 0.2, 0.1, 0.3);
    for (const x of [-0.45, -0.3, 0.1, 0.28]) line(g, [[x, 0.25], [x - 0.02, 0.78]], 0.12);
    line(g, [[-0.58, 0.0], [-0.74, -0.08]], 0.09);
    // antlers
    line(g, [[0.46, -0.58], [0.4, -0.95], [0.3, -0.98]], 0.06);
    line(g, [[0.43, -0.78], [0.55, -0.9]], 0.05);
    line(g, [[0.4, -0.9], [0.26, -0.82]], 0.05);
    line(g, [[0.52, -0.58], [0.66, -0.92], [0.78, -0.9]], 0.06);
    line(g, [[0.6, -0.76], [0.74, -0.7]], 0.05);
  },
  aslan(g) {
    blob(g, -0.15, 0.15, 0.5, 0.26);
    blob(g, 0.5, -0.12, 0.34, 0.34); // mane
    blob(g, 0.62, -0.06, 0.19, 0.17);
    for (const x of [-0.5, -0.32, 0.12, 0.3]) line(g, [[x, 0.3], [x, 0.8]], 0.14);
    line(g, [[-0.62, 0.05], [-0.88, -0.15], [-0.78, -0.5], [-0.62, -0.42]], 0.07);
    blob(g, -0.62, -0.46, 0.09, 0.09);
  },
  kus(g) {
    blob(g, 0, 0.1, 0.46, 0.22, -0.2);
    blob(g, 0.46, -0.18, 0.14, 0.14);
    g.beginPath();
    g.moveTo(0.58, -0.2);
    g.lineTo(0.84, -0.12);
    g.lineTo(0.58, -0.1);
    g.fill();
    g.beginPath(); // wing
    g.moveTo(-0.1, 0.05);
    g.lineTo(-0.5, -0.8);
    g.lineTo(0.15, -0.55);
    g.lineTo(0.3, 0.0);
    g.fill();
    g.beginPath(); // tail
    g.moveTo(-0.38, 0.2);
    g.lineTo(-0.95, 0.5);
    g.lineTo(-0.9, 0.2);
    g.lineTo(-0.4, 0.05);
    g.fill();
    line(g, [[0.05, 0.3], [0.0, 0.6]], 0.06);
    line(g, [[0.2, 0.3], [0.2, 0.6]], 0.06);
  },
  boga(g) {
    blob(g, -0.1, 0.05, 0.55, 0.3);
    blob(g, 0.38, -0.12, 0.3, 0.3); // hump / shoulders
    blob(g, 0.72, 0.12, 0.2, 0.15, 0.3);
    line(g, [[0.64, -0.0], [0.72, -0.3], [0.9, -0.32]], 0.07); // horn
    for (const x of [-0.55, -0.35, 0.1, 0.35]) line(g, [[x, 0.25], [x, 0.78]], 0.14);
    line(g, [[-0.62, -0.05], [-0.85, 0.15], [-0.82, 0.5]], 0.06);
  },
  kartal(g) {
    blob(g, 0, 0.12, 0.2, 0.36);
    blob(g, -0.18, -0.4, 0.13, 0.13);
    blob(g, 0.18, -0.4, 0.13, 0.13);
    g.beginPath();
    g.moveTo(-0.28, -0.42);
    g.lineTo(-0.5, -0.36);
    g.lineTo(-0.28, -0.34);
    g.moveTo(0.28, -0.42);
    g.lineTo(0.5, -0.36);
    g.lineTo(0.28, -0.34);
    g.fill();
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(s * 0.15, -0.1);
      g.lineTo(s * 0.95, -0.55);
      g.lineTo(s * 0.9, -0.1);
      g.lineTo(s * 0.8, 0.15);
      g.lineTo(s * 0.55, 0.3);
      g.lineTo(s * 0.18, 0.3);
      g.fill();
    }
    line(g, [[0, 0.45], [0, 0.85]], 0.18);
    line(g, [[-0.18, 0.6], [-0.3, 0.9]], 0.08);
    line(g, [[0.18, 0.6], [0.3, 0.9]], 0.08);
  },
};

/** Fills and strokes one glyph with `col`, centred at (x, y), `size` world units across. */
export function glyph(g: Ctx, id: GlyphId, x: number, y: number, size: number, col: string) {
  g.save();
  g.translate(x, y);
  g.scale(size / 2, size / 2);
  g.fillStyle = col;
  g.strokeStyle = col;
  GLYPHS[id](g);
  g.restore();
}

/**
 * A carving seen in raking light: the cut edge facing the light catches a highlight, the far edge falls into shadow.
 * (dx, dy) points from the carving to the light; `a` fades the whole thing in and out.
 */
export function carved(g: Ctx, id: GlyphId, x: number, y: number, size: number, dx: number, dy: number, a: number) {
  if (a < 0.01) return;
  const m = Math.hypot(dx, dy) || 1;
  const ux = dx / m;
  const uy = dy / m;
  const o = Math.max(1.5, size * 0.022);
  g.save();
  g.globalAlpha = a;
  glyph(g, id, x - ux * o, y - uy * o, size, 'rgba(36,14,40,.85)');
  glyph(g, id, x + ux * o, y + uy * o, size, 'rgba(255,228,168,.95)');
  glyph(g, id, x, y, size, 'rgba(176,118,78,.95)');
  g.restore();
}

/** One of the twelve running gods of Yazılıkaya chamber B: tall horned cap, profile head, short kilt, upturned shoes, curved sword. */
export function god(g: Ctx, x: number, base: number, h: number, col: string, stride = 0) {
  g.save();
  g.translate(x, base);
  g.scale(h, h);
  g.fillStyle = col;
  g.strokeStyle = col;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const st = stride * 0.045;
  // legs: a long running stride, calves a little thicker than ankles
  line(g, [[-0.02, -0.33], [-0.1 - st, -0.17], [-0.15 - st, -0.05]], 0.085);
  line(g, [[0.03, -0.33], [0.12 + st, -0.19], [0.17 + st, -0.06]], 0.085);
  // upturned pointed shoes
  g.beginPath();
  g.moveTo(-0.2 - st, -0.025);
  g.lineTo(-0.075 - st, -0.025);
  g.lineTo(-0.075 - st, -0.075);
  g.lineTo(-0.1 - st, -0.075);
  g.quadraticCurveTo(-0.17 - st, -0.07, -0.265 - st, -0.115);
  g.quadraticCurveTo(-0.24 - st, -0.04, -0.2 - st, -0.025);
  g.fill();
  g.beginPath();
  g.moveTo(0.1 + st, -0.045);
  g.lineTo(0.235 + st, -0.045);
  g.quadraticCurveTo(0.3 + st, -0.07, 0.33 + st, -0.135);
  g.quadraticCurveTo(0.24 + st, -0.1, 0.1 + st, -0.1);
  g.fill();
  // kilt with a pleated hem
  g.beginPath();
  g.moveTo(-0.115, -0.53);
  g.lineTo(0.125, -0.53);
  g.lineTo(0.175, -0.33);
  g.lineTo(0.1, -0.3);
  g.lineTo(0.02, -0.33);
  g.lineTo(-0.06, -0.3);
  g.lineTo(-0.16, -0.33);
  g.closePath();
  g.fill();
  // belt and torso with broad shoulders
  g.beginPath();
  g.moveTo(-0.1, -0.53);
  g.lineTo(0.11, -0.53);
  g.lineTo(0.15, -0.79);
  g.lineTo(-0.12, -0.79);
  g.closePath();
  g.fill();
  // arms: front arm raised with the sword, back arm bent down
  line(g, [[0.1, -0.75], [0.2, -0.66], [0.27, -0.72]], 0.06);
  line(g, [[0.27, -0.72], [0.31, -0.84], [0.4, -1.0]], 0.035); // curved blade
  g.beginPath();
  g.moveTo(0.4, -1.0);
  g.quadraticCurveTo(0.34, -0.99, 0.31, -0.92);
  g.quadraticCurveTo(0.36, -0.95, 0.4, -1.0);
  g.fill();
  line(g, [[-0.1, -0.75], [-0.17, -0.62], [-0.12, -0.52]], 0.055);
  // neck and head in profile, big nose and chin
  line(g, [[0.0, -0.79], [0.01, -0.84]], 0.07);
  g.beginPath();
  g.moveTo(-0.05, -0.93);
  g.quadraticCurveTo(-0.06, -0.86, 0.0, -0.845);
  g.lineTo(0.06, -0.85);
  g.lineTo(0.075, -0.865);
  g.lineTo(0.13, -0.875); // nose tip
  g.lineTo(0.07, -0.9);
  g.quadraticCurveTo(0.075, -0.95, 0.04, -0.965);
  g.closePath();
  g.fill();
  // tall conical cap with a horn curling in front
  g.beginPath();
  g.moveTo(-0.075, -0.94);
  g.lineTo(-0.02, -1.2);
  g.lineTo(0.0, -1.23);
  g.lineTo(0.065, -0.95);
  g.closePath();
  g.fill();
  g.lineWidth = 0.022;
  g.beginPath();
  g.moveTo(0.06, -0.96);
  g.quadraticCurveTo(0.14, -1.05, 0.08, -1.14);
  g.stroke();
  g.restore();
}

/** A cuneiform wedge pressed into clay at (x, y): a head triangle with a tail. */
export function wedge(g: Ctx, x: number, y: number, ang: number, len: number, col: string, shade: string) {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.beginPath();
  g.moveTo(0, -len * 0.18);
  g.lineTo(len * 0.3, 0);
  g.lineTo(0, len * 0.18);
  g.closePath();
  g.fillStyle = shade;
  g.fill();
  g.beginPath();
  g.moveTo(len * 0.02, -len * 0.12);
  g.lineTo(len * 0.26, 0);
  g.lineTo(len * 0.02, len * 0.12);
  g.closePath();
  g.fillStyle = col;
  g.fill();
  g.strokeStyle = shade;
  g.lineWidth = Math.max(1.2, len * 0.045);
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(len * 0.26, 0);
  g.lineTo(len * 0.8, 0);
  g.stroke();
  g.restore();
}
