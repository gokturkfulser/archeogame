/* Başlangıç (the prologue): the game-level opening film G1. The other game-level cinematics (G2–G6) are in-engine and live
   in src/engine/cinematic/. */
import type { Film } from '../../engine/cinematic/film';

export const FILMS: Film[] = [
  {
    id: 'g1-dedenin-golge-oyunu',
    type: 'opening',
    beat: 'A Karagöz screen lit in the dark study: the grandfather, a modern paper-cut figure in an armchair, opens the old book; fifteen animals leap out as paper shadows, the screen turns into the paper map and each animal flies to its city and becomes its coin; lightning, thunder, the power cuts, and Deniz’s flashlight clicks on in the dark room, where the prologue begins. Plays once on the first visit; watchable again from the map.',
    seconds: [24, 24],
    tool: 'remotion',
    assets: [
      'video/src/G1/OpeningFilm.tsx (compositions G1-Opening and -Vertical)',
      'assets-src/baslangic/dede-C-cut.png (Higgsfield nano_banana_pro + remove_background), animals-1..3.png (nano_banana_pro) cut out by scripts/cut-g1.mjs',
      'public/assets/baslangic/g1-opening.webm / g1-opening.mp4 / g1-opening-poster.webp',
    ],
    status: 'built',
  },
];
