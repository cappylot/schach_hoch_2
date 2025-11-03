import { Clock } from './Clock';
import { Board } from './Board';
import type {
  ClockSnapshot,
  MoveRequest,
  PlayerColor,
} from '../lib/types';
import { useClock } from '../lib/useClock';

interface SideGameModalProps {
  fen: string;
  clock?: ClockSnapshot;
  attackerColor: PlayerColor;
  defenderColor: PlayerColor;
  playerRole: PlayerColor | 'spectator';
  onMove: (move: MoveRequest) => void;
  activeColor?: PlayerColor | null;
  message?: string;
}

export const SideGameModal = ({
  fen,
  clock,
  attackerColor,
  defenderColor,
  playerRole,
  onMove,
  activeColor,
  message,
}: SideGameModalProps) => {
  const derivedClock = useClock(clock);

  const playerColor =
    playerRole === 'spectator' ? 'white' : playerRole;
  const canMove =
    playerRole !== 'spectator' &&
    activeColor === playerRole;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/85 px-4 py-8">
      <div className="flex w-full max-w-6xl flex-col gap-6 rounded-2xl border border-emerald-500/50 bg-slate-900/95 p-8 shadow-2xl">
        <div className="text-center">
          <h2 className="text-3xl font-semibold text-emerald-300">
            Capture challenged!
          </h2>
          <p className="mt-2 text-base text-slate-200">
            Attacker ({attackerColor}) vs defender ({defenderColor})
          </p>
          {message ? (
            <p className="mt-3 text-sm text-slate-200">{message}</p>
          ) : null}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr,1.6fr] lg:items-center">
          <div className="flex justify-center">
            <div className="flex w-full max-w-xs flex-col items-center gap-4 rounded-xl border border-slate-700 bg-slate-900/80 p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Duel clocks
              </h3>
              <Clock
                label="White"
                millis={derivedClock.white}
                active={activeColor === 'white'}
              />
              <Clock
                label="Black"
                millis={derivedClock.black}
                active={activeColor === 'black'}
              />
              <p className="text-xs text-slate-400">
                {canMove
                  ? 'It’s your move — win to overturn the capture!'
                  : playerRole === 'spectator'
                  ? 'Spectating side duel.'
                  : 'Waiting for opponent…'}
              </p>
            </div>
          </div>
          <Board
            fen={fen}
            playerColor={playerColor}
            turnColor={activeColor ?? undefined}
            onMove={canMove ? onMove : undefined}
            disabled={!canMove}
            label="Side Duel"
            className="w-full"
            maxWidthClass="max-w-[820px]"
          />
        </div>
      </div>
    </div>
  );
};
