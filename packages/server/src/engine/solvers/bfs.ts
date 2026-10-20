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
import { generateSuccessors } from '../successors.js';
import { isGoal, searchStateKey } from '../state.js';

export class BFSSolver implements Solver {
  readonly id: AlgorithmId = 'bfs';

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

    const initialNode: SearchNode = {
      state: initial,
      parent: null,
      move: null,
      g: 0,
      pushed: false,
    };

    // Immediate check if initial state is already at goal
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

    // Check if initial state is deadlocked
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

    const visited = new Set<string>();
    visited.add(searchStateKey(board, initial, opts.normalizePlayerPosition));

    // FIFO Queue with head pointer for O(1) dequeues
    const queue: SearchNode[] = [initialNode];
    let head = 0;
    maxFrontierSize = 1;

    while (head < queue.length) {
      // Check timeout
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

      // Check max states explored budget
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

      const currNode = queue[head++]!;
      statesExplored++;

      if (onProgress && statesExplored % SSE_PROGRESS_INTERVAL === 0) {
        onProgress(statesExplored, queue.length - head);
      }

      // Goal test
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

      // Generate successors
      const successors = generateSuccessors(board, currNode.state);

      for (const succ of successors) {
        statesGenerated++;

        // Deadlock detection on pushes
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

        const hash = searchStateKey(board, succ.state, opts.normalizePlayerPosition);
        if (visited.has(hash)) {
          continue;
        }

        visited.add(hash);

        const childNode: SearchNode = {
          state: succ.state,
          parent: currNode,
          move: succ.move,
          g: currNode.g + 1,
          pushed: succ.pushed,
        };

        queue.push(childNode);
      }

      const frontierSize = queue.length - head;
      if (frontierSize > maxFrontierSize) {
        maxFrontierSize = frontierSize;
      }
    }

    // Queue exhausted without finding a solution
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
