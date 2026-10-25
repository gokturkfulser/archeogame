/* Story progress shared by the hub, the opening scene and every act. Kept in localStorage; every access is guarded
   because storage can be missing or blocked (private windows, blocked site data). */

const KEY = 'ppa.progress.v1';

export interface Progress {
  /** The old book has been found (opening scene finished). */
  book: boolean;
  /** Ids of the cities whose coin is complete. */
  done: string[];
}

const empty = (): Progress => ({ book: false, done: [] });

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const p = JSON.parse(raw) as Partial<Progress>;
    return { book: !!p.book, done: Array.isArray(p.done) ? p.done.filter((x) => typeof x === 'string') : [] };
  } catch {
    return empty();
  }
}

function save(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* progress just will not persist */
  }
}

export function markBookFound() {
  const p = loadProgress();
  p.book = true;
  save(p);
}

export function markDone(id: string) {
  const p = loadProgress();
  p.book = true;
  if (!p.done.includes(id)) p.done.push(id);
  save(p);
}

/** Replaying an act from the start gives its coin back: it is found again when the act ends. */
export function unmarkDone(id: string) {
  const p = loadProgress();
  p.done = p.done.filter((x) => x !== id);
  save(p);
}

export function resetProgress() {
  save(empty());
}
