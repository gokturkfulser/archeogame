/* Drawing for the reflection system (geometry is in reflect.ts): polished bronze mirrors, the bounced beam and gold glints.
   Everything puzzles depend on is drawn in code, not painted, so hit areas and picture always agree. */
import { Ctx, RM, TAU, stage } from './core';
import { dot } from './paper';
import type { Glint, Mirror, Trace } from './reflect';
import { glintLevel } from './reflect';

/** A bronze mirror: a thin knife-cut oval plate on a stand, bright where the beam strikes it. `lit` is 0..1. */
export function drawMirror(g: Ctx, m: Mirror, lit = 0, selected = false) {
  const T = stage.T;
  g.save();
  g.translate(m.x, m.y);
  // the face lies along the tangent, the normal points to the shiny side
  g.rotate(m.angle + Math.PI / 2);

  // stand
  g.fillStyle = '#3a2418';
  g.beginPath();
  g.moveTo(-9, 6);
  g.lineTo(9, 6);
  g.lineTo(14, 70);
  g.lineTo(-14, 70);
  g.closePath();
  g.fill();

  // rim and plate (the plate is a flat ellipse seen edge-on)
  const rim = g.createLinearGradient(0, -m.r, 0, m.r);
  rim.addColorStop(0, '#f0c070');
  rim.addColorStop(0.5, '#a8672a');
  rim.addColorStop(1, '#5a3418');
  g.fillStyle = rim;
  g.beginPath();
  g.ellipse(0, 0, 11, m.r + 5, 0, 0, TAU);
  g.fill();
  const face = g.createLinearGradient(-8, 0, 8, 0);
  face.addColorStop(0, '#ffe7ae');
  face.addColorStop(1, '#d99a48');
  g.fillStyle = face;
  g.beginPath();
  g.ellipse(-2, 0, 6, m.r, 0, 0, TAU);
  g.fill();

  // punched border dots, like the other paper pieces
  g.fillStyle = 'rgba(60,30,10,0.75)';
  for (let i = -3; i <= 3; i++) dot(g, 4, (i / 3) * (m.r - 10), 1.6);

  if (lit > 0 || selected) {
    g.globalCompositeOperation = 'screen';
    const a = Math.max(lit, selected ? 0.25 : 0);
    const glow = g.createRadialGradient(-3, 0, 0, -3, 0, m.r + 18);
    glow.addColorStop(0, `rgba(255,238,190,${0.85 * a})`);
    glow.addColorStop(1, 'rgba(255,200,110,0)');
    g.fillStyle = glow;
    dot(g, -3, 0, m.r + 18);
  }
  if (selected) {
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = 'rgba(255,236,190,0.8)';
    g.lineWidth = 2;
    g.setLineDash([5, 5]);
    g.lineDashOffset = RM ? 0 : -T * 12;
    g.beginPath();
    g.ellipse(0, 0, 20, m.r + 14, 0, 0, TAU);
    g.stroke();
  }
  g.restore();
}

/** The beam after its first bounce: nested soft strips like the flashlight cone, fainter each time, with a spark at every mirror. */
export function drawBounces(g: Ctx, trace: Trace) {
  if (trace.segs.length < 2) return;
  const T = stage.T;
  g.save();
  g.globalCompositeOperation = 'screen';
  g.lineCap = 'round';
  for (let i = 1; i < trace.segs.length; i++) {
    const s = trace.segs[i];
    const grad = g.createLinearGradient(s.x0, s.y0, s.x1, s.y1);
    grad.addColorStop(0, `rgba(255,244,205,${0.9 * s.power})`);
    grad.addColorStop(1, `rgba(255,214,140,${0.45 * s.power})`);
    g.strokeStyle = grad;
    const flick = RM ? 1 : 1 + 0.03 * Math.sin(T * 19 + i);
    for (const [w, a] of [[34, 0.12], [20, 0.18], [9, 0.32], [3, 0.7]] as const) {
      g.globalAlpha = a * flick;
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(s.x0, s.y0);
      g.lineTo(s.x1, s.y1);
      g.stroke();
    }
  }
  g.globalAlpha = 1;
  for (const h of trace.hits) {
    const r = 34 + (RM ? 0 : Math.sin(T * 6 + h.x) * 4);
    const sp = g.createRadialGradient(h.x, h.y, 0, h.x, h.y, r);
    sp.addColorStop(0, 'rgba(255,250,225,0.95)');
    sp.addColorStop(1, 'rgba(255,210,130,0)');
    g.fillStyle = sp;
    dot(g, h.x, h.y, r);
  }
  g.restore();
}

/** A gold flake and its sparkle. Returns the brightness it was drawn with (0..1) so a puzzle can count it as caught. */
export function drawGlint(g: Ctx, gl: Glint, trace: Trace, caught = false): number {
  const lvl = glintLevel(gl, trace);
  const T = stage.T;
  g.save();
  g.translate(gl.x, gl.y);
  g.rotate(gl.angle);
  // the flake: a small perforated gold leaf, dull until the light is right
  g.fillStyle = caught ? '#ffd873' : `rgb(${150 + lvl * 100},${112 + lvl * 100},${48 + lvl * 50})`;
  g.beginPath();
  g.ellipse(0, 0, gl.r, gl.r * 0.55, 0, 0, TAU);
  g.fill();
  g.rotate(-gl.angle);

  const a = caught ? 1 : lvl;
  if (a > 0.02) {
    g.globalCompositeOperation = 'screen';
    // four-point star flash
    const rr = gl.r * (2.2 + 2.4 * a) * (RM ? 1 : 1 + 0.12 * Math.sin(T * 14 + gl.x));
    g.fillStyle = `rgba(255,246,214,${0.95 * a})`;
    g.beginPath();
    for (let k = 0; k < 8; k++) {
      const ang = (k * Math.PI) / 4 + Math.PI / 4;
      const rad = k % 2 === 0 ? rr : rr * 0.18;
      g.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
    }
    g.closePath();
    g.fill();
    const halo = g.createRadialGradient(0, 0, 0, 0, 0, rr);
    halo.addColorStop(0, `rgba(255,226,150,${0.6 * a})`);
    halo.addColorStop(1, 'rgba(255,200,100,0)');
    g.fillStyle = halo;
    dot(g, 0, 0, rr);
  }
  g.restore();
  return lvl;
}
