/* The hub: a papercut map of Türkiye with the ancient cities on top. Opening a city starts its act; the old book
   (found in the opening scene) lists the coins and the animal that guides Deniz in each city.
   `mountHub` builds the map into any page: the map page itself uses it, and so does the opening scene, which hands over
   to the map without a page load (G4). */
import './hub.css';
import bounds from './map-bounds.json';
import { openBook } from '../engine/book';
import { audioInit } from '../engine/audio';
import { assetUrl } from '../engine/url';
import { loadProgress, markShown, pendingReturn, resetProgress } from '../engine/progress';
import { CITIES, bookSpreads } from '../story/book-content';

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

const MARKUP = `
  <div id="mapwrap">
    <img id="mapimg" src="${assetUrl('hub/map.webp')}" alt="Türkiye’nin kâğıttan kesilmiş haritası" draggable="false">
    <ul id="cities" aria-label="Antik kentler"></ul>
  </div>
  <header class="hub-title">
    <p class="series">Perde Perde Anadolu</p>
    <h1>Kayıp Sikkelerin Peşinde</h1>
    <p class="count" id="count" aria-live="polite"></p>
  </header>
  <button id="bookBtn" hidden aria-label="Eski kitabı aç">
    <img src="${assetUrl('book/closed.webp')}" alt="" draggable="false">
    <span>Kitap</span>
  </button>
  <section id="startCard" hidden aria-labelledby="startTitle">
    <img src="${assetUrl('book/closed.webp')}" alt="" draggable="false">
    <div>
      <h2 id="startTitle">Haritanın sırrı eski bir kitapta</h2>
      <p>Deniz’in dedesi bir kitap saklamış. Önce onu bulmalısın.</p>
      <a class="go" id="startBtn" href="/baslangic/">Kitabı bulmaya başla</a>
    </div>
  </section>
  <div id="toast" role="status" aria-live="polite"></div>
  <button id="reset" class="tiny" hidden>Baştan başla</button>
  <p id="rotate">Telefonu yan çevirirsen harita büyür.</p>
  <div id="veil"></div>`;

export interface Hub {
  root: HTMLElement;
  wrap: HTMLElement;
  /** The list item of a city (its origin is the true place on the map). */
  city(id: string): HTMLElement;
  /** Map position in percent of the map image. */
  pos(lon: number, lat: number): { x: number; y: number };
  toast(text: string): void;
}

/** Same projection as scripts/make-map-reference.mjs: the painted map was generated from that outline. */
const project = (lon: number, lat: number) => ({
  x: ((lon - bounds.lon0) / (bounds.lon1 - bounds.lon0)) * 100,
  y: ((bounds.lat1 - lat) / (bounds.lat1 - bounds.lat0)) * 100,
});

export function mountHub(host: HTMLElement): Hub {
  const root = document.createElement('main');
  root.id = 'hub';
  root.innerHTML = MARKUP;
  host.append(root);
  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>('#' + id)!;

  const progress = loadProgress();
  /** A city finished since the map was last shown: it stays unlit until its coin lands (G6). */
  const pending = pendingReturn();
  const list = $('cities');
  list.classList.toggle('nobook', !progress.book);

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
    const done = progress.done.includes(c.id) && c.id !== pending;
    const open = c.playable && progress.book && !done;
    const locked = !c.playable && !done;
    const { x, y } = project(c.lon, c.lat);

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
      if (done || open) {
        audioInit();
        return void import('../engine/cinematic/city-select').then((m) => m.citySelect({ li, wrap: $('mapwrap'), root, id: c.id, href: `/${c.id}/` }));
      }
      if (c.playable) toast('Önce eski kitabı bulmalısın.');
      else toast(`${c.name} henüz açılmadı. Yakında!`);
    });
    li.append(b);
    list.append(li);
  }

  $('count').textContent = progress.book ? `Bulunan sikke: ${progress.done.length - (pending ? 1 : 0)} / ${CITIES.length}` : 'Önce eski kitabı bulmalısın';

  if (progress.book) {
    const btn = $<HTMLButtonElement>('bookBtn');
    btn.hidden = false;
    btn.classList.toggle('pulse', progress.done.length === 0);
    btn.addEventListener('click', () => {
      btn.classList.remove('pulse');
      audioInit();
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


  if (pending && progress.book) {
    const li = list.querySelector<HTMLElement>(`[data-city="${pending}"]`)!;
    const city = CITIES.find((c) => c.id === pending)!;
    const idx = CITIES.indexOf(city);
    void import('../engine/cinematic/map-return').then((m) =>
      m.mapReturn({
        li,
        wrap: $('mapwrap'),
        root,
        id: pending,
        spread: idx === 0 ? 1 : 2 + Math.floor((idx - 1) / 2),
        reveal: () => {
          li.classList.remove('open');
          li.classList.add('done');
          $('count').textContent = `Bulunan sikke: ${progress.done.length} / ${CITIES.length}`;
          li.querySelector('button')?.setAttribute('aria-label', `${city.name}: sikkesi bulundu.`);
        },
        openBook: (o) => {
          audioInit();
          return openBook(bookSpreads(loadProgress()), o);
        },
        finished: () => markShown(pending),
      }),
    );
  }

  // coming back with the browser's back button must not show a half-played cinematic
  addEventListener('pageshow', (e) => {
    if (e.persisted) location.reload();
  });

  return {
    root,
    wrap: $('mapwrap'),
    city: (id) => list.querySelector<HTMLElement>(`[data-city="${id}"]`)!,
    pos: project,
    toast,
  };
}
