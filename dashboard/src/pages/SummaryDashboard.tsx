import { useEffect, useState } from 'react';
import { useMetricsStore } from '../store/metricsStore';
import MetricCard from '../components/MetricCard';
import ThresholdTable from '../components/ThresholdTable';
import {
  Timer, Zap, AlertTriangle, Hash, Clock, ArrowDownToLine, ArrowUpFromLine,
  CheckCircle, XCircle,
} from 'lucide-react';
import type { SummaryData, CheckData, GroupData } from '../types/metrics';

export default function SummaryDashboard() {
  const { state } = useMetricsStore();
  const [summary, setSummary] = useState<SummaryData | null>(state.summary);
  const [loading, setLoading] = useState(false);

  // Fetch summary from API if not available in store
  useEffect(() => {
    if (state.summary) {
      setSummary(state.summary);
      return;
    }

    setLoading(true);
    fetch('/api/summary')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSummary(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [state.summary]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">
        <Clock className="w-5 h-5 animate-spin mr-2" />
        Loading summary...
      </div>
    );
  }

  if (!summary || !summary.metrics) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Test Summary</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Post-run aggregated results</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-12 text-center transition-colors">
          <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No test results available yet.</p>
          <p className="text-gray-400 dark:text-gray-600 text-sm mt-1">Run a test to see the summary here.</p>
        </div>
      </div>
    );
  }

  const metrics = summary.metrics;
  const meta = summary.metadata;

  // Extract key values
  const httpReqs = metrics['http_reqs'];
  const duration = metrics['http_req_duration'];
  const failed = metrics['http_req_failed'];
  const dataSent = metrics['data_sent'];
  const dataRecv = metrics['data_received'];
  const iterations = metrics['iterations'];
  const testDuration = summary.state?.testRunDurationMs;

  // Flatten checks
  const checks = summary.root_group ? flattenChecks(summary.root_group) : [];
  const totalChecks = checks.reduce((acc, c) => acc + c.passes + c.fails, 0);
  const passedChecks = checks.reduce((acc, c) => acc + c.passes, 0);
  const checkRate = totalChecks > 0 ? (passedChecks / totalChecks * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Test Summary</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Post-run aggregated results</p>
        </div>
        {meta && (
          <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
            <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 uppercase font-medium">
              {meta.phase}
            </span>
            <span>{meta.vus} VUs</span>
            <span>{meta.duration}</span>
            <span>{new Date(meta.timestamp).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Requests"
          value={httpReqs?.values.count ?? 0}
          icon={<Hash className="w-4 h-4" />}
          subtitle={`${(httpReqs?.values.rate ?? 0).toFixed(1)} req/s`}
        />
        <MetricCard
          title="Avg Response Time"
          value={(duration?.values.avg ?? 0).toFixed(1)}
          unit="ms"
          icon={<Timer className="w-4 h-4" />}
          status={
            (duration?.values.avg ?? 0) > 500 ? 'danger' :
            (duration?.values.avg ?? 0) > 300 ? 'warning' : 'success'
          }
        />
        <MetricCard
          title="Error Rate"
          value={((failed?.values.rate ?? 0) * 100).toFixed(2)}
          unit="%"
          icon={<AlertTriangle className="w-4 h-4" />}
          status={
            (failed?.values.rate ?? 0) > 0.1 ? 'danger' :
            (failed?.values.rate ?? 0) > 0.05 ? 'warning' : 'success'
          }
          subtitle={`${failed?.values.fails ?? 0} failed`}
        />
        <MetricCard
          title="Test Duration"
          value={testDuration ? (testDuration / 1000).toFixed(1) : '-'}
          unit="s"
          icon={<Clock className="w-4 h-4" />}
          subtitle={`${iterations?.values.count ?? 0} iterations`}
        />
      </div>

      {/* Percentile Cards */}
      {duration && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: 'Min', value: duration.values.min, status: 'success' as const },
            { label: 'Median', value: duration.values.med, status: 'neutral' as const },
            { label: 'P90', value: duration.values['p(90)'], status: 'neutral' as const },
            { label: 'P95', value: duration.values['p(95)'], status: (duration.values['p(95)'] ?? 0) > 500 ? 'warning' as const : 'success' as const },
            { label: 'P99', value: duration.values['p(99)'], status: (duration.values['p(99)'] ?? 0) > 1000 ? 'danger' as const : 'neutral' as const },
            { label: 'Max', value: duration.values.max, status: 'danger' as const },
          ].map(({ label, value, status }) => (
            <MetricCard
              key={label}
              title={label}
              value={(value ?? 0).toFixed(1)}
              unit="ms"
              status={status}
            />
          ))}
        </div>
      )}

      {/* Thresholds */}
      <ThresholdTable metrics={metrics} />

      {/* Checks */}
      {checks.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 overflow-hidden transition-colors">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">Checks</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              checkRate === 100
                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                : checkRate > 90
                  ? 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                  : 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400'
            }`}>
              {checkRate.toFixed(1)}% passed
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-4 py-2 font-medium">Check</th>
                <th className="text-right px-4 py-2 font-medium w-20">Passes</th>
                <th className="text-right px-4 py-2 font-medium w-20">Fails</th>
                <th className="text-center px-4 py-2 font-medium w-20">Rate</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((c, i) => {
                const total = c.passes + c.fails;
                const rate = total > 0 ? (c.passes / total * 100) : 0;
                return (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{c.name}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-500 dark:text-emerald-400 font-mono text-xs">{c.passes}</td>
                    <td className="px-4 py-2.5 text-right text-red-500 dark:text-red-400 font-mono text-xs">{c.fails}</td>
                    <td className="px-4 py-2.5 text-center">
                      {rate === 100 ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500 dark:text-emerald-400 inline-block" />
                      ) : (
                        <span className="text-xs font-mono text-amber-500 dark:text-amber-400">{rate.toFixed(1)}%</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Data Transfer */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-4 flex items-center gap-4 transition-colors">
          <ArrowUpFromLine className="w-8 h-8 text-cyan-500 dark:text-cyan-400" />
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">Data Sent</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {formatBytes(dataSent?.values.count ?? 0)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{(dataSent?.values.rate ?? 0).toFixed(0)} bytes/s</p>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-4 flex items-center gap-4 transition-colors">
          <ArrowDownToLine className="w-8 h-8 text-purple-500 dark:text-purple-400" />
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">Data Received</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {formatBytes(dataRecv?.values.count ?? 0)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{(dataRecv?.values.rate ?? 0).toFixed(0)} bytes/s</p>
          </div>
        </div>
      </div>

      {/* Full Metrics Table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 overflow-hidden transition-colors">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">All Metrics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-4 py-2 font-medium">Metric</th>
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-right px-4 py-2 font-medium">Values</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(metrics).sort(([a], [b]) => a.localeCompare(b)).map(([name, metric]) => (
                <tr key={name} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-700 dark:text-gray-300">{name}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      {metric.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-500 dark:text-gray-400">
                    {formatMetricValues(metric)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function flattenChecks(group: GroupData): CheckData[] {
  let checks = [...(group.checks || [])];
  for (const sub of group.groups || []) {
    checks = checks.concat(flattenChecks(sub));
  }
  return checks;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatMetricValues(metric: { type: string; values: Record<string, number> }): string {
  const v = metric.values;
  switch (metric.type) {
    case 'counter':
      return `count=${v.count ?? 0}  rate=${(v.rate ?? 0).toFixed(2)}/s`;
    case 'gauge':
      return `value=${v.value ?? 0}  min=${v.min ?? 0}  max=${v.max ?? 0}`;
    case 'rate':
      return `${((v.rate ?? 0) * 100).toFixed(2)}%  (${v.passes ?? 0}✓ / ${v.fails ?? 0}✗)`;
    case 'trend':
      return `avg=${(v.avg ?? 0).toFixed(1)}ms  p95=${(v['p(95)'] ?? 0).toFixed(1)}ms  max=${(v.max ?? 0).toFixed(1)}ms`;
    default:
      return JSON.stringify(v);
  }
}
