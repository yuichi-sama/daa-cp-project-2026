import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { PlayPage } from './pages/PlayPage';
import { SolvePage } from './pages/SolvePage';
import { ComparePage } from './pages/ComparePage';
import { Brain, Gamepad2, Activity, BarChart2, BookOpen } from 'lucide-react';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-navy-50 text-navy-800 font-sans selection:bg-amber-200 selection:text-navy-900">
      {/* Top Academic Navigation Bar */}
      <header className="bg-navy-900 border-b border-navy-800 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-mint-400 flex items-center justify-center shadow-md">
                <Brain className="w-6 h-6 text-navy-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base tracking-tight text-white">
                    Algorithmic Sokoban
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-navy-800 text-amber-400 border border-navy-700">
                    DAA Benchmark
                  </span>
                </div>
                <p className="text-[11px] text-navy-300 hidden sm:block">
                  State-Space Search Comparison & Heuristic Evaluation
                </p>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex items-center gap-1 sm:gap-2">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-navy-800 text-amber-300 shadow-inner'
                      : 'text-navy-300 hover:text-white hover:bg-navy-800/60'
                  }`
                }
              >
                <Gamepad2 className="w-4 h-4" />
                <span>Play</span>
              </NavLink>

              <NavLink
                to="/solve"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-navy-800 text-amber-300 shadow-inner'
                      : 'text-navy-300 hover:text-white hover:bg-navy-800/60'
                  }`
                }
              >
                <Activity className="w-4 h-4" />
                <span>Solve</span>
              </NavLink>

              <NavLink
                to="/compare"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-navy-800 text-amber-300 shadow-inner'
                      : 'text-navy-300 hover:text-white hover:bg-navy-800/60'
                  }`
                }
              >
                <BarChart2 className="w-4 h-4" />
                <span>Compare</span>
              </NavLink>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Page Routing */}
      <main className="flex-1 pb-12">
        <Routes>
          <Route path="/" element={<PlayPage />} />
          <Route path="/solve" element={<SolvePage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Academic Footer */}
      <footer className="bg-white border-t border-navy-200/80 py-6 text-xs text-navy-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-navy-400" />
            <span>Design & Analysis of Algorithms Course Project — Sokoban Graph Search</span>
          </div>
          <div className="flex items-center gap-4 text-navy-400">
            <span>BFS • DFS • Greedy Best-First • A* Search</span>
            <span>•</span>
            <span className="font-mono text-navy-500">TypeScript / React / Vite</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
