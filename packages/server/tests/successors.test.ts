import { describe, it, expect } from 'vitest';
import type { StaticBoard, SokobanState } from '@sokoban/shared';
import { generateSuccessors } from '../src/engine/successors.js';

describe('generateSuccessors', () => {
  // Hand-crafted 5x5 board:
  // #####
  // #@$ #
  // #$# #
  // #$  #
  // #####
  const board: StaticBoard = {
    width: 5,
    height: 5,
    cells: [
      ['wall', 'wall',  'wall',  'wall',  'wall'],
      ['wall', 'floor', 'floor', 'floor', 'wall'],
      ['wall', 'floor', 'wall',  'floor', 'wall'],
      ['wall', 'floor', 'floor', 'floor', 'wall'],
      ['wall', 'wall',  'wall',  'wall',  'wall'],
    ],
    targets: [{ x: 3, y: 3 }],
  };

  it('generates the correct number and types of successors from an open position', () => {
    // Player at (1, 1), box at (2, 1) and (1, 2) and (1, 3)
    const state: SokobanState = {
      player: { x: 1, y: 1 },
      boxes: [
        { x: 2, y: 1 },
        { x: 1, y: 2 },
        { x: 1, y: 3 },
      ],
    };

    const successors = generateSuccessors(board, state);

    // Up: (1, 0) is wall -> blocked
    // Left: (0, 1) is wall -> blocked
    // Down: box at (1, 2), beyond is (1, 3) which has another box -> blocked by box
    // Right: box at (2, 1), beyond is (3, 1) floor -> legal push!
    expect(successors.length).toBe(1);
    const rightSucc = successors[0]!;
    expect(rightSucc.move).toBe('right');
    expect(rightSucc.pushed).toBe(true);
    expect(rightSucc.state.player).toEqual({ x: 2, y: 1 });
    // Box moved from (2, 1) to (3, 1)
    expect(rightSucc.state.boxes).toContainEqual({ x: 3, y: 1 });
  });

  it('handles push blocked by wall case', () => {
    // Player at (2, 1), box at (3, 1). Attempting to push right: beyond (4, 1) is wall.
    const state: SokobanState = {
      player: { x: 2, y: 1 },
      boxes: [{ x: 3, y: 1 }],
    };

    const successors = generateSuccessors(board, state);
    const rightMove = successors.find((s) => s.move === 'right');
    // Right push into wall must NOT be generated
    expect(rightMove).toBeUndefined();
  });

  it('handles push blocked by box case', () => {
    // Player at (1, 1), box at (1, 2), box at (1, 3). Attempting to push down: beyond has a box.
    const state: SokobanState = {
      player: { x: 1, y: 1 },
      boxes: [
        { x: 1, y: 2 },
        { x: 1, y: 3 },
      ],
    };

    const successors = generateSuccessors(board, state);
    const downMove = successors.find((s) => s.move === 'down');
    // Cannot push two boxes in a row
    expect(downMove).toBeUndefined();
  });

  it('handles simple move (no push) case', () => {
    // Player at (3, 1), boxes far away
    const state: SokobanState = {
      player: { x: 3, y: 1 },
      boxes: [{ x: 1, y: 3 }],
    };

    const successors = generateSuccessors(board, state);
    const downSucc = successors.find((s) => s.move === 'down');
    expect(downSucc).toBeDefined();
    expect(downSucc!.pushed).toBe(false);
    expect(downSucc!.state.player).toEqual({ x: 3, y: 2 });
    // Boxes are unchanged
    expect(downSucc!.state.boxes).toEqual([{ x: 1, y: 3 }]);
  });
});
