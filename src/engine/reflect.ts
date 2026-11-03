/* Reflection: the flashlight beam bounces off polished bronze mirrors and can light targets, and gold glints flash only
   when the beam passes them at the right angle. Pure geometry (no DOM), so it can be tested on its own; the drawing is in
   reflect-draw.ts. World units, angles in radians (0 = right, y points down). */

export interface Mirror {
  x: number;
  y: number;
  /** Half the length of the mirror face. */
  r: number;
  /** Direction of the face normal, i.e. which way the shiny side looks. */
  angle: number;
  /** Angle the mirror is turning towards (eased by `easeMirrors`). */
  want: number;
  /** Turn limits for `want`, as an offset from the angle it started at (rad). Omit for a free mirror. */
  range?: number;
  home: number;
}

export interface Target {
  x: number;
  y: number;
  r: number;
}

/** A gold flake that flashes when a beam passes within `r` of it travelling in about `angle` (±`tol`). */
export interface Glint {
  x: number;
  y: number;
  r: number;
  angle: number;
  tol: number;
}

export interface Segment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** 1 for the beam itself, less after every bounce. */
  power: number;
}

export interface Trace {
  segs: Segment[];
  /** Mirrors the beam hit, in order, with the hit point. */
  hits: { mirror: number; x: number; y: number }[];
  /** Index of the first target the light reached, or -1. */
  target: number;
}

export const MAX_BOUNCES = 3;
const BOUNCE_POWER = 0.82;
const FAR = 2600;
const EPS = 1e-6;

/** Wraps an angle to -π..π. */
export function wrap(a: number) {
  const t = Math.PI * 2;
  return a - t * Math.floor((a + Math.PI) / t);
}

export function makeMirror(x: number, y: number, r: number, angle: number, range?: number): Mirror {
  return { x, y, r, angle, want: angle, range, home: angle };
}

/**
 * Follows the beam from `from` towards `aim`: it flies straight until it meets the face of a mirror, turns by the mirror law
 * and carries on (at most `MAX_BOUNCES` times). The back of a mirror lets light stop, it does not reflect.
 * `length` is how far the last segment runs when nothing is hit.
 */
export function traceBeam(from: { x: number; y: number }, aim: { x: number; y: number }, mirrors: Mirror[], targets: Target[] = [], length = FAR): Trace {
  const trace: Trace = { segs: [], hits: [], target: -1 };
  let dx = aim.x - from.x;
  let dy = aim.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < EPS) return trace;
  dx /= len;
  dy /= len;
  let px = from.x;
  let py = from.y;
  let power = 1;
  let skip = -1;

  for (let bounce = 0; bounce <= MAX_BOUNCES; bounce++) {
    let best = length;
    let bestI = -1;
    for (let i = 0; i < mirrors.length; i++) {
      if (i === skip) continue;
      const m = mirrors[i];
      const nx = Math.cos(m.angle);
      const ny = Math.sin(m.angle);
      if (dx * nx + dy * ny >= 0) continue; // only the shiny face reflects
      const tx = -ny;
      const ty = nx;
      const den = dx * ty - dy * tx;
      if (Math.abs(den) < EPS) continue;
      const cx = m.x - px;
      const cy = m.y - py;
      const s = (cx * ty - cy * tx) / den;
      const u = (cx * dy - cy * dx) / den;
      if (s > EPS && s < best && Math.abs(u) <= m.r) {
        best = s;
        bestI = i;
      }
    }
    const x1 = px + dx * best;
    const y1 = py + dy * best;
    trace.segs.push({ x0: px, y0: py, x1, y1, power });

    if (trace.target < 0) {
      for (let k = 0; k < targets.length; k++) {
        if (distToSegment(targets[k].x, targets[k].y, px, py, x1, y1) <= targets[k].r) {
          trace.target = k;
          break;
        }
      }
    }
    if (bestI < 0 || bounce === MAX_BOUNCES) break; // after the last allowed bounce the light just ends on the next mirror

    const m = mirrors[bestI];
    trace.hits.push({ mirror: bestI, x: x1, y: y1 });
    const nx = Math.cos(m.angle);
    const ny = Math.sin(m.angle);
    const dot = dx * nx + dy * ny;
    dx -= 2 * dot * nx;
    dy -= 2 * dot * ny;
    px = x1;
    py = y1;
    power *= BOUNCE_POWER;
    skip = bestI;
  }
  return trace;
}

export function distToSegment(x: number, y: number, x0: number, y0: number, x1: number, y1: number) {
  const vx = x1 - x0;
  const vy = y1 - y0;
  const l2 = vx * vx + vy * vy;
  const t = l2 < EPS ? 0 : Math.max(0, Math.min(1, ((x - x0) * vx + (y - y0) * vy) / l2));
  return Math.hypot(x - (x0 + vx * t), y - (y0 + vy * t));
}

/**
 * How brightly a glint flashes, 0..1. It needs the beam close enough (within `reach` of the flake’s centre line, a little more
 * than the flake itself) and travelling in the right direction: full strength at the flake’s `angle`, nothing beyond `tol`.
 */
export function glintLevel(gl: Glint, trace: Trace, reach = 60): number {
  let best = 0;
  for (const s of trace.segs) {
    const d = distToSegment(gl.x, gl.y, s.x0, s.y0, s.x1, s.y1);
    const near = 1 - Math.max(0, d - gl.r) / reach;
    if (near <= 0) continue;
    const ang = Math.abs(wrap(Math.atan2(s.y1 - s.y0, s.x1 - s.x0) - gl.angle));
    const fit = 1 - ang / gl.tol;
    if (fit <= 0) continue;
    best = Math.max(best, Math.min(1, near) * fit * s.power);
  }
  return best;
}

/** Turns a mirror by `steps` notches of `step` radians, held inside its range. */
export function turnMirror(m: Mirror, steps: number, step = Math.PI / 24) {
  let off = wrap(m.want - m.home) + steps * step;
  if (m.range !== undefined) off = Math.max(-m.range, Math.min(m.range, off));
  m.want = m.home + off;
}

/** Eases every mirror towards the angle it was told to turn to. */
export function easeMirrors(mirrors: Mirror[], dt: number) {
  const k = 1 - Math.exp(-dt * 10);
  for (const m of mirrors) m.angle += wrap(m.want - m.angle) * k;
}
