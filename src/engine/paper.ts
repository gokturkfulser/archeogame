/* Cut-paper drawing helpers (world units). Used by code-drawn layers. */
import { Ctx, H, TAU, W, clamp, nz, par, rng, stage } from './core';

export type Star = [number, number, number, number, number];

/** Paper grain tile, composited over every code-drawn layer. */
export const grain = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 192;
  const g = c.getContext('2d')!;
  const r = rng(7);
  for (let i = 0; i < 2800; i++) {
    const a = r() * 0.09;
    g.fillStyle = r() < 0.85 ? `rgba(0,0,0,${a})` : `rgba(255,240,210,${a * 0.6})`;
    g.fillRect(r() * 192, r() * 192, 1 + r() * 1.6, 1 + r() * 1.6);
  }
  for (let i = 0; i < 70; i++) {
    g.strokeStyle = `rgba(0,0,0,${0.03 + r() * 0.05})`;
    g.lineWidth = 0.7;
    g.beginPath();
    let x = r() * 192;
    let y = r() * 192;
    g.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += (r() - 0.5) * 20;
      y += (r() - 0.5) * 20;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  return c;
})();

/** Knife-cut: punches a hole through what is already drawn on this layer. */
export function cut(g: Ctx, fn: () => void) {
  g.save();
  g.globalCompositeOperation = 'destination-out';
  fn();
  g.restore();
}

export function ridge(g: Ctx, y0: number, amp: number, freq: number, sd: number, col: string) {
  const { Mx, My } = stage;
  g.fillStyle = col;
  g.beginPath();
  const x0 = -Mx - 60;
  const x1 = W + Mx + 60;
  g.moveTo(x0, H + My + 60);
  for (let x = x0; x <= x1; x += 14) g.lineTo(x, y0 - amp * nz(x * freq, sd));
  g.lineTo(x1, H + My + 60);
  g.closePath();
  g.fill();
}

export function dot(g: Ctx, x: number, y: number, r: number) {
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

export function perfLine(g: Ctx, x1: number, y1: number, x2: number, y2: number, step: number, r: number, col: string) {
  const d = Math.hypot(x2 - x1, y2 - y1);
  const n = Math.max(1, Math.floor(d / step));
  g.fillStyle = col;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    dot(g, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, r);
  }
}

export function perfArc(g: Ctx, cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, step: number, r: number, col: string) {
  const n = Math.max(2, Math.floor((Math.abs(a1 - a0) * (rx + ry)) / 2 / step));
  g.fillStyle = col;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    dot(g, cx + rx * Math.cos(a), cy + ry * Math.sin(a), r);
  }
}

export function archPath(g: Ctx, x: number, y: number, w: number, h: number) {
  const r = w / 2;
  g.moveTo(x, y + h);
  g.lineTo(x, y + r);
  g.arc(x + r, y + r, r, Math.PI, TAU);
  g.lineTo(x + w, y + h);
  g.closePath();
}

export interface ColumnOpts {
  cap?: 'ion' | 'cor' | 'none';
  broken?: boolean;
  flutes?: boolean;
}

export function column(g: Ctx, x: number, base: number, h: number, w: number, o: ColumnOpts = {}) {
  const cap = o.cap || 'ion';
  const capH = cap === 'none' ? 0 : cap === 'cor' ? w * 1.1 : w * 0.62;
  const baseH = w * 0.45;
  const top = base - h + capH;
  g.beginPath();
  g.rect(x - w * 0.8, base - w * 0.2, w * 1.6, w * 0.2);
  g.rect(x - w * 0.64, base - baseH, w * 1.28, baseH - w * 0.2 + 1);
  if (o.broken) {
    const r = rng(Math.round(x * 7 + h * 3));
    g.moveTo(x - w * 0.5, base - baseH + 1);
    g.lineTo(x - w * 0.45, top + w * 0.5 * r());
    for (let i = 1; i < 5; i++) g.lineTo(x - w * 0.45 + (w * 0.9 * i) / 5, top + r() * w * 1.1 - w * 0.3);
    g.lineTo(x + w * 0.45, top + w * 0.6 * r());
    g.lineTo(x + w * 0.5, base - baseH + 1);
    g.closePath();
  } else {
    g.moveTo(x - w * 0.5, base - baseH + 1);
    g.lineTo(x - w * 0.42, top);
    g.lineTo(x + w * 0.42, top);
    g.lineTo(x + w * 0.5, base - baseH + 1);
    g.closePath();
  }
  g.fill();
  if (!o.broken && cap !== 'none') {
    g.beginPath();
    if (cap === 'cor') {
      g.moveTo(x - w * 0.44, top + 1);
      g.quadraticCurveTo(x - w * 0.5, top - capH * 0.6, x - w * 0.86, top - capH * 0.86);
      g.lineTo(x + w * 0.86, top - capH * 0.86);
      g.quadraticCurveTo(x + w * 0.5, top - capH * 0.6, x + w * 0.44, top + 1);
      g.closePath();
      g.rect(x - w * 0.95, top - capH, w * 1.9, capH * 0.16);
    } else {
      g.rect(x - w * 0.7, top - capH * 0.55, w * 1.4, capH * 0.42);
      g.rect(x - w * 0.82, top - capH, w * 1.64, capH * 0.46);
      g.moveTo(x - w * 0.62 + w * 0.26, top - capH * 0.32);
      g.arc(x - w * 0.62, top - capH * 0.32, w * 0.26, 0, TAU);
      g.moveTo(x + w * 0.62 + w * 0.26, top - capH * 0.32);
      g.arc(x + w * 0.62, top - capH * 0.32, w * 0.26, 0, TAU);
    }
    g.fill();
  }
  if (o.flutes !== false && w > 15) {
    cut(g, () => {
      const t0 = (o.broken ? top + w * 1.1 : top) + w * 0.25;
      const b0 = base - baseH - w * 0.15;
      for (let k = -1; k <= 1; k++) g.fillRect(x + k * w * 0.24 - w * 0.035, t0, w * 0.07, Math.max(0, b0 - t0));
      if (!o.broken && cap === 'ion') {
        dot(g, x - w * 0.62, top - capH * 0.32, w * 0.08);
        dot(g, x + w * 0.62, top - capH * 0.32, w * 0.08);
      }
      if (!o.broken && cap === 'cor') {
        for (let k = -2; k <= 2; k++) {
          g.beginPath();
          g.ellipse(x + k * w * 0.3, top - capH * 0.4, w * 0.06, capH * 0.22, 0, 0, TAU);
          g.fill();
        }
      }
    });
  }
}

export function cypress(g: Ctx, x: number, base: number, h: number, w: number, sd = 1) {
  g.beginPath();
  g.moveTo(x, base - h);
  g.bezierCurveTo(x + w * 0.72, base - h * 0.7, x + w * 0.62, base - h * 0.18, x + w * 0.14, base);
  g.lineTo(x - w * 0.14, base);
  g.bezierCurveTo(x - w * 0.62, base - h * 0.18, x - w * 0.72, base - h * 0.7, x, base - h);
  g.fill();
  const r = rng((sd * 97 + x) | 0);
  cut(g, () => {
    for (let i = 0; i < Math.floor(h / 9); i++) {
      const yy = base - h * 0.08 - r() * h * 0.82;
      const f = (base - yy) / h;
      const half = w * 0.5 * Math.sin(Math.PI * clamp(f * 1.1, 0, 1)) * 0.9;
      const xx = x + (r() * 2 - 1) * half * 0.8;
      g.beginPath();
      g.ellipse(xx, yy, 1.4, 5 + r() * 4, (r() - 0.5) * 0.8, 0, TAU);
      g.fill();
    }
  });
}

export function olive(g: Ctx, x: number, base: number, sc: number, sd: number) {
  const r = rng(sd);
  g.beginPath();
  g.moveTo(x - 14 * sc, base);
  g.bezierCurveTo(x - 24 * sc, base - 60 * sc, x + 20 * sc, base - 90 * sc, x - 6 * sc, base - 150 * sc);
  g.lineTo(x + 8 * sc, base - 150 * sc);
  g.bezierCurveTo(x + 34 * sc, base - 96 * sc, x - 2 * sc, base - 60 * sc, x + 16 * sc, base);
  g.closePath();
  g.fill();
  const blobs: [number, number, number][] = [];
  for (let i = 0; i < 11; i++) {
    const bx = x + (r() * 2 - 1) * 95 * sc;
    const by = base - 175 * sc + (r() * 2 - 1) * 48 * sc;
    const br = (36 + r() * 34) * sc;
    blobs.push([bx, by, br]);
    g.beginPath();
    g.arc(bx, by, br, 0, TAU);
    g.fill();
  }
  cut(g, () => {
    for (let i = 0; i < 190; i++) {
      const b = blobs[i % blobs.length];
      const a = r() * TAU;
      const d = r() * b[2] * 0.85;
      g.beginPath();
      g.ellipse(b[0] + Math.cos(a) * d, b[1] + Math.sin(a) * d, 1.6 * sc, 6 * sc, r() * TAU, 0, TAU);
      g.fill();
    }
  });
}

export function poppy(g: Ctx, x: number, base: number, h: number, r: number) {
  g.strokeStyle = '#160b1e';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x, base);
  g.quadraticCurveTo(x + r * 1.4, base - h * 0.5, x + r * 0.4, base - h);
  g.stroke();
  g.fillStyle = '#d8352b';
  g.beginPath();
  g.arc(x + r * 0.4, base - h, r, 0, TAU);
  g.fill();
  g.fillStyle = '#f06a43';
  g.beginPath();
  g.arc(x + r * 0.1, base - h - r * 0.25, r * 0.55, 0, TAU);
  g.fill();
  g.fillStyle = '#160b1e';
  dot(g, x + r * 0.4, base - h, r * 0.28);
}

export function grass(g: Ctx, x0: number, x1: number, base: number, hmin: number, hmax: number, sd: number) {
  const r = rng(sd);
  g.beginPath();
  for (let x = x0; x < x1; x += 5 + r() * 7) {
    const h = hmin + r() * (hmax - hmin);
    const lean = (r() - 0.5) * 28;
    g.moveTo(x - 3, base);
    g.quadraticCurveTo(x + lean * 0.4, base - h * 0.6, x + lean, base - h);
    g.quadraticCurveTo(x + lean * 0.3 + 2, base - h * 0.5, x + 4, base);
  }
  g.fill();
}

export function skyFill(g: Ctx, stops: [number, string][]) {
  const { Mx, My } = stage;
  const gr = g.createLinearGradient(0, 0, 0, H);
  stops.forEach(([p, c]) => gr.addColorStop(p, c));
  g.fillStyle = gr;
  g.fillRect(-Mx - 80, -My - 80, W + 2 * Mx + 160, H + 2 * My + 160);
}

export function stars(g: Ctx, list: Star[], a = 1) {
  for (const st of list) {
    const tw = 0.55 + 0.45 * Math.sin(stage.T * st[3] + st[4]);
    g.fillStyle = `rgba(255,240,205,${tw * st[2] * a})`;
    dot(g, st[0] + par(0.01).x, st[1], st[2] * 1.6);
  }
}

export function makeStars(n: number, ymax: number, sd: number): Star[] {
  const { Mx, My } = stage;
  const r = rng(sd);
  const a: Star[] = [];
  for (let i = 0; i < n; i++) a.push([-Mx + r() * (W + 2 * Mx + 200), -My * 0.5 + r() * (ymax + My * 0.5), 0.4 + r() * 0.8, 1 + r() * 3, r() * 6]);
  return a;
}

export function glowDisk(g: Ctx, x: number, y: number, r: number, core: string, halo: string) {
  const gr = g.createRadialGradient(x, y, r * 0.6, x, y, r * 3.2);
  gr.addColorStop(0, halo);
  gr.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = gr;
  dot(g, x, y, r * 3.2);
  g.fillStyle = core;
  dot(g, x, y, r);
}
