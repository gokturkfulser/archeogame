/* The Sardes coin and its four pieces (altın damla, aslan başı, boğa, zımba izi). Higgsfield medallion art; a plain gold disc is the fallback. */
import { Ctx, TAU } from '../../engine/core';
import { loadImage } from '../../engine/layers';
import { dot } from '../../engine/paper';

export type PieceId = 'damla' | 'aslan' | 'boga' | 'zimba';
export const PIECES: PieceId[] = ['damla', 'aslan', 'boga', 'zimba'];

const FILES: Record<string, string> = {
  damla: 'sardes/coin-damla.webp',
  aslan: 'sardes/coin-aslan.webp',
  boga: 'sardes/coin-boga.webp',
  zimba: 'sardes/coin-zimba.webp',
  front: 'sardes/coin-front.webp',
  reverse: 'sardes/coin-reverse.webp',
};
const imgs: Record<string, HTMLImageElement> = {};

export function useCoinImages(onLoad: () => void) {
  Promise.all(Object.entries(FILES).map(async ([k, f]) => (imgs[k] = await loadImage(f))))
    .then(onLoad)
    .catch((err) => console.warn('coin images not loaded, keeping drawn coins', err));
}

export const coinImage = (id: string): HTMLImageElement | undefined => imgs[id];

/** Draws a coin image centred at (cx, cy), about 2R wide. */
export function drawCoinImage(g: Ctx, img: HTMLImageElement, cx: number, cy: number, R: number) {
  const w = R * 2.06;
  const h = (w * img.naturalHeight) / img.naturalWidth;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}

export function drawPiece(g: Ctx, type: string, cx: number, cy: number, R: number) {
  const img = imgs[type];
  if (img) return drawCoinImage(g, img, cx, cy, R);
  const gr = g.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R);
  gr.addColorStop(0, '#f8dc93');
  gr.addColorStop(0.65, '#d6a245');
  gr.addColorStop(1, '#9c6a24');
  g.fillStyle = gr;
  dot(g, cx, cy, R);
  g.strokeStyle = '#8a5a1c';
  g.lineWidth = R * 0.05;
  g.beginPath();
  g.arc(cx, cy, R * 0.9, 0, TAU);
  g.stroke();
}
