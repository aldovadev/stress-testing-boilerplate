import { post } from '../../../helpers/http.js';
import { authHeaders } from '../../../helpers/auth.js';
import { createCustomMessagePayload } from '../payloads/custom-message.payload.js';
import { createMetrics, recordMetrics } from '../../../helpers/metrics.js';
import { validateResponse } from '../../../helpers/checks.js';

// ─── Environment Variables ──────────────────────────────────────────
const BASE_URL = __ENV.VCONTENT_BASE_URL;
const JWT_TOKEN = __ENV.VCONTENT_JWT_TOKEN;

// ─── Custom Metrics ─────────────────────────────────────────────────
// Factory creates: custom_message_duration, custom_message_ttfb,
// custom_message_errors, custom_message_requests, custom_message_status_2xx, etc.
const metrics = createMetrics('custom_message');

/**
 * Scenario: Create Custom Message
 * Method: POST /custom-message
 *
 * Sends a randomized custom message payload and records all metrics.
 * Used across all test phases (smoke, load, stress, soak).
 */
export default function createCustomMessage() {
  const res = post(
    `${BASE_URL}/custom-message`,
    createCustomMessagePayload(),
    authHeaders(JWT_TOKEN),
    { endpoint: 'custom-message' },
  );

  // Record all metrics (duration, TTFB, response size, status codes, etc.)
  recordMetrics(metrics, res);

  // Validate response (k6 checks — contributes to checks pass/fail rate)
  validateResponse(res, {
    expectedStatus: 200,
    maxDuration: 2000,
    name: 'Create Custom Message',
  });
}