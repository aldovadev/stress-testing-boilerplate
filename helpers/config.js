/**
 * Centralized test configuration.
 * Reads environment variables and provides scenario stage profiles
 * for each test phase (smoke, load, stress, soak).
 */

/**
 * Get base configuration from environment variables.
 * @param {string} servicePrefix - Environment variable prefix (e.g., 'VCONTENT')
 * @returns {object} Configuration object with baseUrl, jwtToken, testPhase, etc.
 */
export function getConfig(servicePrefix = 'VCONTENT') {
  return {
    baseUrl: __ENV[`${servicePrefix}_BASE_URL`] || 'http://localhost:3000',
    jwtToken: __ENV[`${servicePrefix}_JWT_TOKEN`] || '',
    testPhase: (__ENV.TEST_PHASE || 'smoke').toLowerCase(),
    vus: Number(__ENV.VUS || 1),
    duration: __ENV.DURATION || '10s',
  };
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
 *   export const options = buildOptions('load', 'createCustomMessage', {
 *     'custom_message_duration': ['p(95)<500'],
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
