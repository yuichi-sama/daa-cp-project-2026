/** Default search budget — max states to explore before giving up */
export const DEFAULT_MAX_STATES = 200_000;

/** Default server-side timeout in milliseconds */
export const DEFAULT_TIMEOUT_MS = 30_000;

/** SSE progress interval — send progress event every N nodes explored */
export const SSE_PROGRESS_INTERVAL = 500;

/** Animation speed for solution playback (ms per move) */
export const ANIMATION_STEP_MS = 1_000;

/** Pause before an automatic solution playback begins */
export const ANIMATION_START_DELAY_MS = 2_000;

/** Time allocated to visibly animate each box push */
export const ANIMATION_PUSH_STEP_MS = 1_000;

/** Theme colors matching the academic navy/amber palette */
export const COLORS = {
  wall: '#3E4A63',
  floor: '#EEF1F8',
  target: '#E8A33D',
  box: '#1B2A4A',
  boxOnTarget: '#2D5A3D',
  player: '#63C7B2',
  playerOnTarget: '#4DAA9A',
  gridBorder: '#CBD5E1',
} as const;

/** Cell size in pixels for the board renderer */
export const CELL_SIZE = 48;

/** Direction vectors for each move */
export const DIRECTION_VECTORS: Record<string, { dx: number; dy: number }> = {
  up:    { dx: 0,  dy: -1 },
  down:  { dx: 0,  dy:  1 },
  left:  { dx: -1, dy:  0 },
  right: { dx: 1,  dy:  0 },
} as const;
