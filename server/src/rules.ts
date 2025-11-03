import { Chess } from 'chess.js';
import { PLAYER_COLOR_TO_SYMBOL, type PlayerColor } from './types';

export const STANDARD_START_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

export const createMainChess = () => new Chess();

export const createSideDuelChess = (attacker: PlayerColor) => {
  const chess = new Chess();
  const fen = `${STANDARD_START_FEN} ${PLAYER_COLOR_TO_SYMBOL[attacker]} KQkq - 0 1`;
  chess.load(fen);
  return chess;
};
