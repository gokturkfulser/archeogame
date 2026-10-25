/* All player-facing Turkish text of Act 2 (Hattuşa).
   n = narrator / instruction, k = Kurunta, d = Deniz. Kurunta always speaks to Deniz by name. */
import type { Line, Mood } from '../../engine/dialogue';

const n = (t: string): Line => ({ w: 'n', t });
const k = (t: string): Line => ({ w: 'k', t });
const d = (t: string, e?: Mood): Line => ({ w: 'd', t, e });

export const TEXT = {
  where: 'Hattuşa',

  collectibles: {
    names: { aslan: 'Aslan', gunes: 'Güneş', kil: 'Kil tablet', tanri: 'Tanrı' },
    cardNote: 'Sikkenin bir parçasını buldun.',
    label: (count: number, total: number) => `Hattuşa sikkesinin parçaları: ${count} / ${total}`,
  },

  kapi: {
    num: 'Birinci sahne',
    name: 'Aslanlı Kapı',
    intro: [
      n('Gün batıyor. Deniz, Çorum’un Boğazkale ilçesinde, Hititler’in başkenti Hattuşa’nın Aslanlı Kapı’sının önünde duruyor. Rüzgâr kuru ot ve sıcak taş kokuyor.'),
      n('Hititler’in ülkesine “bin tanrının ülkesi” denirdi. Kapının taşlarındaki kabartmaları ise yüzyıllar aşındırmış: ışığı tam üstlerine tutarsan hiçbir şey görünmez.'),
      n('Işığı oymanın yanından, yatık tut. Kabartmanın kenarı parlar ve resim okunur.'),
    ],
    goal: 'Işığı kabartmaların yanından tut ve dördünü de oku.',
    spot: (i: number) => `Taş pano ${i + 1}`,
    flat: [n('Işık tam üstüne düşünce kabartma silinir. Işığı biraz yandan tut.')],
    far: [n('Burası çok karanlık. Işığı panoya yaklaştır.')],
    hint: [n('Işığı bir panonun sağına ya da soluna, yakınına getir ve orada tut. Kabartmanın kenarı parlayınca resim okunur.')],
    read: {
      gunes: [d('Bir güneş! Işınları dört bir yana uzanıyor; sanki taştan bir yıldız.', 'happy')],
      geyik: [d('Bu bir geyik! Boynuzlarına bak, dal dal ayrılmış. Ne kadar zarif.', 'happy')],
      boga: [d('Güçlü bir boğa. Boynuzları yukarı bakıyor; sanki gökyüzüne meydan okuyor.')],
      kartal: [d('İki başlı bir kartal, kanatları açık! İki yöne birden bakıyor; hiçbir şeyi kaçırmaz.')],
    },
    open: [
      n('Dördü de okundu. Ağır taşlar gıcırdıyor; kapının karanlığında iki sıcak ışık yanıyor.'),
      k('Merhaba, Deniz. Korkma; o ışıklar benim boynuzlarım.'),
      d('Bir geyik! Hem de konuşan bir geyik! Sen kimsin?', 'surprised'),
      k('Ben Kurunta, Hattuşa’nın geyiği. Eski kitabındaki sikkede duran geyik benim. Bu kapıdan geçenleri çok uzun zamandır izlerim.'),
      k('Hattuşa sikkesi dört parçaya ayrıldı. Aslan parçası artık sende. Ötekiler tünelde, kil tabletlerin arasında ve kaya tapınağında saklı.'),
      k('Hadi, önce Yerkapı’ya. Orası karanlık; bende ışık var, sende de ışık var. İkimiz yeteriz.'),
    ],
    card: {
      title: 'Aslanlı Kapı',
      facts: [
        'Hattuşa, Hitit İmparatorluğu’nun başkentiydi. Bugün Çorum’un Boğazkale ilçesinde bulunur; 1986’da UNESCO Dünya Mirası Listesi’ne girdi.',
        'Aslanlı Kapı’nın iki yanında taştan oyulmuş aslanlar durur. Aslanların kapıyı ve kenti koruduğu düşünülür.',
        'Hititler yeni bir ülkeyi ya da tanrıyı tanıdıkça onları kendi tanrılar topluluğuna katardı; bu yüzden belgelerde “bin tanrının ülkesi” denir.',
      ],
    },
  },

  tunel: {
    num: 'İkinci sahne',
    name: 'Yerkapı Tüneli',
    intro: [
      k('Burası Yerkapı. Altından yaklaşık 70 metrelik bir taş geçit uzanır. Hititler taşları üst üste koyup uçlarını yaklaştırarak sivri bir tonoz yapmış.'),
      k('Şşş… Çok karanlık, ama korkma. Bu taşlar yüzyıllardır burada; senden de benden de sabırlılar.'),
      k('Duvarlarda beş resimli işaret saklı: güneş, dağ, geyik, aslan ve kuş. Tavandaki levhada hangi sırayla yakılacakları yazılı.'),
      n('Işığını önce levhaya tut ve sırayı oku. Sonra işaretleri aynı sırayla yak: ışığını her birinin üstünde bir an bekletirsen parlar.'),
    ],
    goal: 'Levhadaki sırayı oku, sonra işaretleri aynı sırayla yak.',
    plaque: 'Tavandaki levha',
    sign: (name: string) => `${name} işareti`,
    names: { gunes: 'Güneş', dag: 'Dağ', geyik: 'Geyik', aslan: 'Aslan', kus: 'Kuş' },
    wrong: [k('Işıklar söndü. Hiç dert değil; levhadaki sırayı bir daha oku, taşlar sırayı unutmaz.')],
    tooEarly: [n('Önce levhadaki sırayı oku. Işığını tavandaki levhaya tut.')],
    hint: [k('Tavandaki levhada beş resim yan yana duruyor. Işığını önce oraya tut, sonra aynı sırayla duvardaki işaretlere götür ve her birinde bekle.')],
    solved: [
      n('Beşinci işaret de yandı. Taşlar yavaşça yana kayıyor.'),
      d('Bak, tünelin ucundaki kapı açıldı! Az önce duvar sanıyordum.', 'happy'),
      k('Aferin, Deniz. Işığın doğru yolu gösterdi. İşte ikinci parça: güneş.'),
    ],
    card: {
      title: 'Yerkapı Tüneli',
      facts: [
        'Yerkapı’nın altında yaklaşık 70 metre uzunluğunda bir taş geçit vardır. Taşlar üst üste konup uçları birbirine yaklaştırılarak sivri bir tonoz yapılmıştır.',
        'Bu geçidin, savunma sırasında şehir surunun dışına gizlice çıkmak için kullanılmış olabileceği düşünülür.',
        'Hitit inancında Arinna Güneş Tanrıçası en önemli tanrılardan biriydi.',
      ],
    },
  },

  arsiv: {
    num: 'Üçüncü sahne',
    name: 'Kil Tablet Arşivi',
    intro: [
      n('Tünelin ucunda sıcak, loş bir oda var. Raflar kil tabletlerle dolu; Hattuşa’da on binlerce kil tablet bulunmuştur.'),
      k('Hititler çivi yazısıyla yazardı. Islak kilin üstüne kamış kalemi bastırır, kama biçimli izler bırakırlardı. Mektup yazmak bile küçük bir heykel yapmak gibiydi.'),
      k('Bak, masadaki üç tablet kırılmış! Kırık parçalar şurada duruyor. Kenarları uyanı bulursak yazılar tamamlanır.'),
      n('Önce bir parçaya dokun, sonra kırık kenarı ona uyan tabletin boşluğuna dokun. Klavyede Tab ve Enter ile de seçebilirsin.'),
    ],
    goal: 'Kırık parçaları doğru tabletlere yerleştir.',
    fragment: (i: number) => `Kil parça ${i + 1}`,
    tablet: (i: number) => `Kırık tablet ${i + 1}`,
    wrong: [k('Olmadı, kırık kenarlar birbirine uymuyor. Kenarın şekline bak: çıkıntılar ve girintiler tam oturmalı.')],
    pickFirst: [n('Önce aşağıdaki parçalardan birine dokun.')],
    mended: [
      k('Harika! Üç tablet de bütün. Bunlardan biri, Hititler’le Mısır arasındaki barış antlaşmasının bir nüshasına benziyor. Birazdan onu daha yakından göreceğiz.'),
      k('Şimdi sıra sende, Deniz! Taze kile kamış kalemle adını yazalım. Parlayan noktalara sırayla dokun.'),
    ],
    goal2: 'Kilin üstündeki parlayan noktalara sırayla dokun.',
    dot: (i: number) => `Kil noktası ${i + 1}`,
    hint: [k('Kırık kenarın şekline bak: aynı çıkıntı ve girinti sayısı olan parçayı seç.')],
    hint2: [k('Parlayan noktaya dokun, kamış kalem kile bir kama izi bırakır.')],
    signed: [d('İşte adım, Hititler gibi çivi yazısıyla! Dedem görse çok gurur duyardı.', 'happy'), k('Çok güzel. Kuruyan kil yüzyıllarca kalır; adın burada uzun süre yaşayabilir. İşte üçüncü parça: kil tablet.')],
    card: {
      title: 'Kil Tablet Arşivi',
      facts: [
        'Hattuşa’da on binlerce kil tablet bulundu. Bunlar yasaları, duaları, mektupları ve antlaşmaları anlatır. Hititler’i bugün büyük ölçüde bu tabletlerden tanıyoruz.',
        'Yazı, ıslak kilin üstüne kamış kalemin ucu bastırılarak yazılırdı. Bu kama biçimli izlere “çivi yazısı” denir.',
        'Tabletlerde Hititçe’nin yanında Akadca gibi başka diller de vardır. Hititçe, bilinen en eski Hint-Avrupa dillerinden biridir.',
      ],
    },
  },

  yazili: {
    num: 'Dördüncü sahne',
    name: 'Yazılıkaya',
    intro: [
      n('Kentin biraz dışında, kayalıkların arasında Yazılıkaya var: Hititler’in açık hava tapınağı.'),
      k('Burada yüzlerce tanrı kayaya oyulmuş. Küçük galeride kılıç taşıyan on iki tanrı yan yana yürür; hiçbiri arkasına bakmaz.'),
      k('Işığını soldan sağa, yürüyüş yönünde gezdirirsen tanrılar sırayla uyanır. Hiçbirini atlama; yürüyüş sırası bozulmaz.'),
    ],
    goal: 'Işığını soldan sağa gezdir ve on iki tanrıyı sırayla uyandır.',
    god: (i: number) => `${i + 1}. tanrı`,
    skip: [k('Sırayı atladın. Tanrılar yürüyüş sırasıyla uyanır; soldan başla.')],
    hint: [k('Işığını en soldaki tanrının üstüne getir, sonra yavaşça sağa ilerle. Her tanrının üstünde bir an bekle.')],
    allLit: [n('On iki tanrının hepsi parladı! Yandaki kayada yeni bir kabartma beliriyor.')],
    plaque: [
      d('Bak, bir geyiğin üstünde duran bir tanrı… Altındaki levhada “KURUNTA” yazıyor.'),
      d('Kurunta… Senin adın! Demek ki Hititler’in doğa tanrısının adı bu.', 'surprised'),
      k('Evet, Deniz. Hititler yaban doğanın koruyucusunu geyikle gösterirdi. Adımı ondan aldım; ya da o benden, kim bilir.'),
      d('Sen yalnızca bir geyik değilsin; bir tanrının adını taşıyorsun!'),
      k('Adımı yüksek sesle okuyan ilk ziyaretçi sensin. Şimdi dikkat et, asıl büyük an geliyor.'),
    ],
    treaty: [
      n('Salonun ortasında iki gümüş tablet parlıyor. Yıl yaklaşık M.Ö. 1259. Hitit Kralı III. Hattušili ile Mısır Firavunu II. Ramses uzun bir savaşın ardından barış yapıyor.'),
      k('Antlaşmaya göre iki ülke birbirine saldırmayacak, düşmanlarına karşı birbirine yardım edecekti. Tanık olarak da bin tanrı çağrıldı: Hitit tanrıları ve Mısır tanrıları.'),
      d('Bilinen en eski barış antlaşmalarından biri! Demek savaşın bile bir sonu varmış.'),
      k('Evet. Bugün bunun bir kopyası New York’ta, Birleşmiş Milletler binasında asılıdır.'),
    ],
    card: {
      title: 'Yazılıkaya ve Kadeş Antlaşması',
      facts: [
        'Yazılıkaya, Hattuşa’dan yaklaşık bir kilometre uzaktaki bir kaya tapınağıdır. Kayalara yüzlerce tanrı oyulmuştur; küçük galerideki on iki kılıçlı tanrı en ünlü kabartmalardandır.',
        'Hititler’in Mısır’la yaptığı Kadeş Antlaşması (yaklaşık M.Ö. 1259), bilinen en eski yazılı barış antlaşmalarından biri sayılır.',
        'Hitit inancında yaban doğanın koruyucusu Kurunta’dır; geyikle gösterildiği düşünülür. Kurunta adı Hitit prensleri arasında da kullanılmıştır.',
      ],
    },
  },

  finale: [
    k('Hattuşa sikkesi tamamlandı, Deniz! Bir yüzünde geyik, öbür yüzünde barışın eli.'),
    d('Hititler barışı bile kile ve taşa yazmışlar. Sözler uçar, yazılar kalır; demek buymuş.', 'thinking'),
    k('Yolun daha uzun. Öteki sikkeler seni bekliyor; yeni bir kentte yeni bir dost karşılayacak seni. Ben burada, tanrıların yanında kalıyorum. Işığını koru.'),
  ],
};
