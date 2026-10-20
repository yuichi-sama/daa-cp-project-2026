import { describe, it, expect } from 'vitest';
import type { Coord } from '@sokoban/shared';
import { manhattanHeuristic, hungarianMinCost } from '../src/engine/heuristics.js';

describe('Heuristics & Hungarian Algorithm', () => {
  it('returns zero heuristic when all boxes are already on targets', () => {
    const boxes: Coord[] = [
      { x: 1, y: 1 },
      { x: 3, y: 4 },
      { x: 5, y: 2 },
    ];
    const targets: Coord[] = [
      { x: 3, y: 4 },
      { x: 1, y: 1 },
      { x: 5, y: 2 },
    ];

    expect(manhattanHeuristic(boxes, targets)).toBe(0);
  });

  it('proves admissibility: h(n) <= known optimal cost on a hand-solved board', () => {
    // 1 box at (1, 3), target at (1, 1). Distance = 2.
    // In actual game, player at (1, 4) needs 2 pushes up to reach target (optimal move cost = 2 pushes).
    // Heuristic = 2 <= 2.
    const boxes: Coord[] = [{ x: 1, y: 3 }];
    const targets: Coord[] = [{ x: 1, y: 1 }];

    const h = manhattanHeuristic(boxes, targets);
    const knownOptimalMoveCost = 2;

    expect(h).toBe(2);
    expect(h).toBeLessThanOrEqual(knownOptimalMoveCost);
  });

  it('guarantees optimal bipartite matching where greedy nearest-neighbor fails', () => {
    // Box 1: (0, 0)
    // Box 2: (0, 3)
    // Target 1: (0, 2)
    // Target 2: (0, 10)
    //
    // Pairwise Manhattan distances:
    // Box 1 -> Target 1: |0-0| + |0-2| = 2
    // Box 1 -> Target 2: |0-0| + |0-10| = 10
    // Box 2 -> Target 1: |0-0| + |3-2| = 1
    // Box 2 -> Target 2: |0-0| + |3-10| = 7
    //
    // A greedy nearest-first assignment would choose:
    // Box 2 -> Target 1 (dist 1)
    // Leaving Box 1 -> Target 2 (dist 10)
    // Greedy total cost = 1 + 10 = 11.
    //
    // The globally optimal Hungarian assignment is:
    // Box 1 -> Target 1 (dist 2)
    // Box 2 -> Target 2 (dist 7)
    // Optimal total cost = 2 + 7 = 9.

    const boxes: Coord[] = [
      { x: 0, y: 0 },
      { x: 0, y: 3 },
    ];
    const targets: Coord[] = [
      { x: 0, y: 2 },
      { x: 0, y: 10 },
    ];

    const h = manhattanHeuristic(boxes, targets);
    expect(h).toBe(9);
    expect(h).toBeLessThan(11); // Strictly better than greedy nearest
  });

  it('handles empty boxes or targets gracefully', () => {
    expect(manhattanHeuristic([], [])).toBe(0);
    expect(manhattanHeuristic([{ x: 1, y: 1 }], [])).toBe(0);
    expect(hungarianMinCost([])).toBe(0);
  });
});
