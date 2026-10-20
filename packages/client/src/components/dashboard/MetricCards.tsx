import React from 'react';
import type { SolverMetrics } from '@sokoban/shared';
import { Award, Zap, Compass, Cpu } from 'lucide-react';
import { AlgorithmBadge } from '../shared/AlgorithmBadge';

interface MetricCardsProps {
  metrics: SolverMetrics[];
  className?: string;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ metrics, className = '' }) => {
  if (!metrics || metrics.length === 0) return null;

  const solved = metrics.filter((m) => m.solved);

  // Best algorithm by states explored
  const bestStatesMetric = [...metrics].sort((a, b) => a.statesExplored - b.statesExplored)[0];

  // Fastest algorithm by time (from solved ones)
  const fastestMetric = solved.length > 0
    ? [...solved].sort((a, b) => a.timeMs - b.timeMs)[0]
    : null;

  // Optimal solution length (minimum moves among solved)
  const optimalMetric = solved.length > 0
    ? [...solved]
        .filter((m) => m.solutionLength !== null)
        .sort((a, b) => (a.solutionLength ?? Infinity) - (b.solutionLength ?? Infinity))[0]
    : null;

  // Total states explored across all algorithms
  const totalStatesExplored = metrics.reduce((sum, m) => sum + m.statesExplored, 0);

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {/* Best By State Space Exploration */}
      <div className="bg-white rounded-xl border border-navy-200 p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-navy-500">
            Most Efficient
          </span>
          <div className="w-8 h-8 rounded-lg bg-mint-50 flex items-center justify-center text-mint-500">
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
        </div>
        <div className="mt-2">
          {bestStatesMetric ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-navy-900">
                  {bestStatesMetric.statesExplored.toLocaleString()}
                </span>
                <span className="text-xs text-navy-400">states</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <AlgorithmBadge algorithm={bestStatesMetric.algorithm} />
                <span className="text-xs text-navy-500">minimal expansion</span>
              </div>
            </>
          ) : (
            <span className="text-sm text-navy-400">N/A</span>
          )}
        </div>
      </div>

      {/* Fastest Algorithm */}
      <div className="bg-white rounded-xl border border-navy-200 p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-navy-500">
            Fastest Solver
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
            <Zap className="w-4 h-4 text-amber-600" />
          </div>
        </div>
        <div className="mt-2">
          {fastestMetric ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-navy-900">
                  {fastestMetric.timeMs.toFixed(1)}
                </span>
                <span className="text-xs text-navy-400">ms</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <AlgorithmBadge algorithm={fastestMetric.algorithm} />
                <span className="text-xs text-navy-500">lowest runtime</span>
              </div>
            </>
          ) : (
            <span className="text-sm text-navy-400">No solved results</span>
          )}
        </div>
      </div>

      {/* Optimal Solution Length */}
      <div className="bg-white rounded-xl border border-navy-200 p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-navy-500">
            Optimal Moves
          </span>
          <div className="w-8 h-8 rounded-lg bg-navy-50 flex items-center justify-center text-navy-600">
            <Compass className="w-4 h-4 text-navy-700" />
          </div>
        </div>
        <div className="mt-2">
          {optimalMetric && optimalMetric.solutionLength !== null ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-navy-900">
                  {optimalMetric.solutionLength}
                </span>
                <span className="text-xs text-navy-400">moves</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <AlgorithmBadge algorithm={optimalMetric.algorithm} />
                <span className="text-xs text-navy-500">
                  ({optimalMetric.pushCount ?? 0} pushes)
                </span>
              </div>
            </>
          ) : (
            <span className="text-sm text-navy-400">No optimal solution</span>
          )}
        </div>
      </div>

      {/* Total Search Effort */}
      <div className="bg-white rounded-xl border border-navy-200 p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-navy-500">
            Total States Explored
          </span>
          <div className="w-8 h-8 rounded-lg bg-navy-100 flex items-center justify-center text-navy-700">
            <Cpu className="w-4 h-4 text-navy-800" />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-navy-900">
              {totalStatesExplored.toLocaleString()}
            </span>
            <span className="text-xs text-navy-400">nodes</span>
          </div>
          <div className="mt-2 flex items-center text-xs text-navy-500">
            <span>Across all {metrics.length} algorithms</span>
          </div>
        </div>
      </div>
    </div>
  );
};
