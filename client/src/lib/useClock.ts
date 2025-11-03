import { useEffect, useMemo, useState } from 'react';
import type { ClockSnapshot, PlayerColor } from './types';

const computeRemaining = (
  snapshot: ClockSnapshot,
  color: PlayerColor,
  now: number,
) => {
  let remaining = snapshot[color];
  if (
    snapshot.running &&
    snapshot.activeColor === color
  ) {
    remaining -= now - snapshot.lastUpdated;
  }
  return Math.max(0, remaining);
};

export const useClock = (snapshot?: ClockSnapshot, tickMs = 200) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(
      () => setNow(Date.now()),
      tickMs,
    );
    return () => clearInterval(interval);
  }, [tickMs]);

  return useMemo(() => {
    if (!snapshot) {
      return {
        white: 0,
        black: 0,
        activeColor: null,
      };
    }
    return {
      white: computeRemaining(snapshot, 'white', now),
      black: computeRemaining(snapshot, 'black', now),
      activeColor: snapshot.activeColor,
    };
  }, [snapshot, now]);
};
