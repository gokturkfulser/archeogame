/* Scene-to-scene transition: three layers of cut paper (madder, lapis, deep indigo) slide over the stage at different
   speeds, their holes punched in Karagöz ornaments that glow; while they cover it the scene changes and a lit shadow
   screen shows the scene's title; then the layers slide on and away. About 4 seconds in all.
   Direction follows the story: forward = left to right, back = right to left, a scene entered from nothing (first
   scene, replay) = rising from below. */
import { RM, wait } from './core';
import { paperSlide, woodKnock } from './audio';

export type Dir = 'R' | 'L' | 'U';

const IN_MS = [1100, 950, 800];
const STAGGER = 100;
const OUT_MS = [1150, 1000, 900];
const HOLD_MS = 1200;

/** One punched-ornament tile per layer, as an SVG data URI (the bright shapes are the holes the light comes through). */
const tile = (size: number, shapes: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${shapes}</svg>`)}")`;

const star8 = (cx: number, cy: number, r: number, fill: string) => {
  const pts = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.42 : r;
    return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`;
  });
  return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`;
};

const LAYERS = [
  {
    // madder red: eight-point stars with a dot between
    c1: '#6e2420',
    c2: '#a8423a',
    orn: tile(52, star8(26, 26, 11, '#ffb25a') + '<circle cx="0" cy="0" r="3" fill="#ffd28a"/><circle cx="52" cy="0" r="3" fill="#ffd28a"/><circle cx="0" cy="52" r="3" fill="#ffd28a"/><circle cx="52" cy="52" r="3" fill="#ffd28a"/>'),
  },
  {
    // lapis: rosettes of eight petals (holes in a ring) with diamonds between
    c1: '#17307f',
    c2: '#2a52b4',
    orn:
      tile(
        46,
        Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return `<circle cx="${(23 + Math.cos(a) * 10).toFixed(1)}" cy="${(23 + Math.sin(a) * 10).toFixed(1)}" r="2.4" fill="#7fe3ea"/>`;
        }).join('') +
          '<circle cx="23" cy="23" r="3.6" fill="#c8f6f8"/><path d="M0 -5l4 5l-4 5l-4 -5zM46 -5l4 5l-4 5l-4 -5zM0 41l4 5l-4 5l-4 -5zM46 41l4 5l-4 5l-4 -5z" fill="#7fe3ea"/>',
      ),
  },
  {
    // deep indigo (nearest): a scale-and-chevron border of gold holes
    c1: '#120c33',
    c2: '#231a5a',
    orn: tile(
      40,
      '<path d="M4 14l16 -10l16 10" fill="none" stroke="#ffd678" stroke-width="3" stroke-linecap="round"/><path d="M4 30l16 -10l16 10" fill="none" stroke="#ffd678" stroke-width="3" stroke-linecap="round" opacity=".75"/><circle cx="20" cy="36" r="2.4" fill="#ffe7a6"/>',
    ),
  },
];

/** A hand-cut outline: both long edges wobble a little and have a few notches. */
function cutPath(seed: number, vertical: boolean) {
  const N = 24;
  const edge = (side: 0 | 1) =>
    Array.from({ length: N + 1 }, (_, i) => {
      const t = (i / N) * 100;
      const w = 2.2 + Math.sin(i * 1.9 + seed + side * 2) * 1.2 + (i % 5 === (seed + side) % 5 ? 2.1 : 0) + (((i * 7 + seed * 3) % 3) * 0.35);
      return side ? [100 - w, t] : [w, t];
    });
  const right = edge(1);
  const left = edge(0).reverse();
  const pts = [...right, ...left].map(([x, y]) => (vertical ? [y, x] : [x, y]));
  return 'polygon(' + pts.map(([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(',') + ')';
}

let host: HTMLElement | null = null;
let screen: HTMLElement | null = null;
let layers: HTMLElement[] = [];
let dir: Dir = 'R';
let covering = false;
let titled = false;

function ensureHost() {
  if (host) return;
  host = document.createElement('div');
  host.id = 'trHost';
  host.setAttribute('aria-hidden', 'true');
  screen = document.createElement('div');
  screen.id = 'trScreen';
  screen.innerHTML = '<div><span class="num"></span><span class="name"></span></div>';
  document.body.append(host, screen);
}

function build(d: Dir) {
  ensureHost();
  const vertical = d === 'U';
  host!.innerHTML = '';
  layers = LAYERS.map((L, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'tr-lay ' + (vertical ? 'v' : 'h');
    const paper = document.createElement('div');
    paper.className = 'tr-paper';
    paper.style.background = `linear-gradient(${vertical ? 0 : 90}deg,${L.c1},${L.c2})`;
    paper.style.clipPath = cutPath(i * 2.3 + 1, vertical);
    const orn = document.createElement('div');
    orn.className = 'tr-orn';
    orn.style.backgroundImage = L.orn;
    const fibre = document.createElement('div');
    fibre.className = 'tr-fibre';
    paper.append(orn, fibre);
    wrap.append(paper);
    if (d === 'L') wrap.style.scale = '-1 1';
    host!.append(wrap);
    return wrap;
  });
}

/* L is R mirrored (scale -1 on the layer), so both use the same transforms; U rises from below. */
const startT = (d: Dir) => (d === 'U' ? 'translateY(122%)' : 'translateX(-122%)');
const restT = (d: Dir) => (d === 'U' ? 'translateY(0)' : 'translateX(0)');
const endT = (d: Dir) => (d === 'U' ? 'translateY(-122%)' : 'translateX(122%)');

const run = (el: HTMLElement, from: string, to: string, ms: number, delay: number, easing: string) =>
  el.animate([{ transform: from }, { transform: to }], { duration: ms, delay, easing, fill: 'forwards' }).finished;

function setTitle(num: string, name: string) {
  (screen!.querySelector('.num') as HTMLElement).textContent = num;
  (screen!.querySelector('.name') as HTMLElement).textContent = name;
}

/** The layers slide in over the stage; the title screen of the scene to come lights up on them. */
export async function closeCurtain(next: { num: string; name: string } | undefined, d: Dir) {
  dir = d;
  build(d);
  host!.style.pointerEvents = 'auto';
  covering = true;
  if (RM) {
    layers.forEach((l) => (l.style.transform = 'none'));
    await wait(50);
    return;
  }
  paperSlide(true);
  const ins = layers.map((l, i) => run(l, startT(d), restT(d), IN_MS[i], i * STAGGER, 'cubic-bezier(.3,0,.2,1)'));
  if (next) {
    titled = true;
    showScreen(next.num, next.name, 260, IN_MS[0] * 0.6);
  }
  await Promise.all(ins);
}

function showScreen(num: string, name: string, ms: number, delay = 0) {
  setTitle(num, name);
  screen!.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(.93)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }], { duration: ms, delay, easing: 'ease-out', fill: 'forwards' });
  window.setTimeout(woodKnock, RM ? 0 : delay + ms * 0.6);
}

/** Title screen holds a moment, then the layers slide on and off, uncovering the new scene. */
export async function openCurtain(num: string, name: string) {
  ensureHost();
  if (!covering) {
    // first opening of an act: start from covered, with the title already lit
    build('U');
    dir = 'U';
    host!.style.pointerEvents = 'auto';
    layers.forEach((l) => (l.style.transform = 'none'));
    covering = true;
    showScreen(num, name, RM ? 1 : 300);
  } else if (!titled) {
    showScreen(num, name, RM ? 1 : 260);
  }
  await wait(RM ? 300 : HOLD_MS);
  if (RM) {
    clear();
    return;
  }
  screen!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' });
  paperSlide(false);
  const d = dir;
  const outs = layers
    .slice()
    .reverse()
    .map((l, k) => run(l, restT(d), endT(d), OUT_MS[k], k * STAGGER, 'cubic-bezier(.6,0,.7,.4)'));
  await Promise.all(outs);
  clear();
}

function clear() {
  host!.innerHTML = '';
  host!.style.pointerEvents = 'none';
  screen!.getAnimations().forEach((a) => a.cancel());
  screen!.style.opacity = '0';
  covering = false;
  titled = false;
}
