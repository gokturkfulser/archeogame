/* Hattuşa: the films of Act 2. There is no act opening: the title screen and the curtain already open the act. */
import type { Film } from '../../engine/cinematic/film';

export const FILMS: Film[] = [
  {
    id: 'kurunta-debut',
    type: 'debut',
    beat: 'The four reliefs of the Lion Gate are read; the heavy stones grind apart and two warm lights come on in the dark of the gateway: Kurunta’s antlers. (To be redone as a proper in-engine debut; today it is the scene’s existing opening.)',
    seconds: [5, 8],
    tool: 'engine',
    assets: ['src/acts/hattusa/scenes/kapi.ts', 'src/engine/kurunta.ts'],
    status: 'planned',
  },
  {
    id: 'kades-treaty',
    type: 'beat',
    beat: 'Plays in the middle of the Yazılıkaya dialogue: Hattušili and Ramesses, as glowing shadow puppets, walk in from the two edges and meet; the silver tablets change hands with a chime, light bursts between them, the twelve witness gods appear along the rock one by one and olive branches grow round the tablets; caption “Kadeş Antlaşması, yaklaşık M.Ö. 1259”.',
    seconds: [6, 8],
    tool: 'remotion',
    assets: ['video/src/Beat/KadesTreaty.tsx (compositions Beat-KadesTreaty and -Vertical)', 'public/assets/hattusa/kades.webm / kades.mp4 / kades-poster.webp'],
    status: 'built',
  },
  {
    id: 'hattusa-ending',
    type: 'ending',
    beat: 'The four coin pieces (lion, sun, clay tablet, god) rise from their scenes with a chime, click into one coin that spins once (stag on the front, the Kadesh handshake on the back), Deniz holds it up in her flashlight beam while Kurunta stands beside her with his antlers glowing, it flies onto the paper map and settles on Hattuşa, which lights up; the curtains close and the next act’s name appears.',
    seconds: [20, 25],
    tool: 'remotion',
    assets: ['video/src/ActEnding (Remotion template, composition ActEnding-Hattusa and -Vertical)', 'public/assets/hattusa/ending.webm / ending.mp4 / ending-poster.webp'],
    status: 'built',
  },
];
