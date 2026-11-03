/* Opening scene: Deniz finds the old book. Registers the scene and starts the engine; there are no coins here.
   The first time, the opening film “Dedenin Gölge Oyunu” (G1, rendered with Remotion from /video) plays before the
   room opens; afterwards it can be watched again from the map. */
import { boot } from '../../engine/game';
import { configureCollectibles } from '../../engine/hud';
import { playOpeningFilm, openingSeen, markOpeningSeen } from '../../engine/cinematic/opening-film';
import { Calisma } from './scenes/calisma';
import { TEXT } from './text';

configureCollectibles({ ids: [], names: {}, draw: () => {}, label: () => '', cardNote: '' });

boot([new Calisma()], TEXT.where, 'melissa', {
  intro: async () => {
    if (openingSeen()) return;
    markOpeningSeen();
    await playOpeningFilm();
  },
});
