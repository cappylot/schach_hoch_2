import type { Piece } from '../lib/chessWrapper';
import whitePawn from '../assets/pieces/wp.png';
import whiteKnight from '../assets/pieces/wn.png';
import whiteBishop from '../assets/pieces/wb.png';
import whiteRook from '../assets/pieces/wr.png';
import whiteQueen from '../assets/pieces/wq.png';
import whiteKing from '../assets/pieces/wk.png';
import blackPawn from '../assets/pieces/bp.png';
import blackKnight from '../assets/pieces/bn.png';
import blackBishop from '../assets/pieces/bb.png';
import blackRook from '../assets/pieces/br.png';
import blackQueen from '../assets/pieces/bq.png';
import blackKing from '../assets/pieces/bk.png';

const spriteMap = {
  white: {
    p: whitePawn,
    n: whiteKnight,
    b: whiteBishop,
    r: whiteRook,
    q: whiteQueen,
    k: whiteKing,
  },
  black: {
    p: blackPawn,
    n: blackKnight,
    b: blackBishop,
    r: blackRook,
    q: blackQueen,
    k: blackKing,
  },
} as const;

export const PieceIcon = ({ piece }: { piece: Piece }) => {
  const src = spriteMap[piece.color][piece.type];
  return (
    <img
      src={src}
      alt={`${piece.color} ${piece.type}`}
      className="max-h-[72%] max-w-[72%] select-none"
      draggable={false}
    />
  );
};
