/* G2: when the light first touches the book. Dust motes swirl, the coins on the cover glint one by one in a ring, the
   clasp clicks open, the book lifts off the desk and floats towards the camera. The flying book is a DOM element so it
   can be handed straight to the book overlay (G3), which swaps it for its own cover. */
import { assetUrl } from '../url';
import { claspClick, glint } from '../audio';
import { Cine, dustSwirl } from './index';

/** Coins on the closed-book art (480×554), clockwise from the top, as fractions of its size; the last is the centre one. */
const COINS: [number, number][] = [
  [242, 133],
  [299, 150],
  [330, 190],
  [333, 243],
  [318, 293],
  [273, 324],
  [197, 321],
  [157, 287],
  [141, 240],
  [152, 190],
  [185, 150],
  [240, 232],
].map(([x, y]) => [x / 480, y / 554]);
const CLASP: [number, number] = [372 / 480, 228 / 554];
const ASPECT = 554 / 480;

export interface BookStart {
  /** Where the book lies, in client pixels (centre), its width and tilt. */
  x: number;
  y: number;
  w: number;
  rot: number;
}

/** Where the cover sits in the open-book overlay (client pixels), so the flight ends exactly on it. */
export function coverTarget() {
  const vw = innerWidth;
  const vh = innerHeight;
  const small = vh <= 520;
  const stageW = Math.min(vw * 0.96, (vh - (small ? 52 : 76)) * 1.505);
  const w = stageW / 2;
  return { x: vw / 2, y: (vh - (small ? 26 : 38)) / 2, w };
}

const el = (cls: string, css: Partial<CSSStyleDeclaration> = {}) => {
  const e = document.createElement('div');
  e.className = cls;
  Object.assign(e.style, css);
  return e;
};

/** Plays G2 and resolves with the floating book (still in the page) once it hangs in front of the camera. */
export async function bookDiscovery(c: Cine, from: BookStart, onLift?: () => void): Promise<HTMLElement> {
  const { x, y, w, rot } = from;
  const h = w * ASPECT;
  const book = el('cine-book', { left: x - w / 2 + 'px', top: y - h / 2 + 'px', width: w + 'px', height: h + 'px', transform: `rotate(${rot}rad)` });
  const img = document.createElement('img');
  img.src = assetUrl('book/closed.webp');
  img.alt = '';
  img.draggable = false;
  book.append(img);
  const sparks = COINS.map(([fx, fy], k) => {
    const s = el('cine-spark' + (k === COINS.length - 1 ? ' big' : ''), { left: fx * 100 + '%', top: fy * 100 + '%' });
    book.append(s);
    return s;
  });
  const clasp = el('cine-spark clasp', { left: CLASP[0] * 100 + '%', top: CLASP[1] * 100 + '%' });
  book.append(clasp);
  document.body.insertBefore(book, document.getElementById('dialog'));
  await img.decode().catch(() => {});

  const stop = dustSwirl(
    () => {
      const r = book.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
    { radius: Math.max(70, w * 0.9) },
  );
  c.onEnd(stop);

  // 1. the dust stirs, the book stirs with it
  await c.anim(book, [{ transform: `rotate(${rot}rad) scale(1)` }, { transform: `rotate(${rot}rad) scale(1.12)` }], { duration: 900, easing: 'ease-out' });

  // 2. the coins glint one by one around the ring, and the centre coin last
  for (let k = 0; k < sparks.length; k++) {
    if (!c.skipped) glint(k);
    void c.anim(
      sparks[k],
      [
        { transform: 'translate(-50%,-50%) scale(0) rotate(0deg)', opacity: 0 },
        { transform: 'translate(-50%,-50%) scale(1) rotate(45deg)', opacity: 1, offset: 0.35 },
        { transform: 'translate(-50%,-50%) scale(0) rotate(90deg)', opacity: 0 },
      ],
      { duration: k === sparks.length - 1 ? 900 : 520, easing: 'ease-in-out' },
    );
    await c.sleep(k === sparks.length - 1 ? 700 : 150);
  }

  // 3. the clasp clicks open
  if (!c.skipped) claspClick();
  void c.anim(
    clasp,
    [
      { transform: 'translate(-50%,-50%) scale(0)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(1.5)', opacity: 1, offset: 0.3 },
      { transform: 'translate(-50%,-50%) scale(0.2)', opacity: 0 },
    ],
    700,
  );
  await c.anim(
    book,
    [
      { transform: `rotate(${rot}rad) scale(1.12)` },
      { transform: `rotate(${rot - 0.03}rad) scale(1.14)`, offset: 0.35 },
      { transform: `rotate(${rot + 0.02}rad) scale(1.12)`, offset: 0.7 },
      { transform: `rotate(${rot}rad) scale(1.12)` },
    ],
    360,
  );
  await c.sleep(250);

  // 4. the book lifts off the desk and floats to the camera
  onLift?.();
  const t = coverTarget();
  const dx = t.x - x;
  const dy = t.y - y;
  const k = t.w / w;
  await c.anim(
    book,
    [
      { transform: `translate(0,0) rotate(${rot}rad) scale(1.12)`, offset: 0 },
      { transform: `translate(${dx * 0.12}px,${dy * 0.12 - h * 0.45}px) rotate(${rot * 0.6}rad) scale(${1.12 + (k - 1.12) * 0.25})`, offset: 0.3 },
      { transform: `translate(${dx}px,${dy}px) rotate(0rad) scale(${k})`, offset: 1 },
    ],
    { duration: 1700, easing: 'cubic-bezier(.45,.05,.2,1)' },
  );
  book.classList.add('landed');
  return book;
}
