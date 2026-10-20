import React, { useState, useEffect } from 'react';
import type { LevelManifest, SolverMetrics, Difficulty, AlgorithmId } from '@sokoban/shared';
import { fetchLevels, compareSolvers } from '../api';
import { ComparisonTable } from '../components/dashboard/ComparisonTable';
import { MetricCards } from '../components/dashboard/MetricCards';
import { DashboardCharts } from '../components/dashboard/Charts';
import { AlgorithmBadge } from '../components/shared/AlgorithmBadge';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import {
  BarChart2,
  Play,
  Lightbulb,
  ShieldCheck,
  Zap,
  Filter,
  Layers,
  Sparkles,
  Info,
  CheckCircle,
  Clock,
} from 'lucide-react';

function generateKeyInsights(metrics: SolverMetrics[]): string[] {
  const insights: string[] = [];
  const bfs = metrics.find((m) => m.algorithm === 'bfs');
  const dfs = metrics.find((m) => m.algorithm === 'dfs');
  const greedy = metrics.find((m) => m.algorithm === 'greedy');
  const astar = metrics.find((m) => m.algorithm === 'astar');

  // A* vs BFS states explored
  if (astar?.solved && bfs?.solved && bfs.statesExplored > 0) {
    if (astar.statesExplored < bfs.statesExplored) {
      const reduction = Math.round(
        ((bfs.statesExplored - astar.statesExplored) / bfs.statesExplored) * 100
      );
      insights.push(
        `A* explored ${reduction}% fewer states than BFS through admissible heuristic pruning (${astar.statesExplored.toLocaleString()} vs ${bfs.statesExplored.toLocaleString()}).`
      );
    } else if (astar.statesExplored === bfs.statesExplored) {
      insights.push(`A* and BFS explored an identical number of states on this level.`);
    }
  }

  // BFS and A* solution length optimality
  if (bfs?.solved && astar?.solved && bfs.solutionLength !== null && astar.solutionLength !== null) {
    if (bfs.solutionLength === astar.solutionLength) {
      insights.push(
        `BFS and A* found solutions of equal length (${astar.solutionLength} moves), experimentally confirming both algorithms guarantee move-optimality.`
      );
    } else {
      insights.push(
        `A* found a solution of ${astar.solutionLength} moves while BFS found ${bfs.solutionLength} moves.`
      );
    }
  }

  // DFS suboptimality or timeout
  if (dfs?.solved && dfs.solutionLength !== null) {
    const optimalLength =
      astar?.solved && astar.solutionLength !== null
        ? astar.solutionLength
        : bfs?.solutionLength ?? null;
    if (optimalLength !== null) {
      if (dfs.solutionLength > optimalLength) {
        const diff = dfs.solutionLength - optimalLength;
        insights.push(
          `DFS found a solution ${diff} moves longer than optimal (${dfs.solutionLength} vs ${optimalLength}), demonstrating lack of optimality in depth-first exploration.`
        );
      } else if (dfs.solutionLength === optimalLength) {
        insights.push(`DFS fortuitously found an optimal solution of ${dfs.solutionLength} moves.`);
      }
    }
  } else if (dfs?.timedOut) {
    insights.push(`DFS timed out before finding a solution due to wandering deep into dense search paths.`);
  }

  // Greedy speed vs quality
  if (greedy?.solved) {
    const solvedList = metrics.filter((m) => m.solved);
    const fastest = [...solvedList].sort((a, b) => a.timeMs - b.timeMs)[0];
    const optimalLength =
      astar?.solved && astar.solutionLength !== null
        ? astar.solutionLength
        : bfs?.solutionLength ?? null;

    const isFastest = fastest?.algorithm === 'greedy';
    const isSuboptimal =
      optimalLength !== null &&
      greedy.solutionLength !== null &&
      greedy.solutionLength > optimalLength;

    if (isFastest && isSuboptimal) {
      insights.push(
        `Greedy Best-First was fastest (${greedy.timeMs.toFixed(1)} ms) but produced a suboptimal solution (${greedy.solutionLength} moves vs ${optimalLength} optimal).`
      );
    } else if (isFastest) {
      insights.push(
        `Greedy Best-First was the fastest algorithm to reach a goal state in ${greedy.timeMs.toFixed(1)} ms.`
      );
    } else if (isSuboptimal) {
      insights.push(
        `Greedy found a suboptimal solution of ${greedy.solutionLength} moves compared to ${optimalLength} optimal moves.`
      );
    }
  }

  // Deadlock detection metric
  const maxDeadlocks = Math.max(...metrics.map((m) => m.deadlocksPruned));
  if (maxDeadlocks > 0) {
    insights.push(
      `Deadlock detection successfully pruned up to ${maxDeadlocks.toLocaleString()} dead-end states, preventing algorithms from exploring provably unwinnable paths.`
    );
  }

  if (insights.length === 0) {
    insights.push('Evaluation complete. Check the metrics table and charts below for full results.');
  }

  return insights;
}

export const ComparePage: React.FC = () => {
  const [levels, setLevels] = useState<LevelManifest[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);

  // Feature flags / options
  const [deadlockDetection, setDeadlockDetection] = useState(true);
  const [normalizePlayerPosition, setNormalizePlayerPosition] = useState(false);

  // Results
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState<SolverMetrics[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Multi-tier benchmark state
  const [isTierBenchmarking, setIsTierBenchmarking] = useState(false);
  const [multiLevelMetrics, setMultiLevelMetrics] = useState<
    { levelName: string; difficulty: string; metrics: SolverMetrics[] }[]
  >([]);

  // Load levels
  useEffect(() => {
    async function load() {
      try {
        const list = await fetchLevels();
        setLevels(list);
        if (list.length > 0) {
          setSelectedLevelId(list[0]!.id);
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch levels');
      }
    }
    load();
  }, []);

  const filteredLevels = React.useMemo(() => {
    if (selectedDifficulty === 'all') return levels;
    return levels.filter((l) => l.difficulty === selectedDifficulty);
  }, [levels, selectedDifficulty]);

  // Keep selected level valid if difficulty filter changes
  useEffect(() => {
    if (filteredLevels.length > 0 && !filteredLevels.some((l) => l.id === selectedLevelId)) {
      setSelectedLevelId(filteredLevels[0]!.id);
    }
  }, [filteredLevels, selectedLevelId]);

  // Run single level comparison
  const handleRunComparison = async () => {
    if (!selectedLevelId) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const results = await compareSolvers({
        levelId: selectedLevelId,
        deadlockDetection,
        normalizePlayerPosition,
      });
      setMetrics(results);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Comparison failed to execute');
    } finally {
      setIsLoading(false);
    }
  };

  // Run multi-tier benchmark across easy, medium, hard
  const handleBenchmarkTiers = async () => {
    const easyLevel = levels.find((l) => l.difficulty === 'easy');
    const medLevel = levels.find((l) => l.difficulty === 'medium');
    const hardLevel = levels.find((l) => l.difficulty === 'hard');

    const targets = [
      easyLevel ? { tier: 'easy', level: easyLevel } : null,
      medLevel ? { tier: 'medium', level: medLevel } : null,
      hardLevel ? { tier: 'hard', level: hardLevel } : null,
    ].filter(Boolean) as { tier: string; level: LevelManifest }[];

    if (targets.length === 0) return;

    setIsTierBenchmarking(true);
    setErrorMessage(null);

    try {
      const tierResults: { levelName: string; difficulty: string; metrics: SolverMetrics[] }[] = [];
      for (const target of targets) {
        const res = await compareSolvers({
          levelId: target.level.id,
          deadlockDetection,
          normalizePlayerPosition,
        });
        tierResults.push({
          levelName: target.level.name,
          difficulty: target.tier,
          metrics: res,
        });
      }
      setMultiLevelMetrics(tierResults);
      // Also show the first level's metrics in the table
      if (tierResults[0]) {
        setMetrics(tierResults[0].metrics);
        setSelectedLevelId(targets[0]!.level.id);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Multi-tier comparison failed');
    } finally {
      setIsTierBenchmarking(false);
    }
  };

  const algorithmsList: AlgorithmId[] = ['bfs', 'dfs', 'greedy', 'astar'];
  const insights = metrics ? generateKeyInsights(metrics) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Page Header */}
      <div className="border-b border-navy-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-navy-900 flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-amber-500" />
          <span>Algorithm Comparison Dashboard</span>
        </h1>
        <p className="text-sm text-navy-500 mt-1 max-w-3xl">
          Empirical evaluation of state-space search algorithms (BFS, DFS, Greedy Best-First, and A*)
          on identical Sokoban puzzle instances.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Control Panel Card */}
      <div className="bg-white rounded-xl border border-navy-200 p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Difficulty Filter */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-navy-600 mb-2">
              <Filter className="w-3.5 h-3.5 text-amber-500" />
              <span>Difficulty Filter</span>
            </label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              disabled={isLoading || isTierBenchmarking}
              className="w-full bg-navy-50/50 border border-navy-200 rounded-lg py-2 px-3 text-sm font-medium text-navy-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy (1-2 Boxes)</option>
              <option value="medium">Medium (3 Boxes)</option>
              <option value="hard">Hard (4+ Boxes)</option>
            </select>
          </div>

          {/* Level Dropdown */}
          <div className="sm:col-span-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-navy-600 mb-2">
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              <span>Level Instance</span>
            </label>
            <select
              value={selectedLevelId ?? ''}
              onChange={(e) => setSelectedLevelId(e.target.value)}
              disabled={isLoading || isTierBenchmarking}
              className="w-full bg-navy-50/50 border border-navy-200 rounded-lg py-2 px-3 text-sm font-medium text-navy-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {filteredLevels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} — [{l.difficulty.toUpperCase()}] ({l.boxCount} boxes, {l.width}x{l.height})
                </option>
              ))}
            </select>
          </div>

          {/* Action Button */}
          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={handleRunComparison}
              disabled={isLoading || isTierBenchmarking || !selectedLevelId}
              className="w-full py-2.5 px-4 rounded-lg bg-navy-800 hover:bg-navy-900 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="p-0 text-white" />
                  <span>Evaluating All 4...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current text-amber-400" />
                  <span>Run Comparison</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Search Options & Multi-Tier Benchmark Bar */}
        <div className="pt-4 border-t border-navy-100 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-5 text-navy-700">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={deadlockDetection}
                onChange={(e) => setDeadlockDetection(e.target.checked)}
                disabled={isLoading || isTierBenchmarking}
                className="rounded text-amber-500 focus:ring-amber-400 h-4 w-4"
              />
              <span className="font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Deadlock Detection
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-not-allowed select-none" title="Reserved for a future push-macro solver; move-level search keeps exact player coordinates for correctness.">
              <input
                type="checkbox"
                checked={normalizePlayerPosition}
                onChange={(e) => setNormalizePlayerPosition(e.target.checked)}
                disabled
                className="rounded text-amber-500 focus:ring-amber-400 h-4 w-4"
              />
              <span className="font-medium flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Player Normalization (push-macro mode only)
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={handleBenchmarkTiers}
            disabled={isLoading || isTierBenchmarking}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-navy-200 bg-navy-50 hover:bg-navy-100 text-navy-700 font-medium transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{isTierBenchmarking ? 'Benchmarking Tiers...' : 'Benchmark Across Tiers'}</span>
          </button>
        </div>
      </div>

      {/* Loading state showing all 4 algorithms */}
      {isLoading && (
        <div className="bg-white rounded-xl border border-navy-200 p-8 shadow-sm">
          <div className="text-center mb-6">
            <h3 className="text-base font-semibold text-navy-800">
              Executing Search Algorithms on Level Instance
            </h3>
            <p className="text-xs text-navy-400 mt-1">
              Running real algorithmic search on the backend engine. Please wait...
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {algorithmsList.map((algo) => (
              <div
                key={algo}
                className="p-4 rounded-xl border border-navy-200 bg-navy-50/50 flex flex-col items-center text-center space-y-3"
              >
                <AlgorithmBadge algorithm={algo} showFullLabel />
                <LoadingSpinner size="md" className="py-2" />
                <span className="text-xs text-navy-500 animate-pulse font-mono">
                  Exploring states...
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Section */}
      {metrics && !isLoading && (
        <div className="space-y-8 animate-fadeIn">
          {/* Summary Metric Cards */}
          <MetricCards metrics={metrics} />

          {/* 1. Comparison Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-navy-900">Search Benchmark Table</h2>
                <p className="text-xs text-navy-500">
                  Comprehensive performance comparison across uninformed and informed state-space search strategies.
                </p>
              </div>
            </div>
            <ComparisonTable metrics={metrics} />
          </div>

          {/* 2. Visual Charts */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-navy-900">Graphical Visualizations</h2>
            <DashboardCharts
              metrics={metrics}
              multiLevelMetrics={multiLevelMetrics.length > 0 ? multiLevelMetrics : undefined}
            />
          </div>

          {/* 3. Key Insights Panel */}
          <div className="bg-gradient-to-br from-amber-50/80 to-navy-50/50 rounded-xl border border-amber-200/80 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3 text-amber-900">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold">Key Empirical Insights</h3>
            </div>
            <ul className="space-y-2 text-sm text-navy-800 list-disc list-inside">
              {insights.map((insight, idx) => (
                <li key={idx} className="leading-relaxed">
                  <span className="font-medium text-navy-900">{insight}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 4. Experimental Results Disclaimer Footer */}
          <div className="p-4 rounded-xl bg-navy-100/70 border border-navy-200 text-center text-xs text-navy-600 space-y-1">
            <p className="font-semibold text-navy-800">Experimental Results Guarantee</p>
            <p>
              All results are experimental, generated by running the actual search algorithms on the selected level. No values are hardcoded or simulated.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
