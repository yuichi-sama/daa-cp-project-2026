import type { Coord, SokobanState, StaticBoard } from '@sokoban/shared';
import { isWalkable } from './board.js';

/**
 * Sorts boxes canonically by x coordinate, then by y coordinate.
 * This guarantees consistent state representation and hashing.
 */
export function canonicalizeBoxes(boxes: readonly Coord[]): Coord[] {
  return [...boxes].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
}

/**
 * Creates a unique string representation of a SokobanState.
 * Format: `${player.x},${player.y}|${boxes.map(b=>`${b.x},${b.y}`).join(';')}`
 * Canonicalizes box positions so that order in the array does not affect the hash.
 */
export function hashState(state: SokobanState): string {
  const sorted = canonicalizeBoxes(state.boxes);
  const boxesStr = sorted.map(b => `${b.x},${b.y}`).join(';');
  return `${state.player.x},${state.player.y}|${boxesStr}`;
}

/**
 * Computes the canonical representative for the player's reachable region.
 * Boxes are treated as obstacles. Every player position in the same connected
 * floor region has identical push options, so this representative can safely
 * be used for search deduplication without changing the stored state or path.
 */
export function canonicalPlayerPosition(
  board: StaticBoard,
  state: SokobanState
): Coord {
  const blocked = new Set(state.boxes.map((box) => `${box.x},${box.y}`));
  const startKey = `${state.player.x},${state.player.y}`;
  const queue: Coord[] = [{ x: state.player.x, y: state.player.y }];
  const visited = new Set<string>([startKey]);
  let best = { x: state.player.x, y: state.player.y };
  const directions: readonly Coord[] = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]!;
    if (current.y < best.y || (current.y === best.y && current.x < best.x)) {
      best = current;
    }

    for (const direction of directions) {
      const next = {
        x: current.x + direction.x,
        y: current.y + direction.y,
      };
      const key = `${next.x},${next.y}`;
      if (!isWalkable(board, next) || blocked.has(key) || visited.has(key)) {
        continue;
      }
      visited.add(key);
      queue.push(next);
    }
  }

  return best;
}

/** Search key with optional reachability-zone player normalization. */
export function searchStateKey(
  board: StaticBoard,
  state: SokobanState,
  normalizePlayerPosition = false
): string {
  // This engine expands one player move at a time. Collapsing all positions in
  // a reachable region would be unsafe here: a walking state may be the exact
  // position needed for the next push. Push-macro search can use
  // canonicalPlayerPosition safely, but move-level search must retain the
  // exact coordinate even when the compatibility flag is requested.
  void board;
  void normalizePlayerPosition;
  return hashState(state);
}

/**
 * Checks if every target on the static board is occupied by a box in the current state.
 */
export function isGoal(board: StaticBoard, state: SokobanState): boolean {
  if (board.targets.length === 0) return false;
  return board.targets.every(t => state.boxes.some(b => b.x === t.x && b.y === t.y));
}

/**
 * Creates a deep clone of a SokobanState.
 */
export function cloneState(state: SokobanState): SokobanState {
  return {
    player: { x: state.player.x, y: state.player.y },
    boxes: state.boxes.map(b => ({ x: b.x, y: b.y })),
  };
}

/**
 * Compares two coordinates for equality.
 */
export function coordEquals(a: Coord, b: Coord): boolean {
  return a.x === b.x && a.y === b.y;
}

/**
 * Checks whether a box exists at the specified coordinate in the given state.
 */
export function hasBoxAt(state: SokobanState, coord: Coord): boolean {
  return state.boxes.some(b => b.x === coord.x && b.y === coord.y);
}
