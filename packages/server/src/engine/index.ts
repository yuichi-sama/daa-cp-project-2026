export {
  hashState,
  canonicalPlayerPosition,
  searchStateKey,
  isGoal,
  cloneState,
  canonicalizeBoxes,
  coordEquals,
  hasBoxAt,
} from './state.js';
export { getCell, isWalkable, isInBounds } from './board.js';
export { generateSuccessors, type SuccessorInfo } from './successors.js';
export { MinHeap } from './frontier.js';
export { manhattanHeuristic, hungarianMinCost } from './heuristics.js';
export {
  computeDeadSquares,
  isFreezeDeadlock,
  isDeadlocked,
} from './deadlock.js';
export { withMetrics } from './metrics.js';
export { BFSSolver } from './solvers/bfs.js';
export { DFSSolver } from './solvers/dfs.js';
export { GreedySolver } from './solvers/greedy.js';
export { AStarSolver } from './solvers/astar.js';
export {
  initLevels,
  getLoadedLevel,
  getAllLevelManifests,
  registerLevel,
  type LoadedLevel,
} from './levelLoader.js';

import type { AlgorithmId, Solver } from '@sokoban/shared';
import { BFSSolver } from './solvers/bfs.js';
import { DFSSolver } from './solvers/dfs.js';
import { GreedySolver } from './solvers/greedy.js';
import { AStarSolver } from './solvers/astar.js';

export function createSolver(id: AlgorithmId): Solver {
  switch (id) {
    case 'bfs':
      return new BFSSolver();
    case 'dfs':
      return new DFSSolver();
    case 'greedy':
      return new GreedySolver();
    case 'astar':
      return new AStarSolver();
    default:
      throw new Error(`Unknown algorithm: ${id as string}`);
  }
}

