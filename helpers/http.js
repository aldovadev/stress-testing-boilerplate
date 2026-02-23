import http from 'k6/http';

/**
 * Generic HTTP request dispatcher
 * @param {string} method - HTTP method (GET, POST, PUT, PATCH, DELETE)
 * @param {string} url - Request URL
 * @param {object|null} body - Request body (will be JSON-stringified if object)
 * @param {object} headers - Request headers
 * @param {object} tags - k6 tags for metric grouping
 * @returns {import('k6/http').RefinedResponse}
 */
export function request(method, url, body = null, headers = {}, tags = {}) {
  const params = { headers, tags };
  const payload = body ? JSON.stringify(body) : null;

  switch (method.toUpperCase()) {
    case 'GET':
      return http.get(url, params);
    case 'POST':
      return http.post(url, payload, params);
    case 'PUT':
      return http.put(url, payload, params);
    case 'PATCH':
      return http.patch(url, payload, params);
    case 'DELETE':
      return http.del(url, payload, params);
    default:
      throw new Error(`Unsupported HTTP method: ${method}`);
  }
}

/**
 * HTTP GET request
 * @param {string} url - Request URL
 * @param {object} headers - Request headers
 * @param {object} tags - k6 tags for metric grouping
 */
export function get(url, headers = {}, tags = {}) {
  return request('GET', url, null, headers, tags);
}

/**
 * HTTP POST request with JSON body
 * @param {string} url - Request URL
 * @param {object} body - Request body
 * @param {object} headers - Request headers
 * @param {object} tags - k6 tags for metric grouping
 */
export function post(url, body, headers = {}, tags = {}) {
  return request('POST', url, body, headers, tags);
}

/**
 * HTTP PUT request with JSON body
 * @param {string} url - Request URL
 * @param {object} body - Request body
 * @param {object} headers - Request headers
 * @param {object} tags - k6 tags for metric grouping
 */
export function put(url, body, headers = {}, tags = {}) {
  return request('PUT', url, body, headers, tags);
}

/**
 * HTTP PATCH request with JSON body
 * @param {string} url - Request URL
 * @param {object} body - Request body
 * @param {object} headers - Request headers
 * @param {object} tags - k6 tags for metric grouping
 */
export function patch(url, body, headers = {}, tags = {}) {
  return request('PATCH', url, body, headers, tags);
}

/**
 * HTTP DELETE request
 * @param {string} url - Request URL
 * @param {object|null} body - Optional request body
 * @param {object} headers - Request headers
 * @param {object} tags - k6 tags for metric grouping
 */
export function del(url, body = null, headers = {}, tags = {}) {
  return request('DELETE', url, body, headers, tags);
}