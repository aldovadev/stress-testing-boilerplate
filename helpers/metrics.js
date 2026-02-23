import { Trend, Rate, Counter } from 'k6/metrics';

/**
 * Creates a full set of custom k6 metrics for a given endpoint.
 * All metric names are auto-prefixed with the endpoint name.
 *
 * @param {string} name - Endpoint identifier (e.g., 'custom_message')
 * @returns {object} Metric collection object
 *
 * @example
 *   const metrics = createMetrics('custom_message');
 *   // Creates: custom_message_duration, custom_message_ttfb, etc.
 */
export function createMetrics(name) {
  return {
    // Response time
    duration: new Trend(`${name}_duration`, true),
    // Time To First Byte
    ttfb: new Trend(`${name}_ttfb`, true),
    // Connection time
    connecting: new Trend(`${name}_connecting`, true),
    // TLS handshake time
    tlsHandshaking: new Trend(`${name}_tls_handshaking`, true),
    // Response body size
    responseSize: new Trend(`${name}_response_size`, false),
    // Error rate (status >= 400)
    errors: new Rate(`${name}_errors`),
    // Total request count
    requests: new Counter(`${name}_requests`),
    // Status code buckets
    status2xx: new Counter(`${name}_status_2xx`),
    status4xx: new Counter(`${name}_status_4xx`),
    status5xx: new Counter(`${name}_status_5xx`),
  };
}

/**
 * Records all metrics from a k6 HTTP response in one call.
 * Use this after every HTTP request to automatically populate all metrics.
 *
 * @param {object} metrics - Metrics object returned by createMetrics()
 * @param {import('k6/http').RefinedResponse} res - k6 HTTP response
 *
 * @example
 *   const res = post(url, body, headers, tags);
 *   recordMetrics(metrics, res);
 */
export function recordMetrics(metrics, res) {
  // Timing metrics
  metrics.duration.add(res.timings.duration);
  metrics.ttfb.add(res.timings.waiting);
  metrics.connecting.add(res.timings.connecting);
  metrics.tlsHandshaking.add(res.timings.tls_handshaking);

  // Response size
  if (res.body) {
    metrics.responseSize.add(res.body.length);
  }

  // Request count
  metrics.requests.add(1);

  // Error rate
  metrics.errors.add(res.status >= 400);

  // Status code buckets
  if (res.status >= 200 && res.status < 300) {
    metrics.status2xx.add(1);
  } else if (res.status >= 400 && res.status < 500) {
    metrics.status4xx.add(1);
  } else if (res.status >= 500) {
    metrics.status5xx.add(1);
  }
}
