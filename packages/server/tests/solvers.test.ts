import { describe, it, expect } from 'vitest';
import type { StaticBoard, SokobanState, Solver } from '@sokoban/shared';
import { parseLevel } from '@sokoban/shared';
import { BFSSolver } from '../src/engine/solvers/bfs.js';
import { DFSSolver } from '../src/engine/solvers/dfs.js';
import { GreedySolver } from '../src/engine/solvers/greedy.js';
import { AStarSolver } from '../src/engine/solvers/astar.js';

describe('Comprehensive Solver Tests', () => {
  const bfs = new BFSSolver();
  const dfs = new DFSSolver();
  const greedy = new GreedySolver();
  const astar = new AStarSolver();

  const allSolvers: Solver[] = [bfs, dfs, greedy, astar];

  // Benchmark 1-box level:
  // ####
  // #. #
  // #  #
  // #$ #
  // #@ #
  // ####
  const level1Raw = `####
#. #
#  #
#$ #
#@ #
####`;

  const { board: board1, initialState: state1 } = parseLevel(level1Raw);

  // Unsolvable board: box is trapped in a 1x1 dead nook
  const unsolvableRaw = `######
#@ #.#
#  # #
#  #$#
######`;
  const { board: unsolvableBoard, initialState: unsolvableState } =
    parseLevel(unsolvableRaw);

  // Branching level where Greedy diverges or takes more moves than A*
  const levelDivergenceRaw = `########
#@  $ .#
# #### #
#      #
# . $  #
########`;
  const { board: boardDiv, initialState: stateDiv } = parseLevel(levelDivergenceRaw);

  it('1. All 4 solvers agree on solvability (all solve level 1)', () => {
    for (const solver of allSolvers) {
      const result = solver.solve(board1, state1, { deadlockDetection: true });
      expect(result.solved, `${solver.id} should solve level 1`).toBe(true);
      expect(result.path, `${solver.id} should provide a path`).not.toBeNull();
      expect(result.timedOut).toBe(false);
    }
  });

  it('2. BFS finds the shortest solution', () => {
    const result = bfs.solve(board1, state1);
    expect(result.solved).toBe(true);
    // Direct pushes up: 2 pushes, 2 moves total
    expect(result.path!.length).toBe(2);
    expect(result.pushCount).toBe(2);
    expect(result.path).toEqual(['up', 'up']);
  });

  it('3. A* solution length == BFS solution length (both optimal)', () => {
    const bfsResult = bfs.solve(board1, state1);
    const astarResult = astar.solve(board1, state1);

    expect(bfsResult.solved).toBe(true);
    expect(astarResult.solved).toBe(true);
    expect(astarResult.path!.length).toBe(bfsResult.path!.length);
  });

  it('4. DFS solution length >= BFS solution length', () => {
    const bfsResult = bfs.solve(board1, state1);
    const dfsResult = dfs.solve(board1, state1);

    expect(dfsResult.solved).toBe(true);
    expect(dfsResult.path!.length).toBeGreaterThanOrEqual(
      bfsResult.path!.length
    );
  });

  it('5. Greedy solution length >= A* solution length', () => {
    // On all levels, optimal A* path length <= any path length found by Greedy
    const astarResult = astar.solve(board1, state1);
    const greedyResult = greedy.solve(board1, state1);

    expect(greedyResult.solved).toBe(true);
    expect(greedyResult.path!.length).toBeGreaterThanOrEqual(
      astarResult.path!.length
    );

    // On branching level
    const astarDiv = astar.solve(boardDiv, stateDiv);
    const greedyDiv = greedy.solve(boardDiv, stateDiv);
    if (greedyDiv.solved && astarDiv.solved) {
      expect(greedyDiv.path!.length).toBeGreaterThanOrEqual(
        astarDiv.path!.length
      );
    }
  });

  it('6. All return solved:false on an unsolvable board', () => {
    for (const solver of allSolvers) {
      const result = solver.solve(unsolvableBoard, unsolvableState, {
        maxStatesExplored: 1000,
        timeoutMs: 2000,
        deadlockDetection: true,
      });
      expect(result.solved, `${solver.id} should return solved:false`).toBe(false);
      expect(result.path).toBeNull();
    }
  });

  it('7. All respect maxStatesExplored budget', () => {
    const budget = 1;
    for (const solver of allSolvers) {
      const result = solver.solve(board1, state1, {
        maxStatesExplored: budget,
        deadlockDetection: false,
      });

      // Budget of 1 state explored cannot solve a 2-step puzzle
      expect(result.solved).toBe(false);
      expect(result.statesExplored).toBeLessThanOrEqual(budget);
    }
  });
});
