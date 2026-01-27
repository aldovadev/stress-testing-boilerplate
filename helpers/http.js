import http from 'k6/http';

export function post(url, body, headers, tags = {}) {
  return http.post(
    url,
    JSON.stringify(body),
    {
      headers,
      tags,
    },
  );
}