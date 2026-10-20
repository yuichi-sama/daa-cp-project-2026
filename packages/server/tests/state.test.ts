import { describe, it, expect } from 'vitest';
import type { StaticBoard } from '@sokoban/shared';
import {
  canonicalizeBoxes,
  hashState,
  isGoal,
  cloneState,
  coordEquals,
  hasBoxAt,
  canonicalPlayerPosition,
  searchStateKey,
} from '../src/engine/state.js';

describe('State Utilities', () => {
  describe('canonicalizeBoxes', () => {
    it('sorts boxes primarily by x coordinate and secondarily by y coordinate', () => {
      const unsorted = [
        { x: 3, y: 1 },
        { x: 1, y: 5 },
        { x: 2, y: 4 },
        { x: 1, y: 2 },
      ];
      const sorted = canonicalizeBoxes(unsorted);
      expect(sorted).toEqual([
        { x: 1, y: 2 },
        { x: 1, y: 5 },
        { x: 2, y: 4 },
        { x: 3, y: 1 },
      ]);
    });
  });

  describe('hashState', () => {
    it('produces the same hash for the same boxes regardless of array order', () => {
      const stateA = {
        player: { x: 2, y: 3 },
        boxes: [
          { x: 1, y: 1 },
          { x: 4, y: 2 },
          { x: 2, y: 5 },
        ],
      };
      const stateB = {
        player: { x: 2, y: 3 },
        boxes: [
          { x: 4, y: 2 },
          { x: 2, y: 5 },
          { x: 1, y: 1 },
        ],
      };

      expect(hashState(stateA)).toBe(hashState(stateB));
    });

    it('produces different hashes for different player or box positions', () => {
      const baseState = {
        player: { x: 2, y: 3 },
        boxes: [{ x: 1, y: 1 }],
      };
      const diffPlayer = {
        player: { x: 2, y: 4 },
        boxes: [{ x: 1, y: 1 }],
      };
      const diffBox = {
        player: { x: 2, y: 3 },
        boxes: [{ x: 1, y: 2 }],
      };

      const baseHash = hashState(baseState);
      expect(hashState(diffPlayer)).not.toBe(baseHash);
      expect(hashState(diffBox)).not.toBe(baseHash);
    });
  });

  describe('isGoal', () => {
    const board: StaticBoard = {
      width: 5,
      height: 5,
      cells: [
        ['wall', 'wall', 'wall', 'wall', 'wall'],
        ['wall', 'floor', 'floor', 'target', 'wall'],
        ['wall', 'floor', 'target', 'floor', 'wall'],
        ['wall', 'floor', 'floor', 'floor', 'wall'],
        ['wall', 'wall', 'wall', 'wall', 'wall'],
      ],
      targets: [
        { x: 3, y: 1 },
        { x: 2, y: 2 },
      ],
    };

    it('returns true when all targets have boxes', () => {
      const solvedState = {
        player: { x: 1, y: 1 },
        boxes: [
          { x: 2, y: 2 },
          { x: 3, y: 1 },
        ],
      };
      expect(isGoal(board, solvedState)).toBe(true);
    });

    it('returns false when some targets are empty', () => {
      const unsolvedState = {
        player: { x: 1, y: 1 },
        boxes: [
          { x: 1, y: 2 },
          { x: 3, y: 1 },
        ],
      };
      expect(isGoal(board, unsolvedState)).toBe(false);
    });
  });

  describe('cloneState, coordEquals, hasBoxAt', () => {
    it('correctly clones state deeply', () => {
      const original = { player: { x: 1, y: 2 }, boxes: [{ x: 3, y: 4 }] };
      const clone = cloneState(original);
      expect(clone).toEqual(original);
      clone.player.x = 99;
      expect(original.player.x).toBe(1);
    });

    it('evaluates coord equality', () => {
      expect(coordEquals({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
      expect(coordEquals({ x: 1, y: 2 }, { x: 1, y: 3 })).toBe(false);
    });

    it('checks if a box exists at coord', () => {
      const state = { player: { x: 0, y: 0 }, boxes: [{ x: 2, y: 3 }] };
      expect(hasBoxAt(state, { x: 2, y: 3 })).toBe(true);
      expect(hasBoxAt(state, { x: 2, y: 2 })).toBe(false);
    });
  });

  it('finds the canonical player position within a reachable region', () => {
    const board: StaticBoard = {
      width: 5,
      height: 3,
      cells: [
        ['wall', 'wall', 'wall', 'wall', 'wall'],
        ['wall', 'floor', 'floor', 'floor', 'wall'],
        ['wall', 'wall', 'wall', 'wall', 'wall'],
      ],
      targets: [{ x: 3, y: 1 }],
    };
    const left = { player: { x: 1, y: 1 }, boxes: [{ x: 3, y: 1 }] };
    const middle = { player: { x: 2, y: 1 }, boxes: [{ x: 3, y: 1 }] };

    expect(canonicalPlayerPosition(board, middle)).toEqual({ x: 1, y: 1 });
    // Move-level search keeps exact player coordinates for path correctness.
    expect(searchStateKey(board, left, true)).not.toBe(searchStateKey(board, middle, true));
  });
});
