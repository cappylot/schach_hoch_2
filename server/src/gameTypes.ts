import { Chess, type PieceSymbol, type Square } from 'chess.js';
import type { ClockSnapshot, CountdownClock } from './clock';
import type { PlayerColor, ColorSymbol } from './types';

type PromotionPiece = Exclude<PieceSymbol, 'p' | 'k'>;

export interface PlayerInfo {
  id: string;
  name: string;
  color: PlayerColor;
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

export interface MainGame {
  chess: Chess;
  clock: CountdownClock;
  pendingCapture?: PendingCapture;
}

export interface SideGame {
  chess: Chess;
  clock: CountdownClock;
  attackerColor: PlayerColor;
  defenderColor: PlayerColor;
  startedAt: number;
}

export interface GameState {
  id: string;
  createdAt: number;
  players: Map<string, PlayerInfo>;
  whitePlayer?: PlayerInfo;
  blackPlayer?: PlayerInfo;
  spectators: Set<string>;
  mainGame: MainGame;
  sideGame?: SideGame;
  statusMessage?: string;
  ended?: boolean;
  pendingDrawOffer?: PlayerColor;
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
