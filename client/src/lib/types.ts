import type { PieceSymbol, Square } from 'chess.js';

export type PromotionPiece = Exclude<PieceSymbol, 'p' | 'k'>;

export type PlayerColor = 'white' | 'black';

export interface PlayerInfo {
  id: string;
  name: string;
  color: PlayerColor;
}

export interface ClockSnapshot {
  white: number;
  black: number;
  activeColor: PlayerColor | null;
  running: boolean;
  lastUpdated: number;
}

export interface PendingCapture {
  move: {
    from: Square;
    to: Square;
    promotion?: PromotionPiece;
  };
  attackerColor: PlayerColor;
  defenderColor: PlayerColor;
  snapshotFen: string;
  capturedPiece?: string;
  isEnPassant: boolean;
  capturedSquare?: Square;
  promotion?: PromotionPiece;
}

export interface ClientGameState {
  id: string;
  fen: string;
  sideGameFen?: string;
  mainClock: ClockSnapshot;
  sideClock?: ClockSnapshot;
  activeColor: PlayerColor;
  pendingCapture?: PendingCapture;
  status: {
    type: 'waiting' | 'ongoing' | 'side-duel' | 'ended';
    message?: string;
  };
  whitePlayer?: PlayerInfo;
  blackPlayer?: PlayerInfo;
}

export interface MoveRequest {
  from: Square;
  to: Square;
  promotion?: PromotionPiece;
}
