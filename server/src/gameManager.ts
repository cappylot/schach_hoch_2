import { Chess, type Square } from 'chess.js';
import { CountdownClock } from './clock';
import {
  ClientGameState,
  GameState,
  MoveRequest,
  PendingCapture,
} from './gameTypes';
import {
  PlayerColor,
  PLAYER_COLOR_TO_SYMBOL,
  SYMBOL_TO_PLAYER_COLOR,
  oppositeColor,
} from './types';
import {
  createMainChess,
  createSideDuelChess,
} from './rules';

const MAIN_INITIAL_MS = 15 * 60 * 1000;
const MAIN_INCREMENT_MS = 2 * 1000;
const SIDE_ATTACKER_MS = 5 * 60 * 1000;
const SIDE_DEFENDER_MS = 60 * 1000;

export class GameManager {
  private games = new Map<string, GameState>();

  getOrCreateGame(id: string): GameState {
    const existing = this.games.get(id);
    if (existing) {
      return existing;
    }

    const chess = createMainChess();
    const clock = new CountdownClock(
      {
        white: MAIN_INITIAL_MS,
        black: MAIN_INITIAL_MS,
      },
      MAIN_INCREMENT_MS,
    );

    const game: GameState = {
      id,
      createdAt: Date.now(),
      players: new Map(),
      spectators: new Set(),
      mainGame: {
        chess,
        clock,
      },
    };

    this.games.set(id, game);
    return game;
  }

  getGame(id: string): GameState | undefined {
    return this.games.get(id);
  }

  joinGame(gameId: string, socketId: string, name: string) {
    const game = this.getOrCreateGame(gameId);

    let player = game.players.get(socketId);
    if (!player) {
      const availableColor = this.pickAvailableColor(game);
      if (availableColor) {
        player = {
          id: socketId,
          name,
          color: availableColor,
        };
        game.players.set(socketId, player);
        if (availableColor === 'white') {
          game.whitePlayer = player;
        } else {
          game.blackPlayer = player;
        }
      } else {
        game.spectators.add(socketId);
        return { game, role: 'spectator' as const };
      }
    } else {
      player.name = name;
    }

    return { game, role: player.color };
  }

  leaveGame(gameId: string, socketId: string) {
    const game = this.games.get(gameId);
    if (!game) {
      return;
    }
    const player = game.players.get(socketId);
    if (player) {
      game.players.delete(socketId);
      if (game.whitePlayer?.id === socketId) {
        game.whitePlayer = undefined;
      }
      if (game.blackPlayer?.id === socketId) {
        game.blackPlayer = undefined;
      }
    }
    if (game.spectators.has(socketId)) {
      game.spectators.delete(socketId);
    }
  }

  handleMainMove(gameId: string, socketId: string, move: MoveRequest) {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }
    if (game.ended) {
      throw new Error('Game already finished');
    }
    if (game.sideGame) {
      throw new Error('Side duel in progress');
    }
    const player = game.players.get(socketId);
    if (!player) {
      throw new Error('Player not part of this game');
    }

    const chess = game.mainGame.chess;
    const turn = chess.turn();
    const playerColor = PLAYER_COLOR_TO_SYMBOL[player.color];
    if (turn !== playerColor) {
      throw new Error('Not your turn');
    }

    if (game.mainGame.pendingCapture) {
      throw new Error('Capture resolution pending');
    }

    const pending = this.buildPendingCapture(game, player.color, move);
    if (pending) {
      game.mainGame.pendingCapture = pending;
      this.startSideGame(game, pending);
      game.statusMessage = 'Capture challenged!';
      return { type: 'side-duel-started' as const };
    }

    // Non-capture move, apply immediately
    const applied = chess.move(move);
    if (!applied) {
      throw new Error('Illegal move');
    }

    this.afterMainMove(game, player.color);
    return { type: 'move-applied' as const };
  }

  handleSideMove(gameId: string, socketId: string, move: MoveRequest) {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }
    const side = game.sideGame;
    if (!side) {
      throw new Error('No side duel in progress');
    }
    const player = game.players.get(socketId);
    if (!player) {
      throw new Error('Player not part of this game');
    }
    const chess = side.chess;
    const turnSymbol = chess.turn();
    const turnColor = SYMBOL_TO_PLAYER_COLOR[turnSymbol];
    if (player.color !== turnColor) {
      throw new Error('Not your turn');
    }

    const flagged = side.clock.getFlagged();
    if (flagged) {
      const winner = oppositeColor(flagged);
      this.finishSideGame(game, winner, 'time');
      return { type: 'timeout', flagged };
    }

    const applied = chess.move(move);
    if (!applied) {
      throw new Error('Illegal move');
    }

    side.clock.completeMove(player.color);

    const postFlagged = side.clock.getFlagged();
    if (postFlagged) {
      const winner = oppositeColor(postFlagged);
      this.finishSideGame(game, winner, 'time');
      return { type: 'timeout', flagged: postFlagged };
    }

    if (chess.isCheckmate()) {
      const winner = oppositeColor(
        SYMBOL_TO_PLAYER_COLOR[chess.turn()],
      );
      this.finishSideGame(game, winner, 'checkmate');
      return { type: 'checkmate', winner };
    }

    if (
      chess.isStalemate() ||
      chess.isDraw() ||
      chess.isInsufficientMaterial() ||
      chess.isThreefoldRepetition()
    ) {
      this.finishSideGame(game, null, 'draw');
      return { type: 'draw' };
    }

    return { type: 'move-applied' as const };
  }

  resign(gameId: string, socketId: string) {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }
    const player = game.players.get(socketId);
    if (!player) {
      throw new Error('Player not part of this game');
    }

    this.concludeGame(
      game,
      `${player.color} resigned`,
    );
    return { winner: oppositeColor(player.color) };
  }

  offerDraw(gameId: string, socketId: string) {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }
    if (game.ended) {
      throw new Error('Game already finished');
    }
    const player = game.players.get(socketId);
    if (!player) {
      throw new Error('Player not part of this game');
    }
    if (game.sideGame) {
      throw new Error('Cannot offer draw during side duel');
    }

    if (
      game.pendingDrawOffer &&
      game.pendingDrawOffer !== player.color
    ) {
      game.pendingDrawOffer = undefined;
      this.concludeGame(game, 'Draw agreed');
      return { accepted: true };
    }

    game.pendingDrawOffer = player.color;
    game.statusMessage = `${player.color} offers a draw`;
    return { accepted: false };
  }

  declineDraw(gameId: string, socketId: string) {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }
    const player = game.players.get(socketId);
    if (!player) {
      throw new Error('Player not part of this game');
    }
    if (
      game.pendingDrawOffer &&
      game.pendingDrawOffer !== player.color
    ) {
      game.pendingDrawOffer = undefined;
      game.statusMessage = `${player.color} declined the draw offer`;
      return { declined: true };
    }
    return { declined: false };
  }

  getClientState(gameId: string): ClientGameState {
    const game = this.getOrCreateGame(gameId);
    const mainChess = game.mainGame.chess;
    const status = this.buildStatus(game);
    const state: ClientGameState = {
      id: game.id,
      fen: mainChess.fen(),
      mainClock: game.mainGame.clock.snapshot(),
      activeColor: SYMBOL_TO_PLAYER_COLOR[mainChess.turn()],
      status,
      whitePlayer: game.whitePlayer,
      blackPlayer: game.blackPlayer,
    };
    if (game.mainGame.pendingCapture) {
      state.pendingCapture = game.mainGame.pendingCapture;
    }
    if (game.sideGame) {
      state.sideGameFen = game.sideGame.chess.fen();
      state.sideClock = game.sideGame.clock.snapshot();
    }
    return state;
  }

  tick() {
    for (const game of this.games.values()) {
      if (game.ended) {
        continue;
      }
      const flagged = game.mainGame.clock.getFlagged();
      if (flagged) {
        this.concludeGame(game, `${flagged} flagged`);
      }
      if (game.sideGame) {
        const sideFlagged = game.sideGame.clock.getFlagged();
        if (sideFlagged) {
          const winner = oppositeColor(sideFlagged);
          this.finishSideGame(game, winner, 'time');
        }
      }
    }
  }

  getActiveGames(): GameState[] {
    return Array.from(this.games.values());
  }

  private buildStatus(
    game: GameState,
  ): ClientGameState['status'] {
    if (game.ended) {
      return {
        type: 'ended',
        message: game.statusMessage,
      };
    }
    if (!game.whitePlayer || !game.blackPlayer) {
      return {
        type: 'waiting',
        message: 'Waiting for players',
      };
    }
    if (game.sideGame) {
      return {
        type: 'side-duel',
        message:
          game.statusMessage ?? 'Capture challenged!',
      };
    }
    return {
      type: 'ongoing',
      message: game.statusMessage,
    };
  }

  private pickAvailableColor(
    game: GameState,
  ): PlayerColor | null {
    if (!game.whitePlayer) {
      return 'white';
    }
    if (!game.blackPlayer) {
      return 'black';
    }
    return null;
  }

  private buildPendingCapture(
    game: GameState,
    attackerColor: PlayerColor,
    move: MoveRequest,
  ): PendingCapture | null {
    const chess = game.mainGame.chess;
    const snapshotFen = chess.fen();
    const simulation = new Chess(snapshotFen);
    const applied = simulation.move(move);
    if (!applied) {
      return null;
    }
    if (!applied.captured) {
      return null;
    }

    const defenderColor = oppositeColor(attackerColor);
    const pending: PendingCapture = {
      move: { ...move },
      attackerColor,
      defenderColor,
      snapshotFen,
      capturedPiece: applied.captured,
      isEnPassant: applied.flags.includes('e'),
      promotion: move.promotion,
    };

    if (pending.isEnPassant) {
      const file = move.to[0];
      const rank = Number(move.to[1]);
      const offset = attackerColor === 'white' ? -1 : 1;
      const capturedRank = rank + offset;
      if (capturedRank >= 1 && capturedRank <= 8) {
        pending.capturedSquare = `${file}${capturedRank}` as Square;
      }
    }

    return pending;
  }

  private startSideGame(game: GameState, pending: PendingCapture) {
    const attackerColor = pending.attackerColor;
    const defenderColor = pending.defenderColor;
    const chess = createSideDuelChess(attackerColor);

    const clock = new CountdownClock({
      white:
        attackerColor === 'white'
          ? SIDE_ATTACKER_MS
          : SIDE_DEFENDER_MS,
      black:
        attackerColor === 'black'
          ? SIDE_ATTACKER_MS
          : SIDE_DEFENDER_MS,
    });
    clock.resume(attackerColor);

    game.sideGame = {
      chess,
      clock,
      attackerColor,
      defenderColor,
      startedAt: Date.now(),
    };

    game.mainGame.clock.pause();
  }

  private finishSideGame(
    game: GameState,
    winner: PlayerColor | null,
    reason: 'checkmate' | 'time' | 'draw',
  ) {
    const side = game.sideGame;
    if (!side || !game.mainGame.pendingCapture) {
      return;
    }
    const pending = game.mainGame.pendingCapture;

    const defenderWon =
      winner !== null && winner === side.defenderColor;
    const applied = this.resolvePendingCapture(
      game,
      pending,
      defenderWon,
    );

    const attacker = pending.attackerColor;
    this.afterMainMove(game, attacker);

    if (defenderWon && applied.inverted) {
      game.statusMessage =
        'Defender won — capture reversed!';
    } else if (defenderWon) {
      game.statusMessage =
        'Defender win but inversion illegal — capture stands.';
    } else if (winner === side.attackerColor) {
      game.statusMessage =
        'Attacker won — capture stands!';
    } else if (reason === 'draw') {
      game.statusMessage = 'Side duel drawn — capture stands.';
    } else {
      game.statusMessage = 'Side duel resolved.';
    }

    game.sideGame = undefined;
    game.mainGame.pendingCapture = undefined;
  }

  private resolvePendingCapture(
    game: GameState,
    pending: PendingCapture,
    defenderWon: boolean,
  ): { inverted: boolean } {
    const chess = game.mainGame.chess;
    const attackerMove = pending.move;

    if (!defenderWon) {
      const res = chess.move(attackerMove);
      if (!res) {
        throw new Error('Failed to apply capture');
      }
      return { inverted: false };
    }

    const defenderFrom: Square =
      pending.isEnPassant && pending.capturedSquare
        ? pending.capturedSquare
        : pending.move.to;

    const defenderMove: MoveRequest = {
      from: defenderFrom,
      to: pending.move.from,
    };

    const simulation = new Chess(chess.fen());
    // Attempt inversion
    const result = simulation.move(defenderMove);
    if (result) {
      const applied = chess.move(defenderMove);
      if (!applied) {
        throw new Error('Unexpected failure applying inversion');
      }
      return { inverted: true };
    }

    // Fallback to original capture
    const original = chess.move(attackerMove);
    if (!original) {
      throw new Error('Failed to apply fallback capture');
    }
    return { inverted: false };
  }

  private afterMainMove(
    game: GameState,
    movingColor: PlayerColor,
  ) {
    game.mainGame.clock.completeMove(movingColor);
    const chess = game.mainGame.chess;

    if (chess.isCheckmate()) {
      const winner = oppositeColor(
        SYMBOL_TO_PLAYER_COLOR[chess.turn()],
      );
      this.concludeGame(
        game,
        `Checkmate — ${winner} wins`,
      );
      return;
    }

    if (chess.isStalemate()) {
      this.concludeGame(game, 'Stalemate — draw');
      return;
    }

    if (
      chess.isDraw() ||
      chess.isInsufficientMaterial() ||
      chess.isThreefoldRepetition()
    ) {
      this.concludeGame(game, 'Draw');
      return;
    }

    const nextTurn = chess.turn();
    const nextColor = SYMBOL_TO_PLAYER_COLOR[nextTurn];
    if (game.mainGame.clock.snapshot().activeColor !== nextColor) {
      game.mainGame.clock.resume(nextColor);
    }
  }

  private concludeGame(game: GameState, message: string) {
    game.ended = true;
    game.statusMessage = message;
    game.mainGame.clock.pause();
    if (game.sideGame) {
      game.sideGame.clock.pause();
    }
    game.sideGame = undefined;
    game.mainGame.pendingCapture = undefined;
    game.pendingDrawOffer = undefined;
  }
}

export const gameManager = new GameManager();
