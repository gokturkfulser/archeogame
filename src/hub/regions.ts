/* The four stages of the journey. Cities carry a `region` id in cities.json; the map shows a stage once the one before
   it is finished (every playable city of it has its coin), so the route unrolls like the trip itself:
   the Aegean and the north, Central Anatolia, the south-east, then the Mediterranean and home. */
import cities from './cities.json';

export interface Region {
  id: string;
  name: string;
  /** What the player reads on the map when the stage opens. */
  intro: string;
}

export const REGIONS: Region[] = [
  { id: 'ege', name: 'Ege ve Kuzey', intro: 'Yolculuk Ege’den başlar, kıyı boyunca kuzeye uzanır.' },
  { id: 'ic', name: 'İç Anadolu', intro: 'Yol artık yüksek platolara, Hitit ve Frig topraklarına çıkıyor.' },
  { id: 'guneydogu', name: 'Güneydoğu Anadolu', intro: 'Dünyanın en eski tapınaklarının ve Fırat kıyısının yolu açıldı.' },
  { id: 'akdeniz', name: 'Akdeniz ve eve dönüş', intro: 'Son durak: Toros eteklerinden Akdeniz kıyısına, oradan Ege’ye, eve doğru.' },
];

type CityRef = { id: string; region: string; playable: boolean };
const all = cities as CityRef[];

export const regionOf = (cityId: string): number => REGIONS.findIndex((r) => r.id === all.find((c) => c.id === cityId)?.region);

/** How many stages the map shows: up to the first one that still has a playable city without its coin, and,
    when everything that can be played is done, one more (its cities are still sealed). Finished cities always show. */
export function visibleRegions(done: string[]): number {
  let lastPlayable = 0;
  for (let i = 0; i < REGIONS.length; i++) {
    const playable = all.filter((c) => c.region === REGIONS[i].id && c.playable);
    if (playable.length) lastPlayable = i;
    if (playable.some((c) => !done.includes(c.id))) return i + 1;
  }
  return Math.min(REGIONS.length, lastPlayable + 2);
}
