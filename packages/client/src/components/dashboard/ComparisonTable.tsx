import React from 'react';
import type { SolverMetrics, AlgorithmId } from '@sokoban/shared';
import { AlgorithmBadge } from '../shared/AlgorithmBadge';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

interface ComparisonTableProps {
  metrics: SolverMetrics[];
  className?: string;
}

const ALGO_TYPES: Record<AlgorithmId, 'Uninformed' | 'Informed'> = {
  bfs: 'Uninformed',
  dfs: 'Uninformed',
  greedy: 'Informed',
  astar: 'Informed',
};

export const ComparisonTable: React.FC<ComparisonTableProps> = ({
  metrics,
  className = '',
}) => {
  if (!metrics || metrics.length === 0) {
    return (
      <div className="p-8 text-center text-navy-400 bg-white rounded-xl border border-navy-200">
        No comparison results available yet. Run a comparison to view the benchmark table.
      </div>
    );
  }

  // Calculate best (min) and worst (max) for numeric columns
  const getMinMax = (extractor: (m: SolverMetrics) => number | null) => {
    const validValues = metrics
      .map(extractor)
      .filter((v): v is number => v !== null && !isNaN(v) && isFinite(v));
    if (validValues.length <= 1) return { min: null, max: null };
    return {
      min: Math.min(...validValues),
      max: Math.max(...validValues),
    };
  };

  const timeBounds = getMinMax((m) => (m.solved ? m.timeMs : null));
  const genBounds = getMinMax((m) => m.statesGenerated);
  const expBounds = getMinMax((m) => m.statesExplored);
  const frontBounds = getMinMax((m) => m.maxFrontierSize);
  const memBounds = getMinMax((m) => m.peakMemoryMb);
  const lenBounds = getMinMax((m) => (m.solved ? m.solutionLength : null));
  const pushBounds = getMinMax((m) => (m.solved ? m.pushCount : null));

  const formatCell = (
    value: number | null,
    bounds: { min: number | null; max: number | null },
    formatter: (v: number) => string = (v) => v.toLocaleString()
  ) => {
    if (value === null || isNaN(value)) {
      return <span className="text-navy-300">—</span>;
    }

    const isBest = bounds.min !== null && value === bounds.min && bounds.min !== bounds.max;
    const isWorst = bounds.max !== null && value === bounds.max && bounds.min !== bounds.max;

    let styleClass = 'text-navy-700';
    if (isBest) {
      styleClass = 'text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded';
    } else if (isWorst) {
      styleClass = 'text-rose-700 font-medium bg-rose-50 px-2 py-0.5 rounded';
    }

    return <span className={styleClass}>{formatter(value)}</span>;
  };

  return (
    <div className={`overflow-x-auto rounded-xl border border-navy-200 shadow-sm bg-white ${className}`}>
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-navy-900 text-white text-xs uppercase tracking-wider font-semibold">
            <th className="py-3 px-4">Algorithm</th>
            <th className="py-3 px-3">Type</th>
            <th className="py-3 px-3">Status</th>
            <th className="py-3 px-3 text-right">Time</th>
            <th className="py-3 px-3 text-right">States Gen.</th>
            <th className="py-3 px-3 text-right">States Expl.</th>
            <th className="py-3 px-3 text-right">Max Frontier</th>
            <th className="py-3 px-3 text-right">Peak RAM</th>
            <th className="py-3 px-3 text-right">Moves</th>
            <th className="py-3 px-4 text-right">Pushes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-100 font-mono text-xs">
          {metrics.map((row) => {
            const algoType = ALGO_TYPES[row.algorithm] || 'Uninformed';

            return (
              <tr
                key={row.algorithm}
                className="hover:bg-navy-50/70 transition-colors font-sans"
              >
                <td className="py-3 px-4 font-medium">
                  <AlgorithmBadge algorithm={row.algorithm} showFullLabel />
                </td>
                <td className="py-3 px-3">
                  <span
                    className={`inline-block px-2 py-0.5 text-[11px] rounded font-medium ${
                      algoType === 'Informed'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-navy-100 text-navy-700'
                    }`}
                  >
                    {algoType}
                  </span>
                </td>
                <td className="py-3 px-3">
                  {row.solved ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      Solved
                    </span>
                  ) : row.timedOut ? (
                    <span className="inline-flex items-center gap-1 text-amber-600 font-semibold text-xs">
                      <Clock className="w-4 h-4" />
                      Timeout
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-600 font-semibold text-xs">
                      <XCircle className="w-4 h-4" />
                      Failed
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 text-right font-mono">
                  {formatCell(row.timeMs, timeBounds, (v) => `${v.toFixed(1)} ms`)}
                </td>
                <td className="py-3 px-3 text-right font-mono">
                  {formatCell(row.statesGenerated, genBounds)}
                </td>
                <td className="py-3 px-3 text-right font-mono">
                  {formatCell(row.statesExplored, expBounds)}
                </td>
                <td className="py-3 px-3 text-right font-mono">
                  {formatCell(row.maxFrontierSize, frontBounds)}
                </td>
                <td className="py-3 px-3 text-right font-mono">
                  {formatCell(row.peakMemoryMb, memBounds, (v) => `${v.toFixed(2)} MB`)}
                </td>
                <td className="py-3 px-3 text-right font-mono">
                  {row.solved
                    ? formatCell(row.solutionLength, lenBounds)
                    : <span className="text-navy-300">—</span>}
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {row.solved
                    ? formatCell(row.pushCount, pushBounds)
                    : <span className="text-navy-300">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-4 py-2 bg-navy-50 border-t border-navy-100 flex items-center justify-between text-xs text-navy-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Best in metric
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Worst in metric
          </span>
        </div>
        <span className="italic text-navy-400">g(n) counts moves</span>
      </div>
    </div>
  );
};
