import type {
  Solver,
  StaticBoard,
  SokobanState,
  SolveOptions,
  SolverMetrics,
} from '@sokoban/shared';

/**
 * Wrap a solver call with performance instrumentation.
 * 
 * NOTE: process.memoryUsage().heapUsed deltas are an approximation,
 * not a true peak-RSS profile. This is a known limitation documented
 * in the UI and COMPLEXITY_ANALYSIS.md.
 */
export function withMetrics(
  solver: Solver,
  board: StaticBoard,
  initial: SokobanState,
  opts: SolveOptions,
  levelId: string
): SolverMetrics {
  const memBefore = process.memoryUsage().heapUsed;
  const t0 = process.hrtime.bigint();

  const result = solver.solve(board, initial, opts);

  const t1 = process.hrtime.bigint();
  const memAfter = process.memoryUsage().heapUsed;

  return {
    algorithm: solver.id,
    levelId,
    solved: result.solved,
    timedOut: result.timedOut,
    timeMs: Number(t1 - t0) / 1_000_000,
    statesGenerated: result.statesGenerated,
    statesExplored: result.statesExplored,
    maxFrontierSize: result.maxFrontierSize,
    peakMemoryMb: Math.max(0, (memAfter - memBefore) / 1_000_000),
    solutionLength: result.path ? result.path.length : null,
    pushCount: result.pushCount,
    path: result.path,
    deadlocksPruned: result.deadlocksPruned,
  };
}
