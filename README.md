# K6 Stress Testing Framework

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**App-agnostic** performance and load testing framework built with **k6** + a **real-time metrics dashboard** (Vite + React + Recharts + WebSocket).

Test **any** endpoint or page — configure targets dynamically from the dashboard UI or via CLI. Supports all HTTP methods, frontend page loads, backend API testing, and saved presets.

---

## Architecture

```
                          +-------------------+
                          |   Dashboard UI    |
                          |  (Vite + React)   |
                          |    :5173          |
                          +--------+----------+
                                   |
                          WebSocket + REST API
                                   |
                          +--------+----------+
                          | Express Backend   |
                          |    :3001          |
                          +---+----------+----+
                              |          |
                   POST /api/run-test   tail results/output.json
                              |          |
                         +----+----+    +--+
                         | k6 CLI  |    |  | chokidar watcher
                         | or      |    |  +----> broadcast via WS
                         | Docker  |----+
                         +---------+
                              |
                         --out json
                              |
                    results/output.json
                    results/summary.json
```

---

## Features

- **App-Agnostic**: Test any URL — no hardcoded endpoints. Configure target, method, headers, body, auth from the dashboard or CLI.
- **FE + BE Testing**: Toggle between frontend page load testing (GET routes) and backend API testing (all HTTP methods).
- **Dynamic Dashboard**: Real-time charts auto-discover custom metrics from the k6 stream  no chart configuration needed.
- **Test Runner**: Launch and stop k6 tests directly from the dashboard. Auto-detects native k6 CLI or Docker.
- **Saved Presets**: Save test configurations and reload them instantly.
- **5-Phase Testing**: smoke, load, stress, soak phases with pre-configured VU profiles and thresholds.
- **CLI Support**: npm scripts for CI/CD pipelines with environment file support.
- **Realtime Streaming**: NDJSON file tailing via chokidar + WebSocket broadcast to React frontend.
- **Custom Metrics**: Per-endpoint metrics (duration, TTFB, errors, status codes, response size) via factory pattern.

---

## Quick Start

### 1. Install Dashboard Dependencies

```bash
npm run dashboard:install
```

### 2. Start the Dashboard

```bash
npm run dashboard:dev
```

Opens at [http://localhost:5173](http://localhost:5173) with the backend API at port 3001.

### 3. Run a Test

**Option A — Dashboard UI** (recommended):
1. Navigate to **New Test** in the sidebar
2. Choose **Backend API** or **Frontend Page**
3. Enter target URL, endpoint, HTTP method, headers, body
4. Select test phase (smoke/load/stress/soak)
5. Click **Run Test**
6. Switch to **Live Dashboard** to watch metrics in real-time

**Option B — CLI**:

```bash
# Smoke test against local env
npm run k6:smoke:local -- -e ENDPOINT=/api/users -e HTTP_METHOD=GET

# Load test against dev env with POST body
npm run k6:load:dev -- -e ENDPOINT=/api/users -e HTTP_METHOD=POST -e 'REQUEST_BODY={"name":"test"}'

# Stress test with auth
npm run k6:stress:dev -- -e ENDPOINT=/api/protected -e AUTH_TOKEN=your_jwt_token
```

---

## Project Structure

```
stress-testing-boilerplate/
+-- package.json                 # npm scripts for k6 + dashboard
+-- env/
|   +-- local.env               # BASE_URL, AUTH_TOKEN, TEST_PHASE
|   +-- dev.env
|   +-- stag.env
|   +-- prod.env
+-- helpers/
|   +-- auth.js                 # Bearer token header builder
|   +-- checks.js               # Response validation (k6 checks)
|   +-- config.js               # Centralized config + phase profiles
|   +-- health-checks.js        # Pre-flight GET /health check
|   +-- http.js                 # HTTP method wrappers (GET/POST/PUT/PATCH/DELETE)
|   +-- metrics.js              # Metric factory (createMetrics/recordMetrics)
|   +-- summary.js              # handleSummary JSON + text export
+-- scripts/
|   +-- generic/
|       +-- main.js             # Universal k6 entry point
+-- results/
|   +-- output.json             # k6 NDJSON stream (gitignored)
|   +-- summary.json            # Post-test summary (gitignored)
+-- dashboard/
    +-- package.json
    +-- vite.config.ts
    +-- server/
    |   +-- server.js           # Express + WebSocket backend
    |   +-- parser.js           # k6 NDJSON parser
    |   +-- runner.js           # k6 process spawner (native/Docker)
    |   +-- presets.js          # Saved test configurations
    |   +-- presets.json        # Preset storage file
    +-- src/
        +-- App.tsx             # Layout + routes
        +-- types/
        |   +-- metrics.ts      # Metric/dashboard types
        |   +-- testConfig.ts   # Test configuration types
        +-- store/
        |   +-- metricsStore.tsx # React Context state
        +-- hooks/
        |   +-- useMetricsStream.ts  # WebSocket hook
        +-- components/
        |   +-- Header.tsx
        |   +-- Sidebar.tsx
        |   +-- StatusBadge.tsx
        |   +-- MetricCard.tsx
        |   +-- RealtimeChart.tsx
        |   +-- ThresholdTable.tsx
        |   +-- HeaderKeyValueEditor.tsx
        |   +-- JsonEditor.tsx
        +-- pages/
            +-- TestConfigPage.tsx    # Test configuration + runner
            +-- LiveDashboard.tsx     # Realtime metric charts
            +-- SummaryDashboard.tsx  # Post-test summary
            +-- HistoryPage.tsx       # Past test runs
```

---

## Environment Variables

All test parameters are passed via environment variables (`--env-file` or `-e` flags):

| Variable           | Description                                      | Default                |
| :----------------- | :----------------------------------------------- | :--------------------- |
| `BASE_URL`         | Target base URL                                  | `http://localhost:3000` |
| `ENDPOINT`         | Path to test (e.g., `/api/users`)                | `/`                    |
| `HTTP_METHOD`      | HTTP method (GET, POST, PUT, PATCH, DELETE)      | `GET`                  |
| `REQUEST_BODY`     | JSON string for request body                     | (empty)                |
| `REQUEST_HEADERS`  | JSON string of extra headers                     | `{}`                   |
| `AUTH_TOKEN`       | Bearer token for Authorization header            | (empty)                |
| `TEST_PHASE`       | smoke, load, stress, soak                        | `smoke`                |
| `TEST_TYPE`        | `fe` (frontend) or `be` (backend)                | `be`                   |
| `METRIC_NAME`      | Custom metric prefix (auto-derived from endpoint)| (auto)                 |
| `VUS`              | Override VU count                                | (phase default)        |
| `DURATION`         | Override duration                                | (phase default)        |

---

## Test Phases

| Phase      | Executor     | VUs          | Duration | Purpose                               |
| :--------- | :----------- | :----------- | :------- | :------------------------------------ |
| **Smoke**  | constant-vus | 2            | 30s      | Verify correctness under minimal load |
| **Load**   | ramping-vus  | 0 → 50 → 0  | ~3min    | Simulate expected production traffic  |
| **Stress** | ramping-vus  | 0 → 200 → 0 | ~5.5min  | Find breaking point + recovery        |
| **Soak**   | ramping-vus  | 0 → 30 → 0  | ~17min   | Detect memory leaks under sustained load |

---

## Test Phase Flows

### Smoke Test

Minimal verification — confirm the endpoint is reachable and responds correctly under almost no load.

```
  VUs
   2 |████████████████████████████████████|
   1 |                                    |
   0 +------------------------------------+→ time
     0s                                  30s

     ╔═══════════════════════════════════╗
     ║  Phase: constant @ 2 VUs / 30s    ║
     ╚═══════════════════════════════════╝
```

**Flow:**
```
  ┌──────────┐    ┌──────────────┐    ┌───────────────────┐    ┌──────────────┐
  │  Start   │──▶│  2 VUs send   │──▶│  Validate status  │──▶│  Collect     │
  │  k6 run  │    │  requests    │    │  codes, latency,  │    │  summary &   │
  │          │    │  for 30s     │    │  response body    │    │  thresholds  │
  └──────────┘    └──────────────┘    └───────────────────┘    └──────────────┘
```

**Thresholds:** p95 < 1000ms · avg < 500ms · error rate < 1%

**When to use:** After deployments, in CI/CD pipelines, or before running heavier tests.

---

### Load Test

Simulate expected production traffic with a controlled ramp-up, sustained plateau, and graceful ramp-down.

```
  VUs
  50 |         ┌──────────────────────┐
     |        /                        \
     |       /       plateau 2min       \
     |      /                            \
     |     /                              \
   0 +----+────────────────────────────────+→ time
     0s  30s                          2m30s  3m

     ╔══════════╗  ╔══════════════╗  ╔══════════╗
     ║ Ramp up  ║  ║   Plateau    ║  ║ Ramp down║
     ║ 0→50 VUs ║  ║   50 VUs     ║  ║ 50→0 VUs ║
     ║   30s    ║  ║    2min      ║  ║   30s    ║
     ╚══════════╝  ╚══════════════╝  ╚══════════╝
```

**Flow:**
```
  ┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐
  │  Ramp up │──▶│  Hold at     │───▶│  Monitor     │──▶│  Ramp down   │───▶│  Report  │
  │  0→50    │    │  50 VUs      │    │  latency,    │    │  50→0 VUs    │    │  summary │
  │  (30s)   │    │  (2min)      │    │  errors,     │    │  (30s)       │    │  + pass/ │
  │          │    │              │    │  throughput  │    │              │    │  fail    │
  └──────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────┘
```

**Thresholds:** p95 < 500ms · p99 < 1000ms · avg < 300ms · error rate < 5%

**When to use:** Validate production readiness, confirm SLAs are met, establish performance baselines.

---

### Stress Test

Push the system beyond expected limits in escalating steps to find the breaking point and observe recovery.

```
  VUs
 200 |                             ┌──────────┐
     |                            /            \
 100 |              ┌────────────┘              \
     |             /                              \
  50 |  ┌────────┘                                  \
     | /                                              \
   0 +-+────────────────────────────────────────────────+→ time
     0s 30s   1m30s 2m   3m  3m30s  4m30s  5m      5m30s

     ╔════════╗╔════════╗╔════════╗╔════════╗╔═════════╗╔════════╗╔═════════╗
     ║ Warmup ║║ Hold   ║║Scale up║║ Hold   ║║  Push   ║║ Hold   ║║Recovery ║
     ║ 0→50   ║║ 50 VUs ║║50→100  ║║100 VUs ║║100→200  ║║200 VUs ║║ 200→0   ║
     ║  30s   ║║  1min  ║║  30s   ║║  1min  ║║  30s    ║║  1min  ║║  30s    ║
     ╚════════╝╚════════╝╚════════╝╚════════╝╚═════════╝╚════════╝╚═════════╝
```

**Flow:**
```
  ┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐
  │  Warm up │──▶│  Step 1      │───▶│  Step 2      │──▶│  Step 3      │──▶│ Recovery  │
  │  0→50    │    │  Hold 50 VUs │    │  Scale to    │    │  Push to     │    │  200→0   │
  │  VUs     │    │  (1min)      │    │  100 VUs     │    │  200 VUs     │    │  observe │
  │  (30s)   │    │              │    │  hold (1min) │    │  hold (1min) │    │  cooldown│
  └──────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────┘
                                                                                    │
                              ┌──────────────────────────────────────────────────────┘
                              ▼
                        ┌──────────────┐
                        │  Analyze:    │
                        │  - At which  │
                        │    VU count  │
                        │    did it    │
                        │    degrade?  │
                        │  - Did it    │
                        │    recover?  │
                        └──────────────┘
```

**Thresholds:** p95 < 2000ms · avg < 1000ms · error rate < 15%

**When to use:** Before major releases, capacity planning, or discovering system limits and bottlenecks.

---

### Soak Test

Sustained moderate load over an extended period to detect memory leaks, connection pool exhaustion, and gradual degradation.

```
  VUs
  30 |   ┌────────────────────────────────────────────────────┐
     |  /                   sustained 15min                    \
     | /                                                        \
   0 ++──────────────────────────────────────────────────────────+→ time
     0s 1m                                                  16m  17m

     ╔══════════╗  ╔══════════════════════════════════════╗  ╔══════════╗
     ║ Ramp up  ║  ║         Sustained Load               ║  ║ Ramp down║
     ║ 0→30 VUs ║  ║         30 VUs for 15min             ║  ║ 30→0 VUs ║
     ║   1min   ║  ║                                      ║  ║   1min   ║
     ╚══════════╝  ╚══════════════════════════════════════╝  ╚══════════╝
```

**Flow:**
```
  ┌──────────┐    ┌──────────────┐    ┌────────────────────────┐    ┌──────────┐
  │  Ramp up │──▶│  Sustain     │───▶│  Continuously monitor  │──▶│ Ramp down│
  │  0→30    │    │  30 VUs      │    │  for 15 minutes:       │    │ & report │
  │  VUs     │    │  steady      │    │  - Memory growth?      │    │          │
  │  (1min)  │    │  state       │    │  - Latency creep?      │    │ Compare  │
  └──────────┘    └──────────────┘    │  - Error rate rise?    │    │ start vs │
                                      │  - Connection leaks?   │    │ end perf │
                                      └────────────────────────┘    └──────────┘
```

**Thresholds:** p95 < 500ms · p99 < 1000ms · avg < 300ms · error rate < 5%

**When to use:** Before production release for long-running services, detecting slow resource leaks that only manifest over time.

---

## Dashboard Pages

### New Test (`/config`)
Configure and launch tests. Toggle FE/BE mode, set target URL, method, body, headers, auth token, test phase. Save and load presets. View k6 console output.

### Live Dashboard (`/`)
Real-time metrics with auto-discovered charts. Standard charts: Response Time (p50/p90/p95/p99), Throughput, Error Rate, Active VUs, TTFB, Data Transfer, Connection Time. Custom metric charts appear automatically.

### Summary (`/summary`)
Post-test aggregated results: key metrics, percentile breakdown, threshold pass/fail, checks, full metrics table.

### History (`/history`)
Browse past test runs. Click to view details with metrics and thresholds.

---

## API Endpoints

| Method   | Path                 | Description                        |
| :------- | :------------------- | :--------------------------------- |
| GET      | `/api/status`        | Current test status                |
| GET      | `/api/summary`       | Latest summary.json                |
| GET      | `/api/history`       | List past test runs                |
| GET      | `/api/history/:file` | Specific historical run            |
| GET      | `/api/metrics`       | Current metric definitions         |
| GET      | `/api/runner-status` | Runner status + available runners  |
| GET      | `/api/presets`       | List saved presets                 |
| POST     | `/api/run-test`      | Start a k6 test                    |
| POST     | `/api/stop-test`     | Stop running test                  |
| POST     | `/api/reset`         | Clear buffered data                |
| POST     | `/api/presets`       | Save a preset                      |
| DELETE   | `/api/presets/:name` | Delete a preset                    |
| WS       | `/ws`                | Real-time metric stream            |

---

## Custom Metrics

Every test automatically creates per-endpoint metrics using the metric name prefix (auto-derived from endpoint or manually set):

- `{name}_duration` — Response time (Trend, ms)
- `{name}_ttfb` — Time to first byte (Trend, ms)
- `{name}_connecting` — Connection time (Trend, ms)
- `{name}_tls_handshaking` — TLS handshake time (Trend, ms)
- `{name}_response_size` — Response body size (Trend, bytes)
- `{name}_errors` — Error rate (Rate, status >= 400)
- `{name}_requests` — Request count (Counter)
- `{name}_status_2xx` — 2xx responses (Counter)
- `{name}_status_4xx` — 4xx responses (Counter)
- `{name}_status_5xx` — 5xx responses (Counter)

---

## Development Rules

- Test scripts go in `k6/scripts/`. Each script targets a specific endpoint or scenario. Use the metric name prefix convention for per-endpoint metrics.
- Presets are user-configurable test profiles. Store presets via the API (`POST /api/presets`). Do not hardcode test parameters.
- Dashboard pages are defined in the frontend. Keep real-time (WebSocket) and historical (REST API) data flows separate.
- The runner abstraction supports multiple k6 execution modes. Add new runners by implementing the runner interface.
- Custom metrics follow the naming convention: `{name}_duration`, `{name}_ttfb`, `{name}_errors`, etc. Do not deviate from this pattern.
- Environment variables are documented in the env table. All new config must be added to both `.env.example` and the README table.
- All comments must be single-line (`//` or `#`). No multi-line comment blocks.

## Bug Fix Guidelines

When fixing bugs in this project:
1. **For WebSocket streaming issues**: Check the `/ws` endpoint and the real-time metric buffer. Verify the client reconnection logic.
2. **For k6 runner failures**: Check runner status via `GET /api/runner-status`. Verify k6 binary availability and script paths.
3. **For metric calculation errors**: Check the custom metric definitions. Verify per-endpoint metric naming matches the expected prefix pattern.
4. **For dashboard rendering issues**: Check the data format returned by `GET /api/summary` and `GET /api/history`. Verify chart component data bindings.
5. **For preset save/load failures**: Check the preset API (`/api/presets`). Verify file permissions in the preset storage directory.
6. **For Docker issues**: Check the Docker Compose configuration and environment variable mapping.

---

## License

This project is licensed under the [MIT License](LICENSE).
