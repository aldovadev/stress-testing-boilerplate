export function authHeaders(JWT_TOKEN) {
  return {
    Authorization: `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json',
  };
}