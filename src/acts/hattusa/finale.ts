/* The end of Act 2: closing lines, then the spinning Hattuşa coin with all four pieces. */
import { RM } from '../../engine/core';
import { holdCheer } from '../../engine/deniz';
import { say } from '../../engine/dialogue';
import { go } from '../../engine/game';
import { resetCollectibles } from '../../engine/hud';
import { hideStag } from '../../engine/kurunta';
import { fillNextActs } from '../../engine/next-acts';
import { markDone, unmarkDone } from '../../engine/progress';
import { coinImage, drawCoinImage } from './emblems';
import { TEXT } from './text';

export async function finale() {
  markDone('hattusa');
  await say(TEXT.finale);
  const fin = document.getElementById('final') as HTMLElement;
  fillNextActs(document.getElementById('nextActs') as HTMLElement);
  holdCheer(true);
  fin.hidden = false;
  (document.getElementById('again') as HTMLButtonElement).focus({ preventScroll: true });
  const c = document.getElementById('coinCanvas') as HTMLCanvasElement;
  const g = c.getContext('2d')!;
  let run = true;
  const t0 = performance.now();
  (function spin(now: number) {
    if (!run) return;
    const t = (now - t0) / 1000;
    const a = RM ? 0 : t * 1.4;
    const sx = Math.cos(a);
    g.clearRect(0, 0, 400, 400);
    g.save();
    g.translate(200, 200);
    g.scale(Math.max(0.04, Math.abs(sx)), 1);
    const img = coinImage(sx >= 0 ? 'geyik' : 'reverse');
    if (img) drawCoinImage(g, img, 0, 0, 185);
    g.restore();
    requestAnimationFrame(spin);
  })(t0);
  (document.getElementById('again') as HTMLButtonElement).onclick = async () => {
    run = false;
    holdCheer(false);
    unmarkDone('hattusa');
    fin.hidden = true;
    resetCollectibles();
    hideStag();
    await go(0);
  };
}
