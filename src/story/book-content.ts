/* What is written in the old book. Shared by the hub (the book button) and the opening scene (where Deniz finds it).
   Pages show which coins have been found; cities that are not playable yet stay sealed. */
import cities from '../hub/cities.json';
import { Spread, plate } from '../engine/book';
import type { Progress } from '../engine/progress';

export interface City {
  id: string;
  name: string;
  lat: number;
  lon: number;
  animal: string;
  animalEn: string;
  label: 'top' | 'bottom' | 'left' | 'right';
  /** Where the coin sits relative to the true place, in map-width percent (dx right, dy down). */
  off: [number, number];
  playable: boolean;
}
export const CITIES = cities as City[];

/** A riddle per city about the place and its mood. It never names the guide animal: meeting it is a surprise. */
const TEASERS: Record<string, string> = {
  efes: 'Denizin çekilip gittiği, mermer caddelerin geceleri hâlâ konuştuğu liman kenti. Yüzyıllardır uyuyan biri, bir ışık bekliyor.',
  hattusa: 'Hitit krallarının başkenti: kalın surlar, kayalara oyulmuş bin tanrı. Gizli kapıyı sana bir dost açacak; onu önce ışığından tanıyacaksın.',
  gobeklitepe: 'Dikilitaşların üstünde oyulu hayvanlar gökyüzüne bakar. Yıldızların haritasını okumayı bilen kurnaz bir rehber seni orada bekler.',
  catalhoyuk: 'Evlerin kapısı çatıdaydı, duvarlarda eski resimler vardı. O resimlerin bekçisi, sessiz adımlarla gelir.',
  troya: 'Katman katman, kent üstüne kent. En alttaki kapıyı arayan bir dost, kazının başında seni bekliyor.',
  assos: 'Denize bakan tepede Athena’nın tapınağı yükselir. Gece her şeyi gören iri gözler, seni daha gelmeden fark eder.',
  afrodisias: 'Mermerin kenti, geceleyin bile ak. Heykeltıraşların sırrını taşıyan nazik bir rehber, taşların arasından süzülür.',
  bergama: 'Yüksek tepede kütüphane ve tiyatro, aşağıda ünlü bir şifa merkezi. Hekimin dostu, gölgelerin arasından sessizce kayar.',
  sardes: 'Dünyanın ilk sikkelerinin burada, Lidya’da basıldığı düşünülür. Kralın sikkesindeki işareti bilen görkemli bir rehber seni bekler.',
  nemrut: 'Dağın tepesinde dev heykeller nöbet tutar, gökyüzü yakındır. Tanrıların ve kralın sırrını yükseklerden bir bakış taşır.',
  zeugma: 'Fırat kıyısında küçücük taşlardan resimler. Mozaiklerin içinden seni bekleyen rehber, kanatlarını gizliyor.',
  hierapolis: 'Beyaz teraslardan sıcak sular akar. Eski kapıyı bekleyen küçük bir nöbetçi, seni neşeyle karşılayacak.',
  patara: 'Uzun bir kumsalda her yaz sessizce yuvalar kazılır. Denizin ve kumun yaşlı dostu, acele etmeyi sevmez.',
  gordion: 'Anlatılana göre Kral Midas’ın kulakları değişmişti ve bu sır uzun süre saklanmıştı. Sırrı bilen, inatçı bir rehber seni bekler.',
  phaselis: 'Üç limanlı kent, çam kokulu bir koyda. Eski deniz yollarını bilen, güleç bir rehber dalgaların arasından çıkar.',
};

/** Turkish number words for the counts that appear in the book. */
const words = (n: number) => (({ 11: 'on bir', 12: 'on iki', 13: 'on üç', 14: 'on dört', 15: 'on beş', 16: 'on altı' }) as Record<number, string>)[n] ?? String(n);
const ORD = ['', 'birinci', 'ikinci', 'üçüncü', 'dördüncü', 'beşinci', 'altıncı', 'yedinci', 'sekizinci', 'dokuzuncu', 'onuncu', 'on birinci', 'on ikinci', 'on üçüncü', 'on dördüncü', 'on beşinci'];
const ordinal = (n: number) => ORD[n] ?? `${n}.`;
const cap = (s: string) => s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);

function cityPage(c: City, p: Progress, big: boolean): string {
  const done = p.done.includes(c.id);
  const sealed = !c.playable && !done;
  const state = done ? 'lit' : sealed ? 'ghost' : 'plain';
  const status = done ? '<span class="bk-seal">Sikke tamamlandı</span>' : sealed ? '<span class="bk-seal">Bu sayfa henüz mühürlü</span>' : '';
  return `${plate(c.id, state, !big)}<h2>${c.name}</h2><span class="kicker">${cap(ordinal(CITIES.indexOf(c) + 1))} perde</span><p>${TEASERS[c.id]}</p>${status}`;
}

export function bookSpreads(p: Progress): Spread[] {
  const found = p.done.length;
  const intro: Spread = {
    left: `<span class="kicker">Dedemin yazısı</span>
      <p class="hand">Sevgili Deniz’im,<br>bu satırları okuyorsan el fenerin yanında, merakın da yanındadır.<br>Anadolu’nun ${words(CITIES.length)} kentinde ${words(CITIES.length)} sikke saklı; her birinin başında bir hayvan nöbet tutuyor. Adlarını yazmadım, tanışmanın tadı kaçmasın.<br>Işığı yandan tut, acele etme. Taş, acele edeni sevmez.<br>Dedem<br><span class="ps">Not: Efes’ten başla.</span></p>`,
    right: `<h2>${cap(words(CITIES.length))} sikke</h2>
      <div class="bk-grid">${CITIES.map((c) => plate(c.id, p.done.includes(c.id) ? 'lit' : 'ghost')).join('')}</div>
      <p>Bulunan sikke: ${found} / ${CITIES.length}</p>`,
  };
  const efes = CITIES[0];
  const spreads: Spread[] = [
    intro,
    { left: `${plate(efes.id, p.done.includes(efes.id) ? 'lit' : 'plain')}`, right: cityPage(efes, p, true).replace(/^<img[^>]*>/, '') },
  ];
  const rest = CITIES.slice(1);
  for (let i = 0; i < rest.length; i += 2) {
    const a = rest[i];
    const b = rest[i + 1];
    spreads.push({ left: cityPage(a, p, false), right: b ? cityPage(b, p, false) : '' });
  }
  return spreads;
}
