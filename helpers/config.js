/**
 * Centralized test configuration.
 * Reads environment variables and provides scenario stage profiles
 * for each test phase (smoke, load, stress, soak).
 *
 * Fully app-agnostic — all parameters come from environment variables.
 */

/**
 * Get base configuration from environment variables.
 * No service-specific prefixes — uses generic env var names.
 *
 * Environment Variables:
 *   BASE_URL       - Target base URL (required)
 *   ENDPOINT       - API endpoint path, e.g., /api/users (default: /)
 *   HTTP_METHOD    - HTTP method: GET, POST, PUT, PATCH, DELETE (default: GET)
 *   REQUEST_BODY   - JSON string for request body (optional)
 *   REQUEST_HEADERS - JSON string of extra headers (optional)
 *   AUTH_TOKEN     - Bearer token for Authorization header (optional)
 *   TEST_PHASE     - smoke | load | stress | soak (default: smoke)
 *   METRIC_NAME    - Custom metric prefix (auto-derived from endpoint if omitted)
 *   TEST_TYPE      - fe | be (default: be) — frontend page load vs backend API
 *   VUS            - Override VU count for constant-vus phases
 *   DURATION       - Override duration for constant-vus phases
 *
 * @returns {object} Configuration object
 */
export function getConfig() {
  const endpoint = __ENV.ENDPOINT || '/';
  const metricName = __ENV.METRIC_NAME || deriveMetricName(endpoint);

  return {
    baseUrl: __ENV.BASE_URL || 'http://localhost:3000',
    endpoint,
    httpMethod: (__ENV.HTTP_METHOD || 'GET').toUpperCase(),
    requestBody: parseJsonEnv(__ENV.REQUEST_BODY),
    requestHeaders: parseJsonEnv(__ENV.REQUEST_HEADERS) || {},
    authToken: __ENV.AUTH_TOKEN || '',
    testPhase: (__ENV.TEST_PHASE || 'smoke').toLowerCase(),
    testType: (__ENV.TEST_TYPE || 'be').toLowerCase(),
    metricName,
    vus: Number(__ENV.VUS || 1),
    duration: __ENV.DURATION || '10s',
  };
}

/**
 * Safely parse a JSON string from an environment variable.
 * Returns null if the string is empty or invalid.
 */
function parseJsonEnv(value) {
  if (!value || value.trim() === '') return null;
  try {
    return JSON.parse(value);
  } catch {
    console.warn(`[config] Failed to parse JSON env value: ${value.substring(0, 100)}`);
    return null;
  }
}

/**
 * Derive a metric-safe name from an endpoint path.
 * e.g., "/api/v1/users" → "api_v1_users"
 *       "/health" → "health"
 */
function deriveMetricName(endpoint) {
  return endpoint
    .replace(/^\/+/, '')          // Remove leading slashes
    .replace(/\/+$/, '')          // Remove trailing slashes
    .replace(/[^a-zA-Z0-9]+/g, '_')  // Replace non-alphanumeric with _
    .replace(/_+/g, '_')         // Collapse multiple underscores
    .toLowerCase()
    || 'root';                   // Fallback for "/"
}

/**
 * Phase-specific scenario configurations.
 * Each phase defines its k6 executor type, VU stages, and thresholds.
 *
 * Phases:
 *   - health:  Pre-flight check, 1 VU, 1 iteration
 *   - smoke:   Minimal load to verify correctness (2 VUs, 30s)
 *   - load:    Expected traffic simulation with ramp-up/down (up to 50 VUs)
 *   - stress:  Push beyond limits to find breaking point (up to 200 VUs)
 *   - soak:    Sustained load for endurance/memory leak detection (30 VUs for 15min)
 */
export const phaseProfiles = {
  health: {
    executor: 'per-vu-iterations',
    vus: 1,
    iterations: 1,
    maxDuration: '10s',
  },

  smoke: {
    executor: 'constant-vus',
    vus: 2,
    duration: '30s',
  },

  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 50 },   // Ramp up
      { duration: '2m', target: 50 },    // Plateau
      { duration: '30s', target: 0 },    // Ramp down
    ],
  },

  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 50 },   // Warm up
      { duration: '1m', target: 50 },    // Hold
      { duration: '30s', target: 100 },  // Scale up
      { duration: '1m', target: 100 },   // Hold
      { duration: '30s', target: 200 },  // Push to breaking point
      { duration: '1m', target: 200 },   // Hold at peak
      { duration: '30s', target: 0 },    // Recovery
    ],
  },

  soak: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 30 },    // Ramp up
      { duration: '15m', target: 30 },   // Sustained load
      { duration: '1m', target: 0 },     // Ramp down
    ],
  },
};

/**
 * Phase-specific thresholds.
 * Each phase has different acceptable limits.
 */
export const phaseThresholds = {
  health: {
    'http_req_failed': ['rate==0'],
  },

  smoke: {
    'http_req_duration': ['p(95)<1000', 'avg<500'],
    'http_req_failed': ['rate<0.01'],
  },

  load: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000', 'avg<300'],
    'http_req_failed': ['rate<0.05'],
  },

  stress: {
    'http_req_duration': ['p(95)<2000', 'avg<1000'],
    'http_req_failed': ['rate<0.15'],
  },

  soak: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000', 'avg<300'],
    'http_req_failed': ['rate<0.05'],
  },
};

/**
 * Builds k6 options object for a given test phase and scenario function name.
 *
 * @param {string} phase - Test phase: 'health' | 'smoke' | 'load' | 'stress' | 'soak'
 * @param {string} execFn - Name of the exported scenario function to execute
 * @param {object} [customThresholds={}] - Additional thresholds to merge
 * @returns {object} k6 options object with scenarios and thresholds
 *
 * @example
 *   export const options = buildOptions('load', 'runTest', {
 *     'api_users_duration': ['p(95)<500'],
 *   });
 */
export function buildOptions(phase, execFn, customThresholds = {}) {
  const profile = phaseProfiles[phase];
  if (!profile) {
    throw new Error(`Unknown test phase: "${phase}". Valid phases: ${Object.keys(phaseProfiles).join(', ')}`);
  }

  const thresholds = {
    ...phaseThresholds[phase],
    ...customThresholds,
  };

  return {
    scenarios: {
      [execFn]: {
        ...profile,
        exec: execFn,
      },
    },
    thresholds,
  };
}
