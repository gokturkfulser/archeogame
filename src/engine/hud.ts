/* Collectible HUD, fact cards, scene titles and curtain transitions. */
import { Ctx, RM, wait } from './core';
import { chime, whoosh } from './audio';
import { celebrate } from './deniz';

/* ---------- collectibles (Efes: the four pieces of the coin) ---------- */
export interface CollectibleConfig {
  ids: string[];
  names: Record<string, string>;
  /** Draws one collected piece, centred at (cx, cy) with radius R. */
  draw: (g: Ctx, id: string, cx: number, cy: number, R: number) => void;
  /** aria-label of the whole HUD strip. */
  label: (count: number, total: number) => string;
  /** Small line on the fact card under the piece name. */
  cardNote: string;
}

let cfg: CollectibleConfig | null = null;
const owned = new Set<string>();
const coinBox = document.getElementById('coins') as HTMLElement;

export function configureCollectibles(c: CollectibleConfig) {
  cfg = c;
  coinBox.innerHTML = '';
  c.ids.forEach((id) => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 72;
    cv.dataset.p = id;
    coinBox.append(cv);
  });
  drawCoins();
  if (document.fonts) void document.fonts.ready.then(drawCoins);
}

export const hasPiece = (id: string) => owned.has(id);
export const pieceCount = () => owned.size;

export function resetCollectibles() {
  owned.clear();
  drawCoins();
}

export function drawCoins() {
  if (!cfg) return;
  const c = cfg;
  coinBox.querySelectorAll<HTMLCanvasElement>('canvas').forEach((cv) => {
    const g = cv.getContext('2d')!;
    g.clearRect(0, 0, 72, 72);
    if (owned.has(cv.dataset.p!)) c.draw(g, cv.dataset.p!, 36, 36, 33);
    else {
      g.strokeStyle = 'rgba(243,197,106,.55)';
      g.lineWidth = 2;
      g.setLineDash([4, 5]);
      g.beginPath();
      g.arc(36, 36, 30, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
    }
  });
  coinBox.setAttribute('aria-label', c.label(owned.size, c.ids.length));
}

export async function award(id: string) {
  owned.add(id);
  celebrate();
  drawCoins();
  const cv = coinBox.querySelector<HTMLElement>(`[data-p="${id}"]`);
  cv?.classList.add('pop');
  chime();
  await wait(550);
  cv?.classList.remove('pop');
}

/* ---------- fact card (“Efes Defteri”) ---------- */
const cardEl = document.getElementById('card') as HTMLElement;

export function card(title: string, facts: string[], pieceId: string): Promise<void> {
  return new Promise((res) => {
    (document.getElementById('cardTitle') as HTMLElement).textContent = title;
    const box = document.getElementById('cardFacts') as HTMLElement;
    box.innerHTML = '';
    facts.forEach((f) => {
      const p = document.createElement('p');
      p.className = 'f';
      p.textContent = f;
      box.append(p);
    });
    const pc = cardEl.querySelector<HTMLCanvasElement>('.piece canvas')!;
    const g = pc.getContext('2d')!;
    g.clearRect(0, 0, 128, 128);
    cfg?.draw(g, pieceId, 64, 64, 60);
    const sp = cardEl.querySelector<HTMLElement>('.piece span')!;
    sp.innerHTML = '';
    const b = document.createElement('b');
    b.textContent = cfg?.names[pieceId] ?? '';
    sp.append(b, document.createTextNode(cfg?.cardNote ?? ''));
    cardEl.hidden = false;
    const go = document.getElementById('cardGo') as HTMLButtonElement;
    go.focus({ preventScroll: true });
    go.onclick = () => {
      cardEl.hidden = true;
      res();
    };
  });
}

/* ---------- curtains and scene title ---------- */
const curL = document.getElementById('curL') as HTMLElement;
const curR = document.getElementById('curR') as HTMLElement;
const titleBox = document.getElementById('sceneTitle') as HTMLElement;

export async function closeCurtain() {
  whoosh();
  curL.classList.add('closed');
  curR.classList.add('closed');
  await wait(RM ? 50 : 1150);
}

export async function openCurtain(num: string, name: string) {
  whoosh();
  curL.classList.remove('closed');
  curR.classList.remove('closed');
  (titleBox.querySelector('.num') as HTMLElement).textContent = num;
  (titleBox.querySelector('.name') as HTMLElement).textContent = name;
  titleBox.classList.add('show');
  await wait(RM ? 300 : 1500);
  setTimeout(() => titleBox.classList.remove('show'), 1200);
  await wait(700);
}
