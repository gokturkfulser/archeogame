/* All player-facing Turkish text of Act 1 (Efes).
   n = narrator / instruction, m = Melissa, d = Deniz. Melissa always speaks to Deniz by name. */
import type { Line, Mood } from '../../engine/dialogue';

const n = (t: string): Line => ({ w: 'n', t });
const m = (t: string): Line => ({ w: 'm', t });
const d = (t: string, e?: Mood): Line => ({ w: 'd', t, e });

export const TEXT = {
  where: 'Efes',

  collectibles: {
    names: { ari: 'Arı', geyik: 'Geyik', palmiye: 'Palmiye', ef: 'ΕΦ harfleri' },
    cardNote: 'Sikkenin bir parçasını buldun.',
    label: (count: number, total: number) => `Efes sikkesinin parçaları: ${count} / ${total}`,
  },

  liman: {
    num: 'Birinci sahne',
    name: 'Liman Caddesi',
    intro: [
      n('Gece çöktü. Deniz, Efes’in eski liman caddesinde, mermer taşların üstünde yürüyor. Elinde güçlü bir el feneri, kulağında kendi ayak sesleri var.'),
      n('Bu caddeye Arkadiane denirdi; limandan Büyük Tiyatro’ya uzanırdı. Gemiler bir zamanlar tam şuraya, denizin kıyısına yanaşırdı. Şimdi deniz kilometrelerce uzakta.'),
      n('Fareni ya da parmağını gezdir; Deniz el fenerini oraya doğrultur. Işık, karanlığın sakladığını gösterir.'),
    ],
    goal: 'Kırık sütundaki gizli oymayı bul ve ona dokun.',
    spot: 'Kırık sütundaki gizli işaret',
    tooDark: [n('Burası çok karanlık. Önce el fenerini bu taşa doğrult.')],
    hint: [n('Sağdaki büyük kırık sütuna el fenerinin ışığını doğrult. Taştaki oyma, ışık değince parlar. Sonra ona dokun.')],
    wake: [
      m('Vızzz! Kim ışık tuttu bana? Hay aksi, tam rüyamın en tatlı yerindeydim!'),
      d('Bir arı! Hem de konuşan bir arı! Merhaba, ben Deniz.', 'surprised'),
      m('Deniz! Ne güzel isim. Ben Melissa, Efes’in arısı. Artemis’in rahibelerine de “melissa”, yani “arı” dendiği anlatılır; anlayacağın, pek ünlüyüm.'),
      m('Eskiden bu kentin paralarında benim resmim vardı. Ama Efes sikkesi dört parçaya bölündü. Arı yüzü artık sende; öteki parçalar tiyatroda, kütüphanede ve Artemis Tapınağı’nda saklı.'),
      m('Elindeki şey de ne? Küçük bir güneş mi? Neyse, yolda anlatırsın. Hadi, önce tiyatroya! Ben önden uçarım; sen ayaklarına dikkat et, taşlar eski.'),
    ],
    card: {
      title: 'Liman Caddesi',
      facts: [
        'Efes bir liman kentiydi. Küçük Menderes Nehri’nin taşıdığı alüvyon limanı yavaş yavaş doldurdu; deniz bugün kilometrelerce uzakta.',
        'Arkadiane Caddesi limandan tiyatroya uzanırdı. Geceleri fenerlerle aydınlatıldığı anlatılır.',
        'Efes, 2015’te UNESCO Dünya Mirası Listesi’ne girdi.',
      ],
    },
  },

  tiyatro: {
    num: 'İkinci sahne',
    name: 'Büyük Tiyatro',
    intro: [
      m('İşte Büyük Tiyatro! Yaklaşık 25.000 kişi bu basamaklarda oturup oyun izlerdi. Düşünsene, 25.000 kişi aynı anda gülüyor!'),
      m('Bu taşlar sesi çok iyi taşır; sahnede fısıldasan en üst sıradan bile duyulur. Sakın sırlarını burada söyleme!'),
      m('Ben bir ezgi mırıldanacağım. Sen de aynı sırayla basamaklara dokun, taşlar şarkıyı sana geri söylesin.'),
    ],
    goal: 'Ezgiyi dinle, sonra aynı sırayla basamak kuşaklarına dokun.',
    band: (i: number) => `Basamak kuşağı ${i + 1} (${['en alt', 'alt', 'orta', 'üst', 'en üst'][i]})`,
    hint: [m('Her basamak kuşağı ayrı bir nota söyler: en alttaki en kalın, en üstteki en ince. Klavyede 1’den 5’e kadar tuşları da kullanabilirsin.')],
    wrong: [m('Yankı karıştı. Hiç dert değil, taşlar sabırlıdır; bir daha dinleyelim.')],
    round1: [m('Harika, taşlar seni duydu! Bir tur daha var, bu sefer ezgi biraz uzun. Kulaklarını aç!')],
    solved: [m('Taşlar şarkını tanıdı! Yankının içinden bir parça düştü: bir geyik!'), d('Taşlar benimle şarkı söyledi! Bunu anlatsam kimse inanmaz.', 'happy')],
    card: {
      title: 'Büyük Tiyatro',
      facts: [
        'Tiyatro, Panayır Dağı’nın yamacına yaslanır. Helenistik dönemde yapıldı; Romalılar onu büyüterek yaklaşık 25.000 kişilik hâle getirdi.',
        'Basamakların yarım çanak biçimi, sahnedeki sesi en üst sıralara kadar taşır.',
        'Efes sikkelerinin arka yüzünde Artemis’in kutsal hayvanı geyik ve bir palmiye ağacı bulunurdu.',
      ],
    },
  },

  kutuphane: {
    num: 'Üçüncü sahne',
    name: 'Celsus Kütüphanesi',
    intro: [
      m('Celsus Kütüphanesi! Gaius Julius Aquila adında bir oğul, babası Celsus’un anısına yaptırmış. Bu kütüphane aynı zamanda babasının mezarı.'),
      m('Ön cephedeki dört nişte dört erdemin heykeli dururdu. Ama bak, heykeller yerlerinden inmiş! Kim bilir hangi gece yaramazlık yaptılar.'),
      m('Deniz, el fenerinin ışığını nişlerin dibine tut: taşa kazınmış birer harf göreceksin. Her heykeli adının ilk harfinin yazdığı nişe yerleştir.'),
    ],
    goal: 'Soldan bir heykel seç, sonra doğru nişe dokun.',
    tray: 'Heykeller',
    niche: (n: number) => `Soldan ${n + 1}. niş`,
    statue: (lat: string, tr: string, gr: string) => `${lat}, ${tr}. Yunanca ${gr}`,
    hint: [m('Önce bir heykel seç. Yunanca adının ilk harfine bak: ΣΟΦΙΑ, Σ ile başlar. Sonra el fenerinle nişlerin altını aydınlat ve aynı harfi bul.')],
    twoE: [m('İki nişte de Ε yazıyor... Hangisi önce gelir? Işığı yukarıdaki taş kuşağa tut; kütüphane sana bir öğüt veriyor.')],
    wrong: [m('Bazı heykeller yanlış yerde. Nişlerin altındaki harfleri bir daha oku ve heykelin Yunanca adının ilk harfiyle eşleştir.')],
    solved: [d('Tık! Hepsi tam yerine oturdu.', 'happy'), m('Dört erdem yerinde! Önce düşün, sonra bil. Üstteki yazı da bunu söylüyordu. Al bakalım, palmiye parçası senin.')],
    inscription: 'ÖNCE DÜŞÜN, SONRA BİL',
    card: {
      title: 'Celsus Kütüphanesi',
      facts: [
        'MS 2. yüzyılın başında yapıldı. İçinde yaklaşık 12.000 parşömen tomarı saklandığı düşünülür.',
        'Celsus’un lahdi hâlâ binanın altındaki mezar odasında durur. Kütüphane aynı zamanda onun anıt mezarıdır.',
        'Nişlerdeki dört erdem: Sophia (bilgelik), Arete (erdem), Ennoia (düşünce) ve Episteme (bilgi). Bugün yerindekiler kopyadır; asılları Viyana’daki Efes Müzesi’ndedir.',
      ],
    },
  },

  artemis: {
    num: 'Dördüncü sahne',
    name: 'Artemis Tapınağı',
    intro: [
      m('Burası Artemis Tapınağı’nın yeri. Antik dünyanın Yedi Harikası’ndan biriydi; insanlar sırf onu görmek için denizin öbür ucundan gelirdi.'),
      m('Bugün yalnızca tek bir sütun ayakta. Tepesindeki yuvayı görüyor musun? Leylekler orayı çok sever; belki biri şu an bizi izliyor.'),
      m('İplere asılı kâğıt parçalar tapınağın gölgesini saklıyor. Deniz, el fenerini doğru yere tutarsan gölgeler birleşir ve tapınak duvarda yeniden belirir.'),
    ],
    goal: 'Işığı gezdir; gölgeler duvardaki noktalı çizgilere otursun.',
    hint: [m('Bir sır vereyim: tapınağın yüzü batıya bakardı. Işığı doğudan, yani sağ üstten tut. Noktalı çizgiler koyulaştıkça yaklaşıyorsun.')],
    solved: [d('Gölgeler birleşti! Tapınak ayağa kalktı.', 'happy'), m('İşte! Gölgeden de olsa, tapınak yeniden ayakta. Son parça senin: ΕΦ, Efes’in adının ilk harfleri. Bak, sikke tamamlanıyor!')],
    card: {
      title: 'Artemis Tapınağı',
      facts: [
        'MÖ 356’da Herostratos adlı biri, sırf ünlü olmak için tapınağı ateşe verdi. Efesliler onun adının anılmasını yasakladı.',
        'Tapınak sonra eskisinden de görkemli biçimde yeniden yapıldı. Antik yazar Yaşlı Plinius, 127 sütunu olduğunu yazar.',
        'Bugün ayakta duran tek sütun, kazıda bulunan parçalar üst üste konarak yeniden dikildi.',
      ],
    },
  },

  finale: [
    m('Sikke tamamlandı! Bir yüzünde ben, öbür yüzünde Artemis’in geyiği ve palmiyesi. Hiç bu kadar parlak görünmemiştim.'),
    m('Teşekkürler, Deniz. Yüzyıllardır uyuyordum ve beni uyandıran ilk kişi, elinde küçük bir güneşle gelen sen oldun. Efes’in ışığı artık seninle.'),
    m('Bu perde kapanıyor, ama Anadolu’da açılmayı bekleyen daha çok perde var. Kitabın ikinci sayfasında başka bir dost seni bekliyor.'),
    d('Hazırım, Melissa. Dedem haklıymış: karanlık, ışık tutana sakladığını gösteriyor. Sıradaki perdede görüşürüz!', 'happy'),
  ],
};
