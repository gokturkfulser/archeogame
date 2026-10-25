/* The end of Act 1: closing lines, then the spinning Efes coin with all four pieces. */
import { RM } from '../../engine/core';
import { holdCheer } from '../../engine/deniz';
import { say } from '../../engine/dialogue';
import { go } from '../../engine/game';
import { resetCollectibles } from '../../engine/hud';
import { bee } from '../../engine/melissa';
import { fillNextActs } from '../../engine/next-acts';
import { markDone, unmarkDone } from '../../engine/progress';
import { beeTop, coinBase, coinImage, drawCoinImage, drawEF, palm, stag } from './emblems';
import { TEXT } from './text';

export async function finale() {
  markDone('efes');
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
    const front = coinImage('ari');
    const back = coinImage('reverse');
    if (front && back) {
      // Higgsfield coin art; the letters on the bee side are drawn in code
      drawCoinImage(g, sx >= 0 ? front : back, 0, 0, 185);
      if (sx >= 0) {
        drawEF(g, 'Ε', -134, 6, 76);
        drawEF(g, 'Φ', 134, 6, 76);
      }
      g.restore();
      requestAnimationFrame(spin);
      return;
    }
    coinBase(g, 0, 0, 185);
    const col = '#6a420f';
    if (sx >= 0) {
      g.save();
      g.scale(150, 150);
      beeTop(g, col, '#e9c272');
      g.restore();
      g.fillStyle = col;
      g.font = '700 70px Alegreya, Georgia, serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('Ε', -120, 10);
      g.fillText('Φ', 120, 10);
    } else {
      g.save();
      g.translate(-70, -5);
      g.scale(120, 120);
      palm(g, col);
      g.restore();
      g.save();
      g.translate(30, 20);
      g.scale(140, 140);
      stag(g, col);
      g.restore();
    }
    g.restore();
    requestAnimationFrame(spin);
  })(t0);
  (document.getElementById('again') as HTMLButtonElement).onclick = async () => {
    run = false;
    holdCheer(false);
    unmarkDone('efes');
    fin.hidden = true;
    resetCollectibles();
    bee.on = false;
    await go(0);
  };
}
