/**
 * Core types for the Algorithmic Sokoban project.
 * 
 * DESIGN DECISION: g(n) counts MOVES (not pushes).
 * This makes BFS and A* optimal in move-count, which is the standard Sokoban
 * optimality criterion. Push count is tracked separately as `pushCount` in
 * SolverMetrics so it can be reported as an independent metric in the dashboard.
 * This matches the DAA course slide deck's "Number of pushes" metric while
 * keeping cost well-defined for A-star and Greedy.
 */

export type Coord = { x: number; y: number };

export type Cell = 'wall' | 'floor' | 'target';

export interface StaticBoard {
  width: number;
  height: number;
  cells: Cell[][];       // cells[y][x] — walls + targets; never changes during search
  targets: Coord[];
}

export interface SokobanState {
  player: Coord;
  boxes: Coord[];        // sorted canonically by (x, y) for consistent hashing
}

export type Move = 'up' | 'down' | 'left' | 'right';

export interface SearchNode {
  state: SokobanState;
  parent: SearchNode | null;
  move: Move | null;     // move that produced this node from its parent
  g: number;              // path cost so far (move count)
  h?: number;             // heuristic estimate (Greedy/A* only)
  pushed: boolean;        // whether this move pushed a box
}

export type AlgorithmId = 'bfs' | 'dfs' | 'greedy' | 'astar';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface LevelManifest {
  id: string;
  name: string;
  difficulty: Difficulty;
  filePath: string;
  boxCount: number;
  width: number;
  height: number;
}

export interface SolveOptions {
  maxStatesExplored?: number;  // default 200_000
  maxDepth?: number;           // DFS only
  deadlockDetection?: boolean; // default true
  normalizePlayerPosition?: boolean; // stretch goal feature flag
  timeoutMs?: number;          // default 30_000
}

export interface SolverMetrics {
  algorithm: AlgorithmId;
  levelId: string;
  solved: boolean;
  timedOut: boolean;
  timeMs: number;
  statesGenerated: number;     // every successor produced
  statesExplored: number;      // every node popped and expanded
  maxFrontierSize: number;
  peakMemoryMb: number;
  solutionLength: number | null;   // number of moves
  pushCount: number | null;
  path: Move[] | null;
  deadlocksPruned: number;
}

export interface SolverResult {
  solved: boolean;
  timedOut: boolean;
  path: Move[] | null;
  pushCount: number | null;
  statesGenerated: number;
  statesExplored: number;
  maxFrontierSize: number;
  deadlocksPruned: number;
}

export interface Solver {
  id: AlgorithmId;
  solve(board: StaticBoard, initial: SokobanState, opts: SolveOptions): SolverResult;
}

/** SSE progress event sent during streaming solve */
export interface SolveProgressEvent {
  type: 'progress';
  statesExplored: number;
  frontierSize: number;
}

/** SSE completion event sent when streaming solve finishes */
export interface SolveDoneEvent {
  type: 'done';
  result: SolverMetrics;
}
