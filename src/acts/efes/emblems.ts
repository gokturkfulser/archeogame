/* The Ephesian coin and its four pieces (bee, stag, palm, ΕΦ), drawn in code. */
import { Ctx, TAU } from '../../engine/core';
import { loadImage } from '../../engine/layers';
import { dot } from '../../engine/paper';

export type PieceId = 'ari' | 'geyik' | 'palmiye' | 'ef';
export const PIECES: PieceId[] = ['ari', 'geyik', 'palmiye', 'ef'];

export function beeTop(g: Ctx, col: string, light: string) {
  g.fillStyle = col;
  g.globalAlpha = 0.62;
  for (const [x, y, rx, ry, a] of [
    [-0.24, -0.12, 0.22, 0.12, -0.5],
    [0.24, -0.12, 0.22, 0.12, 0.5],
    [-0.19, 0.07, 0.15, 0.08, -0.3],
    [0.19, 0.07, 0.15, 0.08, 0.3],
  ]) {
    g.beginPath();
    g.ellipse(x, y, rx, ry, a, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
  g.beginPath();
  g.ellipse(0, 0.1, 0.12, 0.33, 0, 0, TAU);
  g.fill();
  dot(g, 0, -0.3, 0.1);
  g.strokeStyle = light;
  g.lineWidth = 0.035;
  for (const y of [0.02, 0.14, 0.26]) {
    g.beginPath();
    g.moveTo(-0.1, y);
    g.lineTo(0.1, y);
    g.stroke();
  }
  g.strokeStyle = col;
  g.lineWidth = 0.03;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-0.04, -0.38);
  g.quadraticCurveTo(-0.12, -0.5, -0.2, -0.5);
  g.moveTo(0.04, -0.38);
  g.quadraticCurveTo(0.12, -0.5, 0.2, -0.5);
  g.stroke();
}

export function stag(g: Ctx, col: string) {
  g.fillStyle = col;
  g.strokeStyle = col;
  g.lineCap = 'round';
  g.beginPath();
  g.ellipse(-0.04, 0.12, 0.36, 0.16, 0, 0, TAU);
  g.fill();
  g.beginPath();
  g.moveTo(0.18, 0.02);
  g.lineTo(0.32, -0.32);
  g.lineTo(0.42, -0.28);
  g.lineTo(0.3, 0.1);
  g.fill();
  g.beginPath();
  g.ellipse(0.44, -0.33, 0.13, 0.065, 0.35, 0, TAU);
  g.fill();
  g.lineWidth = 0.055;
  g.beginPath();
  for (const [a, b, c, d] of [
    [-0.29, 0.2, -0.32, 0.55],
    [-0.16, 0.22, -0.14, 0.56],
    [0.11, 0.22, 0.08, 0.56],
    [0.23, 0.2, 0.26, 0.55],
  ]) {
    g.moveTo(a, b);
    g.lineTo(c, d);
  }
  g.stroke();
  g.beginPath();
  g.moveTo(-0.38, 0.04);
  g.lineTo(-0.48, -0.02);
  g.lineTo(-0.4, 0.1);
  g.fill();
  g.lineWidth = 0.035;
  g.beginPath();
  g.moveTo(0.38, -0.38);
  g.lineTo(0.26, -0.7);
  g.moveTo(0.32, -0.53);
  g.lineTo(0.18, -0.6);
  g.moveTo(0.29, -0.62);
  g.lineTo(0.38, -0.74);
  g.moveTo(0.43, -0.39);
  g.lineTo(0.48, -0.72);
  g.moveTo(0.46, -0.56);
  g.lineTo(0.58, -0.62);
  g.stroke();
}

export function palm(g: Ctx, col: string) {
  g.strokeStyle = col;
  g.fillStyle = col;
  g.lineCap = 'round';
  g.lineWidth = 0.07;
  g.beginPath();
  g.moveTo(0, 0.62);
  g.quadraticCurveTo(0.07, 0.1, 0, -0.3);
  g.stroke();
  g.lineWidth = 0.045;
  for (const a of [-3.0, -2.6, -2.15, -1.57, -1.0, -0.55, -0.15]) {
    g.beginPath();
    g.moveTo(0, -0.3);
    const ex = Math.cos(a) * 0.42;
    const ey = -0.3 + Math.sin(a) * 0.34 + 0.12;
    g.quadraticCurveTo(ex * 0.6, -0.3 + Math.sin(a) * 0.42, ex, ey);
    g.stroke();
  }
  for (const [x, y] of [
    [-0.05, -0.22],
    [0.04, -0.2],
    [0, -0.16],
  ])
    dot(g, x, y, 0.045);
}

export function coinBase(g: Ctx, cx: number, cy: number, R: number) {
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
  g.fillStyle = '#9a6a22';
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * TAU;
    dot(g, cx + Math.cos(a) * R * 0.8, cy + Math.sin(a) * R * 0.8, R * 0.022);
  }
}

/* Higgsfield coin art. The code-drawn coin below is the fallback until these have loaded. */
const COIN_FILES: Record<string, string> = {
  ari: 'efes/coin-bee.webp',
  geyik: 'efes/coin-stag.webp',
  palmiye: 'efes/coin-palm.webp',
  ef: 'efes/coin-blank.webp',
  reverse: 'efes/coin-reverse.webp',
};
const coinImgs: Record<string, HTMLImageElement> = {};

export function useCoinImages(onLoad: () => void) {
  Promise.all(Object.entries(COIN_FILES).map(async ([k, f]) => (coinImgs[k] = await loadImage(f))))
    .then(onLoad)
    .catch((err) => console.warn('coin images not loaded, keeping drawn coins', err));
}

export const coinImage = (id: string): HTMLImageElement | undefined => coinImgs[id];

/** Draws a coin image centred at (cx, cy), about 2R wide. */
export function drawCoinImage(g: Ctx, img: HTMLImageElement, cx: number, cy: number, R: number) {
  const w = R * 2.06;
  const h = (w * img.naturalHeight) / img.naturalWidth;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}

/** Engraved-looking ΕΦ letters, always drawn in code. */
export function drawEF(g: Ctx, text: string, x: number, y: number, size: number) {
  g.font = `700 ${size}px Alegreya, Georgia, serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(255,236,170,.85)';
  g.fillText(text, x + size * 0.03, y + size * 0.04);
  g.fillStyle = '#5a3508';
  g.fillText(text, x, y);
}

/** One piece of the coin: the gold disc plus its emblem. The ΕΦ letters are always drawn here in code. */
export function drawPiece(g: Ctx, type: string, cx: number, cy: number, R: number) {
  const img = coinImgs[type];
  if (img) {
    drawCoinImage(g, img, cx, cy, R);
    if (type === 'ef') drawEF(g, 'ΕΦ', cx, cy + R * 0.04, R * 0.78);
    return;
  }
  coinBase(g, cx, cy, R);
  const col = '#6a420f';
  const lt = '#e9c272';
  if (type === 'ef') {
    g.fillStyle = col;
    g.font = `700 ${R * 0.78}px Alegreya, Georgia, serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('ΕΦ', cx, cy + R * 0.05);
    return;
  }
  g.save();
  g.translate(cx, cy);
  g.scale(R * 0.95, R * 0.95);
  if (type === 'ari') beeTop(g, col, lt);
  else if (type === 'geyik') {
    g.translate(-0.02, 0);
    g.scale(0.95, 0.95);
    stag(g, col);
  } else palm(g, col);
  g.restore();
}
