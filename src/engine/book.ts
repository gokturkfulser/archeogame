/* The old book overlay. Pages are plain HTML laid over the open-book art, so the text stays crisp, selectable and
   accessible. Works on any page (hub or act): it builds its own DOM and needs only book.css. */
import './book.css';
import { assetUrl } from './url';

export interface Spread {
  left: string;
  right: string;
}

/** An animal plate. `state`: lit = found, ghost = not yet. */
export function plate(id: string, state: 'lit' | 'ghost' | 'plain' = 'plain', small = false): string {
  const cls = ['bk-plate', state === 'plain' ? '' : state, small ? 'small' : ''].filter(Boolean).join(' ');
  return `<img class="${cls}" src="${assetUrl(`book/plate-${id}.webp`)}" alt="" draggable="false">`;
}

/** Opens the book; resolves when the player closes it. `onPage` is called whenever a spread is shown. */
export function openBook(spreads: Spread[], opts: { start?: number; onPage?: (i: number) => void } = {}): Promise<void> {
  return new Promise((resolve) => {
    let i = clampIndex(opts.start ?? 0);
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const ov = document.createElement('div');
    ov.className = 'bk-overlay';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', 'Kayıp Sikkelerin Kitabı');
    ov.innerHTML = `
      <div class="bk-stage">
        <img class="bk-book" src="${assetUrl('book/open.webp')}" alt="" draggable="false">
        <div class="bk-page bk-left" aria-live="polite"></div>
        <div class="bk-page bk-right"></div>
      </div>
      <div class="bk-nav">
        <button type="button" class="prev" aria-label="Önceki sayfa">‹ Geri</button>
        <span class="bk-count" aria-hidden="true"></span>
        <button type="button" class="next" aria-label="Sonraki sayfa">İleri ›</button>
        <button type="button" class="close">Kitabı kapat</button>
      </div>`;
    const left = ov.querySelector<HTMLElement>('.bk-left')!;
    const right = ov.querySelector<HTMLElement>('.bk-right')!;
    const prev = ov.querySelector<HTMLButtonElement>('.prev')!;
    const next = ov.querySelector<HTMLButtonElement>('.next')!;
    const close = ov.querySelector<HTMLButtonElement>('.close')!;
    const count = ov.querySelector<HTMLElement>('.bk-count')!;

    function clampIndexLocal(n: number) {
      return Math.max(0, Math.min(spreads.length - 1, n));
    }
    function show() {
      left.innerHTML = spreads[i].left;
      right.innerHTML = spreads[i].right;
      count.textContent = `${i + 1} / ${spreads.length}`;
      prev.disabled = i === 0;
      next.disabled = i === spreads.length - 1;
      opts.onPage?.(i);
    }
    function go(d: number) {
      i = clampIndexLocal(i + d);
      show();
    }
    function done() {
      document.removeEventListener('keydown', onKey, true);
      ov.remove();
      previouslyFocused?.focus?.({ preventScroll: true });
      resolve();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        done();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        go(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        go(-1);
      }
    }

    prev.onclick = () => go(-1);
    next.onclick = () => go(1);
    close.onclick = done;
    document.addEventListener('keydown', onKey, true);
    document.body.append(ov);
    show();
    (next.disabled ? close : next).focus({ preventScroll: true });
  });

  function clampIndex(n: number) {
    return Math.max(0, Math.min(spreads.length - 1, n));
  }
}
