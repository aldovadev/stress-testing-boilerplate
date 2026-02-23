import { getConfig, buildOptions } from '../../helpers/config.js';
import { generateSummary } from '../../helpers/summary.js';
import healthCheck from '../../helpers/health-checks.js';
import createCustomMessage from './scenarios/create-custom-message.scenario.js';

// ─── Configuration ──────────────────────────────────────────────────
const config = getConfig('VCONTENT');

// ─── k6 Options ─────────────────────────────────────────────────────
// Phase is selected via __ENV.TEST_PHASE (default: 'smoke')
// Valid phases: health, smoke, load, stress, soak
export const options = buildOptions(config.testPhase, 'createCustomMessage', {
  // Custom metric thresholds (extend per-phase defaults)
  'custom_message_duration': ['p(95)<500'],
  'custom_message_errors': ['rate<0.05'],
});

// ─── Setup (runs once before all VUs) ───────────────────────────────
// Performs a health check. If it fails, the test data returned
// will signal scenarios to skip execution.
export function setup() {
  console.log(`\n🚀 Starting ${config.testPhase.toUpperCase()} test against ${config.baseUrl}\n`);

  if (config.testPhase !== 'health') {
    healthCheck(config.baseUrl);
  }

  return { config };
}

// ─── Default function (required by k6) ─────────────────────────────
export default function () {}

// ─── Scenario exports ───────────────────────────────────────────────
// Each exported function name must match the 'exec' field in options.scenarios
export { createCustomMessage };

// ─── Summary handler ────────────────────────────────────────────────
// Exports results as JSON for the dashboard + prints text summary
export { generateSummary as handleSummary };

