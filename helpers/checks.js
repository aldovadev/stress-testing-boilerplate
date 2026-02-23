import { check } from 'k6';

/**
 * Validates an HTTP response with standard k6 checks.
 * Returns true if ALL checks pass.
 *
 * @param {import('k6/http').RefinedResponse} res - k6 HTTP response
 * @param {object} options - Validation options
 * @param {number} [options.expectedStatus=200] - Expected HTTP status code
 * @param {number} [options.maxDuration=2000] - Max acceptable response time (ms)
 * @param {boolean} [options.checkBody=true] - Whether to assert non-empty body
 * @param {string} [options.name=''] - Optional name prefix for check labels
 * @returns {boolean} True if all checks passed
 *
 * @example
 *   const res = post(url, body, headers);
 *   validateResponse(res, { expectedStatus: 201, name: 'Create Message' });
 */
export function validateResponse(res, options = {}) {
  const {
    expectedStatus = 200,
    maxDuration = 2000,
    checkBody = true,
    name = '',
  } = options;

  const prefix = name ? `${name}: ` : '';

  const checks = {
    [`${prefix}status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${prefix}response time < ${maxDuration}ms`]: (r) => r.timings.duration < maxDuration,
  };

  if (checkBody) {
    checks[`${prefix}body is not empty`] = (r) => r.body && r.body.length > 0;
  }

  return check(res, checks);
}

/**
 * Validates response body contains expected JSON fields.
 *
 * @param {import('k6/http').RefinedResponse} res - k6 HTTP response
 * @param {string[]} fields - Expected top-level JSON field names
 * @param {string} [name=''] - Optional name prefix for check labels
 * @returns {boolean} True if all field checks passed
 *
 * @example
 *   validateJsonFields(res, ['id', 'title', 'createdAt'], 'Create Message');
 */
export function validateJsonFields(res, fields = [], name = '') {
  const prefix = name ? `${name}: ` : '';

  let body;
  try {
    body = JSON.parse(res.body);
  } catch {
    return check(res, {
      [`${prefix}response is valid JSON`]: () => false,
    });
  }

  const checks = {};
  for (const field of fields) {
    checks[`${prefix}has field '${field}'`] = () => body[field] !== undefined;
  }

  return check(res, checks);
}
