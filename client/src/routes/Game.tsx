import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Board } from '../components/Board';
import { Clock } from '../components/Clock';
import { SideGameModal } from '../components/SideGameModal';
import { createSocket, type GameSocket } from '../lib/socket';
import type {
  ClientGameState,
  MoveRequest,
  PlayerColor,
} from '../lib/types';
import { useClock } from '../lib/useClock';

const START_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const useQuery = () => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

const getStoredName = () =>
  window.localStorage.getItem('playerName') ?? '';

const formatRole = (role: PlayerColor | 'spectator') => {
  if (role === 'spectator') {
    return 'Spectator';
  }
  return role === 'white' ? 'White' : 'Black';
};

export const Game = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const query = useQuery();
  const navigate = useNavigate();
  const socketRef = useRef<GameSocket | null>(null);
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [role, setRole] = useState<PlayerColor | 'spectator'>('spectator');
  const [connected, setConnected] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const nameParam = query.get('name') ?? getStoredName();

  useEffect(() => {
    if (!gameId) {
      navigate('/');
      return;
    }
    const socket = createSocket();
    socketRef.current = socket;

    const handleState = (state: ClientGameState) => {
      setGameState(state);
      setBanner(state.status.message ?? null);
    };

    socket.on('connect', () => {
      setConnected(true);
      setError(null);
      joinGame();
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('stateSync', handleState);

    socket.connect();

    return () => {
      socket.off('stateSync', handleState);
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const joinGame = () => {
    if (!socketRef.current || !gameId) {
      return;
    }
    const socket = socketRef.current;
    const name = nameParam || 'Guest';
    setJoining(true);
    socket.emit('join', { gameId, name }, (response) => {
      setJoining(false);
      if (!response) {
        setError('No response from server');
        return;
      }
      if (!response.ok) {
        setError(response.error);
        return;
      }
      const joinedRole = response.result?.role ?? 'spectator';
      setRole(joinedRole);
      window.localStorage.setItem('playerName', name);
    });
  };

  const sendMainMove = (move: MoveRequest) => {
    if (!socketRef.current || !gameId) {
      return;
    }
    socketRef.current.emit(
      'moveMain',
      { gameId, move },
      (response) => {
        if (!response?.ok && response?.error) {
          setError(response.error);
        } else {
          setError(null);
        }
      },
    );
  };

  const sendSideMove = (move: MoveRequest) => {
    if (!socketRef.current || !gameId) {
      return;
    }
    socketRef.current.emit(
      'moveSide',
      { gameId, move },
      (response) => {
        if (!response?.ok && response?.error) {
          setError(response.error);
        } else {
          setError(null);
        }
      },
    );
  };

  const handleResign = () => {
    if (!socketRef.current || !gameId) {
      return;
    }
    socketRef.current.emit('resign', gameId, (response) => {
      if (!response?.ok && response?.error) {
        setError(response.error);
      }
    });
  };

  const handleOfferDraw = () => {
    if (!socketRef.current || !gameId) {
      return;
    }
    socketRef.current.emit('offerDraw', gameId, (response) => {
      if (!response?.ok && response?.error) {
        setError(response.error);
      } else if (response?.ok) {
        setBanner(
          response.result?.accepted
            ? 'Draw agreed.'
            : 'Draw offer sent.',
        );
      }
    });
  };

  const handleDeclineDraw = () => {
    if (!socketRef.current || !gameId) {
      return;
    }
    socketRef.current.emit('declineDraw', gameId, (response) => {
      if (!response?.ok && response?.error) {
        setError(response.error);
      } else if (response?.ok && response.result?.declined) {
        setBanner('Draw offer declined.');
      }
    });
  };

  const mainClock = useClock(gameState?.mainClock);
  const whiteName =
    gameState?.whitePlayer?.name ?? 'White';
  const blackName =
    gameState?.blackPlayer?.name ?? 'Black';
  const statusType = gameState?.status.type ?? 'waiting';
  const canMoveMain =
    role !== 'spectator' &&
    statusType !== 'ended' &&
    statusType !== 'side-duel' &&
    role === gameState?.activeColor;

  const sideActiveColor = gameState?.sideClock?.activeColor ?? null;

  const shareUrl = useMemo(() => {
    if (!gameId || typeof window === 'undefined') {
      return '';
    }
    const base = `${window.location.origin}/game/${gameId}`;
    return nameParam ? `${base}?name=${encodeURIComponent(nameParam)}` : base;
  }, [gameId, nameParam]);

  if (!gameId) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        <header className="flex flex-col justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-xl font-semibold text-emerald-300">
              Game #{gameId}
            </h1>
            <p className="text-sm text-slate-300">
              You are {formatRole(role)} —{' '}
              {connected ? 'Connected' : 'Reconnecting...'}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <div className="text-xs text-slate-400">Share this link</div>
            <code className="rounded bg-slate-800 px-3 py-1 text-sm text-slate-200">
              {shareUrl}
            </code>
          </div>
        </header>

        {banner ? (
          <div className="rounded-md border border-emerald-500/60 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {banner}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-rose-600/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <main className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="flex flex-col gap-6">
            <Board
              fen={gameState?.fen ?? START_FEN}
              playerColor={role === 'spectator' ? 'white' : role}
              turnColor={gameState?.activeColor}
              onMove={canMoveMain ? sendMainMove : undefined}
              disabled={!canMoveMain}
              label="Main Board"
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/60 px-4 py-3">
                <div>
                  <p className="text-sm text-slate-400">White</p>
                  <p className="text-lg font-semibold text-slate-100">
                    {whiteName}
                  </p>
                </div>
                <Clock
                  label="Clock"
                  millis={mainClock.white}
                  active={gameState?.mainClock.activeColor === 'white'}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/60 px-4 py-3">
                <div>
                  <p className="text-sm text-slate-400">Black</p>
                  <p className="text-lg font-semibold text-slate-100">
                    {blackName}
                  </p>
                </div>
                <Clock
                  label="Clock"
                  millis={mainClock.black}
                  active={gameState?.mainClock.activeColor === 'black'}
                />
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <section>
              <h2 className="text-lg font-semibold text-slate-100">
                Status
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                {gameState?.status.message ??
                  (gameState?.status.type === 'waiting'
                    ? 'Waiting for players to join.'
                    : 'Game in progress.')}
              </p>
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Actions
              </h3>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleResign}
                  disabled={
                    role === 'spectator' || statusType === 'ended'
                  }
                  className="rounded-md bg-rose-600/80 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-rose-900/50 disabled:text-rose-200/50"
                >
                  Resign
                </button>
                <button
                  type="button"
                  onClick={handleOfferDraw}
                  disabled={
                    role === 'spectator' ||
                    statusType === 'ended' ||
                    statusType === 'side-duel'
                  }
                  className="rounded-md border border-emerald-500/60 px-3 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
                >
                  Offer Draw
                </button>
                <button
                  type="button"
                  onClick={handleDeclineDraw}
                  disabled={statusType === 'ended'}
                  className="rounded-md border border-slate-600 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-500"
                >
                  Decline Draw
                </button>
              </div>
            </section>
          </aside>
        </main>
      </div>

      {gameState?.sideGameFen && gameState.pendingCapture ? (
        <SideGameModal
          fen={gameState.sideGameFen}
          clock={gameState.sideClock}
          attackerColor={gameState.pendingCapture.attackerColor}
          defenderColor={gameState.pendingCapture.defenderColor}
          playerRole={role}
          onMove={sendSideMove}
          activeColor={sideActiveColor}
          message={gameState.status.message}
        />
      ) : null}

      {joining ? (
        <div className="absolute inset-x-0 bottom-4 flex justify-center">
          <div className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200">
            Joining game…
          </div>
        </div>
      ) : null}
    </div>
  );
};
