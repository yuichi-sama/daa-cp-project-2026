import type {
  AlgorithmId,
  Coord,
  Move,
  SearchNode,
  SolveOptions,
  Solver,
  SolverResult,
  SokobanState,
  StaticBoard,
} from '@sokoban/shared';
import {
  DEFAULT_MAX_STATES,
  DEFAULT_TIMEOUT_MS,
  SSE_PROGRESS_INTERVAL,
} from '@sokoban/shared';
import { computeDeadSquares, isDeadlocked } from '../deadlock.js';
import { MinHeap } from '../frontier.js';
import { manhattanHeuristic } from '../heuristics.js';
import { generateSuccessors } from '../successors.js';
import { isGoal, searchStateKey } from '../state.js';

export class AStarSolver implements Solver {
  readonly id: AlgorithmId = 'astar';

  solve(
    board: StaticBoard,
    initial: SokobanState,
    opts: SolveOptions = {}
  ): SolverResult {
    const maxStatesExplored = opts.maxStatesExplored ?? DEFAULT_MAX_STATES;
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const enableDeadlock = opts.deadlockDetection ?? true;
    const onProgress = opts.onProgress;

    const startTime = Date.now();
    const deadline = startTime + timeoutMs;

    let statesGenerated = 0;
    let statesExplored = 0;
    let deadlocksPruned = 0;
    let maxFrontierSize = 0;

    const deadSquares = enableDeadlock
      ? computeDeadSquares(board)
      : new Set<string>();

    const initialH = manhattanHeuristic(initial.boxes, board.targets);
    const initialNode: SearchNode = {
      state: initial,
      parent: null,
      move: null,
      g: 0,
      h: initialH,
      pushed: false,
    };

    if (isGoal(board, initial)) {
      return {
        solved: true,
        timedOut: false,
        path: [],
        pushCount: 0,
        statesGenerated: 0,
        statesExplored: 0,
        maxFrontierSize: 1,
        deadlocksPruned: 0,
      };
    }

    if (enableDeadlock && isDeadlocked(board, initial, deadSquares)) {
      return {
        solved: false,
        timedOut: false,
        path: null,
        pushCount: null,
        statesGenerated: 0,
        statesExplored: 0,
        maxFrontierSize: 0,
        deadlocksPruned: 1,
      };
    }

    // MinHeap prioritized by f(n) = g(n) + h(n), tie-breaking by lower h(n)
    const heap = new MinHeap<SearchNode>((a, b) => {
      const fA = a.g + (a.h ?? 0);
      const fB = b.g + (b.h ?? 0);
      if (fA !== fB) {
        return fA - fB;
      }
      return (a.h ?? 0) - (b.h ?? 0);
    });

    heap.push(initialNode);
    maxFrontierSize = 1;

    // Track best-known g-cost for each canonical state hash
    const bestG = new Map<string, number>();
    bestG.set(searchStateKey(board, initial, opts.normalizePlayerPosition), 0);

    while (!heap.isEmpty()) {
      if (Date.now() >= deadline) {
        return {
          solved: false,
          timedOut: true,
          path: null,
          pushCount: null,
          statesGenerated,
          statesExplored,
          maxFrontierSize,
          deadlocksPruned,
        };
      }

      if (statesExplored >= maxStatesExplored) {
        return {
          solved: false,
          timedOut: false,
          path: null,
          pushCount: null,
          statesGenerated,
          statesExplored,
          maxFrontierSize,
          deadlocksPruned,
        };
      }

      const currNode = heap.pop()!;
      const currHash = searchStateKey(board, currNode.state, opts.normalizePlayerPosition);

      // Skip stale nodes popped from heap
      if (currNode.g > (bestG.get(currHash) ?? Infinity)) {
        continue;
      }

      statesExplored++;

      if (onProgress && statesExplored % SSE_PROGRESS_INTERVAL === 0) {
        onProgress(statesExplored, heap.size);
      }

      // Goal test upon expanding node ensures optimal path
      if (isGoal(board, currNode.state)) {
        const { path, pushCount } = this.reconstructPath(currNode);
        return {
          solved: true,
          timedOut: false,
          path,
          pushCount,
          statesGenerated,
          statesExplored,
          maxFrontierSize,
          deadlocksPruned,
        };
      }

      const successors = generateSuccessors(board, currNode.state);

      for (const succ of successors) {
        statesGenerated++;

        if (enableDeadlock && succ.pushed) {
          const dirX = succ.state.player.x - currNode.state.player.x;
          const dirY = succ.state.player.y - currNode.state.player.y;
          const movedBox: Coord = {
            x: succ.state.player.x + dirX,
            y: succ.state.player.y + dirY,
          };

          if (isDeadlocked(board, succ.state, deadSquares, movedBox)) {
            deadlocksPruned++;
            continue;
          }
        }

        const succG = currNode.g + 1;
        const hash = searchStateKey(board, succ.state, opts.normalizePlayerPosition);
        const prevG = bestG.get(hash);

        if (prevG !== undefined && succG >= prevG) {
          continue;
        }

        bestG.set(hash, succG);

        const h = manhattanHeuristic(succ.state.boxes, board.targets);
        const childNode: SearchNode = {
          state: succ.state,
          parent: currNode,
          move: succ.move,
          g: succG,
          h,
          pushed: succ.pushed,
        };

        heap.push(childNode);
      }

      if (heap.size > maxFrontierSize) {
        maxFrontierSize = heap.size;
      }
    }

    return {
      solved: false,
      timedOut: false,
      path: null,
      pushCount: null,
      statesGenerated,
      statesExplored,
      maxFrontierSize,
      deadlocksPruned,
    };
  }

  private reconstructPath(goalNode: SearchNode): {
    path: Move[];
    pushCount: number;
  } {
    const path: Move[] = [];
    let pushCount = 0;
    let curr: SearchNode | null = goalNode;

    while (curr && curr.parent) {
      if (curr.move) {
        path.push(curr.move);
        if (curr.pushed) {
          pushCount++;
        }
      }
      curr = curr.parent;
    }

    path.reverse();
    return { path, pushCount };
  }
}
