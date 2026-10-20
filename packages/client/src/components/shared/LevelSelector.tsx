import React from 'react';
import type { LevelManifest, Difficulty } from '@sokoban/shared';
import { Layers, Box } from 'lucide-react';

interface LevelSelectorProps {
  levels: LevelManifest[];
  selectedId: string | null;
  onChange: (levelId: string) => void;
  disabled?: boolean;
  className?: string;
}

const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard'];

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy (1-2 Boxes)',
  medium: 'Medium (3 Boxes)',
  hard: 'Hard (4+ Boxes)',
};

export const LevelSelector: React.FC<LevelSelectorProps> = ({
  levels,
  selectedId,
  onChange,
  disabled = false,
  className = '',
}) => {
  const current = levels.find((l) => l.id === selectedId);

  // Group levels by difficulty
  const grouped = DIFFICULTY_ORDER.map((diff) => ({
    difficulty: diff,
    label: DIFFICULTY_LABELS[diff],
    items: levels.filter((l) => l.difficulty === diff),
  })).filter((g) => g.items.length > 0);

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-navy-600">
        <Layers className="w-4 h-4 text-amber-500" />
        <span>Select Level</span>
      </label>

      <div className="relative">
        <select
          value={selectedId ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full bg-white border border-navy-200 rounded-lg py-2.5 px-3 pr-8 text-sm font-medium text-navy-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
        >
          <option value="" disabled>
            -- Choose a puzzle level --
          </option>
          {grouped.map((group) => (
            <optgroup key={group.difficulty} label={group.label}>
              {group.items.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name} ({level.boxCount} {level.boxCount === 1 ? 'box' : 'boxes'}, {level.width}x{level.height})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {current && (
        <div className="flex items-center justify-between text-xs text-navy-500 bg-navy-50/60 rounded-md px-2.5 py-1.5 border border-navy-100">
          <span className="flex items-center gap-1">
            <span className="font-semibold text-navy-700 capitalize">{current.difficulty}</span>
            <span>•</span>
            <span className="font-mono text-navy-400">{current.width}x{current.height}</span>
          </span>
          <span className="flex items-center gap-1 text-navy-700 font-medium">
            <Box className="w-3.5 h-3.5 text-amber-600" />
            {current.boxCount} {current.boxCount === 1 ? 'box' : 'boxes'}
          </span>
        </div>
      )}
    </div>
  );
};
