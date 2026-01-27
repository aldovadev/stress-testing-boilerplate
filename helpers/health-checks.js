import http from 'k6/http';
import { check } from 'k6';

export default function healthCheck(BASE_URL) {
  const res = http.get(`${BASE_URL}/health`);
  check(res, { 'health ok': (r) => r.status === 200 });
}
