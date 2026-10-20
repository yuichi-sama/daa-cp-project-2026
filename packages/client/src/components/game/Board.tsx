import React from 'react';
import type { StaticBoard, SokobanState, Coord } from '@sokoban/shared';
import { CELL_SIZE } from '@sokoban/shared';
import { Sparkles } from 'lucide-react';

export interface BoardProps {
  board: StaticBoard;
  state: SokobanState;
  cellSize?: number;
  highlightMoves?: Coord[];
  playerDirection?: 'up' | 'down' | 'left' | 'right';
  className?: string;
}

export const Board: React.FC<BoardProps> = ({
  board,
  state,
  cellSize = CELL_SIZE,
  highlightMoves = [],
  playerDirection = 'down',
  className = '',
}) => {
  const targetLookup = React.useMemo(() => {
    const set = new Set<string>();
    for (const t of board.targets) {
      set.add(`${t.x},${t.y}`);
    }
    return set;
  }, [board.targets]);

  const highlightLookup = React.useMemo(() => {
    const set = new Set<string>();
    for (const h of highlightMoves) {
      set.add(`${h.x},${h.y}`);
    }
    return set;
  }, [highlightMoves]);

  return (
    <div
      className={`relative inline-block select-none rounded-xl overflow-hidden shadow-2xl border-4 border-navy-800 bg-navy-900 ${className}`}
      style={{
        width: board.width * cellSize,
        height: board.height * cellSize,
      }}
    >
      {/* Background Static Grid */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${board.width}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${board.height}, ${cellSize}px)`,
          width: board.width * cellSize,
          height: board.height * cellSize,
        }}
      >
        {board.cells.map((row, y) =>
          row.map((cell, x) => {
            const key = `${x},${y}`;
            const isTarget = cell === 'target';
            const isWall = cell === 'wall';
            const isHighlighted = highlightLookup.has(key);

            if (isWall) {
              return (
                <div
                  key={key}
                  style={{ width: cellSize, height: cellSize }}
                  className="bg-[#3E4A63] border border-[#2D3748] relative flex items-center justify-center shadow-inner overflow-hidden"
                >
                  {/* Subtle brick texture overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/30 pointer-events-none" />
                  <div className="w-full h-[1px] bg-navy-700/50 absolute top-1/2" />
                </div>
              );
            }

            return (
              <div
                key={key}
                style={{ width: cellSize, height: cellSize }}
                className={`relative flex items-center justify-center bg-[#EEF1F8] border border-navy-200/40 transition-colors ${
                  isHighlighted ? 'ring-2 ring-inset ring-amber-400 bg-amber-50' : ''
                }`}
              >
                {/* Floor target marker */}
                {isTarget && (
                  <div className="relative flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-amber-400/30 flex items-center justify-center animate-pulse">
                      <div className="w-3 h-3 bg-[#E8A33D] rotate-45 rounded-[2px] shadow-sm border border-amber-600" />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Dynamic Boxes Layer */}
      {state.boxes.map((box, index) => {
        const isOnTarget = targetLookup.has(`${box.x},${box.y}`);
        return (
          <div
            key={`box-${index}`}
            style={{
              width: cellSize - 6,
              height: cellSize - 6,
              transform: `translate(${box.x * cellSize + 3}px, ${box.y * cellSize + 3}px)`,
              transition: 'transform 140ms cubic-bezier(0.2, 0, 0, 1)',
            }}
            className={`absolute top-0 left-0 rounded-lg flex items-center justify-center shadow-md border-2 z-10 ${
              isOnTarget
                ? 'bg-[#2D5A3D] border-emerald-300 ring-2 ring-emerald-500/50'
                : 'bg-[#1B2A4A] border-navy-300'
            }`}
          >
            {/* Box inner crate detailing */}
            <div
              className={`w-full h-full p-1.5 flex items-center justify-center rounded-md border ${
                isOnTarget ? 'border-emerald-400/40' : 'border-white/20'
              }`}
            >
              {isOnTarget ? (
                <Sparkles className="w-4 h-4 text-emerald-200 drop-shadow" />
              ) : (
                <div className="w-full h-full relative border border-dashed border-navy-400/50 rounded-sm flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-amber-400/80" />
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Dynamic Player Layer */}
      <div
        style={{
          width: cellSize - 4,
          height: cellSize - 4,
          transform: `translate(${state.player.x * cellSize + 2}px, ${state.player.y * cellSize + 2}px)`,
          transition: 'transform 140ms cubic-bezier(0.2, 0, 0, 1)',
        }}
        className="absolute top-0 left-0 rounded-full bg-[#63C7B2] border-2 border-white shadow-lg flex items-center justify-center z-20"
      >
        {/* Animated cute face / eyes */}
        <div className="relative w-full h-full flex items-center justify-center">
          <div
            className={`flex items-center gap-1.5 transition-transform duration-100 ${
              playerDirection === 'up'
                ? '-translate-y-1'
                : playerDirection === 'down'
                ? 'translate-y-1'
                : playerDirection === 'left'
                ? '-translate-x-1.5'
                : 'translate-x-1.5'
            }`}
          >
            <div className="w-1.5 h-2 bg-navy-900 rounded-full shadow-inner" />
            <div className="w-1.5 h-2 bg-navy-900 rounded-full shadow-inner" />
          </div>
          {/* Subtle blush */}
          <div className="absolute bottom-1.5 flex items-center justify-between w-5 px-0.5 opacity-60">
            <div className="w-1 h-1 rounded-full bg-rose-400" />
            <div className="w-1 h-1 rounded-full bg-rose-400" />
          </div>
        </div>
      </div>
    </div>
  );
};
