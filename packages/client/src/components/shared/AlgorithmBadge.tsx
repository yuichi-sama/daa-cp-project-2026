import React from 'react';
import type { AlgorithmId } from '@sokoban/shared';

interface AlgorithmBadgeProps {
  algorithm: AlgorithmId | string;
  showFullLabel?: boolean;
  showType?: boolean;
  className?: string;
}

const ALGO_CONFIG: Record<
  AlgorithmId,
  { name: string; fullName: string; type: 'Uninformed' | 'Informed'; classes: string }
> = {
  bfs: {
    name: 'BFS',
    fullName: 'Breadth-First Search',
    type: 'Uninformed',
    classes: 'bg-navy-800 text-navy-50 border-navy-700',
  },
  dfs: {
    name: 'DFS',
    fullName: 'Depth-First Search',
    type: 'Uninformed',
    classes: 'bg-navy-500 text-white border-navy-400',
  },
  greedy: {
    name: 'Greedy',
    fullName: 'Greedy Best-First',
    type: 'Informed',
    classes: 'bg-amber-500 text-white border-amber-600',
  },
  astar: {
    name: 'A*',
    fullName: 'A* Heuristic Search',
    type: 'Informed',
    classes: 'bg-mint-300 text-navy-900 border-mint-400 font-semibold',
  },
};

export const AlgorithmBadge: React.FC<AlgorithmBadgeProps> = ({
  algorithm,
  showFullLabel = false,
  showType = false,
  className = '',
}) => {
  const config = ALGO_CONFIG[algorithm as AlgorithmId] || {
    name: algorithm.toUpperCase(),
    fullName: algorithm,
    type: 'Uninformed',
    classes: 'bg-navy-200 text-navy-800 border-navy-300',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-sm transition-colors ${config.classes} ${className}`}
    >
      <span>{showFullLabel ? config.fullName : config.name}</span>
      {showType && (
        <span className="opacity-75 text-[10px] uppercase tracking-wider">
          ({config.type})
        </span>
      )}
    </span>
  );
};
