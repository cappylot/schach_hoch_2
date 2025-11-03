import { useEffect, useMemo, useState } from 'react';
import { Chess, type Move, type Square } from 'chess.js';
import {
  buildBoardState,
  loadChess,
  type BoardState,
} from '../lib/chessWrapper';
import type {
  MoveRequest,
  PlayerColor,
  PromotionPiece,
} from '../lib/types';
import { PieceIcon } from './PieceIcon';

interface BoardProps {
  fen: string;
  playerColor?: PlayerColor;
  turnColor?: PlayerColor;
  onMove?: (move: MoveRequest) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
  maxWidthClass?: string;
}

interface PendingPromotion {
  from: Square;
  to: Square;
  options: PromotionPiece[];
}

const squareColor = (index: number, row: number) =>
  (index + row) % 2 === 0 ? 'bg-board-light text-slate-900' : 'bg-board-dark text-slate-900';

export const Board = ({
  fen,
  playerColor = 'white',
  turnColor,
  onMove,
  disabled,
  label,
  className,
  maxWidthClass = 'max-w-[640px]',
}: BoardProps) => {
  const orientation = playerColor;
  const chess = useMemo(() => loadChess(fen), [fen]);
  const [selected, setSelected] = useState<Square | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);

  useEffect(() => {
    setSelected(null);
    setMoves([]);
    setPendingPromotion(null);
  }, [fen]);

  const board: BoardState = useMemo(() => buildBoardState(fen), [fen]);
  const orientedBoard =
    orientation === 'white'
      ? board
      : [...board].reverse().map((row) => [...row].reverse());

  const isInteractive =
    !!onMove && !disabled && playerColor === turnColor;

  const handleSquareClick = (square: Square) => {
    if (!isInteractive) {
      return;
    }

    if (pendingPromotion) {
      return;
    }

    const piece = chess.get(square);
    if (selected === square) {
      setSelected(null);
      setMoves([]);
      return;
    }

    if (selected) {
      const candidate = moves.filter((move) => move.to === square);
      if (candidate.length === 0) {
        setSelected(null);
        setMoves([]);
        if (piece && piece.color === (playerColor === 'white' ? 'w' : 'b')) {
          prepareMoves(square);
        }
        return;
      }

      const requiresPromotion = candidate.some((move) => move.promotion);
      if (requiresPromotion) {
        const options = candidate
          .map((move) => move.promotion as PromotionPiece | undefined)
          .filter((value): value is PromotionPiece => Boolean(value));
        setPendingPromotion({ from: selected, to: square, options });
        return;
      }

      submitMove({ from: selected, to: square });
      return;
    }

    if (!piece) {
      return;
    }
    const pieceColor = piece.color === 'w' ? 'white' : 'black';
    if (pieceColor !== playerColor) {
      return;
    }
    prepareMoves(square);
  };

  const prepareMoves = (square: Square) => {
    const instance = new Chess(chess.fen());
    const legalMoves = instance.moves({ square, verbose: true });
    setSelected(square);
    setMoves(legalMoves);
  };

  const submitMove = (move: MoveRequest) => {
    setSelected(null);
    setMoves([]);
    setPendingPromotion(null);
    onMove?.(move);
  };

  const onPromotionSelect = (promotion: PromotionPiece) => {
    if (!pendingPromotion) {
      return;
    }
    submitMove({
      from: pendingPromotion.from,
      to: pendingPromotion.to,
      promotion,
    });
  };

  const highlightSquares = new Set<string>(
    moves.map((move) => move.to),
  );

  return (
    <div className={`flex flex-col gap-2 ${className ?? ''}`}>
      {label ? (
        <div className="text-center text-sm uppercase tracking-wide text-slate-400">
          {label}
        </div>
      ) : null}
      <div className={`relative mx-auto w-full ${maxWidthClass} border border-slate-700`}>
        <div className="grid aspect-square grid-cols-8">
          {orientedBoard.map((row, rowIndex) =>
            row.map((square, colIndex) => {
              const isSelected = square.square === selected;
              const isHighlight = highlightSquares.has(square.square);
              const baseColor = squareColor(colIndex, rowIndex);
              return (
                <button
                  key={square.square}
                  type="button"
                  onClick={() => handleSquareClick(square.square)}
                  className={`flex aspect-square items-center justify-center transition ${
                    baseColor
                  } ${
                    isSelected
                      ? 'ring-4 ring-emerald-400/60'
                      : isHighlight
                      ? 'ring-2 ring-emerald-300/70'
                      : 'ring-0'
                  } ${isInteractive ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {square.piece ? (
                    <PieceIcon piece={square.piece} />
                  ) : null}
                </button>
              );
            }),
          )}
        </div>
        {pendingPromotion ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
            <div className="rounded-md border border-slate-700 bg-slate-800 p-4">
              <p className="mb-2 text-sm text-slate-200">
                Choose promotion piece
              </p>
              <div className="flex gap-2">
                {pendingPromotion.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="rounded bg-emerald-600 px-3 py-1 text-sm font-semibold text-white hover:bg-emerald-500"
                    onClick={() => onPromotionSelect(option)}
                  >
                    {option.toUpperCase()}
                  </button>
                ))}
                <button
                  type="button"
                  className="rounded border border-slate-500 px-3 py-1 text-sm text-slate-200 hover:bg-slate-700"
                  onClick={() => setPendingPromotion(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
