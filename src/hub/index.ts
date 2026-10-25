/* The hub: a papercut map of Türkiye with the ancient cities on top. Opening a city starts its act; the old book
   (found in the opening scene) lists the coins and the animal that guides Deniz in each city. */
import bounds from './map-bounds.json';
import { openBook } from '../engine/book';
import { assetUrl } from '../engine/url';
import { loadProgress, resetProgress } from '../engine/progress';
import { CITIES, bookSpreads } from '../story/book-content';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

const progress = loadProgress();
const list = $('cities');
list.classList.toggle('nobook', !progress.book);

/** Same projection as scripts/make-map-reference.mjs: the painted map was generated from that outline. */
const pos = (lon: number, lat: number) => ({
  x: ((lon - bounds.lon0) / (bounds.lon1 - bounds.lon0)) * 100,
  y: ((bounds.lat1 - lat) / (bounds.lat1 - bounds.lat0)) * 100,
});

let toastTimer = 0;
function toast(text: string) {
  const t = $('toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.remove('show'), 3200);
}

function go(href: string) {
  $('veil').classList.add('on');
  setTimeout(() => (location.href = href), RM ? 30 : 560);
}

for (const c of CITIES) {
  const done = progress.done.includes(c.id);
  const open = c.playable && progress.book && !done;
  const locked = !c.playable && !done;
  const { x, y } = pos(c.lon, c.lat);

  const li = document.createElement('li');
  li.className = 'city ' + [open ? 'open' : '', done ? 'done' : '', locked ? 'locked' : ''].filter(Boolean).join(' ');
  li.dataset.label = c.label;
  li.dataset.city = c.id;
  li.style.left = x + '%';
  li.style.top = y + '%';

  const [dx, dy] = c.off;
  const len = Math.hypot(dx, dy);
  const pin = document.createElement('span');
  pin.className = 'pin';
  const stem = document.createElement('span');
  stem.className = 'stem';
  stem.style.width = len * 0.82 + 'cqw';
  stem.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  li.append(stem, pin);

  const b = document.createElement('button');
  b.style.setProperty('--dx', String(dx));
  b.style.setProperty('--dy', String(dy));
  b.type = 'button';
  const state = done ? 'sikkesi bulundu' : open ? 'açık, girmek için dokun' : c.playable ? 'önce kitabı bulmalısın' : 'yakında';
  b.setAttribute('aria-label', `${c.name}: ${state}.`);
  b.innerHTML = `<img src="${assetUrl(`book/plate-${c.id}.webp`)}" alt="" draggable="false"><span class="tag">${c.name}</span>`;
  b.addEventListener('click', () => {
    if (done || open) return go(`/${c.id}/`);
    if (c.playable) toast('Önce eski kitabı bulmalısın.');
    else toast(`${c.name} henüz açılmadı. Yakında!`);
  });
  li.append(b);
  list.append(li);
}

$('count').textContent = progress.book ? `Bulunan sikke: ${progress.done.length} / ${CITIES.length}` : 'Önce eski kitabı bulmalısın';

if (progress.book) {
  const btn = $<HTMLButtonElement>('bookBtn');
  btn.hidden = false;
  btn.classList.toggle('pulse', progress.done.length === 0);
  btn.addEventListener('click', () => {
    btn.classList.remove('pulse');
    void openBook(bookSpreads(loadProgress()));
  });
  $('reset').hidden = false;
} else {
  $('startCard').hidden = false;
  ($('startBtn') as HTMLAnchorElement).addEventListener('click', (e) => {
    e.preventDefault();
    go('/baslangic/');
  });
}

$('reset').addEventListener('click', () => {
  if (confirm('Oyun baştan başlasın mı? Bulunan sikkeler silinir.')) {
    resetProgress();
    location.reload();
  }
});
