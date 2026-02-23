/**
 * Custom handleSummary function for k6.
 * Exports test results as JSON for the dashboard and prints text summary to stdout.
 *
 * Usage: Import and re-export from your main.js:
 *   export { generateSummary as handleSummary } from '../../helpers/summary.js';
 */

/**
 * Generates test summary outputs.
 * Writes JSON to results/summary.json and prints text summary to stdout.
 *
 * @param {object} data - k6 summary data object (passed automatically by k6)
 * @returns {object} Map of output targets to content
 */
export function generateSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // Enrich summary with metadata
  const enrichedData = {
    ...data,
    metadata: {
      timestamp: new Date().toISOString(),
      phase: __ENV.TEST_PHASE || 'smoke',
      vus: __ENV.VUS || '1',
      duration: __ENV.DURATION || '10s',
    },
  };

  return {
    // JSON export for dashboard consumption
    'results/summary.json': JSON.stringify(enrichedData, null, 2),

    // Timestamped archive copy
    [`results/summary-${timestamp}.json`]: JSON.stringify(enrichedData, null, 2),

    // Text summary to stdout (default k6 output)
    stdout: textSummary(enrichedData),
  };
}

/**
 * Generates a text-based summary table from k6 summary data.
 * Replicates the default k6 end-of-test summary output.
 *
 * @param {object} data - k6 summary data
 * @returns {string} Formatted text summary
 */
function textSummary(data) {
  const lines = [];
  lines.push('\n' + '='.repeat(70));
  lines.push('  TEST RESULTS SUMMARY');
  lines.push('='.repeat(70));

  if (data.metadata) {
    lines.push(`  Phase:    ${data.metadata.phase}`);
    lines.push(`  VUs:      ${data.metadata.vus}`);
    lines.push(`  Duration: ${data.metadata.duration}`);
    lines.push(`  Time:     ${data.metadata.timestamp}`);
    lines.push('-'.repeat(70));
  }

  // Thresholds
  const thresholdMetrics = Object.entries(data.metrics || {}).filter(
    ([, m]) => m.thresholds && Object.keys(m.thresholds).length > 0
  );

  if (thresholdMetrics.length > 0) {
    lines.push('\n  THRESHOLDS:');
    for (const [name, metric] of thresholdMetrics) {
      for (const [expr, result] of Object.entries(metric.thresholds)) {
        const icon = result.ok ? '  ✓' : '  ✗';
        lines.push(`  ${icon}  ${name}: ${expr}`);
      }
    }
    lines.push('-'.repeat(70));
  }

  // Checks
  if (data.root_group && data.root_group.checks) {
    const checks = flattenChecks(data.root_group);
    if (checks.length > 0) {
      lines.push('\n  CHECKS:');
      for (const c of checks) {
        const total = c.passes + c.fails;
        const pct = total > 0 ? ((c.passes / total) * 100).toFixed(1) : '0.0';
        const icon = c.fails === 0 ? '  ✓' : '  ✗';
        lines.push(`  ${icon}  ${c.name}: ${pct}% (${c.passes}/${total})`);
      }
      lines.push('-'.repeat(70));
    }
  }

  // Key metrics
  lines.push('\n  KEY METRICS:');
  const keyMetrics = [
    'http_reqs',
    'http_req_duration',
    'http_req_failed',
    'http_req_waiting',
    'iterations',
    'vus',
    'data_received',
    'data_sent',
  ];

  for (const name of keyMetrics) {
    const metric = data.metrics?.[name];
    if (!metric) continue;
    lines.push(formatMetric(name, metric));
  }

  // Custom metrics
  const customMetrics = Object.entries(data.metrics || {}).filter(
    ([name]) => !name.startsWith('http_') && !['iterations', 'vus', 'vus_max', 'data_received', 'data_sent', 'iteration_duration', 'checks'].includes(name)
  );

  if (customMetrics.length > 0) {
    lines.push('\n  CUSTOM METRICS:');
    for (const [name, metric] of customMetrics) {
      lines.push(formatMetric(name, metric));
    }
  }

  lines.push('\n' + '='.repeat(70) + '\n');
  return lines.join('\n');
}

/**
 * Format a single metric for text output.
 */
function formatMetric(name, metric) {
  const v = metric.values || {};
  const padName = name.padEnd(30);

  switch (metric.type) {
    case 'counter':
      return `    ${padName} count=${v.count || 0}  rate=${(v.rate || 0).toFixed(2)}/s`;
    case 'gauge':
      return `    ${padName} value=${v.value || 0}  min=${v.min || 0}  max=${v.max || 0}`;
    case 'rate':
      return `    ${padName} rate=${((v.rate || 0) * 100).toFixed(2)}%  passes=${v.passes || 0}  fails=${v.fails || 0}`;
    case 'trend':
      return `    ${padName} avg=${fmt(v.avg)}  min=${fmt(v.min)}  med=${fmt(v.med)}  max=${fmt(v.max)}  p90=${fmt(v['p(90)'])}  p95=${fmt(v['p(95)'])}`;
    default:
      return `    ${padName} ${JSON.stringify(v)}`;
  }
}

function fmt(val) {
  if (val === undefined || val === null) return '-';
  return typeof val === 'number' ? val.toFixed(2) + 'ms' : String(val);
}

/**
 * Recursively flatten checks from k6 group structure.
 */
function flattenChecks(group) {
  let checks = [...(group.checks || [])];
  for (const sub of group.groups || []) {
    checks = checks.concat(flattenChecks(sub));
  }
  return checks;
}
