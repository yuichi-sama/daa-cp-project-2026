import { Router } from 'express';
import { z } from 'zod';
import type { SolveDoneEvent, SolveProgressEvent } from '@sokoban/shared';
import { AlgorithmIdSchema } from '@sokoban/shared';
import {
  createSolver,
  getLoadedLevel,
  withMetrics,
} from '../engine/index.js';

export const solveStreamRouter = Router();

const SolveStreamQuerySchema = z.object({
  levelId: z.string().min(1),
  algorithm: AlgorithmIdSchema,
  deadlockDetection: z.preprocess((val) => {
    if (typeof val === 'string') return val !== 'false';
    return val;
  }, z.boolean().default(true)),
  normalizePlayerPosition: z.preprocess((val) => {
    if (typeof val === 'string') return val === 'true';
    return val;
  }, z.boolean().default(false)),
  maxStatesExplored: z.coerce.number().int().positive().optional(),
  maxDepth: z.coerce.number().int().positive().optional(),
  timeoutMs: z.coerce.number().int().positive().optional(),
});

/**
 * GET /api/solve/stream?levelId=X&algorithm=Y
 * Server-Sent Events (SSE) streaming endpoint for real-time solver progress visualization.
 */
solveStreamRouter.get('/', (req, res) => {
  const parseResult = SolveStreamQuerySchema.safeParse(req.query);

  if (!parseResult.success) {
    res.status(400).json({
      error: 'Invalid streaming solve query parameters',
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

  // Set standard SSE response headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });
  res.flushHeaders?.();

  // Progress callback invoked by the solver engine every SSE_PROGRESS_INTERVAL nodes
  const onProgress = (explored: number, frontierSize: number): void => {
    const progressEvent: SolveProgressEvent = {
      type: 'progress',
      statesExplored: explored,
      frontierSize,
    };
    res.write(`data: ${JSON.stringify(progressEvent)}\n\n`);
  };

  try {
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
        onProgress,
      },
      levelId
    );

    const doneEvent: SolveDoneEvent = {
      type: 'done',
      result: metrics,
    };

    res.write(`data: ${JSON.stringify(doneEvent)}\n\n`);
    res.end();
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    res.write(`data: ${JSON.stringify({ type: 'error', error: errMessage })}\n\n`);
    res.end();
  }
});
