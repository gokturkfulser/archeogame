/* Act 1: Efes. Registers the scenes and the coin collectibles, then starts the engine. */
import { boot } from '../../engine/game';
import { configureCollectibles, drawCoins } from '../../engine/hud';
import { PIECES, drawPiece, useCoinImages } from './emblems';
import { Artemis } from './scenes/artemis';
import { Kutuphane } from './scenes/kutuphane';
import { Liman } from './scenes/liman';
import { Tiyatro } from './scenes/tiyatro';
import { TEXT } from './text';

configureCollectibles({
  ids: PIECES,
  names: TEXT.collectibles.names,
  draw: drawPiece,
  label: TEXT.collectibles.label,
  cardNote: TEXT.collectibles.cardNote,
});

useCoinImages(drawCoins);

boot([new Liman(), new Tiyatro(), new Kutuphane(), new Artemis()], TEXT.where);
