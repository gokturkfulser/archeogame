/* Act 2 of the Ege stage: Sardes, “Kroisos’un Altını”. Registers the scenes and the coin collectibles, then starts the engine. */
import { boot } from '../../engine/game';
import { configureCollectibles, drawCoins } from '../../engine/hud';
import { PIECES, drawPiece, useCoinImages } from './emblems';
import { Paktolos } from './scenes/paktolos';
import { TEXT } from './text';

configureCollectibles({
  ids: PIECES,
  names: TEXT.collectibles.names,
  draw: drawPiece,
  label: TEXT.collectibles.label,
  cardNote: TEXT.collectibles.cardNote,
});

useCoinImages(drawCoins);

boot([new Paktolos()], TEXT.where, 'alyat');
