// ─── Test Configuration Types ────────────────────────────────────────

export type TestType = 'fe' | 'be';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface TestConfig {
  testType: TestType;
  baseUrl: string;
  endpoint: string;
  method: HttpMethod;
  body: string;
  headers: Record<string, string>;
  authToken: string;
  testPhase: string;
  metricName: string;
}

export interface Preset {
  name: string;
  config: TestConfig;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface RunnerStatus {
  running: boolean;
  pid: number | null;
  startedAt: string | null;
  config: TestConfig | null;
  runner: 'native' | 'docker' | null;
  output: string[];
  availableRunners: {
    native: boolean;
    docker: boolean;
  };
}

export const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export const TEST_PHASES = [
  { value: 'smoke', label: 'Smoke', description: '2 VUs, 30s — verify correctness' },
  { value: 'load', label: 'Load', description: 'Up to 50 VUs — expected traffic' },
  { value: 'stress', label: 'Stress', description: 'Up to 200 VUs — breaking point' },
  { value: 'soak', label: 'Soak', description: '30 VUs, 15min — endurance' },
];

export const DEFAULT_CONFIG: TestConfig = {
  testType: 'be',
  baseUrl: 'http://localhost:3000',
  endpoint: '/',
  method: 'GET',
  body: '',
  headers: {},
  authToken: '',
  testPhase: 'smoke',
  metricName: '',
};
