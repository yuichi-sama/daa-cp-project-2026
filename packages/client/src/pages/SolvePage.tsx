import React, { useState, useEffect, useRef } from 'react';
import type {
  LevelManifest,
  AlgorithmId,
  SolverMetrics,
  SolveProgressEvent,
  SolveDoneEvent,
  StaticBoard,
  SokobanState,
  Move,
  Coord,
} from '@sokoban/shared';
import { DIRECTION_VECTORS } from '@sokoban/shared';
import { fetchLevels, fetchLevel, createSolveStream } from '../api';
import { LevelSelector } from '../components/shared/LevelSelector';
import { AlgorithmBadge } from '../components/shared/AlgorithmBadge';
import { Board } from '../components/game/Board';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Cpu,
  Layers,
  StopCircle,
  Clock,
  Zap,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const SolvePage: React.FC = () => {
  const [levels, setLevels] = useState<LevelManifest[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [selectedAlgo, setSelectedAlgo] = useState<AlgorithmId>('astar');
  const [deadlockDetection, setDeadlockDetection] = useState(true);
  const [normalizePlayer, setNormalizePlayer] = useState(false);

  // Level preview data
  const [board, setBoard] = useState<StaticBoard | null>(null);
  const [initialState, setInitialState] = useState<SokobanState | null>(null);
  const [isLoadingLevel, setIsLoadingLevel] = useState(false);

  // SSE Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [liveExplored, setLiveExplored] = useState(0);
  const [liveFrontier, setLiveFrontier] = useState(0);
  const [solverResult, setSolverResult] = useState<SolverMetrics | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Step-through playback state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlayingPath, setIsPlayingPath] = useState(false);
  const playbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load levels on mount
  useEffect(() => {
    async function load() {
      try {
        const list = await fetchLevels();
        setLevels(list);
        if (list.length > 0) {
          handleSelectLevel(list[0]!.id);
        }
      } catch (err) {
        setErrorText(err instanceof Error ? err.message : 'Failed to fetch levels');
      }
    }
    load();
  }, []);

  const handleSelectLevel = async (levelId: string) => {
    handleStopStream();
    setIsLoadingLevel(true);
    setErrorText(null);
    setSolverResult(null);
    setCurrentStepIndex(0);
    setIsPlayingPath(false);
    setSelectedLevelId(levelId);

    try {
      const data = await fetchLevel(levelId);
      setBoard(data.board);
      setInitialState(data.initialState);
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Failed to load level data');
    } finally {
      setIsLoadingLevel(false);
    }
  };

  // Start live SSE search
  const handleStartStream = () => {
    if (!selectedLevelId) return;

    handleStopStream();
    setErrorText(null);
    setSolverResult(null);
    setLiveExplored(0);
    setLiveFrontier(0);
    setElapsedMs(0);
    setIsStreaming(true);

    startTimeRef.current = performance.now();
    timerRef.current = setInterval(() => {
      setElapsedMs(Math.round(performance.now() - startTimeRef.current));
    }, 50);

    const es = createSolveStream(selectedLevelId, selectedAlgo, {
      deadlockDetection,
      normalizePlayerPosition: normalizePlayer,
    });
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as
          | SolveProgressEvent
          | SolveDoneEvent
          | { type: 'error'; error: string };

        if (data.type === 'progress') {
          setLiveExplored(data.statesExplored);
          setLiveFrontier(data.frontierSize);
        } else if (data.type === 'done') {
          setSolverResult(data.result);
          handleStopStream();
        } else if (data.type === 'error') {
          setErrorText(data.error || 'Solver encountered an error');
          handleStopStream();
        }
      } catch (e) {
        console.error('Error parsing SSE message', e);
      }
    };

    es.onerror = (err) => {
      console.error('SSE connection error', err);
      setErrorText('Connection to solver stream interrupted.');
      handleStopStream();
    };
  };

  const handleStopStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsStreaming(false);
  };

  useEffect(() => {
    return () => {
      handleStopStream();
      if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);
    };
  }, []);

  // Compute playback board state at currentStepIndex
  const currentPlaybackState = React.useMemo<SokobanState | null>(() => {
    if (!initialState || !board) return null;
    if (!solverResult?.path || solverResult.path.length === 0 || currentStepIndex === 0) {
      return initialState;
    }

    let p = { ...initialState.player };
    let boxes = initialState.boxes.map((b) => ({ ...b }));

    for (let i = 0; i < currentStepIndex && i < solverResult.path.length; i++) {
      const move = solverResult.path[i]!;
      const vec = DIRECTION_VECTORS[move];
      if (!vec) continue;

      const nx = p.x + vec.dx;
      const ny = p.y + vec.dy;
      const boxIdx = boxes.findIndex((b) => b.x === nx && b.y === ny);

      if (boxIdx !== -1) {
        boxes = boxes.map((b, idx) =>
          idx === boxIdx ? { x: nx + vec.dx, y: ny + vec.dy } : b
        );
        boxes.sort((a, b) => a.x - b.x || a.y - b.y);
      }
      p = { x: nx, y: ny };
    }

    return { player: p, boxes };
  }, [initialState, board, solverResult, currentStepIndex]);

  // Automated playback timer
  useEffect(() => {
    if (!isPlayingPath || !solverResult?.path) return;

    if (currentStepIndex >= solverResult.path.length) {
      setIsPlayingPath(false);
      return;
    }

    playbackTimerRef.current = setTimeout(() => {
      setCurrentStepIndex((prev) => prev + 1);
    }, 200);

    return () => {
      if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);
    };
  }, [isPlayingPath, currentStepIndex, solverResult]);

  const algos: AlgorithmId[] = ['bfs', 'dfs', 'greedy', 'astar'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-navy-200">
        <h1 className="text-2xl font-bold tracking-tight text-navy-900 flex items-center gap-2">
          <Activity className="w-6 h-6 text-amber-500" />
          <span>Real-Time State-Space Search Monitor</span>
        </h1>
        <p className="text-sm text-navy-500 mt-1">
          Stream live frontier and exploration metrics via Server-Sent Events (SSE) while the search algorithm executes.
        </p>
      </div>

      {errorText && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{errorText}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Settings & Live Metrics (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Level & Algo Selection Card */}
          <div className="bg-white rounded-xl border border-navy-200 p-5 shadow-sm space-y-4">
            <LevelSelector
              levels={levels}
              selectedId={selectedLevelId}
              onChange={handleSelectLevel}
              disabled={isStreaming}
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-navy-600 mb-2">
                Search Algorithm
              </label>
              <div className="grid grid-cols-2 gap-2">
                {algos.map((algo) => (
                  <button
                    key={algo}
                    type="button"
                    onClick={() => setSelectedAlgo(algo)}
                    disabled={isStreaming}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-between transition-all ${
                      selectedAlgo === algo
                        ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm ring-1 ring-amber-400'
                        : 'border-navy-200 bg-white text-navy-700 hover:bg-navy-50'
                    }`}
                  >
                    <AlgorithmBadge algorithm={algo} />
                    {selectedAlgo === algo && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Heuristic / Deadlock Options */}
            <div className="pt-2 border-t border-navy-100 space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-navy-700 select-none">
                <input
                  type="checkbox"
                  checked={deadlockDetection}
                  onChange={(e) => setDeadlockDetection(e.target.checked)}
                  disabled={isStreaming}
                  className="rounded text-amber-500 focus:ring-amber-400 h-4 w-4"
                />
                <span className="font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Deadlock Detection (Corner / Wall Freeze Pruning)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-not-allowed text-navy-700 select-none" title="Reserved for a future push-macro solver; move-level search keeps exact player coordinates for correctness.">
                <input
                  type="checkbox"
                  checked={normalizePlayer}
                  onChange={(e) => setNormalizePlayer(e.target.checked)}
                  disabled
                  className="rounded text-amber-500 focus:ring-amber-400 h-4 w-4"
                />
                <span className="font-medium flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Player Reachability Normalization (push-macro mode only)
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="pt-3">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStopStream}
                  className="w-full py-2.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <StopCircle className="w-4 h-4" />
                  <span>Abort Search Stream</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartStream}
                  disabled={!selectedLevelId || isLoadingLevel}
                  className="w-full py-2.5 px-4 rounded-lg bg-navy-800 hover:bg-navy-900 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-current text-amber-400" />
                  <span>Start Streaming Solve</span>
                </button>
              )}
            </div>
          </div>

          {/* Live Progress Gauge Card */}
          <div className="bg-white rounded-xl border border-navy-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-navy-600 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-amber-500" />
                Live Search Telemetry
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                  isStreaming
                    ? 'bg-amber-100 text-amber-800 animate-pulse'
                    : solverResult
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-navy-100 text-navy-600'
                }`}
              >
                {isStreaming ? 'Streaming...' : solverResult ? 'Search Complete' : 'Idle'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-navy-50 border border-navy-100">
                <span className="text-[11px] text-navy-400 block mb-0.5">Elapsed Time</span>
                <span className="font-mono text-lg font-bold text-navy-900">
                  {isStreaming
                    ? `${(elapsedMs / 1000).toFixed(1)}s`
                    : solverResult
                    ? `${(solverResult.timeMs / 1000).toFixed(2)}s`
                    : '0.0s'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-navy-50 border border-navy-100">
                <span className="text-[11px] text-navy-400 block mb-0.5">States Explored</span>
                <span className="font-mono text-lg font-bold text-navy-900">
                  {isStreaming
                    ? liveExplored.toLocaleString()
                    : solverResult
                    ? solverResult.statesExplored.toLocaleString()
                    : '0'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-navy-50 border border-navy-100">
                <span className="text-[11px] text-navy-400 block mb-0.5">Frontier Queue</span>
                <span className="font-mono text-lg font-bold text-navy-900">
                  {isStreaming
                    ? liveFrontier.toLocaleString()
                    : solverResult
                    ? solverResult.maxFrontierSize.toLocaleString()
                    : '0'}
                </span>
              </div>
            </div>

            {/* Pulsing Search Bar */}
            {isStreaming && (
              <div className="w-full bg-navy-100 rounded-full h-2 overflow-hidden">
                <div className="bg-amber-500 h-2 rounded-full w-2/3 animate-[pulse_1s_ease-in-out_infinite]" />
              </div>
            )}
          </div>

          {/* Result Summary Card */}
          {solverResult && (
            <div className="bg-white rounded-xl border border-navy-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-navy-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Execution Metrics</span>
                </h3>
                <AlgorithmBadge algorithm={solverResult.algorithm} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-navy-50 p-2.5 rounded-lg border border-navy-100">
                  <span className="text-navy-400 font-sans block text-[11px]">Execution Time</span>
                  <span className="font-bold text-navy-900">{solverResult.timeMs.toFixed(2)} ms</span>
                </div>
                <div className="bg-navy-50 p-2.5 rounded-lg border border-navy-100">
                  <span className="text-navy-400 font-sans block text-[11px]">States Generated</span>
                  <span className="font-bold text-navy-900">
                    {solverResult.statesGenerated.toLocaleString()}
                  </span>
                </div>
                <div className="bg-navy-50 p-2.5 rounded-lg border border-navy-100">
                  <span className="text-navy-400 font-sans block text-[11px]">Optimal Moves</span>
                  <span className="font-bold text-navy-900">
                    {solverResult.solutionLength ?? 'N/A'}
                  </span>
                </div>
                <div className="bg-navy-50 p-2.5 rounded-lg border border-navy-100">
                  <span className="text-navy-400 font-sans block text-[11px]">Total Pushes</span>
                  <span className="font-bold text-navy-900">{solverResult.pushCount ?? 'N/A'}</span>
                </div>
                <div className="bg-navy-50 p-2.5 rounded-lg border border-navy-100">
                  <span className="text-navy-400 font-sans block text-[11px]">Peak RAM</span>
                  <span className="font-bold text-navy-900">
                    {solverResult.peakMemoryMb.toFixed(2)} MB
                  </span>
                </div>
                <div className="bg-navy-50 p-2.5 rounded-lg border border-navy-100">
                  <span className="text-navy-400 font-sans block text-[11px]">Deadlocks Pruned</span>
                  <span className="font-bold text-emerald-700">
                    {solverResult.deadlocksPruned.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Board & Step-Through Playback (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center space-y-4">
          <div className="w-full min-h-[460px] bg-navy-100/60 rounded-2xl border border-navy-200/80 p-6 flex flex-col items-center justify-center overflow-auto shadow-inner">
            {isLoadingLevel ? (
              <LoadingSpinner message="Loading level preview..." />
            ) : board && currentPlaybackState ? (
              <Board
                board={board}
                state={currentPlaybackState}
                cellSize={42}
              />
            ) : (
              <div className="text-navy-400 text-sm">Select a level to view preview</div>
            )}
          </div>

          {/* Step-Through Playback Toolbar */}
          {solverResult?.path && solverResult.path.length > 0 && (
            <div className="w-full bg-white rounded-xl border border-navy-200 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs text-navy-600">
                <span className="font-semibold flex items-center gap-1.5">
                  <span>Step-Through Playback:</span>
                  <span className="font-mono text-amber-600 font-bold">
                    {currentStepIndex} / {solverResult.path.length}
                  </span>
                </span>
                {currentStepIndex > 0 && (
                  <span className="font-mono uppercase bg-navy-100 px-2 py-0.5 rounded text-[11px]">
                    Move: {solverResult.path[currentStepIndex - 1]}
                  </span>
                )}
              </div>

              {/* Slider */}
              <input
                type="range"
                min={0}
                max={solverResult.path.length}
                value={currentStepIndex}
                onChange={(e) => {
                  setIsPlayingPath(false);
                  setCurrentStepIndex(parseInt(e.target.value, 10));
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />

              {/* Stepper Buttons */}
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsPlayingPath(false);
                    setCurrentStepIndex(0);
                  }}
                  disabled={currentStepIndex === 0}
                  className="p-2 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50 disabled:opacity-40"
                  title="First Step"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsPlayingPath(false);
                    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
                  }}
                  disabled={currentStepIndex === 0}
                  className="p-2 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50 disabled:opacity-40"
                  title="Previous Step"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsPlayingPath(!isPlayingPath)}
                  className="py-2 px-4 rounded-lg bg-navy-800 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-navy-900 shadow-sm"
                >
                  {isPlayingPath ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current text-amber-400" />
                      <span>Play Path</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsPlayingPath(false);
                    setCurrentStepIndex((prev) =>
                      Math.min(solverResult.path!.length, prev + 1)
                    );
                  }}
                  disabled={currentStepIndex >= solverResult.path.length}
                  className="p-2 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50 disabled:opacity-40"
                  title="Next Step"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
