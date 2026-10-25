/* Camera moves for in-engine cinematics: push, pan and a small shake, tweened on the stage camera in core.ts. */
import { cam } from '../core';
import type { Cine } from './index';

const ease = (t: number) => t * t * (3 - 2 * t);

/** Moves the camera to zoom `z` centred on world point (x, y). */
export function camMove(c: Cine, to: { z?: number; x?: number; y?: number }, ms: number): Promise<void> {
  const a = { z: cam.z, x: cam.x, y: cam.y };
  return c.tween(ms, (t) => {
    const e = ease(t);
    cam.z = a.z + ((to.z ?? a.z) - a.z) * e;
    cam.x = a.x + ((to.x ?? a.x) - a.x) * e;
    cam.y = a.y + ((to.y ?? a.y) - a.y) * e;
  });
}

/** A shake that settles: `amount` world units at the start, fading to nothing over `ms`. */
export function camShake(c: Cine, amount: number, ms: number): Promise<void> {
  return c.tween(ms, (t) => {
    const k = (1 - t) * amount;
    cam.sx = (Math.random() - 0.5) * 2 * k;
    cam.sy = (Math.random() - 0.5) * 2 * k;
  });
}

export function camReset() {
  Object.assign(cam, { z: 1, sx: 0, sy: 0 });
}
