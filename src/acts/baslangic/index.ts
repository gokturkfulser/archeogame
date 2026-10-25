/* Opening scene: Deniz finds the old book. Registers the scene and starts the engine; there are no coins here. */
import { boot } from '../../engine/game';
import { configureCollectibles } from '../../engine/hud';
import { Calisma } from './scenes/calisma';
import { TEXT } from './text';

configureCollectibles({ ids: [], names: {}, draw: () => {}, label: () => '', cardNote: '' });

boot([new Calisma()], TEXT.where);
