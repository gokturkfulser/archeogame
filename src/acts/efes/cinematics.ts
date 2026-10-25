/* Efes: the films of Act 1. There is no act opening: the title screen and the curtain already open the act. */
import type { Film } from '../../engine/cinematic/film';

export const FILMS: Film[] = [
  {
    id: 'melissa-debut',
    type: 'debut',
    beat: 'The flashlight finds the bee carving: the camera pushes in, cracks of light run over the stone, sparks gather into Melissa, she shakes off the dust, loops round the column and settles by Deniz’s flashlight.',
    seconds: [8, 9],
    tool: 'engine',
    assets: ['characters/melissa/*', 'src/acts/efes/scenes/liman.ts'],
    status: 'built',
  },
  {
    id: 'temple-shadows',
    type: 'beat',
    beat: 'The shadows click into place on the wall and the temple lights up piece by piece from the steps to the roof with rising notes; golden rays burst, Melissa circles the temple, Deniz cheers and the letters ΕΦ rise out of it.',
    seconds: [5, 7],
    tool: 'engine',
    assets: ['src/acts/efes/scenes/artemis.ts'],
    status: 'built',
  },
  {
    id: 'efes-ending',
    type: 'ending',
    beat: 'The four coin pieces (bee, stag, palm, ΕΦ) rise from their scenes with a chime, click into one coin that spins once, Deniz holds it up beside her flashlight while Melissa loops round it, it flies onto the paper map and settles on Efes, which lights up; the curtains close and the next act’s name appears.',
    seconds: [20, 25],
    tool: 'remotion',
    assets: ['video/src/ActEnding (Remotion template, composition ActEnding-Efes and -Vertical)', 'public/assets/efes/ending.webm / ending.mp4 / ending-poster.webp'],
    status: 'built',
  },
];
