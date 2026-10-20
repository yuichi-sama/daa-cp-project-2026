import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { Move, AlgorithmId } from '@sokoban/shared';
import {
  ANIMATION_PUSH_STEP_MS,
  ANIMATION_START_DELAY_MS,
  ANIMATION_STEP_MS,
  DIRECTION_VECTORS,
} from '@sokoban/shared';
import { useGameStore } from '../stores/gameStore';
import { fetchLevels, fetchLevel, solvePuzzle } from '../api';
import { Board } from '../components/game/Board';
import { Controls } from '../components/game/Controls';
import { LevelSelector } from '../components/shared/LevelSelector';
import { AlgorithmBadge } from '../components/shared/AlgorithmBadge';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import {
  Trophy,
  Play,
  Square,
  Sparkles,
  Footprints,
  Box,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Cpu,
} from 'lucide-react';

export const PlayPage: React.FC = () => {
  const {
    levels,
    setLevels,
    currentLevelId,
    board,
    initialState,
    playerState,
    moveCount,
    pushCount,
    moveHistory,
    isSolved,
    solverResult,
    isAnimating,
    isSolving,
    selectedAlgorithm,
    loadLevel,
    makeMove,
    applyMove,
    undo,
    reset,
    setSolverResult,
    setIsAnimating,
    setIsSolving,
    setSelectedAlgorithm,
  } = useGameStore();

  const [isLoadingLevel, setIsLoadingLevel] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [playerDirection, setPlayerDirection] = useState<'up' | 'down' | 'left' | 'right'>('down');
  const animationCancelledRef = useRef(false);

  // Load levels on initial mount
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const manifestList = await fetchLevels();
        if (mounted) {
          setLevels(manifestList);
          if (manifestList.length > 0 && !currentLevelId) {
            await handleSelectLevel(manifestList[0]!.id);
          }
        }
      } catch (err) {
        if (mounted) {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load levels list');
        }
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSelectLevel = async (levelId: string) => {
    setIsLoadingLevel(true);
    setErrorMessage(null);
    animationCancelledRef.current = true;
    setIsAnimating(false);
    try {
      const data = await fetchLevel(levelId);
      loadLevel(data.board, data.initialState, levelId);
      setPlayerDirection('down');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error fetching level data');
    } finally {
      setIsLoadingLevel(false);
    }
  };

  // Move handler
  const handleMove = useCallback(
    (move: Move) => {
      if (isAnimating || isSolved) return;
      setPlayerDirection(move);
      makeMove(move);
    },
    [isAnimating, isSolved, makeMove]
  );

  // Keyboard navigation listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if inside input / select
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          handleMove('up');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          handleMove('down');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          handleMove('left');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          handleMove('right');
          break;
        case 'z':
        case 'Z':
          if (!isAnimating) undo();
          break;
        case 'r':
        case 'R':
          if (!isAnimating) {
            animationCancelledRef.current = true;
            setIsAnimating(false);
            reset();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove, isAnimating, undo, reset, setIsAnimating]);

  // Solver trigger
  const handleSolve = async () => {
    if (!currentLevelId) return;
    setIsSolving(true);
    setErrorMessage(null);
    try {
      const result = await solvePuzzle({
        levelId: currentLevelId,
        algorithm: selectedAlgorithm,
        deadlockDetection: true,
      });
      setSolverResult(result);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Solver failed to run');
    } finally {
      setIsSolving(false);
    }
  };

  // Playback animation
  const handleAnimate = async () => {
    if (!solverResult?.path || solverResult.path.length === 0 || !initialState || !board) return;

    animationCancelledRef.current = false;
    reset(); // start from initial state
    // reset() also clears the store's animation flag, so set this afterwards.
    setIsAnimating(true);

    try {
      // Small delay before moves start so the reset state is visible.
      await new Promise((r) => setTimeout(r, ANIMATION_START_DELAY_MS));

      // Keep a local copy so we can identify pushes between React renders.
      let animationState = {
        player: { ...initialState.player },
        boxes: initialState.boxes.map((box) => ({ ...box })),
      };

      for (let i = 0; i < solverResult.path.length; i++) {
        if (animationCancelledRef.current) break;
        const move = solverResult.path[i]!;
        const vector = DIRECTION_VECTORS[move];
        if (!vector) {
          setErrorMessage(`Animation stopped: unknown solver move at step ${i + 1}.`);
          break;
        }
        const nextPlayer = {
          x: animationState.player.x + vector.dx,
          y: animationState.player.y + vector.dy,
        };
        const boxIndex = animationState.boxes.findIndex(
          (box) => box.x === nextPlayer.x && box.y === nextPlayer.y
        );
        const pushed = boxIndex !== -1;
        setPlayerDirection(move);
        const applied = applyMove(move);
        if (!applied) {
          setErrorMessage(`Animation stopped: solver move ${i + 1} (${move}) was invalid for the current board.`);
          break;
        }

        animationState = {
          player: nextPlayer,
          boxes: animationState.boxes.map((box, index) =>
            index === boxIndex
              ? { x: box.x + vector.dx, y: box.y + vector.dy }
              : { ...box }
          ),
        };
        await new Promise((r) =>
          setTimeout(r, pushed ? ANIMATION_PUSH_STEP_MS : ANIMATION_STEP_MS)
        );
      }
    } finally {
      setIsAnimating(false);
    }
  };

  const handleStopAnimation = () => {
    animationCancelledRef.current = true;
    setIsAnimating(false);
  };

  // Next level navigation
  const handleNextLevel = () => {
    const currentIndex = levels.findIndex((l) => l.id === currentLevelId);
    if (currentIndex >= 0 && currentIndex < levels.length - 1) {
      const nextLevel = levels[currentIndex + 1]!;
      handleSelectLevel(nextLevel.id);
    }
  };

  const algorithms: AlgorithmId[] = ['bfs', 'dfs', 'greedy', 'astar'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Bar / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-navy-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">
            Interactive Play & Solver
          </h1>
          <p className="text-sm text-navy-500">
            Move boxes onto targets using Arrow keys or WASD, or run graph search solvers.
          </p>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-lg border border-navy-200 shadow-sm">
            <Footprints className="w-4 h-4 text-mint-500" />
            <div className="text-xs">
              <span className="text-navy-400 block leading-none">Moves</span>
              <span className="font-mono font-bold text-navy-800 text-base">{moveCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-lg border border-navy-200 shadow-sm">
            <Box className="w-4 h-4 text-amber-500" />
            <div className="text-xs">
              <span className="text-navy-400 block leading-none">Pushes</span>
              <span className="font-mono font-bold text-navy-800 text-base">{pushCount}</span>
            </div>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Play Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Panel: The Sokoban Board (7 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col items-center">
          <div className="relative w-full min-h-[460px] bg-navy-100/60 rounded-2xl border border-navy-200/80 p-6 flex flex-col items-center justify-center overflow-auto shadow-inner">
            {isLoadingLevel ? (
              <LoadingSpinner message="Loading level..." />
            ) : board && playerState ? (
              <div className="relative">
                <Board
                  board={board}
                  state={playerState}
                  playerDirection={playerDirection}
                />

                {/* Solved Overlay Dialog */}
                {isSolved && (
                  <div className="absolute inset-0 bg-navy-900/85 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-6 text-center text-white z-30 animate-fadeIn">
                    <div className="w-16 h-16 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center mb-3 animate-bounce">
                      <Trophy className="w-9 h-9" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-amber-300">Puzzle Solved!</h2>
                    <p className="text-xs text-navy-200 mt-1 max-w-xs">
                      All boxes placed on target destinations. Great problem solving!
                    </p>

                    <div className="grid grid-cols-2 gap-4 my-4 font-mono">
                      <div className="bg-navy-800/80 px-4 py-2 rounded-lg border border-navy-700">
                        <span className="text-[11px] text-navy-300 block">Total Moves</span>
                        <span className="text-xl font-bold text-mint-300">{moveCount}</span>
                      </div>
                      <div className="bg-navy-800/80 px-4 py-2 rounded-lg border border-navy-700">
                        <span className="text-[11px] text-navy-300 block">Total Pushes</span>
                        <span className="text-xl font-bold text-amber-300">{pushCount}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={reset}
                        className="px-4 py-2 rounded-lg bg-navy-700 hover:bg-navy-600 text-xs font-semibold text-white transition-colors"
                      >
                        Replay
                      </button>
                      <button
                        type="button"
                        onClick={handleNextLevel}
                        className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-xs font-bold text-navy-950 transition-colors shadow-md"
                      >
                        Next Level →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-navy-400 text-sm">Please select a level to begin.</div>
            )}
          </div>

          {/* Keyboard tip footer */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-navy-500">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-navy-200 font-mono text-navy-700">W</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-navy-200 font-mono text-navy-700">A</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-navy-200 font-mono text-navy-700">S</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-navy-200 font-mono text-navy-700">D</kbd> or
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-navy-200 font-mono text-navy-700">Arrows</kbd> to move
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-navy-200 font-mono text-navy-700">Z</kbd> Undo
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-navy-200 font-mono text-navy-700">R</kbd> Reset
            </span>
          </div>
        </div>

        {/* Right Panel: Controls + Solver (5 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* Level Selection Box */}
          <div className="bg-white rounded-xl border border-navy-200 p-5 shadow-sm space-y-4">
            <LevelSelector
              levels={levels}
              selectedId={currentLevelId}
              onChange={handleSelectLevel}
              disabled={isAnimating || isSolving}
            />
          </div>

          {/* On-Screen D-Pad and Game Controls */}
          <div className="bg-white rounded-xl border border-navy-200 p-5 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-navy-600 mb-3 text-center">
              Controls
            </h3>
            <Controls
              onMove={handleMove}
              onUndo={undo}
              onReset={reset}
              canUndo={moveHistory.length > 0}
              disabled={isAnimating || isLoadingLevel}
            />
          </div>

          {/* Solver Section */}
          <div className="bg-white rounded-xl border border-navy-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-navy-800">State-Space Solver</h3>
              </div>
              <span className="text-[11px] text-navy-400">DAA Engine</span>
            </div>

            {/* Algorithm Choice */}
            <div className="grid grid-cols-2 gap-2">
              {algorithms.map((algo) => {
                const isSelected = selectedAlgorithm === algo;
                return (
                  <button
                    key={algo}
                    type="button"
                    onClick={() => setSelectedAlgorithm(algo)}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm ring-1 ring-amber-400'
                        : 'border-navy-200 bg-white text-navy-700 hover:bg-navy-50'
                    }`}
                  >
                    <AlgorithmBadge algorithm={algo} />
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />}
                  </button>
                );
              })}
            </div>

            {/* Solve Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSolve}
                disabled={isSolving || isAnimating || !currentLevelId}
                className="w-full py-2.5 px-4 rounded-lg bg-navy-800 hover:bg-navy-900 text-white font-medium text-xs shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSolving ? (
                  <>
                    <LoadingSpinner size="sm" className="p-0 text-white" />
                    <span>Searching State-Space...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Run Solver</span>
                  </>
                )}
              </button>
            </div>

            {/* Solver Result Metrics */}
            {solverResult && (
              <div className="bg-navy-50 rounded-lg p-3 border border-navy-200 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-navy-800 flex items-center gap-1.5">
                    <AlgorithmBadge algorithm={solverResult.algorithm} />
                    <span>Outcome:</span>
                  </span>
                  <span
                    className={`font-semibold ${
                      solverResult.solved
                        ? 'text-emerald-700'
                        : solverResult.timedOut
                        ? 'text-amber-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {solverResult.solved
                      ? 'Solved!'
                      : solverResult.timedOut
                      ? 'Timed Out'
                      : 'No Solution'}
                  </span>
                </div>

                {!solverResult.solved && !solverResult.timedOut && (
                  <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2 py-1.5">
                    {solverResult.statesExplored === 0 && solverResult.deadlocksPruned > 0
                      ? 'The starting position contains a detected deadlock. Choose another level or reset the puzzle.'
                      : 'This search exhausted its reachable state space without finding a valid solution.'}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 font-mono text-navy-700 text-[11px] pt-1 border-t border-navy-200/60">
                  <div>
                    <span className="text-navy-400 block font-sans">Time:</span>
                    <span className="font-bold">{solverResult.timeMs.toFixed(1)} ms</span>
                  </div>
                  <div>
                    <span className="text-navy-400 block font-sans">Explored:</span>
                    <span className="font-bold">{solverResult.statesExplored.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-navy-400 block font-sans">Solution Moves:</span>
                    <span className="font-bold">{solverResult.solutionLength ?? '—'}</span>
                  </div>
                  <div>
                    <span className="text-navy-400 block font-sans">Push Count:</span>
                    <span className="font-bold">{solverResult.pushCount ?? '—'}</span>
                  </div>
                </div>

                {/* Animation controls */}
                {solverResult.solved && solverResult.path && solverResult.path.length > 0 && (
                  <div className="pt-2">
                    {isAnimating ? (
                      <button
                        type="button"
                        onClick={handleStopAnimation}
                        className="w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Stop Animation</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleAnimate}
                        className="w-full py-2 px-3 rounded-lg bg-mint-400 hover:bg-mint-500 text-navy-900 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Animate Solution ({solverResult.path.length} steps)</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
