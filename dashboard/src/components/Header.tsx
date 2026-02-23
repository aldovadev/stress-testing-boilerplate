import { Activity, Wifi, WifiOff, RotateCcw } from 'lucide-react';
import { useMetricsStore } from '../store/metricsStore';
import StatusBadge from './StatusBadge';

interface HeaderProps {
  isConnected: boolean;
  onReset?: () => void;
}

export default function Header({ isConnected, onReset }: HeaderProps) {
  const { state } = useMetricsStore();

  const handleReset = async () => {
    await fetch('/api/reset', { method: 'POST' });
    onReset?.();
  };

  return (
    <header className="h-16 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-50">
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-gray-100">K6 Metrics Dashboard</h1>
        </div>
      </div>

      {/* Center: Test Status */}
      <div className="flex items-center gap-4">
        <StatusBadge status={state.testStatus} />
        {state.testStartTime && state.testStatus === 'running' && (
          <span className="text-xs text-gray-500">
            Started: {new Date(state.testStartTime).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Right: Connection + Actions */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          isConnected
            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
            : 'bg-red-950 text-red-400 border border-red-800'
        }`}>
          {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isConnected ? 'Live' : 'Disconnected'}
        </div>

        <button
          onClick={handleReset}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
          title="Reset data"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
