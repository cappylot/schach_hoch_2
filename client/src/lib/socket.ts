import { io, type Socket } from 'socket.io-client';
import type {
  ClientGameState,
  MoveRequest,
  PlayerColor,
} from './types';

const getDefaultServerUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:4000';
  }

  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const hostname = window.location.hostname;
  const port = import.meta.env.VITE_SERVER_PORT ?? '4000';

  return `${protocol}//${hostname}:${port}`;
};

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ?? getDefaultServerUrl();

export interface ServerToClientEvents {
  stateSync: (state: ClientGameState) => void;
}

export type AckResponse<T = unknown> =
  | { ok: true; result?: T }
  | { ok: false; error: string };

export interface ClientToServerEvents {
  join: (
    payload: { gameId: string; name: string },
    ack?: (response: AckResponse<{ role: PlayerColor | 'spectator' }>) => void,
  ) => void;
  moveMain: (
    payload: { gameId: string; move: MoveRequest },
    ack?: (response: AckResponse) => void,
  ) => void;
  moveSide: (
    payload: { gameId: string; move: MoveRequest },
    ack?: (response: AckResponse) => void,
  ) => void;
  resign: (
    gameId: string,
    ack?: (response: AckResponse) => void,
  ) => void;
  offerDraw: (
    gameId: string,
    ack?: (response: AckResponse<{ accepted: boolean }>) => void,
  ) => void;
  declineDraw: (
    gameId: string,
    ack?: (response: AckResponse<{ declined: boolean }>) => void,
  ) => void;
}

export type GameSocket = Socket<
  ServerToClientEvents,
  ClientToServerEvents
>;

export const createSocket = (): GameSocket =>
  io(SERVER_URL, {
    autoConnect: false,
    transports: ['websocket'],
  });
