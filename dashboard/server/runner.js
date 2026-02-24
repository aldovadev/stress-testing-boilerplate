/**
 * K6 Test Runner
 * ─────────────────────────────────────────────────────────────────────
 * Spawns k6 test processes from the dashboard backend.
 * Auto-detects native k6 CLI or falls back to Docker.
 *
 * Provides:
 *   - startTest(config) — Launch a k6 test with dynamic parameters
 *   - stopTest()        — Kill a running test
 *   - getStatus()       — Get current runner state
 */

import { spawn, execSync } from 'child_process';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';

// ─── Paths ──────────────────────────────────────────────────────────
const PROJECT_ROOT = resolve(process.cwd(), '..');
const RESULTS_DIR = join(PROJECT_ROOT, 'results');
const OUTPUT_FILE = join(RESULTS_DIR, 'output.json');
const SCRIPT_PATH = 'scripts/generic/main.js';

// ─── State ──────────────────────────────────────────────────────────
let currentProcess = null;
let runnerState = {
  running: false,
  pid: null,
  startedAt: null,
  config: null,
  runner: null,     // 'native' | 'docker'
  output: [],       // Last N lines of k6 stdout/stderr
};

const MAX_OUTPUT_LINES = 200;

// ─── Runner Detection ───────────────────────────────────────────────

/**
 * Detect which k6 runner is available.
 * Checks for native k6 first, then Docker.
 * Can be overridden via K6_RUNNER env var ('native' | 'docker').
 *
 * @returns {'native' | 'docker' | null}
 */
export function detectRunner() {
  const override = process.env.K6_RUNNER;
  if (override === 'native' || override === 'docker') return override;

  // Check native k6
  try {
    const cmd = process.platform === 'win32' ? 'where k6' : 'which k6';
    execSync(cmd, { stdio: 'pipe' });
    return 'native';
  } catch {
    // k6 not in PATH
  }

  // Check Docker
  try {
    execSync('docker --version', { stdio: 'pipe' });
    return 'docker';
  } catch {
    // Docker not available
  }

  return null;
}

/**
 * Build the k6 command and arguments from test configuration.
 *
 * @param {object} config - Test configuration
 * @param {'native'|'docker'} runner - Which runner to use
 * @returns {{ cmd: string, args: string[] }}
 */
function buildCommand(config, runner) {
  // Map config to k6 -e flags
  const envFlags = [];
  envFlags.push('-e', `BASE_URL=${config.baseUrl}`);
  envFlags.push('-e', `ENDPOINT=${config.endpoint || '/'}`);
  envFlags.push('-e', `HTTP_METHOD=${(config.method || 'GET').toUpperCase()}`);
  envFlags.push('-e', `TEST_PHASE=${config.testPhase || 'smoke'}`);
  envFlags.push('-e', `TEST_TYPE=${config.testType || 'be'}`);

  if (config.authToken) {
    envFlags.push('-e', `AUTH_TOKEN=${config.authToken}`);
  }
  if (config.body) {
    const bodyStr = typeof config.body === 'string' ? config.body : JSON.stringify(config.body);
    envFlags.push('-e', `REQUEST_BODY=${bodyStr}`);
  }
  if (config.headers && Object.keys(config.headers).length > 0) {
    envFlags.push('-e', `REQUEST_HEADERS=${JSON.stringify(config.headers)}`);
  }
  if (config.metricName) {
    envFlags.push('-e', `METRIC_NAME=${config.metricName}`);
  }

  if (runner === 'docker') {
    // Docker mode: grafana/k6 image
    const isLocal = config.baseUrl?.includes('localhost') || config.baseUrl?.includes('host.docker.internal');
    const args = [
      'run', '--rm',
      ...(isLocal ? ['--add-host=host.docker.internal:host-gateway'] : []),
      '-v', `${PROJECT_ROOT}:/app`,
      '-w', '/app',
      ...envFlags.flatMap(f => [f]),  // Pass -e flags to Docker container
      'grafana/k6', 'run',
      '--out', 'json=/app/results/output.json',
      SCRIPT_PATH,
    ];

    // Re-structure: Docker -e flags go before image name, k6 flags after
    const dockerArgs = ['run', '--rm'];
    if (isLocal) dockerArgs.push('--add-host=host.docker.internal:host-gateway');
    dockerArgs.push('-v', `${PROJECT_ROOT}:/app`, '-w', '/app');

    // Add env flags for Docker
    for (let i = 0; i < envFlags.length; i += 2) {
      dockerArgs.push(envFlags[i], envFlags[i + 1]);
    }

    dockerArgs.push('grafana/k6', 'run', '--out', 'json=/app/results/output.json', SCRIPT_PATH);

    return { cmd: 'docker', args: dockerArgs };
  }

  // Native k6 mode
  const args = [
    'run',
    ...envFlags,
    '--out', `json=${OUTPUT_FILE}`,
    join(PROJECT_ROOT, SCRIPT_PATH),
  ];

  return { cmd: 'k6', args };
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Start a k6 test with the given configuration.
 *
 * @param {object} config - Test configuration
 * @param {string} config.baseUrl - Target base URL
 * @param {string} config.endpoint - API endpoint path
 * @param {string} config.method - HTTP method
 * @param {string} config.testPhase - smoke | load | stress | soak
 * @param {string} config.testType - fe | be
 * @param {string} [config.authToken] - Bearer token
 * @param {object|string} [config.body] - Request body
 * @param {object} [config.headers] - Extra headers
 * @param {string} [config.metricName] - Custom metric prefix
 * @param {function} [onOutput] - Callback for stdout/stderr lines
 * @param {function} [onExit] - Callback for process exit
 * @returns {{ ok: boolean, pid?: number, runner?: string, error?: string }}
 */
export function startTest(config, onOutput, onExit) {
  if (runnerState.running) {
    return { ok: false, error: 'A test is already running. Stop it first.' };
  }

  const runner = detectRunner();
  if (!runner) {
    return { ok: false, error: 'Neither k6 nor Docker found. Install k6 (https://k6.io) or Docker.' };
  }

  // Ensure results directory exists
  if (!existsSync(RESULTS_DIR)) {
    mkdirSync(RESULTS_DIR, { recursive: true });
  }

  // Clean previous output file
  if (existsSync(OUTPUT_FILE)) {
    try { unlinkSync(OUTPUT_FILE); } catch { /* ignore */ }
  }

  const { cmd, args } = buildCommand(config, runner);

  console.log(`[Runner] Starting ${runner} k6 test...`);
  console.log(`[Runner] Command: ${cmd} ${args.join(' ').substring(0, 200)}...`);

  try {
    const proc = spawn(cmd, args, {
      cwd: runner === 'native' ? PROJECT_ROOT : undefined,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });

    currentProcess = proc;
    runnerState = {
      running: true,
      pid: proc.pid,
      startedAt: new Date().toISOString(),
      config,
      runner,
      output: [],
    };

    proc.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        runnerState.output.push(line);
        if (runnerState.output.length > MAX_OUTPUT_LINES) {
          runnerState.output.shift();
        }
        onOutput?.(line);
      }
    });

    proc.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        runnerState.output.push(`[stderr] ${line}`);
        if (runnerState.output.length > MAX_OUTPUT_LINES) {
          runnerState.output.shift();
        }
        onOutput?.(line);
      }
    });

    proc.on('exit', (code, signal) => {
      console.log(`[Runner] k6 process exited (code=${code}, signal=${signal})`);
      runnerState.running = false;
      currentProcess = null;
      onExit?.(code, signal);
    });

    proc.on('error', (err) => {
      console.error(`[Runner] Spawn error:`, err.message);
      runnerState.running = false;
      currentProcess = null;
      onExit?.(-1, err.message);
    });

    return { ok: true, pid: proc.pid, runner };
  } catch (err) {
    return { ok: false, error: `Failed to spawn k6: ${err.message}` };
  }
}

/**
 * Stop the currently running k6 test.
 * Sends SIGTERM first, then SIGKILL after 5 seconds.
 *
 * @returns {{ ok: boolean, error?: string }}
 */
export function stopTest() {
  if (!currentProcess || !runnerState.running) {
    return { ok: false, error: 'No test is currently running.' };
  }

  console.log(`[Runner] Stopping test (pid=${currentProcess.pid})...`);

  try {
    // On Windows, use taskkill for tree kill
    if (process.platform === 'win32') {
      try {
        execSync(`taskkill /pid ${currentProcess.pid} /T /F`, { stdio: 'pipe' });
      } catch { /* may already be dead */ }
    } else {
      currentProcess.kill('SIGTERM');

      // Force kill after 5 seconds
      setTimeout(() => {
        if (currentProcess && runnerState.running) {
          console.log('[Runner] Force killing k6 process...');
          currentProcess.kill('SIGKILL');
        }
      }, 5000);
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Failed to stop test: ${err.message}` };
  }
}

/**
 * Get current runner status.
 *
 * @returns {object} Runner state including running, pid, config, output
 */
export function getStatus() {
  return {
    ...runnerState,
    availableRunners: {
      native: (() => { try { execSync(process.platform === 'win32' ? 'where k6' : 'which k6', { stdio: 'pipe' }); return true; } catch { return false; } })(),
      docker: (() => { try { execSync('docker --version', { stdio: 'pipe' }); return true; } catch { return false; } })(),
    },
  };
}
