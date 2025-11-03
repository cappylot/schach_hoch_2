export type PlayerColor = 'white' | 'black';
export type ColorSymbol = 'w' | 'b';

export const PLAYER_COLORS: PlayerColor[] = ['white', 'black'];

export const PLAYER_COLOR_TO_SYMBOL: Record<PlayerColor, ColorSymbol> = {
  white: 'w',
  black: 'b',
};

export const SYMBOL_TO_PLAYER_COLOR: Record<ColorSymbol, PlayerColor> = {
  w: 'white',
  b: 'black',
};

export const oppositeColor = (color: PlayerColor): PlayerColor =>
  color === 'white' ? 'black' : 'white';
