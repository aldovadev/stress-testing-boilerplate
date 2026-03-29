<p align="center">
  <img src="dashboard/public/images/stresster.svg" alt="Stresster" width="80" height="80" />
</p>

<h1 align="center">Stresster</h1>

<p align="center">
  App-agnostic stress testing framework powered by k6 with real-time metrics dashboard
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/k6-Grafana-7D64FF?logo=k6&logoColor=white" alt="k6" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" alt="Vite 6" />
  <img src="https://img.shields.io/badge/WebSocket-Live-10B981" alt="WebSocket" />
</p>

---

## Table of Contents

- [About](#about)
- [Built With](#built-with)
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Google OAuth (Optional)](#google-oauth-optional)
- [Test Phases](#test-phases)
- [Dashboard Pages](#dashboard-pages)
- [API Endpoints](#api-endpoints)
- [Custom Metrics](#custom-metrics)
- [Development Rules](#development-rules)
- [Bug Fix Guidelines](#bug-fix-guidelines)
- [License](#license)

---

## About

Stresster is an app-agnostic performance and load testing framework built with k6 and a real-time metrics dashboard (Vite + React + Recharts + WebSocket). Test any endpoint or page -- configure targets dynamically from the dashboard UI or via CLI. Supports all HTTP methods, frontend page loads, backend API testing, and saved presets.

---

## Built With

| Technology | Purpose |
| :--------- | :------ |
| [k6](https://k6.io/) | Load testing engine |
| [React 19](https://react.dev/) | Dashboard frontend |
| [Vite 6](https://vite.dev/) | Frontend build tool |
| [Tailwind CSS v4](https://tailwindcss.com/) | Utility-first styling |
| [shadcn/ui](https://ui.shadcn.com/) | UI component library |
| [Magic UI](https://magicui.design/) | Animated UI components |
| [Recharts](https://recharts.org/) | Chart library |
| [Express](https://expressjs.com/) | Backend server |
| [WebSocket (ws)](https://github.com/websockets/ws) | Real-time metric streaming |
| [Passport](http://www.passportjs.org/) | Optional Google OAuth |

---

## Features

- **App-Agnostic**: Test any URL -- no hardcoded endpoints. Configure target, method, headers, body, auth from the dashboard or CLI.
- **FE + BE Testing**: Toggle between frontend page load testing (GET routes) and backend API testing (all HTTP methods).
- **Dynamic Dashboard**: Real-time charts auto-discover custom metrics from the k6 stream -- no chart configuration needed.
- **Test Runner**: Launch and stop k6 tests directly from the dashboard. Auto-detects native k6 CLI or Docker.
- **Saved Presets**: Save test configurations and reload them instantly.
- **5-Phase Testing**: Smoke, load, stress, soak phases with pre-configured VU profiles and thresholds.
- **CLI Support**: npm scripts for CI/CD pipelines with environment file support.
- **Realtime Streaming**: NDJSON file tailing via chokidar + WebSocket broadcast to React frontend.
- **Custom Metrics**: Per-endpoint metrics (duration, TTFB, errors, status codes, response size) via factory pattern.
- **Animated Landing Page**: Public landing page with Particles background, animated text, and interactive feature cards.
- **Optional Google OAuth**: Dashboard access control via Google sign-in, activated by environment flag.

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

## Quick Start

### 1. Install Dashboard Dependencies

```bash
cd dashboard && npm install
```

### 2. Start Dashboard (Dev Mode)

```bash
npm run dev
```

Opens frontend at **http://localhost:5173** and backend at **http://localhost:3001**.

### 3. Run a Test

**From UI**: Go to `/config`, set your target URL and test options, click **Start Test**. Navigate to **Live Dashboard** to watch results stream in real-time.

**From CLI**: Use npm scripts with env files:

```bash
# Smoke test
npm run test:smoke

# Load test (custom target)
BASE_URL=https://api.example.com ENDPOINT=/health npm run test:load

# Use env file
npm run test:stress -- --env-file=env/local.env
```

---

## Project Structure

```
stresster/
  dashboard/
    server/
      auth.js                   # Google OAuth + JWT (optional)
      server.js                 # Express backend + WS + k6 runner
    src/
      components/
        AuthGuard.tsx           # Auth gate (env-flag controlled)
        Header.tsx              # Theme toggle, status indicator
        MetricCard.tsx          # Real-time metric display (MagicCard)
        RealtimeChart.tsx       # Auto-configured Recharts wrapper
        Sidebar.tsx             # Navigation + test status
        ThresholdTable.tsx      # Pass/fail threshold display
        ui/                     # shadcn/ui + Magic UI components
      pages/
        AuthCallbackPage.tsx    # OAuth callback handler
        HistoryPage.tsx         # Past test runs
        LandingPage.tsx         # Animated landing page
        LiveDashboard.tsx       # Real-time metric charts
        LoginPage.tsx           # Google sign-in page
        SummaryDashboard.tsx    # Post-test aggregated results
        TestConfigPage.tsx      # Test configuration + runner
      store/
        themeStore.tsx          # Dark/light theme (Zustand)
      App.tsx                   # Router setup
    index.html
    vite.config.ts
  env/
    local.env                   # Local dev environment variables
  helpers/
    browser.js                  # Frontend page load test helper
  scripts/
    backend-test.js             # Backend API test script (k6)
    frontend-test.js            # Frontend page load test script (k6)
  results/                      # Test output (git-ignored)
  package.json
```

---

## Environment Variables

| Variable | Default | Description |
| :------- | :------ | :---------- |
| `BASE_URL` | `http://localhost:3000` | Target application base URL |
| `ENDPOINT` | `/` | Target endpoint path |
| `HTTP_METHOD` | `GET` | HTTP method for backend tests |
| `REQUEST_BODY` | `{}` | JSON request body for POST/PUT/PATCH |
| `REQUEST_HEADERS` | `{}` | Additional HTTP headers (JSON) |
| `AUTH_TOKEN` | (empty) | Bearer token for authenticated endpoints |
| `TEST_PHASE` | `smoke` | Test phase: smoke, load, stress, soak |
| `TEST_TYPE` | `backend` | Test type: backend or frontend |
| `METRIC_NAME` | (auto) | Custom metric prefix (auto-derived if empty) |
| `VUS` | (phase default) | Override virtual users count |
| `DURATION` | (phase default) | Override test duration |
| `ENABLE_GOOGLE_AUTH` | `false` | Enable Google OAuth for dashboard access |
| `VITE_ENABLE_GOOGLE_AUTH` | `false` | Frontend auth flag (must match backend) |
| `GOOGLE_CLIENT_ID` | (empty) | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | (empty) | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | `http://localhost:3001/auth/google/callback` | OAuth callback URL |
| `JWT_SECRET` | (empty) | JWT signing secret |
| `FRONTEND_URL` | `http://localhost:5173` | Frontend URL for OAuth redirect |

---

## Google OAuth (Optional)

Dashboard access control via Google sign-in. Disabled by default -- the dashboard is fully open when `ENABLE_GOOGLE_AUTH=false`.

### Setup

1. Create a Google OAuth 2.0 client at [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Set the authorized redirect URI to `http://localhost:3001/auth/google/callback`
3. Add the following to `env/local.env`:

```env
ENABLE_GOOGLE_AUTH=true
VITE_ENABLE_GOOGLE_AUTH=true
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
JWT_SECRET=your-jwt-secret
FRONTEND_URL=http://localhost:5173
```

4. Restart the dashboard -- the landing page CTA will redirect to the login page instead of the dashboard directly.

### How It Works

- When `ENABLE_GOOGLE_AUTH=true`, the Express backend registers a Google Passport strategy and protects `/api` routes with JWT validation.
- The frontend `AuthGuard` component checks the `VITE_ENABLE_GOOGLE_AUTH` flag and validates the stored JWT token before allowing access to dashboard pages.
- When disabled, the auth middleware passes all requests through and `AuthGuard` renders children directly.

---

## Test Phases

| Phase | VUs | Duration | Purpose |
| :---- | :-- | :------- | :------ |
| **Smoke** | 2 | 30s | Verify system works under minimal load |
| **Load** | Ramp 0-50-0 | 3min | Typical production load simulation |
| **Stress** | Ramp 0-200-0 | 5.5min | Find breaking points and recovery behavior |
| **Soak** | Ramp 0-30-0 | 17min | Detect memory leaks and gradual degradation |

---

### Smoke Test

Quick sanity check with minimal load.

```
  VUs
   2 |  +----------------------------+
     |  |       constant 30s         |
   0 +--+----------------------------+---> time
     0s                              30s
```

**Flow:**
```
  +----------+    +--------------+    +--------------+
  |  Start   |--->|  Run 2 VUs   |--->|  Check:      |
  |  2 VUs   |    |  for 30s     |    |  - p95<1000ms|
  |          |    |              |    |  - errors<1% |
  +----------+    +--------------+    +--------------+
```

**Thresholds:** p95 < 1000ms | avg < 500ms | error rate < 1%

**When to use:** Quick health checks, post-deploy verification, CI pipeline gates.

---

### Load Test

Simulate expected production traffic with gradual ramp-up.

```
  VUs
  50 |      /-------------\
     |     /    hold 1min    \
     |    /                   \
   0 +---/---------------------\---> time
     0s  30s              2m   3m
```

**Flow:**
```
  +----------+    +--------------+    +--------------+    +----------+
  |  Ramp up |--->|  Hold at     |--->|  Ramp down   |--->| Analyze  |
  |  0->50   |    |  50 VUs      |    |  50->0 VUs   |    | results  |
  |  VUs     |    |  (1min)      |    |  (1min)      |    |          |
  |  (30s)   |    |              |    |              |    |          |
  +----------+    +--------------+    +--------------+    +----------+
```

**Thresholds:** p95 < 500ms | avg < 200ms | error rate < 5%

**When to use:** Regular performance regression testing, production load simulation.

---

### Stress Test

Push beyond normal capacity to find breaking points and recovery behavior.

```
  VUs
 200 |                     /----\
     |              /-----/      \
 100 |       /-----/               \
  50 |/-----/                       \
   0 +---------------------------------------> time
     0s  30s   1.5m   2.5m  3.5m  4.5m  5.5m
```

**Flow:**
```
  +----------+    +--------------+    +--------------+    +--------------+    +----------+
  |  Warm up |--->|  Step 1      |--->|  Step 2      |--->|  Step 3      |--->| Recovery  |
  |  0->50   |    |  Hold 50 VUs |    |  Scale to    |    |  Push to     |    |  200->0   |
  |  VUs     |    |  (1min)      |    |  100 VUs     |    |  200 VUs     |    |  observe  |
  |  (30s)   |    |              |    |  hold (1min) |    |  hold (1min) |    |  cooldown |
  +----------+    +--------------+    +--------------+    +--------------+    +----------+
                                                                                    |
                              +-----------------------------------------------------+
                              v
                        +--------------+
                        |  Analyze:    |
                        |  - At which  |
                        |    VU count  |
                        |    did it    |
                        |    degrade?  |
                        |  - Did it    |
                        |    recover?  |
                        +--------------+
```

**Thresholds:** p95 < 2000ms | avg < 1000ms | error rate < 15%

**When to use:** Before major releases, capacity planning, or discovering system limits and bottlenecks.

---

### Soak Test

Sustained moderate load over an extended period to detect memory leaks, connection pool exhaustion, and gradual degradation.

```
  VUs
  30 |   +----------------------------------------------------+
     |  /                   sustained 15min                    \
     | /                                                        \
   0 ++----------------------------------------------------------+-> time
     0s 1m                                                  16m  17m

     +==========+  +======================================+  +==========+
     | Ramp up  |  |         Sustained Load               |  | Ramp down|
     | 0->30 VU |  |         30 VUs for 15min             |  | 30->0 VU |
     |   1min   |  |                                      |  |   1min   |
     +==========+  +======================================+  +==========+
```

**Flow:**
```
  +----------+    +--------------+    +------------------------+    +----------+
  |  Ramp up |--->|  Sustain     |--->|  Continuously monitor  |--->| Ramp down|
  |  0->30   |    |  30 VUs      |    |  for 15 minutes:       |    | & report |
  |  VUs     |    |  steady      |    |  - Memory growth?      |    |          |
  |  (1min)  |    |  state       |    |  - Latency creep?      |    | Compare  |
  +----------+    +--------------+    |  - Error rate rise?    |    | start vs |
                                      |  - Connection leaks?   |    | end perf |
                                      +------------------------+    +----------+
```

**Thresholds:** p95 < 500ms | p99 < 1000ms | avg < 300ms | error rate < 5%

**When to use:** Before production release for long-running services, detecting slow resource leaks that only manifest over time.

---

## Dashboard Pages

### Landing Page (`/`)
Public landing page with animated Particles background, Stresster branding, and feature cards. When Google OAuth is enabled, the CTA redirects to the login page.

### New Test (`/config`)
Configure and launch tests. Toggle FE/BE mode, set target URL, method, body, headers, auth token, test phase. Save and load presets. View k6 console output.

### Live Dashboard (`/dashboard`)
Real-time metrics with auto-discovered charts. Standard charts: Response Time (p50/p90/p95/p99), Throughput, Error Rate, Active VUs, TTFB, Data Transfer, Connection Time. Custom metric charts appear automatically.

### Summary (`/summary`)
Post-test aggregated results: key metrics, percentile breakdown, threshold pass/fail, checks, full metrics table.

### History (`/history`)
Browse past test runs. Click to view details with metrics and thresholds.

---

## API Endpoints

| Method | Path | Description |
| :----- | :--- | :---------- |
| GET | `/auth/google` | Initiate Google OAuth flow |
| GET | `/auth/google/callback` | OAuth callback (returns JWT) |
| GET | `/auth/me` | Validate JWT token |
| GET | `/api/status` | Current test status |
| GET | `/api/summary` | Latest summary.json |
| GET | `/api/history` | List past test runs |
| GET | `/api/history/:file` | Specific historical run |
| GET | `/api/metrics` | Current metric definitions |
| GET | `/api/runner-status` | Runner status + available runners |
| GET | `/api/presets` | List saved presets |
| POST | `/api/run-test` | Start a k6 test |
| POST | `/api/stop-test` | Stop running test |
| POST | `/api/reset` | Clear buffered data |
| POST | `/api/presets` | Save a preset |
| DELETE | `/api/presets/:name` | Delete a preset |
| WS | `/ws` | Real-time metric stream |

---

## Custom Metrics

Every test automatically creates per-endpoint metrics using the metric name prefix (auto-derived from endpoint or manually set):

- `{name}_duration` -- Response time (Trend, ms)
- `{name}_ttfb` -- Time to first byte (Trend, ms)
- `{name}_connecting` -- Connection time (Trend, ms)
- `{name}_tls_handshaking` -- TLS handshake time (Trend, ms)
- `{name}_response_size` -- Response body size (Trend, bytes)
- `{name}_errors` -- Error rate (Rate, status >= 400)
- `{name}_requests` -- Request count (Counter)
- `{name}_status_2xx` -- 2xx responses (Counter)
- `{name}_status_4xx` -- 4xx responses (Counter)
- `{name}_status_5xx` -- 5xx responses (Counter)

---

## Development Rules

- Test scripts go in `scripts/`. Each script targets a specific endpoint or scenario. Use the metric name prefix convention for per-endpoint metrics.
- Presets are user-configurable test profiles. Store presets via the API (`POST /api/presets`). Do not hardcode test parameters.
- Dashboard pages are defined in the frontend. Keep real-time (WebSocket) and historical (REST API) data flows separate.
- The runner abstraction supports multiple k6 execution modes. Add new runners by implementing the runner interface.
- Custom metrics follow the naming convention: `{name}_duration`, `{name}_ttfb`, `{name}_errors`, etc. Do not deviate from this pattern.
- Environment variables are documented in the env table. All new config must be added to both `env/local.env` and the README table.
- All comments must be single-line (`//` or `#`). No multi-line comment blocks.

---

## Bug Fix Guidelines

When fixing bugs in this project:
1. **For WebSocket streaming issues**: Check the `/ws` endpoint and the real-time metric buffer. Verify the client reconnection logic.
2. **For k6 runner failures**: Check runner status via `GET /api/runner-status`. Verify k6 binary availability and script paths.
3. **For metric calculation errors**: Check the custom metric definitions. Verify per-endpoint metric naming matches the expected prefix pattern.
4. **For dashboard rendering issues**: Check the data format returned by `GET /api/summary` and `GET /api/history`. Verify chart component data bindings.
5. **For preset save/load failures**: Check the preset API (`/api/presets`). Verify file permissions in the preset storage directory.
6. **For Docker issues**: Check the Docker Compose configuration and environment variable mapping.
7. **For OAuth issues**: Check `ENABLE_GOOGLE_AUTH` and `VITE_ENABLE_GOOGLE_AUTH` match. Verify `GOOGLE_CALLBACK_URL` matches the Google Cloud Console redirect URI.

---

## License

This project is licensed under the [MIT License](LICENSE).
