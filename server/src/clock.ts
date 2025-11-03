import { oppositeColor, type PlayerColor } from './types';

export interface ClockSnapshot {
  white: number;
  black: number;
  activeColor: PlayerColor | null;
  running: boolean;
  lastUpdated: number;
}

export class CountdownClock {
  private remaining: Record<PlayerColor, number>;
  private active: PlayerColor | null = null;
  private lastTimestamp: number = Date.now();
  private readonly incrementMs: number;

  constructor(initial: Record<PlayerColor, number>, incrementMs = 0) {
    this.remaining = { ...initial };
    this.incrementMs = incrementMs;
  }

  private syncNow() {
    if (!this.active) {
      return;
    }
    const now = Date.now();
    const delta = now - this.lastTimestamp;
    this.remaining[this.active] = Math.max(
      0,
      this.remaining[this.active] - delta,
    );
    this.lastTimestamp = now;
    if (this.remaining[this.active] === 0) {
      this.active = null;
    }
  }

  start(color: PlayerColor) {
    this.syncNow();
    this.active = color;
    this.lastTimestamp = Date.now();
  }

  pause() {
    this.syncNow();
    this.active = null;
  }

  resume(color: PlayerColor) {
    this.syncNow();
    this.active = color;
    this.lastTimestamp = Date.now();
  }

  /**
   * Call when the currently active player completes a move.
   * Applies increment to that player and starts the opponent's clock.
   */
  completeMove(movingColor: PlayerColor) {
    this.syncNow();
    this.remaining[movingColor] += this.incrementMs;
    const next = oppositeColor(movingColor);
    if (this.remaining[next] > 0) {
      this.active = next;
      this.lastTimestamp = Date.now();
    } else {
      this.active = null;
    }
  }

  setActive(color: PlayerColor | null) {
    this.syncNow();
    this.active = color;
    this.lastTimestamp = Date.now();
  }

  setRemaining(color: PlayerColor, value: number) {
    this.syncNow();
    this.remaining[color] = value;
  }

  getFlagged(): PlayerColor | null {
    this.syncNow();
    if (this.remaining.white <= 0) {
      return 'white';
    }
    if (this.remaining.black <= 0) {
      return 'black';
    }
    return null;
  }

  snapshot(): ClockSnapshot {
    this.syncNow();
    return {
      white: this.remaining.white,
      black: this.remaining.black,
      activeColor: this.active,
      running: this.active !== null,
      lastUpdated: Date.now(),
    };
  }
}
