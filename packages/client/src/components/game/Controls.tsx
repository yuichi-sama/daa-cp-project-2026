import React from 'react';
import type { Move } from '@sokoban/shared';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';

interface ControlsProps {
  onMove: (move: Move) => void;
  onUndo: () => void;
  onReset: () => void;
  canUndo: boolean;
  disabled?: boolean;
  className?: string;
}

export const Controls: React.FC<ControlsProps> = ({
  onMove,
  onUndo,
  onReset,
  canUndo,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Directional Pad */}
      <div className="grid grid-cols-3 gap-2 w-44">
        <div />
        <button
          type="button"
          onClick={() => onMove('up')}
          disabled={disabled}
          title="Move Up (W or ArrowUp)"
          className="h-12 flex items-center justify-center bg-white border border-navy-200 text-navy-800 rounded-xl shadow-sm hover:bg-amber-50 hover:border-amber-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <ArrowUp className="w-5 h-5 text-navy-700" />
        </button>
        <div />

        <button
          type="button"
          onClick={() => onMove('left')}
          disabled={disabled}
          title="Move Left (A or ArrowLeft)"
          className="h-12 flex items-center justify-center bg-white border border-navy-200 text-navy-800 rounded-xl shadow-sm hover:bg-amber-50 hover:border-amber-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <ArrowLeft className="w-5 h-5 text-navy-700" />
        </button>

        <button
          type="button"
          onClick={() => onMove('down')}
          disabled={disabled}
          title="Move Down (S or ArrowDown)"
          className="h-12 flex items-center justify-center bg-white border border-navy-200 text-navy-800 rounded-xl shadow-sm hover:bg-amber-50 hover:border-amber-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <ArrowDown className="w-5 h-5 text-navy-700" />
        </button>

        <button
          type="button"
          onClick={() => onMove('right')}
          disabled={disabled}
          title="Move Right (D or ArrowRight)"
          className="h-12 flex items-center justify-center bg-white border border-navy-200 text-navy-800 rounded-xl shadow-sm hover:bg-amber-50 hover:border-amber-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <ArrowRight className="w-5 h-5 text-navy-700" />
        </button>
      </div>

      {/* Undo & Reset actions */}
      <div className="flex items-center gap-2.5 w-full max-w-xs justify-center pt-1">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo || disabled}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-white border border-navy-200 text-navy-700 shadow-sm hover:bg-navy-50 hover:border-navy-300 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5 text-navy-500" />
          <span>Undo (Z)</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          disabled={disabled}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-white border border-navy-200 text-rose-700 shadow-sm hover:bg-rose-50 hover:border-rose-300 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5 text-rose-500" />
          <span>Reset (R)</span>
        </button>
      </div>
    </div>
  );
};
