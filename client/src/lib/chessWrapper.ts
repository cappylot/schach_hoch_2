import { Chess, type Square } from 'chess.js';
import type { PlayerColor } from './types';

export type PieceType =
  | 'p'
  | 'n'
  | 'b'
  | 'r'
  | 'q'
  | 'k';

export interface Piece {
  type: PieceType;
  color: PlayerColor;
}

export interface BoardSquare {
  square: Square;
  piece: Piece | null;
}

export type BoardState = BoardSquare[][];

export const loadChess = (fen: string) => {
  const chess = new Chess();
  chess.load(fen);
  return chess;
};

export const buildBoardState = (fen: string): BoardState => {
  const chess = loadChess(fen);
  const board = chess.board();
  return board.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      const file = String.fromCharCode('a'.charCodeAt(0) + colIndex);
      const rank = (8 - rowIndex).toString();
      const square = `${file}${rank}` as Square;
      if (!cell) {
        return { square, piece: null };
      }
      return {
        square,
        piece: {
          type: cell.type,
          color: cell.color === 'w' ? 'white' : 'black',
        },
      };
    }),
  );
};

export const isPromotionMove = (
  from: Square,
  to: Square,
  piece: Piece | null,
) => {
  if (!piece || piece.type !== 'p') {
    return false;
  }
  const targetRank = Number(to[1]);
  return (
    (piece.color === 'white' && targetRank === 8) ||
    (piece.color === 'black' && targetRank === 1)
  );
};
