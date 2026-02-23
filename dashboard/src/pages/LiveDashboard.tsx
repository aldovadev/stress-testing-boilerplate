import { useMetricsStore } from '../store/metricsStore';
import MetricCard from '../components/MetricCard';
import RealtimeChart from '../components/RealtimeChart';
import { Timer, Zap, AlertTriangle, Users, ArrowUpDown, Activity } from 'lucide-react';

export default function LiveDashboard() {
  const { state } = useMetricsStore();
  const { series, currentVUs, currentRPS, currentErrorRate, currentP95 } = state;

  // Determine status colors based on thresholds
  const errorStatus = currentErrorRate > 0.1 ? 'danger' : currentErrorRate > 0.05 ? 'warning' : 'success';
  const p95Status = currentP95 > 1000 ? 'danger' : currentP95 > 500 ? 'warning' : 'success';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-100">Live Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Realtime metrics streaming from k6 test execution</p>
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

      {/* Charts Grid */}
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

        {/* Custom Message Duration (if available) */}
        <RealtimeChart
          title="Custom Message Duration (ms)"
          data={series['custom_message_duration'] || []}
          lines={[
            { dataKey: 'avg', color: '#3b82f6', label: 'Average' },
            { dataKey: 'p95', color: '#f59e0b', label: 'P95' },
            { dataKey: 'max', color: '#ef4444', label: 'Max', dashed: true },
          ]}
          yAxisUnit="ms"
        />
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Data Transfer */}
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
        {/* Connection Time */}
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
