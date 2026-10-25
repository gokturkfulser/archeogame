/* Act 2: Hattuşa. Registers the scenes and the coin collectibles, then starts the engine. */
import { boot } from '../../engine/game';
import { configureCollectibles, drawCoins } from '../../engine/hud';
import { PIECES, drawPiece, useCoinImages } from './emblems';
import { Arsiv } from './scenes/arsiv';
import { Kapi } from './scenes/kapi';
import { Tunel } from './scenes/tunel';
import { Yazili } from './scenes/yazili';
import { TEXT } from './text';

configureCollectibles({
  ids: PIECES,
  names: TEXT.collectibles.names,
  draw: drawPiece,
  label: TEXT.collectibles.label,
  cardNote: TEXT.collectibles.cardNote,
});

useCoinImages(drawCoins);

boot([new Kapi(), new Tunel(), new Arsiv(), new Yazili()], TEXT.where, 'kurunta');
