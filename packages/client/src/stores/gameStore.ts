import { create } from 'zustand';
import type {
  StaticBoard,
  SokobanState,
  Move,
  LevelManifest,
  SolverMetrics,
  AlgorithmId,
  Coord,
} from '@sokoban/shared';
import { DIRECTION_VECTORS } from '@sokoban/shared';

function checkIsSolved(state: SokobanState, board: StaticBoard): boolean {
  if (board.targets.length === 0) return false;
  const targetSet = new Set(board.targets.map((t: Coord) => `${t.x},${t.y}`));
  return state.boxes.every((b: Coord) => targetSet.has(`${b.x},${b.y}`));
}

function cloneState(state: SokobanState): SokobanState {
  return {
    player: { x: state.player.x, y: state.player.y },
    boxes: state.boxes.map((b) => ({ x: b.x, y: b.y })),
  };
}

export interface GameStoreState {
  // Level data
  levels: LevelManifest[];
  currentLevelId: string | null;
  board: StaticBoard | null;
  initialState: SokobanState | null;

  // Game state
  playerState: SokobanState | null;
  moveCount: number;
  pushCount: number;
  moveHistory: { state: SokobanState; move: Move; pushed: boolean }[];
  isSolved: boolean;

  // Solver
  solverResult: SolverMetrics | null;
  isAnimating: boolean;
  isSolving: boolean;
  selectedAlgorithm: AlgorithmId;

  // Actions
  setLevels: (levels: LevelManifest[]) => void;
  loadLevel: (board: StaticBoard, state: SokobanState, levelId: string) => void;
  makeMove: (move: Move) => boolean;
  undo: () => void;
  reset: () => void;
  setSolverResult: (result: SolverMetrics | null) => void;
  setIsAnimating: (v: boolean) => void;
  setIsSolving: (v: boolean) => void;
  setSelectedAlgorithm: (algo: AlgorithmId) => void;
  applyMove: (move: Move) => boolean;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  levels: [],
  currentLevelId: null,
  board: null,
  initialState: null,

  playerState: null,
  moveCount: 0,
  pushCount: 0,
  moveHistory: [],
  isSolved: false,

  solverResult: null,
  isAnimating: false,
  isSolving: false,
  selectedAlgorithm: 'bfs',

  setLevels: (levels: LevelManifest[]) => set({ levels }),

  loadLevel: (board: StaticBoard, state: SokobanState, levelId: string) => {
    const freshState = cloneState(state);
    freshState.boxes.sort((a, b) => a.x - b.x || a.y - b.y);
    set({
      board,
      initialState: cloneState(freshState),
      currentLevelId: levelId,
      playerState: freshState,
      moveCount: 0,
      pushCount: 0,
      moveHistory: [],
      isSolved: checkIsSolved(freshState, board),
      solverResult: null,
      isAnimating: false,
      isSolving: false,
    });
  },

  makeMove: (move: Move): boolean => {
    const { board, playerState, moveHistory, moveCount, pushCount, isSolved } = get();
    if (!board || !playerState || isSolved) return false;

    const vec = DIRECTION_VECTORS[move];
    if (!vec) return false;

    const nx = playerState.player.x + vec.dx;
    const ny = playerState.player.y + vec.dy;

    // Boundary check
    if (nx < 0 || nx >= board.width || ny < 0 || ny >= board.height) return false;
    // Wall check
    const targetCell = board.cells[ny]?.[nx];
    if (targetCell === 'wall') return false;

    // Check if box at target
    const boxIndex = playerState.boxes.findIndex((b) => b.x === nx && b.y === ny);
    let pushed = false;
    let nextBoxes: Coord[];

    if (boxIndex !== -1) {
      // Pushing box
      const bx = nx + vec.dx;
      const by = ny + vec.dy;

      // Box boundary check
      if (bx < 0 || bx >= board.width || by < 0 || by >= board.height) return false;
      // Box wall check
      if (board.cells[by]?.[bx] === 'wall') return false;
      // Box into another box check
      if (playerState.boxes.some((b) => b.x === bx && b.y === by)) return false;

      // Valid push
      nextBoxes = playerState.boxes.map((b, idx) =>
        idx === boxIndex ? { x: bx, y: by } : { x: b.x, y: b.y }
      );
      nextBoxes.sort((a, b) => a.x - b.x || a.y - b.y);
      pushed = true;
    } else {
      nextBoxes = playerState.boxes.map((b) => ({ x: b.x, y: b.y }));
    }

    const nextState: SokobanState = {
      player: { x: nx, y: ny },
      boxes: nextBoxes,
    };

    const solved = checkIsSolved(nextState, board);

    set({
      playerState: nextState,
      moveCount: moveCount + 1,
      pushCount: pushed ? pushCount + 1 : pushCount,
      moveHistory: [...moveHistory, { state: cloneState(playerState), move, pushed }],
      isSolved: solved,
    });

    return true;
  },

  applyMove: (move: Move): boolean => {
    const { board, playerState, moveCount, pushCount } = get();
    if (!board || !playerState) return false;

    const vec = DIRECTION_VECTORS[move];
    if (!vec) return false;

    const nx = playerState.player.x + vec.dx;
    const ny = playerState.player.y + vec.dy;

    if (nx < 0 || nx >= board.width || ny < 0 || ny >= board.height) return false;
    if (board.cells[ny]?.[nx] === 'wall') return false;

    const boxIndex = playerState.boxes.findIndex((b) => b.x === nx && b.y === ny);
    let pushed = false;
    let nextBoxes: Coord[];

    if (boxIndex !== -1) {
      const bx = nx + vec.dx;
      const by = ny + vec.dy;

      if (bx < 0 || bx >= board.width || by < 0 || by >= board.height) return false;
      if (board.cells[by]?.[bx] === 'wall') return false;
      if (playerState.boxes.some((b) => b.x === bx && b.y === by)) return false;

      nextBoxes = playerState.boxes.map((b, idx) =>
        idx === boxIndex ? { x: bx, y: by } : { x: b.x, y: b.y }
      );
      nextBoxes.sort((a, b) => a.x - b.x || a.y - b.y);
      pushed = true;
    } else {
      nextBoxes = playerState.boxes.map((b) => ({ x: b.x, y: b.y }));
    }

    const nextState: SokobanState = {
      player: { x: nx, y: ny },
      boxes: nextBoxes,
    };

    const solved = checkIsSolved(nextState, board);

    set({
      playerState: nextState,
      moveCount: moveCount + 1,
      pushCount: pushed ? pushCount + 1 : pushCount,
      isSolved: solved,
    });

    return true;
  },

  undo: () => {
    const { moveHistory, board } = get();
    if (moveHistory.length === 0 || !board) return;

    const prevHistory = [...moveHistory];
    const lastItem = prevHistory.pop()!;

    set({
      playerState: lastItem.state,
      moveCount: Math.max(0, get().moveCount - 1),
      pushCount: lastItem.pushed ? Math.max(0, get().pushCount - 1) : get().pushCount,
      moveHistory: prevHistory,
      isSolved: checkIsSolved(lastItem.state, board),
    });
  },

  reset: () => {
    const { initialState, board } = get();
    if (!initialState || !board) return;

    const resetState = cloneState(initialState);
    set({
      playerState: resetState,
      moveCount: 0,
      pushCount: 0,
      moveHistory: [],
      isSolved: checkIsSolved(resetState, board),
      isAnimating: false,
    });
  },

  setSolverResult: (result: SolverMetrics | null) => set({ solverResult: result }),
  setIsAnimating: (isAnimating: boolean) => set({ isAnimating }),
  setIsSolving: (isSolving: boolean) => set({ isSolving }),
  setSelectedAlgorithm: (selectedAlgorithm: AlgorithmId) => set({ selectedAlgorithm }),
}));
