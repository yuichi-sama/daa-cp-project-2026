import type { Coord, Move, SokobanState, StaticBoard } from '@sokoban/shared';
import { isWalkable } from './board.js';
import { canonicalizeBoxes, hasBoxAt } from './state.js';

export interface SuccessorInfo {
  state: SokobanState;
  move: Move;
  pushed: boolean;
}

export const DIRECTION_VECTORS: Record<Move, Coord> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const ALL_MOVES: readonly Move[] = ['up', 'down', 'left', 'right'];

/**
 * Generates all valid successor states for a given Sokoban board and state.
 * Shared across all four search algorithms (BFS, DFS, Greedy, A*).
 */
export function generateSuccessors(
  board: StaticBoard,
  state: SokobanState
): SuccessorInfo[] {
  const successors: SuccessorInfo[] = [];

  for (const move of ALL_MOVES) {
    const dir = DIRECTION_VECTORS[move];
    const newPlayer: Coord = {
      x: state.player.x + dir.x,
      y: state.player.y + dir.y,
    };

    // 1 & 2: Check if new player position is walkable
    if (!isWalkable(board, newPlayer)) {
      continue;
    }

    // 3: Check if new player position contains a box
    const boxIndex = state.boxes.findIndex(
      (b) => b.x === newPlayer.x && b.y === newPlayer.y
    );

    if (boxIndex !== -1) {
      // Trying to push a box
      const beyond: Coord = {
        x: newPlayer.x + dir.x,
        y: newPlayer.y + dir.y,
      };

      // Can only push if beyond position is walkable and not occupied by another box
      if (!isWalkable(board, beyond) || hasBoxAt(state, beyond)) {
        continue;
      }

      // Legal push: player moves to newPlayer, pushed box moves to beyond
      const nextBoxes: Coord[] = state.boxes.map((b, i) =>
        i === boxIndex ? { x: beyond.x, y: beyond.y } : { x: b.x, y: b.y }
      );

      successors.push({
        state: {
          player: newPlayer,
          boxes: canonicalizeBoxes(nextBoxes),
        },
        move,
        pushed: true,
      });
    } else {
      // 4: Empty floor or target: player moves, boxes unchanged
      const nextBoxes: Coord[] = state.boxes.map((b) => ({ x: b.x, y: b.y }));

      successors.push({
        state: {
          player: newPlayer,
          boxes: canonicalizeBoxes(nextBoxes),
        },
        move,
        pushed: false,
      });
    }
  }

  return successors;
}
