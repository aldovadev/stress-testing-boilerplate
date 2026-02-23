import { CheckCircle, XCircle } from 'lucide-react';
import type { SummaryMetric } from '../types/metrics';

interface ThresholdTableProps {
  metrics: Record<string, SummaryMetric>;
}

interface ThresholdRow {
  metric: string;
  expression: string;
  passed: boolean;
}

export default function ThresholdTable({ metrics }: ThresholdTableProps) {
  const rows: ThresholdRow[] = [];

  for (const [name, metric] of Object.entries(metrics)) {
    if (!metric.thresholds) continue;
    for (const [expression, result] of Object.entries(metric.thresholds)) {
      rows.push({
        metric: name,
        expression,
        passed: result.ok,
      });
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 text-center text-gray-500 text-sm">
        No thresholds configured for this test run.
      </div>
    );
  }

  const allPassed = rows.every(r => r.passed);
  const passCount = rows.filter(r => r.passed).length;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Thresholds</h3>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          allPassed
            ? 'bg-emerald-950 text-emerald-400'
            : 'bg-red-950 text-red-400'
        }`}>
          {passCount}/{rows.length} passed
        </span>
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
            <th className="text-left px-4 py-2 font-medium">Metric</th>
            <th className="text-left px-4 py-2 font-medium">Threshold</th>
            <th className="text-center px-4 py-2 font-medium w-20">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
              <td className="px-4 py-2.5 font-mono text-xs text-gray-300">{row.metric}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{row.expression}</td>
              <td className="px-4 py-2.5 text-center">
                {row.passed ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 inline-block" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 inline-block" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
