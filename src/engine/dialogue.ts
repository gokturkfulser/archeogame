/* Dialogue box, goal tag and hint button. */
import { RM, assetUrl } from './core';
import { chirp, pluck } from './audio';

/** n = narrator / instructions, m = Melissa, k = Kurunta, d = Deniz. */
export type Speaker = 'n' | 'm' | 'k' | 'd';
/** Deniz's portrait expressions. */
export type Mood = 'neutral' | 'happy' | 'surprised' | 'thinking';
export interface Line {
  w: Speaker;
  t: string;
  /** Expression for Deniz's portrait; when left out it is read off the line (see `moodOf`). */
  e?: Mood;
}

/** Picks the portrait that fits a Deniz line: a question or “hmm” thinks, a wow surprises, an exclamation is happy. */
export function moodOf(L: Line): Mood {
  if (L.e) return L.e;
  const t = L.t;
  if (/(^|\s)(vay|aa+|oo+|inanamıyorum)(?=[\s!,.?]|$)/i.test(t) || /\?!|!\?/.test(t)) return 'surprised';
  if (/\?\s*$/.test(t) || /(^|\s)(hmm+|acaba|belki)(?=[\s!,.?]|$)/i.test(t)) return 'thinking';
  if (/!\s*$/.test(t)) return 'happy';
  return 'neutral';
}


const portraitImg = (file: string) => `<img src="${assetUrl(file)}" alt="" draggable="false">`;

const SPEAKERS: Record<Speaker, { name: string; svg: string; narr: boolean }> = {
  n: { name: '', svg: portraitImg('characters/flashlight.webp'), narr: true },
  m: { name: 'Melissa', svg: portraitImg('characters/portrait-melissa.webp'), narr: false },
  k: { name: 'Kurunta', svg: portraitImg('characters/portrait-kurunta.webp'), narr: false },
  d: { name: 'Deniz', svg: portraitImg('characters/portrait-deniz-neutral.webp'), narr: false },
};
const DENIZ_PORTRAIT: Record<Mood, string> = {
  neutral: portraitImg('characters/portrait-deniz-neutral.webp'),
  happy: portraitImg('characters/portrait-deniz-happy.webp'),
  surprised: portraitImg('characters/portrait-deniz-surprised.webp'),
  thinking: portraitImg('characters/portrait-deniz-thinking.webp'),
};

const dlg = document.getElementById('dialog') as HTMLElement;
const lineEl = document.getElementById('line') as HTMLElement;
const whoEl = document.getElementById('who') as HTMLElement;
const nextBtn = document.getElementById('next') as HTMLButtonElement;
const portrait = document.getElementById('portrait') as HTMLElement;

interface Queue {
  lines: Line[];
  i: number;
  res: () => void;
}
let dq: Queue | null = null;
let typing: number | null = null;

/** True while a dialogue is on screen; puzzles ignore input then. */
export const dialogOpen = () => dq !== null;

/** Shows lines one by one. Resolves when the player has read the last one. Calls made while a dialogue is open are queued. */
export function say(lines: Line[]): Promise<void> {
  return new Promise((res) => {
    if (dq) {
      const prev = dq.res;
      dq.lines.push(...lines);
      dq.res = () => {
        prev();
        res();
      };
      return;
    }
    dq = { lines: [...lines], i: 0, res };
    showLine();
  });
}

function showLine() {
  const q = dq!;
  const L = q.lines[q.i];
  const sp = SPEAKERS[L.w];
  dlg.hidden = false;
  whoEl.textContent = sp.name;
  portrait.innerHTML = L.w === 'd' ? DENIZ_PORTRAIT[moodOf(L)] : sp.svg;
  lineEl.className = sp.narr ? 'narr' : '';
  if (typing !== null) clearInterval(typing);
  const txt = L.t;
  if (RM) {
    lineEl.textContent = txt;
    typing = null;
  } else {
    let n = 0;
    lineEl.textContent = '';
    typing = window.setInterval(() => {
      n += 2;
      lineEl.textContent = txt.slice(0, n);
      if (n >= txt.length && typing !== null) {
        clearInterval(typing);
        typing = null;
      }
    }, 24);
    if (L.w === 'm') chirp();
    else if (L.w === 'k') pluck(196, 0, 0.1, 0.7);
  }
  nextBtn.textContent = q.i === q.lines.length - 1 ? 'Tamam' : 'Devam';
  nextBtn.focus({ preventScroll: true });
}

function advance() {
  if (!dq) return;
  if (typing !== null) {
    clearInterval(typing);
    typing = null;
    lineEl.textContent = dq.lines[dq.i].t;
    return;
  }
  dq.i++;
  if (dq.i >= dq.lines.length) {
    dlg.hidden = true;
    const r = dq.res;
    dq = null;
    r();
  } else showLine();
}

nextBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  advance();
});

/** Enter / Space advance the dialogue. Returns true when the key was used. */
export function dialogKey(e: KeyboardEvent): boolean {
  if (dq && (e.key === 'Enter' || e.key === ' ') && document.activeElement !== nextBtn) {
    e.preventDefault();
    advance();
    return true;
  }
  return false;
}

/* ---------- goal tag ---------- */
const goalEl = document.getElementById('goal') as HTMLElement;
const replayBtn = document.getElementById('replayBtn') as HTMLButtonElement;

export function setGoal(t: string, o: { replay?: boolean } = {}) {
  (document.getElementById('goalText') as HTMLElement).textContent = t;
  replayBtn.hidden = !o.replay;
  goalEl.hidden = false;
}
export function clearGoal() {
  goalEl.hidden = true;
}

/** Hooks the hint and “replay” buttons to the current scene. */
export function bindGoalButtons(onHint: () => void, onReplay: () => void) {
  (document.getElementById('hintBtn') as HTMLButtonElement).onclick = () => {
    if (!dq) onHint();
  };
  replayBtn.onclick = () => {
    if (!dq) onReplay();
  };
}
