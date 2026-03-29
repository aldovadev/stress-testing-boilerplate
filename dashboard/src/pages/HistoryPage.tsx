import { useEffect, useState } from 'react';
import { Clock, ChevronRight, FileText } from 'lucide-react';
import { AuroraText } from '@/components/ui/aurora-text';
import type { HistoryEntry, SummaryData } from '../types/metrics';
import MetricCard from '../components/MetricCard';
import ThresholdTable from '../components/ThresholdTable';

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<SummaryData | null>(null);
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/history')
      .then(r => r.json())
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  const loadRun = async (filename: string) => {
    setSelectedFilename(filename);
    try {
      const res = await fetch(`/api/history/${filename}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedRun(data);
      }
    } catch {
      setSelectedRun(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">
        <Clock className="w-5 h-5 animate-spin mr-2" />
        Loading history...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <AuroraText className="text-xl font-semibold" colors={["#f43f5e", "#fb7185", "#e11d48", "#fda4af"]}>Test History</AuroraText>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Browse past test runs and compare results</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Run List */}
        <div className="lg:col-span-1 space-y-2">
          {history.length === 0 ? (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-8 text-center transition-colors">
              <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">No test history found.</p>
              <p className="text-gray-400 dark:text-gray-600 text-xs mt-1">Run a test to see results here.</p>
            </div>
          ) : (
            history.map((entry) => (
              <button
                key={entry.filename}
                onClick={() => loadRun(entry.filename)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  selectedFilename === entry.filename
                    ? 'border-blue-400 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${
                        phaseColor(entry.phase)
                      }`}>
                        {entry.phase}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {entry.vus} VUs / {entry.duration}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail View */}
        <div className="lg:col-span-2">
          {selectedRun && selectedRun.metrics ? (
            <div className="space-y-4">
              {/* Key metrics */}
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  title="Total Requests"
                  value={selectedRun.metrics['http_reqs']?.values.count ?? 0}
                  subtitle={`${(selectedRun.metrics['http_reqs']?.values.rate ?? 0).toFixed(1)} req/s`}
                />
                <MetricCard
                  title="Avg Response Time"
                  value={(selectedRun.metrics['http_req_duration']?.values.avg ?? 0).toFixed(1)}
                  unit="ms"
                  status={
                    (selectedRun.metrics['http_req_duration']?.values.avg ?? 0) > 500 ? 'danger' :
                    (selectedRun.metrics['http_req_duration']?.values.avg ?? 0) > 300 ? 'warning' : 'success'
                  }
                />
                <MetricCard
                  title="Error Rate"
                  value={((selectedRun.metrics['http_req_failed']?.values.rate ?? 0) * 100).toFixed(2)}
                  unit="%"
                  status={
                    (selectedRun.metrics['http_req_failed']?.values.rate ?? 0) > 0.1 ? 'danger' :
                    (selectedRun.metrics['http_req_failed']?.values.rate ?? 0) > 0.05 ? 'warning' : 'success'
                  }
                />
                <MetricCard
                  title="P95 Latency"
                  value={(selectedRun.metrics['http_req_duration']?.values['p(95)'] ?? 0).toFixed(1)}
                  unit="ms"
                  status={
                    (selectedRun.metrics['http_req_duration']?.values['p(95)'] ?? 0) > 500 ? 'warning' : 'success'
                  }
                />
              </div>

              {/* Thresholds */}
              <ThresholdTable metrics={selectedRun.metrics} />
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-12 text-center transition-colors">
              <ChevronRight className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Select a test run to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function phaseColor(phase: string): string {
  switch (phase.toLowerCase()) {
    case 'smoke': return 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400';
    case 'load': return 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400';
    case 'stress': return 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400';
    case 'soak': return 'bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400';
    case 'health': return 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400';
    default: return 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400';
  }
}
