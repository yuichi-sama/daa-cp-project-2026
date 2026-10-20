import { describe, it, expect } from 'vitest';
import type { StaticBoard, SokobanState } from '@sokoban/shared';
import {
  computeDeadSquares,
  isFreezeDeadlock,
  isDeadlocked,
} from '../src/engine/deadlock.js';

describe('Deadlock Detection', () => {
  // Hand-crafted board:
  // #####
  // #C .#
  // #   #
  // #####
  // Width 5, Height 4
  // (1, 1) is top-left corner
  // (3, 1) is target
  // (2, 1) is floor between corner and target
  const board: StaticBoard = {
    width: 5,
    height: 4,
    cells: [
      ['wall', 'wall',  'wall',  'wall',   'wall'],
      ['wall', 'floor', 'floor', 'target', 'wall'],
      ['wall', 'floor', 'floor', 'floor',  'wall'],
      ['wall', 'wall',  'wall',  'wall',   'wall'],
    ],
    targets: [{ x: 3, y: 1 }],
  };

  describe('computeDeadSquares', () => {
    it('flags corner cell as dead square', () => {
      const deadSquares = computeDeadSquares(board);
      // Corner at (1, 1)
      expect(deadSquares.has('1,1')).toBe(true);
    });

    it('never flags a target cell as dead square', () => {
      const deadSquares = computeDeadSquares(board);
      // Target at (3, 1)
      expect(deadSquares.has('3,1')).toBe(false);
    });

    it('does not flag an open floor cell near the target as dead if pullable', () => {
      const deadSquares = computeDeadSquares(board);
      // (2, 1) is directly to the left of the target (3, 1)
      // A player at (1, 1) can push a box at (2, 1) into (3, 1)
      expect(deadSquares.has('2,1')).toBe(false);
    });
  });

  describe('isFreezeDeadlock', () => {
    it('detects a box frozen in a corner against walls when not on target', () => {
      const state: SokobanState = {
        player: { x: 2, y: 2 },
        boxes: [{ x: 1, y: 1 }],
      };
      // Box at (1, 1) has walls at up (1, 0) and left (0, 1)
      expect(isFreezeDeadlock(board, state, { x: 1, y: 1 })).toBe(true);
    });

    it('does not flag a box as freeze-deadlocked if it is on a target', () => {
      const state: SokobanState = {
        player: { x: 2, y: 2 },
        boxes: [{ x: 3, y: 1 }],
      };
      // (3, 1) is on target
      expect(isFreezeDeadlock(board, state, { x: 3, y: 1 })).toBe(false);
    });

    it('detects 2x2 box deadlock against a wall', () => {
      // Board with a 2-wide hallway
      const hallBoard: StaticBoard = {
        width: 6,
        height: 5,
        cells: [
          ['wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
          ['wall', 'floor', 'floor', 'floor', 'floor', 'wall'],
          ['wall', 'floor', 'floor', 'floor', 'floor', 'wall'],
          ['wall', 'floor', 'floor', 'target', 'floor', 'wall'],
          ['wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
        ],
        targets: [{ x: 3, y: 3 }],
      };

      // Two boxes forming a 2x2 with walls at top
      // (2, 0) wall, (3, 0) wall
      // (2, 1) box, (3, 1) box
      const state: SokobanState = {
        player: { x: 1, y: 2 },
        boxes: [
          { x: 2, y: 1 },
          { x: 3, y: 1 },
        ],
      };

      expect(isFreezeDeadlock(hallBoard, state, { x: 2, y: 1 })).toBe(true);
    });
  });

  describe('isDeadlocked', () => {
    it('returns true if any box is on a dead square', () => {
      const deadSquares = computeDeadSquares(board);
      const state: SokobanState = {
        player: { x: 2, y: 2 },
        boxes: [{ x: 1, y: 1 }],
      };
      expect(isDeadlocked(board, state, deadSquares)).toBe(true);
    });
  });
});
