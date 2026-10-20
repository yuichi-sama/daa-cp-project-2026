import { Router } from 'express';
import { SolveRequestSchema } from '@sokoban/shared';
import {
  createSolver,
  getLoadedLevel,
  withMetrics,
} from '../engine/index.js';

export const solveRouter = Router();

/**
 * POST /api/solve
 * Body: SolveRequest
 * Solves a Sokoban level using the requested algorithm and returns SolverMetrics.
 */
solveRouter.post('/', (req, res, next) => {
  try {
    const parseResult = SolveRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid solve request parameters',
        details: parseResult.error.format(),
      });
      return;
    }

    const {
      levelId,
      algorithm,
      deadlockDetection,
      normalizePlayerPosition,
      maxStatesExplored,
      maxDepth,
      timeoutMs,
    } = parseResult.data;

    const level = getLoadedLevel(levelId);
    if (!level) {
      res.status(404).json({ error: `Level not found: ${levelId}` });
      return;
    }

    const solver = createSolver(algorithm);

    const metrics = withMetrics(
      solver,
      level.board,
      level.initialState,
      {
        deadlockDetection,
        normalizePlayerPosition,
        maxStatesExplored,
        maxDepth,
        timeoutMs,
      },
      levelId
    );

    // Timeout returns 200 with solved: false, timedOut: true inside metrics
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});
