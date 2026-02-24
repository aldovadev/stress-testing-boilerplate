import { useMemo } from 'react';
import { useMetricsStore } from '../store/metricsStore';
import MetricCard from '../components/MetricCard';
import RealtimeChart from '../components/RealtimeChart';
import { Timer, Zap, AlertTriangle, Users } from 'lucide-react';

// Built-in k6 metrics that have dedicated charts — don't render them again in the dynamic section
const BUILTIN_CHART_METRICS = new Set([
  'http_req_duration', 'http_reqs', 'http_req_failed', 'vus', 'vus_max',
  'http_req_waiting', 'data_sent', 'data_received', 'http_req_connecting',
  'iterations', 'iteration_duration', 'http_req_sending', 'http_req_receiving',
  'http_req_tls_handshaking', 'http_req_blocked', 'checks',
]);

// Color palette for dynamic charts
const CHART_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#a855f7',
];

export default function LiveDashboard() {
  const { state } = useMetricsStore();
  const { series, definitions, currentVUs, currentRPS, currentErrorRate, currentP95 } = state;

  // Determine status colors based on thresholds
  const errorStatus = currentErrorRate > 0.1 ? 'danger' : currentErrorRate > 0.05 ? 'warning' : 'success';
  const p95Status = currentP95 > 1000 ? 'danger' : currentP95 > 500 ? 'warning' : 'success';

  // ─── Dynamic Custom Metric Charts ───────────────────────────────
  // Auto-discover custom metrics from the stream and render charts dynamically
  const customCharts = useMemo(() => {
    const charts: Array<{
      name: string;
      title: string;
      metricType: string;
      data: typeof series[string];
    }> = [];

    for (const [name, def] of Object.entries(definitions)) {
      // Skip built-in k6 metrics
      if (BUILTIN_CHART_METRICS.has(name)) continue;

      // Only render if we have data
      if (!series[name] || series[name].length === 0) continue;

      charts.push({
        name,
        title: formatMetricTitle(name),
        metricType: def.metricType,
        data: series[name],
      });
    }

    return charts;
  }, [definitions, series]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Live Dashboard</h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Realtime metrics streaming from k6 test execution</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Active VUs"
          value={currentVUs}
          icon={<Users className="w-4 h-4" />}
          status="neutral"
          subtitle="Virtual users"
        />
        <MetricCard
          title="Requests/s"
          value={currentRPS}
          unit="req/s"
          icon={<Zap className="w-4 h-4" />}
          status="neutral"
          subtitle="Throughput"
        />
        <MetricCard
          title="Error Rate"
          value={(currentErrorRate * 100).toFixed(2)}
          unit="%"
          icon={<AlertTriangle className="w-4 h-4" />}
          status={errorStatus}
          subtitle={currentErrorRate > 0.05 ? 'Above threshold!' : 'Within limits'}
        />
        <MetricCard
          title="P95 Latency"
          value={currentP95.toFixed(0)}
          unit="ms"
          icon={<Timer className="w-4 h-4" />}
          status={p95Status}
          subtitle={currentP95 > 500 ? 'Slow responses' : 'Healthy'}
        />
      </div>

      {/* Standard Built-in Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Response Time Chart */}
        <RealtimeChart
          title="Response Time (ms)"
          data={series['http_req_duration'] || []}
          lines={[
            { dataKey: 'avg', color: '#3b82f6', label: 'Average' },
            { dataKey: 'p90', color: '#a855f7', label: 'P90' },
            { dataKey: 'p95', color: '#f59e0b', label: 'P95' },
            { dataKey: 'p99', color: '#ef4444', label: 'P99', dashed: true },
          ]}
          thresholdLine={{ value: 500, label: 'P95 Threshold', color: '#ef4444' }}
          yAxisUnit="ms"
        />

        {/* Throughput Chart */}
        <RealtimeChart
          title="Throughput (requests/s)"
          data={series['http_reqs'] || []}
          chartType="area"
          lines={[
            { dataKey: 'count', color: '#22c55e', label: 'Requests/s' },
          ]}
        />

        {/* Error Rate Chart */}
        <RealtimeChart
          title="Error Rate"
          data={series['http_req_failed'] || []}
          lines={[
            { dataKey: 'avg', color: '#ef4444', label: 'Error Rate' },
          ]}
          thresholdLine={{ value: 0.05, label: '5% Threshold', color: '#f59e0b' }}
          chartType="area"
        />

        {/* Active VUs Chart */}
        <RealtimeChart
          title="Active Virtual Users"
          data={series['vus'] || []}
          chartType="area"
          lines={[
            { dataKey: 'value', color: '#8b5cf6', label: 'VUs' },
          ]}
        />

        {/* TTFB Chart */}
        <RealtimeChart
          title="Time To First Byte (ms)"
          data={series['http_req_waiting'] || []}
          lines={[
            { dataKey: 'avg', color: '#06b6d4', label: 'Avg TTFB' },
            { dataKey: 'p95', color: '#f59e0b', label: 'P95 TTFB' },
          ]}
          yAxisUnit="ms"
        />
      </div>

      {/* ─── Dynamic Custom Metric Charts ──────────────────────────── */}
      {customCharts.length > 0 && (
        <>
          <div>
            <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">Custom Metrics</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Auto-detected from the current test ({customCharts.length} metric{customCharts.length !== 1 ? 's' : ''})
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {customCharts.map((chart, idx) => (
              <RealtimeChart
                key={chart.name}
                title={chart.title}
                data={chart.data}
                lines={getChartLines(chart.metricType, idx)}
                yAxisUnit={chart.metricType === 'trend' ? 'ms' : ''}
                chartType={chart.metricType === 'counter' ? 'area' : 'line'}
              />
            ))}
          </div>
        </>
      )}

      {/* Additional Built-in Metrics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RealtimeChart
          title="Data Sent (bytes/s)"
          data={series['data_sent'] || []}
          chartType="area"
          lines={[{ dataKey: 'avg', color: '#06b6d4', label: 'Bytes/s' }]}
          height={180}
        />
        <RealtimeChart
          title="Data Received (bytes/s)"
          data={series['data_received'] || []}
          chartType="area"
          lines={[{ dataKey: 'avg', color: '#a855f7', label: 'Bytes/s' }]}
          height={180}
        />
        <RealtimeChart
          title="Connection Time (ms)"
          data={series['http_req_connecting'] || []}
          lines={[{ dataKey: 'avg', color: '#f97316', label: 'Avg Connect' }]}
          yAxisUnit="ms"
          height={180}
        />
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Format a metric name into a human-readable chart title.
 * e.g., "api_users_duration" → "Api Users Duration (ms)"
 */
function formatMetricTitle(name: string): string {
  const isTime = name.endsWith('_duration') || name.endsWith('_ttfb') ||
    name.endsWith('_connecting') || name.endsWith('_tls_handshaking');
  const suffix = isTime ? ' (ms)' : '';

  const title = name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  return title + suffix;
}

/**
 * Get chart line configurations based on metric type.
 * - Trend: avg, p95, max lines
 * - Counter: count area
 * - Rate: avg line (as percentage)
 * - Gauge: value line
 */
function getChartLines(metricType: string, colorIndex: number) {
  const baseColor = CHART_COLORS[colorIndex % CHART_COLORS.length];

  switch (metricType) {
    case 'trend':
      return [
        { dataKey: 'avg', color: baseColor, label: 'Average' },
        { dataKey: 'p95', color: '#f59e0b', label: 'P95' },
        { dataKey: 'max', color: '#ef4444', label: 'Max', dashed: true },
      ];
    case 'counter':
      return [
        { dataKey: 'count', color: baseColor, label: 'Count' },
      ];
    case 'rate':
      return [
        { dataKey: 'avg', color: baseColor, label: 'Rate' },
      ];
    case 'gauge':
      return [
        { dataKey: 'value', color: baseColor, label: 'Value' },
      ];
    default:
      return [
        { dataKey: 'avg', color: baseColor, label: 'Value' },
      ];
  }
}
