/* All player-facing Turkish text of the Sardes act (“Kroisos’un Altını”).
   n = narrator / instruction, a = Alyat, d = Deniz. Alyat always speaks to Deniz by name and calls himself a lion of Lydia.
   The king is always written Kroisos (never Karun); the idiom is explained on the Bin Tepe card. */
import type { Line, Mood } from '../../engine/dialogue';

const n = (t: string): Line => ({ w: 'n', t });
const a = (t: string): Line => ({ w: 'a', t });
const d = (t: string, e?: Mood): Line => ({ w: 'd', t, e });

export const TEXT = {
  where: 'Sardes',

  collectibles: {
    names: { damla: 'Altın damla', aslan: 'Aslan başı', boga: 'Boğa', zimba: 'Zımba izi' },
    cardNote: 'Sikkenin bir parçasını buldun.',
    label: (count: number, total: number) => `Sardes sikkesinin parçaları: ${count} / ${total}`,
  },

  paktolos: {
    num: 'Birinci sahne',
    name: 'Paktolos Çayı',
    intro: [
      n('Akşam oluyor. Deniz, Manisa’nın Salihli ilçesindeki Sart Çayı’nın kıyısında duruyor. Eskiden bu çayın adı Paktolos’tu. Uzakta yükselen solgun kayalık, Lidya Krallığı’nın başkenti Sardes’in akropolü.'),
      n('Anlatılana göre Kral Midas, dokunduğu her şeyi altına çeviren gücünden kurtulmak için bu suda yıkanmış. Altın tozu da suya karışmış ve çay o günden beri altın taşırmış.'),
      d('Dedemin kitabı doğru söylüyormuş… Suya bak, içinde bir şeyler parlıyor.', 'surprised'),
      n('Altın pullar akıntıyla yüzüyor ve dönerken yalnızca bir an parlıyor. Işığı bir pulun üstüne tut, ışık pulun yüzüne doğru geldiğinde parıldar. Akıntı onları götürmeden yakala!'),
    ],
    goal: (got: number, total: number) => `Işığı altın pulların üstünde tut ve yedisini yakala: ${got} / ${total}`,
    spot: 'Çaydaki altın pullar',
    first: [d('Yakaladım! Pulu tuttuğum an parıldadı.', 'happy')],
    halfway: [d('Üç tane oldu. Akıntı hızlı ama ışığım daha hızlı.', 'happy')],
    flaky: [n('Pullar dönerken yalnızca bir an parlıyor. Işığı pulun üstünde tut ve parıltıyı bekle.')],
    hint: [n('Işığı akıntıdaki bir pulun üstünde tut. Pul dönerken ışık yüzüne gelince parlar; o sırada ışığı bırakma.')],
    seven: [
      d('Yedi altın pul! Dedem “her parıltı bir ipucudur” derdi.', 'happy'),
      n('Pullar avucundan fırlıyor, havada dönüyor ve gitgide kalabalıklaşıyor…'),
    ],
    after: [
      a('Hmm. Fena değil, Deniz. Yedi pul, hiçbirini dökmeden. Kral Alyattes bile bu kadar sabırlı olmamıştır.'),
      d('Bir aslan! Hem konuşan hem altın yeleli bir aslan!', 'surprised'),
      a('Ben Alyat, Lidya’nın aslanıyım. Eski kitabındaki sikkenin üstündeki aslan benim. Bana “Majesteleri” diyebilirsin, kızmam.'),
      d('Tamam, Majesteleri. Peki yeleniz neden ıslak, Majesteleri?'),
      a('Islak değil, parlak. Nehirden geçerken biraz… yıkandım.'),
      d('Aslanlar sudan hoşlanmaz sanırdım.'),
      a('Kralların neyi sevdiği önemli değil, nasıl göründüğü önemli. Bugün çok iyi görünüyorum.'),
      d('Bunu not alıyorum.', 'happy'),
      a('Sen de şu parıltıları yakalayan ışığını not et; sana lazım olacak. Eski Lidya’da hiçbir şey göründüğü gibi değildir. Altın da öyle.'),
      a('Hadi. Sikkenin ilk parçası senin, çayın armağanı. Sıradaki durak, altının sikkeye dönüştüğü yer.'),
    ],
    card: {
      title: 'Paktolos Çayı',
      facts: [
        'Sardes (Türkçesi Sart), Lidya Krallığı’nın başkentiydi. Bugün Manisa’nın Salihli ilçesindedir.',
        'Paktolos Çayı’nın (bugünkü adıyla Sart Çayı) altın taşıdığı anlatılır. Efsaneye göre Kral Midas, dokunduğu her şeyi altına çeviren gücünden kurtulmak için bu çayda yıkanmış ve altın tozu çayın kumuna karışmış.',
        'Lidya’nın zenginliğinin bir kısmının çaydan ve çayın doğduğu Tmolos (bugünkü Bozdağ) dağlarından geldiği düşünülür.',
      ],
    },
    soon: [n('Sardes’in öteki sahneleri henüz hazır değil. Altın damla parçası sende kalıyor; yakında devam edeceğiz.')],
  },
};
