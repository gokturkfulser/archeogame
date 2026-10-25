/* The flashlight beam: a soft cone from Deniz’s flashlight lens to the lit spot under the pointer.
   The lit spot itself (`lamp.x/y`) is what reveals things; the cone only shows where the light comes from. */
import { Ctx, RM, TAU, lamp, stage } from './core';
import { deniz } from './deniz';
import { dot } from './paper';

/** Half-width of the beam where it reaches the lit spot (about the radius things are revealed in). */
const END_HALF = 150;
const START_HALF = 7;

export function drawBeam(g: Ctx) {
  const l = deniz.lens;
  const T = stage.T;
  const tx = lamp.x;
  const ty = lamp.y;

  g.save();
  g.globalCompositeOperation = 'screen';

  if (l) {
    const dx = tx - l.x;
    const dy = ty - l.y;
    const d = Math.hypot(dx, dy);
    if (d > 30) {
      const nx = -dy / d;
      const ny = dx / d;
      // a longer beam is a little narrower at the far end, and it flickers very slightly
      const flick = RM ? 1 : 1 + 0.02 * Math.sin(T * 17) + 0.015 * Math.sin(T * 29);
      const end = (END_HALF * 0.85 + Math.min(d, 600) * 0.1) * flick;
      // the cone fades out a little beyond the lit spot, so it has no hard end
      const ext = d * 0.16;
      const ex = tx + (dx / d) * ext;
      const ey = ty + (dy / d) * ext;
      const grad = g.createLinearGradient(l.x, l.y, ex, ey);
      grad.addColorStop(0, 'rgba(255,244,205,0.9)');
      grad.addColorStop(0.4, 'rgba(255,222,155,0.5)');
      grad.addColorStop(0.86, 'rgba(255,204,115,0.26)');
      grad.addColorStop(1, 'rgba(255,200,110,0)');
      g.fillStyle = grad;
      // many faint nested cones: the middle is brightest and the edge falls off smoothly
      const STEPS = 9;
      g.globalAlpha = 0.17;
      for (let i = 0; i < STEPS; i++) {
        const f = 1 - i / STEPS;
        const w1 = end * (0.12 + 0.95 * f);
        const w0 = START_HALF * (0.4 + 0.6 * f);
        const spread = 1 + ext / d;
        g.beginPath();
        g.moveTo(l.x + nx * w0, l.y + ny * w0);
        g.lineTo(l.x + (dx * spread) + nx * w1 * spread, l.y + (dy * spread) + ny * w1 * spread);
        g.lineTo(l.x + (dx * spread) - nx * w1 * spread, l.y + (dy * spread) - ny * w1 * spread);
        g.lineTo(l.x - nx * w0, l.y - ny * w0);
        g.closePath();
        g.fill();
      }
      g.globalAlpha = 1;

      // bloom at the lens
      const bloom = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, 38);
      bloom.addColorStop(0, 'rgba(255,250,225,0.95)');
      bloom.addColorStop(0.35, 'rgba(255,226,160,0.5)');
      bloom.addColorStop(1, 'rgba(255,200,110,0)');
      g.fillStyle = bloom;
      dot(g, l.x, l.y, 38);

      // dust motes drifting through the light
      g.fillStyle = 'rgba(255,240,200,0.9)';
      for (let i = 0; i < 14; i++) {
        const t = RM ? (i + 0.5) / 14 : (i * 0.173 + T * (0.035 + (i % 3) * 0.012)) % 1;
        const half = START_HALF + (end - START_HALF) * t;
        const lat = Math.sin(i * 12.9898 + (RM ? 0 : T * 0.5)) * half * 0.8;
        g.globalAlpha = 0.55 * Math.sin(Math.PI * t);
        dot(g, l.x + dx * t + nx * lat, l.y + dy * t + ny * lat, 1.2 + (i % 3) * 0.7);
      }
      g.globalAlpha = 1;
    }
  }

  // the lit spot: a small bright core with a thin ring, so the aim is easy to see
  const core = g.createRadialGradient(tx, ty, 0, tx, ty, 26);
  core.addColorStop(0, 'rgba(255,248,220,0.85)');
  core.addColorStop(1, 'rgba(255,210,130,0)');
  g.fillStyle = core;
  dot(g, tx, ty, 26);
  g.strokeStyle = 'rgba(255,236,190,0.55)';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(tx, ty, 17 + (RM ? 0 : Math.sin(T * 3) * 1.5), 0, TAU);
  g.stroke();
  g.restore();
}
