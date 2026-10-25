/* Mouse, touch and keyboard. The pointer position is where Deniz holds the lamp. */
import { H, W, clamp, lamp, stage } from './core';
import { dialogKey, dialogOpen } from './dialogue';
import type { Scene } from './scene';

export function toWorld(e: { clientX: number; clientY: number }) {
  return { x: (e.clientX - stage.ox) / stage.s, y: (e.clientY - stage.oy) / stage.s };
}

export function initInput(getScene: () => Scene | null) {
  function moveLamp(e: PointerEvent) {
    if (lamp.lock) return;
    const { Mx, My, s } = stage;
    const p = toWorld(e);
    // With a finger the lamp rides a little above it so the hand does not cover the light.
    const off = e.pointerType === 'touch' ? 70 / s : 0;
    lamp.tx = clamp(p.x, -Mx + 20, W + Mx - 20);
    lamp.ty = clamp(p.y - off, -My + 20, H + My - 20);
  }
  addEventListener('pointermove', moveLamp, { passive: true });
  addEventListener('pointerdown', moveLamp, { passive: true });

  stage.cv.addEventListener('click', (e) => {
    const sc = getScene();
    if (sc && sc.onClick && !dialogOpen()) {
      const p = toWorld(e);
      sc.onClick(p.x, p.y);
    }
  });

  addEventListener('keydown', (e) => {
    if (dialogKey(e)) return;
    const st = e.shiftKey ? 70 : 30;
    const m = ({ ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] } as Record<string, number[]>)[e.key];
    if (m && !lamp.lock) {
      e.preventDefault();
      lamp.tx = clamp(lamp.tx + m[0], 0, W);
      lamp.ty = clamp(lamp.ty + m[1], 0, H);
      return;
    }
    const sc = getScene();
    if (sc && sc.onKey && !dialogOpen()) sc.onKey(e);
  });
}
