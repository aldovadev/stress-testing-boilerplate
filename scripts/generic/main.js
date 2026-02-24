/**
 * Universal K6 Test Entry Point
 * ─────────────────────────────────────────────────────────────────────
 * Fully app-agnostic — all test parameters come from environment variables.
 * Works for both Frontend (page load) and Backend (API) testing.
 *
 * Environment Variables (passed via --env-file or -e flags):
 *   BASE_URL         - Target base URL (required)
 *   ENDPOINT         - Path to test, e.g., /api/users (default: /)
 *   HTTP_METHOD      - GET, POST, PUT, PATCH, DELETE (default: GET)
 *   REQUEST_BODY     - JSON string for request body (optional)
 *   REQUEST_HEADERS  - JSON string of extra headers (optional)
 *   AUTH_TOKEN       - Bearer token (optional)
 *   TEST_PHASE       - smoke | load | stress | soak (default: smoke)
 *   TEST_TYPE        - fe | be (default: be)
 *   METRIC_NAME      - Custom metric prefix (auto-derived from endpoint)
 *   VUS              - Override VU count
 *   DURATION         - Override duration
 *
 * Usage (Docker):
 *   docker run --rm --env-file env/local.env \
 *     -e ENDPOINT=/api/users -e HTTP_METHOD=GET -e TEST_PHASE=smoke \
 *     -v $(pwd):/app -w /app grafana/k6 run \
 *     --out json=/app/results/output.json scripts/generic/main.js
 *
 * Usage (Native k6):
 *   k6 run --env-file env/local.env \
 *     -e ENDPOINT=/api/users -e HTTP_METHOD=GET -e TEST_PHASE=smoke \
 *     --out json=results/output.json scripts/generic/main.js
 */

import { getConfig, buildOptions } from '../../helpers/config.js';
import { generateSummary } from '../../helpers/summary.js';
import { request } from '../../helpers/http.js';
import { authHeaders } from '../../helpers/auth.js';
import { createMetrics, recordMetrics } from '../../helpers/metrics.js';
import { validateResponse } from '../../helpers/checks.js';
import healthCheck from '../../helpers/health-checks.js';

// ─── Configuration ──────────────────────────────────────────────────
const config = getConfig();

// ─── Custom Metrics ─────────────────────────────────────────────────
// Factory creates metrics prefixed with the derived metric name:
//   e.g., "api_users_duration", "api_users_ttfb", "api_users_errors", etc.
const metrics = createMetrics(config.metricName);

// ─── k6 Options ─────────────────────────────────────────────────────
// Phase is selected via TEST_PHASE env var (default: 'smoke')
// Valid phases: health, smoke, load, stress, soak
export const options = buildOptions(config.testPhase, 'runTest', {
  [`${config.metricName}_duration`]: ['p(95)<500'],
  [`${config.metricName}_errors`]: ['rate<0.05'],
});

// ─── Setup (runs once before all VUs) ───────────────────────────────
export function setup() {
  const targetUrl = `${config.baseUrl}${config.endpoint}`;
  const testTypeLabel = config.testType === 'fe' ? 'FRONTEND' : 'BACKEND';

  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║   K6 Stress Test — ${config.testPhase.toUpperCase()} phase`);
  console.log(`║──────────────────────────────────────────────────║`);
  console.log(`║   Type:     ${testTypeLabel}`);
  console.log(`║   Target:   ${targetUrl}`);
  console.log(`║   Method:   ${config.httpMethod}`);
  console.log(`║   Metrics:  ${config.metricName}_*`);
  console.log(`║   Auth:     ${config.authToken ? 'Bearer token provided' : 'None'}`);
  if (config.requestBody) {
    console.log(`║   Body:     ${JSON.stringify(config.requestBody).substring(0, 40)}...`);
  }
  console.log(`╚══════════════════════════════════════════════════╝\n`);

  // Health check (skip for health phase itself)
  if (config.testPhase !== 'health') {
    healthCheck(config.baseUrl);
  }

  return { config };
}

// ─── Default function (required by k6) ─────────────────────────────
export default function () {}

// ─── Scenario: Run Test ─────────────────────────────────────────────
/**
 * Universal test scenario that executes the configured HTTP request.
 * Called by k6 based on the phase executor (constant-vus, ramping-vus, etc.)
 */
export function runTest() {
  const url = `${config.baseUrl}${config.endpoint}`;

  // Build headers
  let headers = {
    'Content-Type': 'application/json',
    ...config.requestHeaders,
  };

  // Add auth header if token is provided
  if (config.authToken) {
    headers = { ...headers, ...authHeaders(config.authToken) };
  }

  // For FE testing (page loads), remove Content-Type since we're fetching HTML
  if (config.testType === 'fe') {
    delete headers['Content-Type'];
    headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
  }

  // Execute HTTP request with configured method
  const res = request(
    config.httpMethod,
    url,
    config.requestBody,
    headers,
    { endpoint: config.endpoint, method: config.httpMethod, test_type: config.testType },
  );

  // Record all custom metrics (duration, TTFB, errors, status codes, etc.)
  recordMetrics(metrics, res);

  // Validate response
  const expectedStatus = config.testType === 'fe' ? 200 : null;
  validateResponse(res, {
    expectedStatus: expectedStatus || 200,
    maxDuration: config.testPhase === 'stress' ? 5000 : 2000,
    name: `${config.httpMethod} ${config.endpoint}`,
  });
}

// ─── Summary handler ────────────────────────────────────────────────
// Exports results as JSON for the dashboard + prints text summary
export { generateSummary as handleSummary };
