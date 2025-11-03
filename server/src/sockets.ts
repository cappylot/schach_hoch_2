import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { gameManager } from './gameManager';
import type { ClientGameState, MoveRequest } from './gameTypes';
import type { PlayerColor } from './types';

interface JoinPayload {
  gameId: string;
  name: string;
}

interface MovePayload {
  gameId: string;
  move: MoveRequest;
}

const TICK_INTERVAL_MS = 500;

type AckResponse<T = unknown> =
  | { ok: true; result?: T }
  | { ok: false; error: string };

type Ack<T = unknown> = (response: AckResponse<T>) => void;

interface ServerToClientEvents {
  stateSync: (state: ClientGameState) => void;
}

interface ClientToServerEvents {
  join: (payload: JoinPayload, ack?: Ack<{ role: PlayerColor | 'spectator' }>) => void;
  moveMain: (payload: MovePayload, ack?: Ack) => void;
  moveSide: (payload: MovePayload, ack?: Ack) => void;
  resign: (gameId: string, ack?: Ack) => void;
  offerDraw: (gameId: string, ack?: Ack<{ accepted: boolean }>) => void;
  declineDraw: (gameId: string, ack?: Ack<{ declined: boolean }>) => void;
}

interface InterServerEvents {}

interface SocketData {
  gameId?: string;
  role?: PlayerColor | 'spectator';
  name?: string;
}

export const registerSocketHandlers = (server: HttpServer) => {
  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
    cors: {
      origin: '*',
    },
  });

  const broadcastState = (gameId: string) => {
    io.to(gameId).emit('stateSync', gameManager.getClientState(gameId));
  };

  io.on('connection', (socket) => {
    socket.on('join', (payload, ack) => {
      try {
        const { gameId, name } = payload;
        const { role } = gameManager.joinGame(gameId, socket.id, name);
        socket.join(gameId);
        socket.data.gameId = gameId;
        socket.data.name = name;
        socket.data.role = role;
        ack?.({ ok: true, result: { role } });
        broadcastState(gameId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to join game';
        ack?.({ ok: false, error: message });
      }
    });

    socket.on('moveMain', (payload, ack) => {
      try {
        const { gameId, move } = payload;
        const result = gameManager.handleMainMove(gameId, socket.id, move);
        ack?.({ ok: true, result });
        broadcastState(gameId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to play move';
        ack?.({ ok: false, error: message });
      }
    });

    socket.on('moveSide', (payload, ack) => {
      try {
        const { gameId, move } = payload;
        const result = gameManager.handleSideMove(gameId, socket.id, move);
        ack?.({ ok: true, result });
        broadcastState(gameId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to play side move';
        ack?.({ ok: false, error: message });
      }
    });

    socket.on('resign', (gameId, ack) => {
      try {
        const result = gameManager.resign(gameId, socket.id);
        ack?.({ ok: true, result });
        broadcastState(gameId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to resign';
        ack?.({ ok: false, error: message });
      }
    });

    socket.on('offerDraw', (gameId, ack) => {
      try {
        const result = gameManager.offerDraw(gameId, socket.id);
        ack?.({ ok: true, result });
        broadcastState(gameId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to offer draw';
        ack?.({ ok: false, error: message });
      }
    });

    socket.on('declineDraw', (gameId, ack) => {
      try {
        const result = gameManager.declineDraw(gameId, socket.id);
        ack?.({ ok: true, result });
        broadcastState(gameId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to decline draw';
        ack?.({ ok: false, error: message });
      }
    });

    socket.on('disconnect', () => {
      const gameId = socket.data.gameId;
      if (typeof gameId === 'string') {
        gameManager.leaveGame(gameId, socket.id);
        broadcastState(gameId);
      }
    });
  });

  const interval = setInterval(() => {
    gameManager.tick();
    for (const game of gameManager.getActiveGames()) {
      broadcastState(game.id);
    }
  }, TICK_INTERVAL_MS);

  return { io, interval };
};
