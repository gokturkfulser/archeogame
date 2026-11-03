import { Composition, Folder } from "remotion";
import { ActEnding } from "./ActEnding/ActEnding";
import { actEndingSchema, type ActEndingProps } from "./ActEnding/schema";
import { OpeningFilm, openingSchema, type OpeningProps } from "./G1/OpeningFilm";
import { KadesTreaty, kadesSchema, type KadesProps } from "./Beat/KadesTreaty";

/* The act ending is one template: every city gets the same film, driven by these props (city, coin pieces, colours, map
   position, guide animal, next act). Efes and Hattuşa so far. The vertical version is for social media. */
const EFES: ActEndingProps = {
  city: "Efes",
  coinTitle: "Efes sikkesi",
  pieces: [
    { id: "ari", image: "img/coin-bee.webp", scene: "Liman Caddesi", sceneImage: "img/liman-mid.webp", note: 0 },
    { id: "geyik", image: "img/coin-stag.webp", scene: "Büyük Tiyatro", sceneImage: "img/tiyatro-mid.webp", note: 1 },
    { id: "palmiye", image: "img/coin-palm.webp", scene: "Celsus Kütüphanesi", sceneImage: "img/kutuphane-mid.webp", note: 2 },
    { id: "ef", image: "img/coin-blank.webp", letters: "ΕΦ", scene: "Artemis Tapınağı", sceneImage: "img/artemis-mid.webp", note: 3 },
  ],
  front: "img/coin-bee.webp",
  back: "img/coin-reverse.webp",
  frontLetters: ["Ε", "Φ"],
  guide: "melissa",
  mapX: 16.1,
  mapY: 63.2,
  nextNumber: "İkinci perde",
  nextName: "Sardes",
  backdrop: { sky: "img/kutuphane-sky.webp", mid: "img/kutuphane-mid.webp", fg: "img/kutuphane-fg.webp" },
  curtain: "#a8322a",
  glow: "#f3c56a",
};

const HATTUSA: ActEndingProps = {
  city: "Hattuşa",
  coinTitle: "Hattuşa sikkesi",
  pieces: [
    { id: "aslan", image: "img/h-coin-aslan.webp", scene: "Aslanlı Kapı", sceneImage: "img/h-kapi-mid.webp", note: 0 },
    { id: "gunes", image: "img/h-coin-gunes.webp", scene: "Yerkapı Tüneli", sceneImage: "img/h-tunel-mid.webp", note: 1 },
    { id: "kil", image: "img/h-coin-kil.webp", scene: "Kil Tablet Arşivi", sceneImage: "img/h-arsiv-mid.webp", note: 2 },
    { id: "tanri", image: "img/h-coin-tanri.webp", scene: "Yazılıkaya", sceneImage: "img/h-yazili-mid.webp", note: 3 },
  ],
  front: "img/h-coin-stag.webp",
  back: "img/h-coin-reverse.webp",
  guide: "kurunta",
  mapX: 46.6,
  mapY: 37.2,
  nextNumber: "Sekizinci perde",
  nextName: "Çatalhöyük",
  backdrop: { sky: "img/h-yazili-sky.webp", mid: "img/h-yazili-mid.webp", fg: "img/h-yazili-fg.webp" },
  curtain: "#8c3a1c",
  glow: "#f0b45a",
};

const SIZES = {
  Landscape: { width: 1920, height: 1080 },
  Vertical: { width: 1080, height: 1920 },
};

/* Story beats: short films for a big moment that does not depend on the player. */
const KADES: KadesProps = {
  title: "Kadeş Antlaşması",
  caption: "Yaklaşık M.Ö. 1259 · bilinen en eski yazılı barış antlaşmalarından biri",
  backdrop: { sky: "img/h-yazili-sky.webp", mid: "img/h-yazili-mid.webp", fg: "img/h-yazili-fg.webp" },
};

/* G1: the opening film. The animals and where their cities lie on the paper map (percent of the map picture). */
const ANIMALS: [string, string, string, number, number, number, number][] = [
  ["ari", "efes", "ari", 478, 495, 16.1, 63.25],
  ["geyik", "hattusa", "geyik", 417, 640, 46.62, 37.25],
  ["tilki", "gobeklitepe", "tilki", 500, 469, 64.65, 72.25],
  ["leopar", "catalhoyuk", "leopar", 608, 350, 39.12, 66.62],
  ["at", "troya", "at", 537, 539, 11.49, 38],
  ["baykus", "assos", "baykus", 358, 640, 11.91, 43.87],
  ["guvercin", "afrodisias", "guvercin", 463, 640, 21.89, 66.12],
  ["yilan", "bergama", "yilan", 360, 640, 15.43, 48.5],
  ["aslan", "sardes", "aslan", 541, 640, 19.04, 56.37],
  ["kartal", "nemrut", "kartal", 490, 640, 63.9, 62.75],
  ["pegasus", "zeugma", "pegasus", 488, 640, 60.25, 74.38],
  ["kerberos", "hierapolis", "kerberos", 519, 509, 23.56, 63.5],
  ["caretta", "patara", "caretta", 545, 495, 24.4, 84.25],
  ["esek", "gordion", "esek", 522, 622, 35.6, 41.88],
  ["yunus", "phaselis", "yunus", 375, 600, 29.56, 81],
];
const OPENING: OpeningProps = {
  animals: ANIMALS.map(([id, cityId, file, w, h, mapX, mapY]) => ({ id, image: `img/g1/${file}.webp`, plate: `img/g1/plate-${cityId}.webp`, w, h, mapX, mapY })),
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Game">
        <Composition id="G1-Opening" component={OpeningFilm} schema={openingSchema} durationInFrames={720} fps={30} width={1920} height={1080} defaultProps={OPENING} />
        <Composition id="G1-Opening-Vertical" component={OpeningFilm} schema={openingSchema} durationInFrames={720} fps={30} width={1080} height={1920} defaultProps={OPENING} />
      </Folder>
      <Folder name="Beats">
        <Composition id="Beat-KadesTreaty" component={KadesTreaty} schema={kadesSchema} durationInFrames={210} fps={30} width={1920} height={1080} defaultProps={KADES} />
        <Composition id="Beat-KadesTreaty-Vertical" component={KadesTreaty} schema={kadesSchema} durationInFrames={210} fps={30} width={1080} height={1920} defaultProps={KADES} />
      </Folder>
      <Folder name="ActEnding">
        {[
          ["Efes", EFES],
          ["Hattusa", HATTUSA],
        ].flatMap(([name, props]) =>
          (Object.entries(SIZES) as [keyof typeof SIZES, { width: number; height: number }][]).map(([kind, size]) => (
            <Composition
              key={`${name}-${kind}`}
              id={kind === "Landscape" ? `ActEnding-${name}` : `ActEnding-${name}-Vertical`}
              component={ActEnding}
              schema={actEndingSchema}
              durationInFrames={750}
              fps={30}
              {...size}
              defaultProps={props as ActEndingProps}
            />
          )),
        )}
      </Folder>
    </>
  );
};
