/* Opening scene (Başlangıç): Deniz finds her grandfather’s old book. All player-facing Turkish text.
   n = narrator / instruction, d = Deniz. */
import type { Line, Mood } from '../../engine/dialogue';

const n = (t: string): Line => ({ w: 'n', t });
const d = (t: string, e?: Mood): Line => ({ w: 'd', t, e });

export const TEXT = {
  where: 'Başlangıç',
  num: 'Başlangıç',
  name: 'Dedemin çalışma odası',

  intro: [
    n('Selçuk, Efes’in hemen yanı başı. Eski bir taş evde gece elektrikler kesildi; dışarıda yıldızlar, içeride tek bir el feneri var.'),
    n('Deniz, dedesinin çalışma odasında. Dedesi yıllarca burada Anadolu’nun taşlarını, çömleklerini, kayıp sikkelerini incelerdi. Oda hâlâ onun kokuyor: kâğıt, toz ve eski ahşap.'),
    d('Dedem bana tek bir şey söylemişti: “Kitabı sakla, bir gün sana lazım olacak.” Hangi kitap, dede? Bu oda baştan aşağı kitap dolu!', 'thinking'),
    n('Fareni ya da parmağını gezdir; Deniz el fenerini oraya doğrultur. Işık, karanlığın sakladığını gösterir.'),
  ],
  goal: 'Odayı el fenerinle tara; karanlıkta bir yerde altın bir parıltı var.',
  spot: 'Masanın üstünde parlayan kitap',
  tooDark: [n('Burası çok karanlık. Işığı masanın üstüne doğrult; altın bir parıltı arıyorsun.')],
  hint: [n('Masanın üstüne, kâğıtların yanına ışık tut. Altın bir parıltı arıyorsun. Bulunca ona dokun.')],

  found: [
    d('Bu bir kitap! Kapağındaki sikkeler fenerin ışığında göz kırpıyor sanki.', 'surprised'),
    d('Hadi bakalım, kapağı açalım.'),
  ],
  afterBook: [
    d('On beş kent, on beş sikke ve her sikkenin üstünde nöbet tutan bir hayvan. Hiçbirinin adı yazmıyor; sanki onları kendim bulmamı istemiş.'),
    d('İlk sayfada küçük, parlak bir kanat… Efes! Bizim evin iki adım ötesi.', 'happy'),
    d('Bunun sandığımdan çok daha büyük bir şey olduğunu hissediyorum. Kitabı çantama koyuyorum; yarın değil, şimdi başlıyoruz.'),
    n('Haritaya bakma zamanı.'),
  ],
};
