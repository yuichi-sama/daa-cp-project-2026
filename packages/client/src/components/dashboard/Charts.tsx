import React, { useState } from 'react';
import type { SolverMetrics, AlgorithmId } from '@sokoban/shared';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Legend,
} from 'recharts';
import { BarChart3, Clock, Milestone, Layers } from 'lucide-react';

const ALGO_COLORS: Record<AlgorithmId, string> = {
  bfs: '#3E4A63',
  dfs: '#6B80AE',
  greedy: '#E8A33D',
  astar: '#63C7B2',
};

const ALGO_NAMES: Record<AlgorithmId, string> = {
  bfs: 'BFS',
  dfs: 'DFS',
  greedy: 'Greedy',
  astar: 'A*',
};

interface ChartsProps {
  metrics: SolverMetrics[];
  multiLevelMetrics?: { levelName: string; difficulty: string; metrics: SolverMetrics[] }[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    payload: { name: string; fullAlgo: string; [key: string]: unknown };
  }>;
  label?: string;
  unit?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, unit = '' }) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-navy-900 text-white px-3 py-2 rounded-lg shadow-lg border border-navy-700 text-xs">
        <p className="font-semibold text-amber-300">{item?.payload?.name ?? label}</p>
        <p className="mt-1 font-mono">
          <span className="text-navy-200">{item?.name ?? 'Value'}: </span>
          <span className="font-bold text-mint-300">
            {typeof item?.value === 'number' ? item.value.toLocaleString() : item?.value} {unit}
          </span>
        </p>
      </div>
    );
  }
  return null;
};

export const StatesExploredChart: React.FC<{ metrics: SolverMetrics[] }> = ({ metrics }) => {
  const [isLogScale, setIsLogScale] = useState(false);

  const data = metrics.map((m) => ({
    name: ALGO_NAMES[m.algorithm] || m.algorithm.toUpperCase(),
    algorithm: m.algorithm,
    // Avoid log(0)
    statesExplored: isLogScale ? Math.max(1, m.statesExplored) : m.statesExplored,
    rawStatesExplored: m.statesExplored,
    statesGenerated: m.statesGenerated,
  }));

  return (
    <div className="bg-white rounded-xl border border-navy-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-navy-100 text-navy-800">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-navy-800">States Explored</h3>
            <p className="text-xs text-navy-400">Total state-space nodes expanded by search</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsLogScale(!isLogScale)}
          className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
            isLogScale
              ? 'bg-amber-100 border-amber-300 text-amber-800'
              : 'bg-navy-50 border-navy-200 text-navy-600 hover:bg-navy-100'
          }`}
        >
          Scale: {isLogScale ? 'Logarithmic (log10)' : 'Linear'}
        </button>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F8" />
            <XAxis dataKey="name" stroke="#6B80AE" tick={{ fontSize: 12 }} />
            <YAxis
              scale={isLogScale ? 'log' : 'auto'}
              domain={isLogScale ? [1, 'auto'] : [0, 'auto']}
              allowDataOverflow={isLogScale}
              stroke="#6B80AE"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => {
                if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
                if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
                return v.toString();
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const entry = payload[0];
                  const item = entry?.payload as { name: string; rawStatesExplored: number; statesGenerated: number };
                  return (
                    <div className="bg-navy-900 text-white px-3 py-2 rounded-lg shadow-lg border border-navy-700 text-xs">
                      <p className="font-semibold text-amber-300">{item.name}</p>
                      <p className="mt-1 font-mono text-mint-300">
                        Explored: {item.rawStatesExplored.toLocaleString()}
                      </p>
                      <p className="font-mono text-navy-200">
                        Generated: {item.statesGenerated.toLocaleString()}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="statesExplored" radius={[6, 6, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={`cell-${entry.algorithm}`}
                  fill={ALGO_COLORS[entry.algorithm as AlgorithmId] || '#3E4A63'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const ExecutionTimeChart: React.FC<{ metrics: SolverMetrics[] }> = ({ metrics }) => {
  const data = metrics.map((m) => ({
    name: ALGO_NAMES[m.algorithm] || m.algorithm.toUpperCase(),
    algorithm: m.algorithm,
    timeMs: Number(m.timeMs.toFixed(2)),
    solved: m.solved,
  }));

  return (
    <div className="bg-white rounded-xl border border-navy-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-md bg-amber-100 text-amber-800">
          <Clock className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-navy-800">Execution Time (ms)</h3>
          <p className="text-xs text-navy-400">Total duration elapsed during computation</p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F8" />
            <XAxis dataKey="name" stroke="#6B80AE" tick={{ fontSize: 12 }} />
            <YAxis
              stroke="#6B80AE"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => `${v}ms`}
            />
            <Tooltip content={<CustomTooltip unit="ms" />} />
            <Bar dataKey="timeMs" name="Time" radius={[6, 6, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={`cell-${entry.algorithm}`}
                  fill={ALGO_COLORS[entry.algorithm as AlgorithmId] || '#3E4A63'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const SolutionLengthChart: React.FC<{ metrics: SolverMetrics[] }> = ({ metrics }) => {
  const data = metrics
    .filter((m) => m.solved && m.solutionLength !== null)
    .map((m) => ({
      name: ALGO_NAMES[m.algorithm] || m.algorithm.toUpperCase(),
      algorithm: m.algorithm,
      moves: m.solutionLength ?? 0,
      pushes: m.pushCount ?? 0,
    }));

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-navy-200 p-5 shadow-sm flex flex-col items-center justify-center h-80 text-navy-400">
        <Milestone className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">No solved solutions available to chart length</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-navy-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-md bg-mint-100 text-mint-700">
          <Milestone className="w-4 h-4 text-emerald-700" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-navy-800">Solution Quality (Moves vs Pushes)</h3>
          <p className="text-xs text-navy-400">Comparing path optimality and push efficiency</p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F8" />
            <XAxis dataKey="name" stroke="#6B80AE" tick={{ fontSize: 12 }} />
            <YAxis stroke="#6B80AE" tick={{ fontSize: 11 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0]?.payload as { name: string; moves: number; pushes: number };
                  return (
                    <div className="bg-navy-900 text-white px-3 py-2 rounded-lg shadow-lg border border-navy-700 text-xs">
                      <p className="font-semibold text-amber-300">{item.name}</p>
                      <p className="mt-1 font-mono text-mint-300">Total Moves: {item.moves}</p>
                      <p className="font-mono text-amber-200">Push Count: {item.pushes}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
            <Bar dataKey="moves" name="Total Moves (Optimality)" fill="#3E4A63" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pushes" name="Box Pushes" fill="#E8A33D" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const DifficultyComparisonChart: React.FC<{
  tierData: {
    difficulty: string;
    bfs: number;
    dfs: number;
    greedy: number;
    astar: number;
  }[];
}> = ({ tierData }) => {
  if (!tierData || tierData.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-navy-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-md bg-navy-100 text-navy-800">
          <Layers className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-navy-800">Exploration Across Difficulty Tiers</h3>
          <p className="text-xs text-navy-400">States explored as problem complexity scales</p>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={tierData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F8" />
            <XAxis dataKey="difficulty" stroke="#6B80AE" tick={{ fontSize: 12 }} />
            <YAxis
              scale="log"
              domain={[1, 'auto']}
              allowDataOverflow
              stroke="#6B80AE"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => {
                if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
                if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
                return v.toString();
              }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-navy-900 text-white px-3 py-2 rounded-lg shadow-lg border border-navy-700 text-xs">
                      <p className="font-semibold text-amber-300 capitalize">{label} Tier</p>
                      {payload.map((p) => (
                        <p key={p.name} className="mt-1 font-mono flex justify-between gap-4">
                          <span style={{ color: p.color }}>{p.name}:</span>
                          <span className="font-bold">{Number(p.value).toLocaleString()}</span>
                        </p>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
            <Bar dataKey="bfs" name="BFS" fill={ALGO_COLORS.bfs} radius={[4, 4, 0, 0]} />
            <Bar dataKey="dfs" name="DFS" fill={ALGO_COLORS.dfs} radius={[4, 4, 0, 0]} />
            <Bar dataKey="greedy" name="Greedy" fill={ALGO_COLORS.greedy} radius={[4, 4, 0, 0]} />
            <Bar dataKey="astar" name="A*" fill={ALGO_COLORS.astar} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const DashboardCharts: React.FC<ChartsProps> = ({ metrics, multiLevelMetrics }) => {
  // Compute difficulty comparison data if multiLevelMetrics is provided
  const tierData = React.useMemo(() => {
    if (!multiLevelMetrics || multiLevelMetrics.length === 0) return [];
    return multiLevelMetrics.map((tier) => {
      const bfs = tier.metrics.find((m) => m.algorithm === 'bfs')?.statesExplored ?? 1;
      const dfs = tier.metrics.find((m) => m.algorithm === 'dfs')?.statesExplored ?? 1;
      const greedy = tier.metrics.find((m) => m.algorithm === 'greedy')?.statesExplored ?? 1;
      const astar = tier.metrics.find((m) => m.algorithm === 'astar')?.statesExplored ?? 1;
      return {
        difficulty: tier.difficulty,
        bfs: Math.max(1, bfs),
        dfs: Math.max(1, dfs),
        greedy: Math.max(1, greedy),
        astar: Math.max(1, astar),
      };
    });
  }, [multiLevelMetrics]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatesExploredChart metrics={metrics} />
        <ExecutionTimeChart metrics={metrics} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SolutionLengthChart metrics={metrics} />
        {tierData.length > 0 && <DifficultyComparisonChart tierData={tierData} />}
      </div>
    </div>
  );
};
