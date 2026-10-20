import type {
  LevelManifest,
  SolverMetrics,
  AlgorithmId,
  StaticBoard,
  SokobanState,
} from '@sokoban/shared';

const BASE = '/api';

export interface LoadedLevelData {
  manifest: LevelManifest;
  board: StaticBoard;
  initialState: SokobanState;
}

export async function fetchLevels(difficulty?: string): Promise<LevelManifest[]> {
  const url = difficulty ? `${BASE}/levels?difficulty=${difficulty}` : `${BASE}/levels`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch levels: ${res.statusText}`);
  return res.json();
}

export async function fetchLevel(id: string): Promise<LoadedLevelData> {
  const res = await fetch(`${BASE}/levels/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Failed to fetch level ${id}: ${res.statusText}`);
  return res.json();
}

export async function solvePuzzle(params: {
  levelId: string;
  algorithm: AlgorithmId;
  deadlockDetection?: boolean;
  normalizePlayerPosition?: boolean;
  maxStatesExplored?: number;
  maxDepth?: number;
  timeoutMs?: number;
}): Promise<SolverMetrics> {
  const res = await fetch(`${BASE}/solve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errorBody = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error || `Solve failed: ${res.statusText}`);
  }
  return res.json();
}

export async function compareSolvers(params: {
  levelId: string;
  deadlockDetection?: boolean;
  normalizePlayerPosition?: boolean;
  maxStatesExplored?: number;
  timeoutMs?: number;
}): Promise<SolverMetrics[]> {
  const res = await fetch(`${BASE}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errorBody = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error || `Compare failed: ${res.statusText}`);
  }
  return res.json();
}

export function createSolveStream(
  levelId: string,
  algorithm: AlgorithmId,
  options?: {
    deadlockDetection?: boolean;
    normalizePlayerPosition?: boolean;
    maxStatesExplored?: number;
    maxDepth?: number;
    timeoutMs?: number;
  }
): EventSource {
  const query = new URLSearchParams({
    levelId,
    algorithm,
  });
  if (options?.deadlockDetection !== undefined) {
    query.set('deadlockDetection', String(options.deadlockDetection));
  }
  if (options?.normalizePlayerPosition !== undefined) {
    query.set('normalizePlayerPosition', String(options.normalizePlayerPosition));
  }
  if (options?.maxStatesExplored !== undefined) {
    query.set('maxStatesExplored', String(options.maxStatesExplored));
  }
  if (options?.maxDepth !== undefined) {
    query.set('maxDepth', String(options.maxDepth));
  }
  if (options?.timeoutMs !== undefined) {
    query.set('timeoutMs', String(options.timeoutMs));
  }
  return new EventSource(`${BASE}/solve/stream?${query.toString()}`);
}
