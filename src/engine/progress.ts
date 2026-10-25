/* Story progress shared by the hub, the opening scene and every act. Kept in localStorage; every access is guarded
   because storage can be missing or blocked (private windows, blocked site data). */

const KEY = 'ppa.progress.v1';

export interface Progress {
  /** The old book has been found (opening scene finished). */
  book: boolean;
  /** Ids of the cities whose coin is complete. */
  done: string[];
  /** Cities whose “coin lands on the map” scene (G6) has already been shown. */
  shown: string[];
}

const empty = (): Progress => ({ book: false, done: [], shown: [] });
const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const p = JSON.parse(raw) as Partial<Progress>;
    const done = ids(p.done);
    // saves from before G6 have no `shown`: those coins were already celebrated
    return { book: !!p.book, done, shown: p.shown === undefined ? done : ids(p.shown) };
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
  p.shown = p.shown.filter((x) => x !== id);
  save(p);
}

/** The first finished city whose return to the map has not been played yet. */
export function pendingReturn(): string | null {
  const p = loadProgress();
  return p.done.find((id) => !p.shown.includes(id)) ?? null;
}

export function markShown(id: string) {
  const p = loadProgress();
  if (!p.shown.includes(id)) p.shown.push(id);
  save(p);
}

export function resetProgress() {
  save(empty());
}
