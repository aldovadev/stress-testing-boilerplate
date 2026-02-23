# K6 Stress Testing Framework

A comprehensive performance and load testing framework built with **k6** + a **real-time metrics dashboard** (Vite + React + Recharts + WebSocket).

---

## Architecture

```
┌──────────┐   --out json    ┌──────────────┐
│  k6      │ ──────────────▶ │  results/    │
│ (Docker) │   NDJSON file   │  output.json │
└──────────┘                 └──────┬───────┘
     │                              │ tail
     │  handleSummary()     ┌───────┴──────────┐
     └─────────────────────▶│  Express + WS    │
       results/summary.json │  Backend :3001   │
                            └───────┬──────────┘
                                    │ WebSocket
                            ┌───────┴──────────┐
                            │  Vite + React    │
                            │  Dashboard :5173 │
                            │  (Recharts)      │
                            └──────────────────┘
```

**Flow:**
1. k6 runs inside Docker and streams NDJSON metrics to `results/output.json`
2. Express backend tails the file in realtime using `chokidar`
3. New metrics are parsed and pushed to all connected dashboard clients via WebSocket
4. React frontend renders live-updating charts with Recharts

---

## Quick Start

### Prerequisites
- **Docker** (for running k6)
- **Node.js 18+** (for the dashboard)

### 1. Install Dashboard Dependencies
```bash
cd dashboard
npm install
```

### 2. Start the Dashboard
```bash
# From the dashboard/ directory
npm run dev
```
This starts both the Express backend (port 3001) and Vite dev server (port 5173).

### 3. Open the Dashboard
Navigate to **http://localhost:5173**

### 4. Run a Test
Open a new terminal from the project root:
```bash
# Smoke test against local API
npm run k6:vcontent:smoke:local

# Load test against dev environment
npm run k6:vcontent:load:dev
```

The dashboard will automatically detect the test run and start showing live metrics.

---

## Project Structure

```
stress-testing-boilerplate/
├── package.json                          # k6 run scripts for all phases/envs
├── README.md
├── .gitignore
│
├── env/                                  # Environment configurations
│   ├── local.env                         # Local development
│   ├── dev.env                           # Development server
│   ├── stag.env                          # Staging (fill in)
│   └── prod.env                          # Production (fill in)
│
├── helpers/                              # Shared k6 helper modules
│   ├── auth.js                           # Auth header builder
│   ├── checks.js                         # Response validation (k6 checks)
│   ├── config.js                         # Test phase configs & thresholds
│   ├── health-checks.js                  # Health check pre-flight
│   ├── http.js                           # HTTP method wrappers (GET/POST/PUT/PATCH/DELETE)
│   ├── metrics.js                        # Metric factory + recorder
│   └── summary.js                        # handleSummary for JSON export
│
├── scripts/                              # Service-specific test scripts
│   └── vcontent/                         # VContent API tests
│       ├── main.js                       # Entry point (scenarios + options)
│       ├── payloads/
│       │   └── custom-message.payload.js # Request body factory
│       └── scenarios/
│           └── create-custom-message.scenario.js
│
├── results/                              # k6 output (gitignored)
│   ├── output.json                       # Realtime NDJSON stream
│   ├── summary.json                      # Latest test summary
│   └── summary-*.json                    # Archived summaries
│
└── dashboard/                            # Realtime metrics dashboard
    ├── package.json
    ├── vite.config.ts
    ├── server/
    │   ├── server.js                     # Express + WebSocket backend
    │   └── parser.js                     # k6 NDJSON parser
    └── src/
        ├── App.tsx                       # Layout + routing
        ├── main.tsx                      # Entry point
        ├── index.css                     # Tailwind styles
        ├── types/metrics.ts              # TypeScript type definitions
        ├── store/metricsStore.tsx         # State management (React Context)
        ├── hooks/useMetricsStream.ts     # WebSocket hook
        ├── components/
        │   ├── Header.tsx                # App bar + status
        │   ├── Sidebar.tsx               # Navigation
        │   ├── MetricCard.tsx            # Stat card component
        │   ├── RealtimeChart.tsx         # Recharts wrapper
        │   ├── StatusBadge.tsx           # Status indicator
        │   └── ThresholdTable.tsx        # Threshold pass/fail table
        └── pages/
            ├── LiveDashboard.tsx          # Realtime charts
            ├── SummaryDashboard.tsx       # Post-run summary
            └── HistoryPage.tsx            # Past test runs
```

---

## Test Phases

Run tests with `npm run k6:vcontent:<phase>:<env>`:

| Phase | VU Profile | Purpose | Command |
|-------|-----------|---------|---------|
| **health** | 1 VU, 1 iter | Pre-flight API check | `npm run k6:vcontent:health:local` |
| **smoke** | 2 VUs, 30s constant | Verify API works under minimal load | `npm run k6:vcontent:smoke:local` |
| **load** | 0→50 VUs ramp, 2min plateau | Simulate expected traffic | `npm run k6:vcontent:load:local` |
| **stress** | 0→50→100→200 VUs ramp | Find breaking point | `npm run k6:vcontent:stress:local` |
| **soak** | 30 VUs for 15 minutes | Detect memory leaks & degradation | `npm run k6:vcontent:soak:local` |

Replace `:local` with `:dev` to target the dev environment.

### VU Ramp Profiles

```
SMOKE:     ███████████████████████████████  2 VUs for 30s

LOAD:      ╱████████████████████████████╲   0→50 VUs (30s) → hold (2m) → down (30s)
           0   30s        2min        3min

STRESS:    ╱███╱██████╱█████████████████╲   0→50→100→200 VUs with holds
           0  30s  1m  2m   3m   4m   5m

SOAK:      ╱█████████████████████████████╲  0→30 VUs (1m) → hold (15m) → down (1m)
           0  1m              16m      17m
```

---

## Metrics Collected

### Per-Request Metrics (via `createMetrics()` factory)

| Metric | Type | Description |
|--------|------|-------------|
| `{name}_duration` | Trend | Total response time (ms) |
| `{name}_ttfb` | Trend | Time To First Byte (ms) |
| `{name}_connecting` | Trend | TCP connection time (ms) |
| `{name}_tls_handshaking` | Trend | TLS handshake time (ms) |
| `{name}_response_size` | Trend | Response body size (bytes) |
| `{name}_errors` | Rate | Error rate (status >= 400) |
| `{name}_requests` | Counter | Total request count |
| `{name}_status_2xx` | Counter | Successful responses |
| `{name}_status_4xx` | Counter | Client errors |
| `{name}_status_5xx` | Counter | Server errors |

### Built-in k6 Metrics (automatic)

| Metric | Description |
|--------|-------------|
| `http_req_duration` | End-to-end response time |
| `http_req_waiting` | TTFB (server processing time) |
| `http_req_failed` | Failed request rate |
| `http_reqs` | Total HTTP requests |
| `vus` | Active virtual users |
| `data_sent` / `data_received` | Network throughput |

### Default Thresholds

| Phase | p95 Latency | Avg Latency | Error Rate |
|-------|------------|-------------|------------|
| Smoke | < 1000ms | < 500ms | < 1% |
| Load | < 500ms | < 300ms | < 5% |
| Stress | < 2000ms | < 1000ms | < 15% |
| Soak | < 500ms | < 300ms | < 5% |

---

## Dashboard

### Live Dashboard
Real-time charts that update as k6 runs:
- **Response Time** — avg, p90, p95, p99 with threshold line
- **Throughput** — Requests per second
- **Error Rate** — Error percentage with threshold warning
- **Active VUs** — Virtual user count over time
- **TTFB** — Time To First Byte
- **Data Transfer** — Bytes sent/received

### Summary Dashboard
Post-run aggregated view:
- Summary stat cards (total requests, avg time, error rate, duration)
- Percentile breakdown (min, median, p90, p95, p99, max)
- Threshold pass/fail results
- Check assertions results
- Full metrics table

### History
Browse and compare past test runs.

---

## Adding a New Service / Endpoint

### 1. Create the payload factory

```javascript
// scripts/myservice/payloads/create-user.payload.js
export function createUserPayload() {
  return {
    name: `User ${Math.floor(Math.random() * 10000)}`,
    email: `user${Date.now()}@test.com`,
  };
}
```

### 2. Create the scenario

```javascript
// scripts/myservice/scenarios/create-user.scenario.js
import { post } from '../../../helpers/http.js';
import { authHeaders } from '../../../helpers/auth.js';
import { createMetrics, recordMetrics } from '../../../helpers/metrics.js';
import { validateResponse } from '../../../helpers/checks.js';
import { createUserPayload } from '../payloads/create-user.payload.js';

const BASE_URL = __ENV.MYSERVICE_BASE_URL;
const JWT_TOKEN = __ENV.MYSERVICE_JWT_TOKEN;
const metrics = createMetrics('create_user');

export default function createUser() {
  const res = post(
    `${BASE_URL}/users`,
    createUserPayload(),
    authHeaders(JWT_TOKEN),
    { endpoint: 'create-user' },
  );
  recordMetrics(metrics, res);
  validateResponse(res, { expectedStatus: 201, name: 'Create User' });
}
```

### 3. Create the main entry point

```javascript
// scripts/myservice/main.js
import { getConfig, buildOptions } from '../../helpers/config.js';
import { generateSummary } from '../../helpers/summary.js';
import healthCheck from '../../helpers/health-checks.js';
import createUser from './scenarios/create-user.scenario.js';

const config = getConfig('MYSERVICE');

export const options = buildOptions(config.testPhase, 'createUser', {
  'create_user_duration': ['p(95)<500'],
  'create_user_errors': ['rate<0.05'],
});

export function setup() {
  healthCheck(config.baseUrl);
  return { config };
}

export default function () {}
export { createUser };
export { generateSummary as handleSummary };
```

### 4. Add environment variables

```env
# env/local.env
MYSERVICE_BASE_URL=http://host.docker.internal:3000
MYSERVICE_JWT_TOKEN=your-token-here
```

### 5. Add npm scripts

```json
{
  "k6:myservice:smoke:local": "docker run --rm --add-host=host.docker.internal:host-gateway --env-file env/local.env -e TEST_PHASE=smoke -v $(pwd):/app -w /app grafana/k6 run --out json=/app/results/output.json scripts/myservice/main.js"
}
```

---

## Environment Configuration

Each environment file in `env/` contains:
```env
<SERVICE>_BASE_URL=https://your-api-url.com
<SERVICE>_JWT_TOKEN=your-jwt-token
```

Available environments: `local`, `dev`, `stag`, `prod`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Docker can't reach localhost | Use `--add-host=host.docker.internal:host-gateway` (included in local scripts) |
| Dashboard not showing data | Ensure Express backend is running on port 3001 |
| `$(pwd)` not working on Windows | Use PowerShell's `${PWD}` or run from Git Bash |
| k6 exits with code 99 | A threshold was violated — check the summary |
| WebSocket keeps disconnecting | Ensure the Express server started before the Vite dev server |

---

## License

MIT
