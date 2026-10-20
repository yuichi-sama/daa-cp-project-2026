import { Router } from 'express';
import type { AlgorithmId, SolverMetrics } from '@sokoban/shared';
import { CompareRequestSchema } from '@sokoban/shared';
import {
  createSolver,
  getLoadedLevel,
  withMetrics,
} from '../engine/index.js';

export const compareRouter = Router();

const ALL_ALGORITHMS: readonly AlgorithmId[] = ['bfs', 'dfs', 'greedy', 'astar'];

/**
 * POST /api/compare
 * Body: CompareRequest
 * Sequentially executes all four algorithms (BFS, DFS, Greedy, A*) on the specified level,
 * returning an array of SolverMetrics.
 */
compareRouter.post('/', (req, res, next) => {
  try {
    const parseResult = CompareRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid compare request parameters',
        details: parseResult.error.format(),
      });
      return;
    }

    const {
      levelId,
      deadlockDetection,
      normalizePlayerPosition,
      maxStatesExplored,
      timeoutMs,
    } = parseResult.data;

    const level = getLoadedLevel(levelId);
    if (!level) {
      res.status(404).json({ error: `Level not found: ${levelId}` });
      return;
    }

    const metricsList: SolverMetrics[] = [];

    for (const algo of ALL_ALGORITHMS) {
      const solver = createSolver(algo);
      const metrics = withMetrics(
        solver,
        level.board,
        level.initialState,
        {
          deadlockDetection,
          normalizePlayerPosition,
          maxStatesExplored,
          timeoutMs,
        },
        levelId
      );
      metricsList.push(metrics);
    }

    res.json(metricsList);
  } catch (err) {
    next(err);
  }
});
