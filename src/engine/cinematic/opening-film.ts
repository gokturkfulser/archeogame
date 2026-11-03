/* G1, the opening film “Dedenin Gölge Oyunu”: shared by the prologue (first visit, plays once) and the map (watch again).
   Hub-safe: it does not import core.ts. */
import { assetUrl } from '../url';
import { playFilm } from './play-film';

const KEY = 'ppa.g1.seen';

export function openingSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function markOpeningSeen() {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* storage blocked: the film just plays again next time */
  }
}

/** The film ends in the dark with the flashlight clicking on; whatever called it carries on from there. */
export function playOpeningFilm(): Promise<void> {
  return playFilm(
    {
      webm: assetUrl('baslangic/g1-opening.webm'),
      mp4: assetUrl('baslangic/g1-opening.mp4'),
      poster: assetUrl('baslangic/g1-opening-poster.webp'),
    },
    1500,
  );
}
