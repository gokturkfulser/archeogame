/* The old book overlay. Pages are plain HTML laid over the open-book art, so the text stays crisp, selectable and
   accessible. Works on any page (hub or act): it builds its own DOM and needs only book.css.
   Animation (G3): the cover swings open in 3D, pages turn with a curl and a paper sound, the grandfather’s letter writes
   itself in ink, wax seals crack open when a coin is found and the Efes plate lifts like the bee. Under
   prefers-reduced-motion all of it is skipped and the book simply appears open. */
import './book.css';
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
import { coverCreak, pageTurn, scratch, waxCrack } from './audio';
import { assetUrl } from './url';

export interface Spread {
  left: string;
  right: string;
}

export interface BookOptions {
  start?: number;
  onPage?: (i: number) => void;
  /** The closed book that G2 (or the map) flew to the middle of the screen; it is replaced by the cover. */
  handoff?: HTMLElement;
  /** City whose wax seal cracks open once its page is shown (G6). */
  crack?: string;
  /** Skip the cover opening and show the book already open. */
  open?: boolean;
}

/** An animal plate. `state`: lit = found, ghost = not yet. */
export function plate(id: string, state: 'lit' | 'ghost' | 'plain' = 'plain', small = false): string {
  const cls = ['bk-plate', state === 'plain' ? '' : state, small ? 'small' : ''].filter(Boolean).join(' ');
  return `<img class="${cls}" data-plate="${id}" src="${assetUrl(`book/plate-${id}.webp`)}" alt="" draggable="false">`;
}

/** A wax seal; `broken` shows it already cracked. */
export function waxSeal(id: string, broken: boolean): string {
  return `<span class="bk-wax${broken ? ' broken' : ''}" data-seal="${id}" aria-hidden="true"><i class="l"></i><i class="r"></i><b>✦</b></span>`;
}

const FLIP_MS = 680;
const OPEN_MS = 1250;

/** Opens the book; resolves when the player closes it. `onPage` is called whenever a spread is shown. */
export function openBook(spreads: Spread[], opts: BookOptions = {}): Promise<void> {
  return new Promise((resolve) => {
    let i = clampIndex(opts.start ?? 0);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const openArt = assetUrl('book/open.webp');
    const closedArt = assetUrl('book/closed.webp');
    const animate = !RM && opts.open !== true;

    const ov = document.createElement('div');
    ov.className = 'bk-overlay' + (opts.handoff ? ' handoff' : '');
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', 'Kayıp Sikkelerin Kitabı');
    ov.style.setProperty('--open-art', `url(${openArt})`);
    ov.style.setProperty('--closed-art', `url(${closedArt})`);
    ov.innerHTML = `
      <div class="bk-stage">
        <img class="bk-book" src="${openArt}" alt="" draggable="false">
        <div class="bk-page bk-left" aria-live="polite"></div>
        <div class="bk-page bk-right"></div>
      </div>
      <div class="bk-nav">
        <button type="button" class="prev" aria-label="Önceki sayfa">‹ Geri</button>
        <span class="bk-count" aria-hidden="true"></span>
        <button type="button" class="next" aria-label="Sonraki sayfa">İleri ›</button>
        <button type="button" class="close">Kitabı kapat</button>
      </div>`;
    const stage = ov.querySelector<HTMLElement>('.bk-stage')!;
    const art = ov.querySelector<HTMLElement>('.bk-book')!;
    const left = ov.querySelector<HTMLElement>('.bk-left')!;
    const right = ov.querySelector<HTMLElement>('.bk-right')!;
    const prev = ov.querySelector<HTMLButtonElement>('.prev')!;
    const next = ov.querySelector<HTMLButtonElement>('.next')!;
    const close = ov.querySelector<HTMLButtonElement>('.close')!;
    const nav = ov.querySelector<HTMLElement>('.bk-nav')!;
    const count = ov.querySelector<HTMLElement>('.bk-count')!;

    let flipping: { finish: () => void } | null = null;
    let inkTimer = 0;
    let cracked = !opts.crack;
    let gone = false;
    let inked = false;

    function decorate() {
      // the Efes plate lifts off the page like the bee and settles back
      const efes = left.querySelector<HTMLElement>('img[data-plate="efes"]');
      if (efes && !RM) efes.classList.add('bk-lift');
      const hand = left.querySelector<HTMLElement>('.hand');
      if (hand && !RM && !inked) {
        inked = true;
        inkWrite(hand);
      }
      const seal = !cracked && opts.crack ? ov.querySelector<HTMLElement>(`.bk-wax[data-seal="${opts.crack}"]`) : null;
      if (seal) {
        cracked = true;
        seal.classList.remove('broken');
        setTimeout(
          () => {
            if (gone) return;
            seal.classList.add('broken');
            waxCrack();
            ov.querySelector<HTMLElement>(`img[data-plate="${opts.crack}"]`)?.classList.add('bk-newlit');
          },
          RM ? 0 : 1100,
        );
      }
    }

    function inkWrite(el: HTMLElement) {
      const words: HTMLElement[] = [];
      const walk = (n: Node) => {
        for (const c of [...n.childNodes]) {
          if (c.nodeType === 3) {
            const frag = document.createDocumentFragment();
            for (const part of (c.textContent ?? '').split(/(\s+)/)) {
              if (!part) continue;
              if (/^\s+$/.test(part)) frag.append(part);
              else {
                const s = document.createElement('span');
                s.className = 'ink';
                s.textContent = part;
                words.push(s);
                frag.append(s);
              }
            }
            c.replaceWith(frag);
          } else walk(c);
        }
      };
      walk(el);
      let k = 0;
      clearInterval(inkTimer);
      inkTimer = window.setInterval(() => {
        if (k >= words.length) return clearInterval(inkTimer);
        words[k].classList.add('on');
        if (k % 3 === 0) scratch();
        k++;
      }, 95);
    }
    function revealInk() {
      clearInterval(inkTimer);
      ov.querySelectorAll('.ink').forEach((e) => e.classList.add('on'));
    }

    function setCounts() {
      count.textContent = `${i + 1} / ${spreads.length}`;
      prev.disabled = i === 0;
      next.disabled = i === spreads.length - 1;
    }
    function show() {
      left.innerHTML = spreads[i].left;
      right.innerHTML = spreads[i].right;
      setCounts();
      opts.onPage?.(i);
      decorate();
    }

    /** A page turning over: a leaf with the old page on its front and the new facing page on its back. */
    function flip(dir: 1 | -1) {
      const from = i;
      i = clampIndex(i + dir);
      if (i === from) return;
      if (RM) return show();
      flipping?.finish();
      revealInk();
      const fwd = dir > 0;
      const leaf = document.createElement('div');
      leaf.className = 'bk-leaf flip ' + (fwd ? 'fwd' : 'back');
      const oldPage = fwd ? right : left;
      leaf.innerHTML = `
        <div class="face front"><div class="bk-page ${fwd ? 'bk-fr' : 'bk-fl'}">${oldPage.innerHTML}</div></div>
        <div class="face back"><div class="bk-page ${fwd ? 'bk-fl' : 'bk-fr'}">${fwd ? spreads[i].left : spreads[i].right}</div></div>`;
      stage.append(leaf);
      // the page revealed underneath changes at once; the other side changes as the leaf passes over the middle
      if (fwd) right.innerHTML = spreads[i].right;
      else left.innerHTML = spreads[i].left;
      setCounts();
      opts.onPage?.(i);
      pageTurn();
      const a = leaf.animate(
        [
          { transform: 'rotateY(0deg) skewY(0deg)', offset: 0 },
          { transform: `rotateY(${fwd ? -90 : 90}deg) skewY(${fwd ? 3 : -3}deg)`, offset: 0.5 },
          { transform: `rotateY(${fwd ? -180 : 180}deg) skewY(0deg)`, offset: 1 },
        ],
        { duration: FLIP_MS, easing: 'cubic-bezier(.45,.05,.3,1)', fill: 'forwards' },
      );
      let finished = false;
      const settle = () => {
        if (fwd) left.innerHTML = spreads[i].left;
        else right.innerHTML = spreads[i].right;
      };
      const mid = window.setTimeout(settle, FLIP_MS * 0.5);
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(mid);
        settle();
        leaf.remove();
        flipping = null;
        decorate();
      };
      flipping = { finish };
      a.onfinish = finish;
    }

    function done() {
      if (gone) return;
      gone = true;
      clearInterval(inkTimer);
      document.removeEventListener('keydown', onKey, true);
      const end = () => {
        ov.remove();
        previouslyFocused?.focus?.({ preventScroll: true });
        resolve();
      };
      if (RM) end();
      else ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' }).onfinish = end;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        done();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        flip(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        flip(-1);
      }
    }

    prev.onclick = () => flip(-1);
    next.onclick = () => flip(1);
    close.onclick = done;
    document.addEventListener('keydown', onKey, true);
    document.body.append(ov);

    if (!animate) {
      show();
      opts.handoff?.remove();
      (next.disabled ? close : next).focus({ preventScroll: true });
      return;
    }

    /* G3 opening: the closed cover is centred; it swings open about the spine while the book slides to the middle. */
    left.style.opacity = right.style.opacity = nav.style.opacity = '0';
    art.style.opacity = '0';
    stage.style.transform = 'translateX(-25%)';
    const leaf = document.createElement('div');
    leaf.className = 'bk-leaf cover';
    leaf.innerHTML = '<div class="face front"></div><div class="face back"></div>';
    stage.append(leaf);
    const handoff = opts.handoff;
    if (handoff) {
      // the flying book and the cover are the same picture: swap without a visible cut
      handoff.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }).onfinish = () => handoff.remove();
    } else {
      leaf.animate([{ opacity: 0, transform: 'translateY(22px) scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 420, fill: 'backwards' });
    }
    // the page content is placed now but stays invisible until the cover has landed
    left.innerHTML = spreads[i].left;
    right.innerHTML = spreads[i].right;
    setCounts();
    opts.onPage?.(i);
    setTimeout(
      () => {
        if (gone) return;
        coverCreak();
        stage.animate([{ transform: 'translateX(-25%)' }, { transform: 'none' }], { duration: OPEN_MS, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
        art.animate([{ opacity: 0 }, { opacity: 0, offset: 0.35 }, { opacity: 1 }], { duration: OPEN_MS, fill: 'forwards' });
        leaf.animate(
          [
            { transform: 'rotateY(0deg)' },
            { transform: 'rotateY(-90deg) skewY(2deg)', offset: 0.5 },
            { transform: 'rotateY(-180deg)' },
          ],
          { duration: OPEN_MS, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'forwards' },
        ).onfinish = () => {
          if (gone) return;
          leaf.remove();
          art.style.opacity = '';
          stage.style.transform = '';
          for (const el of [left, right, nav]) {
            el.style.opacity = '';
            el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350 });
          }
          decorate();
          (next.disabled ? close : next).focus({ preventScroll: true });
        };
      },
      handoff ? 320 : 520,
    );
  });

  function clampIndex(n: number) {
    return Math.max(0, Math.min(spreads.length - 1, n));
  }
}
