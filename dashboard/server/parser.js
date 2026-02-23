/**
 * K6 NDJSON line parser.
 * Parses individual lines from k6's `--out json` output into structured objects.
 *
 * k6 JSON output has two line types:
 *   - "Metric": Metadata declaration (emitted once per metric)
 *   - "Point":  Data sample (emitted per data point)
 */

/**
 * Parse a single NDJSON line from k6 output.
 * @param {string} line - Raw JSON string
 * @returns {object|null} Parsed metric object or null on parse error
 */
export function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);

    if (parsed.type === 'Metric') {
      return {
        type: 'metric_definition',
        name: parsed.metric,
        metricType: parsed.data.type,       // gauge, rate, counter, trend
        contains: parsed.data.contains,     // time, default, data
        thresholds: parsed.data.thresholds || [],
      };
    }

    if (parsed.type === 'Point') {
      return {
        type: 'data_point',
        metric: parsed.metric,
        timestamp: parsed.data.time,
        value: parsed.data.value,
        tags: parsed.data.tags || {},
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Categorize a metric by its name into a dashboard panel category.
 * @param {string} metricName - k6 metric name
 * @returns {string} Category: 'latency' | 'throughput' | 'errors' | 'vus' | 'data' | 'custom'
 */
export function categorizeMetric(metricName) {
  if (['http_req_duration', 'http_req_waiting', 'http_req_connecting',
    'http_req_tls_handshaking', 'http_req_sending', 'http_req_receiving',
    'iteration_duration'].includes(metricName)
    || metricName.endsWith('_duration') || metricName.endsWith('_ttfb')
    || metricName.endsWith('_connecting') || metricName.endsWith('_tls_handshaking')) {
    return 'latency';
  }

  if (['http_reqs', 'iterations'].includes(metricName)
    || metricName.endsWith('_requests') || metricName.endsWith('_status_2xx')
    || metricName.endsWith('_status_4xx') || metricName.endsWith('_status_5xx')) {
    return 'throughput';
  }

  if (['http_req_failed'].includes(metricName)
    || metricName.endsWith('_errors')) {
    return 'errors';
  }

  if (['vus', 'vus_max'].includes(metricName)) {
    return 'vus';
  }

  if (['data_sent', 'data_received'].includes(metricName)
    || metricName.endsWith('_response_size')) {
    return 'data';
  }

  return 'custom';
}

/**
 * Aggregate data points into time-bucketed series for charting.
 * Groups points by metric name and time bucket.
 *
 * @param {Array} points - Array of data_point objects
 * @param {number} bucketMs - Bucket size in milliseconds (default: 1000 = 1s)
 * @returns {Map<string, Array>} Map of metric name → [{time, avg, min, max, count}]
 */
export function aggregatePoints(points, bucketMs = 1000) {
  const buckets = new Map();

  for (const point of points) {
    const key = point.metric;
    const time = Math.floor(new Date(point.timestamp).getTime() / bucketMs) * bucketMs;

    if (!buckets.has(key)) {
      buckets.set(key, new Map());
    }

    const metricBuckets = buckets.get(key);
    if (!metricBuckets.has(time)) {
      metricBuckets.set(time, { sum: 0, count: 0, min: Infinity, max: -Infinity });
    }

    const bucket = metricBuckets.get(time);
    bucket.sum += point.value;
    bucket.count += 1;
    bucket.min = Math.min(bucket.min, point.value);
    bucket.max = Math.max(bucket.max, point.value);
  }

  const result = new Map();
  for (const [metric, metricBuckets] of buckets) {
    const series = [];
    for (const [time, bucket] of metricBuckets) {
      series.push({
        time,
        avg: bucket.sum / bucket.count,
        min: bucket.min,
        max: bucket.max,
        count: bucket.count,
      });
    }
    series.sort((a, b) => a.time - b.time);
    result.set(metric, series);
  }

  return result;
}
