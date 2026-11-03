/* Sardes: the films of the second perde (Ege ve Kuzey stage). The opening film is optional and short: it plays before the first scene. */
import type { Film } from '../../engine/cinematic/film';

export const FILMS: Film[] = [
  {
    id: 'sardes-opening',
    type: 'opening',
    beat: 'The curtain opens on Sart at sunset: the pale acropolis cliff, the Artemis columns, Bozdağ behind, the Paktolos glinting; gold dust drifts through the frame to the title card “Kroisos’un Altını”. Skippable.',
    seconds: [8, 10],
    tool: 'remotion',
    assets: ['video/src/Opening (new, data driven)', 'public/assets/sardes/opening.webm / mp4 / poster'],
    status: 'planned',
  },
  {
    id: 'alyat-debut',
    type: 'debut',
    beat: 'In the Paktolos scene the seven caught flakes burst from Deniz’s hand, swirl in a vortex above the river and gather into Alyat, a paper lion with a mane of gold flakes; the camera pushes in, a flash, he shakes his mane and the first line is his.',
    seconds: [5, 8],
    tool: 'engine',
    assets: ['src/engine/alyat.ts', 'src/acts/sardes/scenes/paktolos.ts'],
    status: 'built',
  },
  {
    id: 'kroisos-golge-oyunu',
    type: 'beat',
    beat: 'In the Bin Tepe burial chamber the lit wall becomes a Karagöz shadow play: Kroisos asks the oracle, “büyük bir imparatorluk yıkılacak”, he crosses the river, and the empire that falls is his own. Hedged captions; Alyat and Deniz comment after.',
    seconds: [7, 9],
    tool: 'remotion',
    assets: ['video/src/Beat/KroisosShadowPlay.tsx', 'public/assets/sardes/kroisos.webm / mp4 / poster'],
    status: 'planned',
  },
  {
    id: 'sardes-ending',
    type: 'ending',
    beat: 'Shared template: the four pieces (altın damla, aslan başı, boğa, zımba izi) rise and click into one coin that spins (lion and bull facing each other on the front, punch marks on the back), Deniz holds it up in her beam with Alyat beside her, it flies onto the paper map and settles on Sardes, which lights up; curtains close and the next act’s name appears.',
    seconds: [20, 25],
    tool: 'remotion',
    assets: ['video/src/ActEnding (add guide "alyat")', 'public/assets/sardes/ending.webm / mp4 / poster'],
    status: 'planned',
  },
];
