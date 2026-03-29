import { Wifi, WifiOff, RotateCcw, Sun, Moon } from 'lucide-react';
import { useMetricsStore } from '../store/metricsStore';
import { useTheme } from '../store/themeStore';
import StatusBadge from './StatusBadge';

interface HeaderProps {
  isConnected: boolean;
  onReset?: () => void;
}

export default function Header({ isConnected, onReset }: HeaderProps) {
  const { state } = useMetricsStore();
  const { theme, toggleTheme } = useTheme();

  const handleReset = async () => {
    await fetch('/api/reset', { method: 'POST' });
    onReset?.();
  };

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-50 transition-colors">
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-3">
        <img
          src="/images/stresster.svg"
          alt="Stresster"
          className="w-8 h-8 rounded-lg"
        />
        <div>
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Stresster</h1>
        </div>
      </div>

      {/* Center: Test Status (absolutely centered) — hidden when idle */}
      {state.testStatus !== 'idle' && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-4">
          <StatusBadge status={state.testStatus} />
          {state.testStartTime && state.testStatus === 'running' && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Started: {new Date(state.testStartTime).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {/* Right: Theme Toggle + Connection + Actions */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          isConnected
            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
            : 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
        }`}>
          {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isConnected ? 'Live' : 'Disconnected'}
        </div>

        <button
          onClick={handleReset}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Reset data"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
