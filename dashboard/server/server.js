import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { watch } from 'chokidar';
import { createReadStream, existsSync, readFileSync, readdirSync } from 'fs';
import { createInterface } from 'readline';
import { resolve, join } from 'path';
import { createServer } from 'http';
import { parseLine, categorizeMetric } from './parser.js';
import { startTest, stopTest, getStatus as getRunnerStatus, detectRunner } from './runner.js';
import { getPresets, savePreset, deletePreset, markPresetUsed } from './presets.js';
import { setupAuth, authGuard } from './auth.js';

// ─── Configuration ──────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const RESULTS_DIR = resolve(process.cwd(), '..', 'results');
const OUTPUT_FILE = join(RESULTS_DIR, 'output.json');
const SUMMARY_FILE = join(RESULTS_DIR, 'summary.json');
const MAX_BUFFER_SIZE = 2000;     // Max data points to buffer for late-joining clients

// ─── State ──────────────────────────────────────────────────────────
let metricDefinitions = new Map();  // metric name → definition object
let dataBuffer = [];                // Circular buffer of recent data points
let bytesRead = 0;                  // Track file position for tailing
let isTestRunning = false;
let testStartTime = null;

// ─── Express App ────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// Auth setup (conditional — only when ENABLE_GOOGLE_AUTH=true)
setupAuth(app);

// Protect API routes when auth is enabled
app.use('/api', authGuard);

// GET /api/status — Current test status
app.get('/api/status', (req, res) => {
  res.json({
    running: isTestRunning,
    startTime: testStartTime,
    bufferedPoints: dataBuffer.length,
    metrics: Object.fromEntries(metricDefinitions),
  });
});

// GET /api/summary — Latest summary.json
app.get('/api/summary', (req, res) => {
  if (!existsSync(SUMMARY_FILE)) {
    return res.status(404).json({ error: 'No summary available. Run a test first.' });
  }
  try {
    const data = JSON.parse(readFileSync(SUMMARY_FILE, 'utf-8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse summary.json', details: err.message });
  }
});

// GET /api/history — List all summary files
app.get('/api/history', (req, res) => {
  if (!existsSync(RESULTS_DIR)) {
    return res.json([]);
  }
  const files = readdirSync(RESULTS_DIR)
    .filter(f => f.startsWith('summary-') && f.endsWith('.json'))
    .sort()
    .reverse()
    .map(filename => {
      try {
        const data = JSON.parse(readFileSync(join(RESULTS_DIR, filename), 'utf-8'));
        return {
          filename,
          timestamp: data.metadata?.timestamp || filename,
          phase: data.metadata?.phase || 'unknown',
          vus: data.metadata?.vus || '-',
          duration: data.metadata?.duration || '-',
        };
      } catch {
        return { filename, timestamp: filename, phase: 'unknown' };
      }
    });
  res.json(files);
});

// GET /api/history/:filename — Get specific historical summary
app.get('/api/history/:filename', (req, res) => {
  const filePath = join(RESULTS_DIR, req.params.filename);
  if (!existsSync(filePath) || !req.params.filename.endsWith('.json')) {
    return res.status(404).json({ error: 'File not found' });
  }
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse file', details: err.message });
  }
});

// GET /api/metrics — Current metric definitions
app.get('/api/metrics', (req, res) => {
  const metrics = {};
  for (const [name, def] of metricDefinitions) {
    metrics[name] = { ...def, category: categorizeMetric(name) };
  }
  res.json(metrics);
});

// POST /api/reset — Clear buffered data (start fresh for new test)
app.post('/api/reset', (req, res) => {
  metricDefinitions.clear();
  dataBuffer = [];
  bytesRead = 0;
  isTestRunning = false;
  testStartTime = null;
  broadcast({ type: 'reset' });
  res.json({ ok: true });
});

// ─── Test Runner Endpoints ──────────────────────────────────────────

// POST /api/run-test — Start a k6 test with the given configuration
app.post('/api/run-test', (req, res) => {
  const config = req.body;

  if (!config.baseUrl) {
    return res.status(400).json({ ok: false, error: 'baseUrl is required.' });
  }

  // Reset state before starting new test
  metricDefinitions.clear();
  dataBuffer = [];
  bytesRead = 0;

  const result = startTest(
    config,
    // onOutput callback — broadcast k6 console output
    (line) => {
      broadcast({ type: 'runner_output', data: { line } });
    },
    // onExit callback — mark test as completed
    (code, signal) => {
      isTestRunning = false;
      broadcast({ type: 'test_complete', data: { exitCode: code, signal } });

      // Try to read and broadcast final summary
      const summaryFile = join(RESULTS_DIR, 'summary.json');
      if (existsSync(summaryFile)) {
        try {
          const summary = JSON.parse(readFileSync(summaryFile, 'utf-8'));
          broadcast({ type: 'summary', data: summary });
        } catch { /* ignore */ }
      }
    }
  );

  if (result.ok) {
    isTestRunning = true;
    testStartTime = new Date().toISOString();
    broadcast({ type: 'test_start', data: { startTime: testStartTime, config } });
  }

  res.json(result);
});

// POST /api/stop-test — Stop a running k6 test
app.post('/api/stop-test', (req, res) => {
  const result = stopTest();
  if (result.ok) {
    isTestRunning = false;
    broadcast({ type: 'test_complete', data: { stopped: true } });
  }
  res.json(result);
});

// GET /api/runner-status — Current runner status + available runners
app.get('/api/runner-status', (req, res) => {
  res.json(getRunnerStatus());
});

// ─── Preset Endpoints ───────────────────────────────────────────────

// GET /api/presets — List all saved presets
app.get('/api/presets', (req, res) => {
  res.json(getPresets());
});

// POST /api/presets — Save or update a preset
app.post('/api/presets', (req, res) => {
  const { name, config } = req.body;
  if (!name || !config) {
    return res.status(400).json({ ok: false, error: 'name and config are required.' });
  }
  res.json(savePreset(name, config));
});

// DELETE /api/presets/:name — Delete a preset
app.delete('/api/presets/:name', (req, res) => {
  res.json(deletePreset(decodeURIComponent(req.params.name)));
});

// POST /api/presets/:name/use — Mark a preset as recently used
app.post('/api/presets/:name/use', (req, res) => {
  markPresetUsed(decodeURIComponent(req.params.name));
  res.json({ ok: true });
});

// ─── HTTP + WebSocket Server ────────────────────────────────────────
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[WS] Client connected (total: ${clients.size})`);

  // Send current state to new client
  ws.send(JSON.stringify({
    type: 'init',
    data: {
      status: { running: isTestRunning, startTime: testStartTime },
      definitions: Object.fromEntries(metricDefinitions),
      buffer: dataBuffer.slice(-500),     // Send last 500 points as history
    },
  }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WS] Client disconnected (total: ${clients.size})`);
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err.message);
    clients.delete(ws);
  });
});

function broadcast(message) {
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

// ─── File Tailing (k6 NDJSON output) ───────────────────────────────

/**
 * Read new lines from the output file starting at bytesRead position.
 * Parses each line and broadcasts to WebSocket clients.
 */
function tailFile() {
  if (!existsSync(OUTPUT_FILE)) return;

  const stream = createReadStream(OUTPUT_FILE, {
    start: bytesRead,
    encoding: 'utf-8',
  });

  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  let newBytes = 0;
  const batch = [];

  rl.on('line', (line) => {
    newBytes += Buffer.byteLength(line, 'utf-8') + 1; // +1 for newline
    const parsed = parseLine(line);
    if (!parsed) return;

    if (parsed.type === 'metric_definition') {
      metricDefinitions.set(parsed.name, parsed);
      broadcast({
        type: 'metric_definition',
        data: { ...parsed, category: categorizeMetric(parsed.name) },
      });
    } else if (parsed.type === 'data_point') {
      // Add to circular buffer
      dataBuffer.push(parsed);
      if (dataBuffer.length > MAX_BUFFER_SIZE) {
        dataBuffer = dataBuffer.slice(-MAX_BUFFER_SIZE);
      }
      batch.push(parsed);
    }
  });

  rl.on('close', () => {
    bytesRead += newBytes;

    // Broadcast data points in batches for efficiency
    if (batch.length > 0) {
      broadcast({
        type: 'data_points',
        data: batch,
      });
    }
  });
}

// ─── File Watcher ───────────────────────────────────────────────────
function startWatcher() {
  console.log(`[Watcher] Watching ${RESULTS_DIR} for changes...`);

  const watcher = watch(RESULTS_DIR, {
    ignoreInitial: false,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
  });

  watcher.on('add', (filePath) => {
    console.log(`[Watcher] File added: ${filePath}`);
    if (filePath.endsWith('output.json')) {
      // New test started — reset state
      bytesRead = 0;
      dataBuffer = [];
      metricDefinitions.clear();
      isTestRunning = true;
      testStartTime = new Date().toISOString();
      broadcast({ type: 'test_start', data: { startTime: testStartTime } });
      tailFile();
    }
    if (filePath.endsWith('summary.json')) {
      // Test completed
      isTestRunning = false;
      broadcast({ type: 'test_complete' });
      try {
        const summary = JSON.parse(readFileSync(filePath, 'utf-8'));
        broadcast({ type: 'summary', data: summary });
      } catch { /* ignore parse errors */ }
    }
  });

  watcher.on('change', (filePath) => {
    if (filePath.endsWith('output.json')) {
      tailFile();
    }
    if (filePath.endsWith('summary.json')) {
      isTestRunning = false;
      broadcast({ type: 'test_complete' });
      try {
        const summary = JSON.parse(readFileSync(filePath, 'utf-8'));
        broadcast({ type: 'summary', data: summary });
      } catch { /* ignore parse errors */ }
    }
  });
}

// ─── Start Server ───────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║   Stresster - Backend Server                     ║
║──────────────────────────────────────────────────║
║   HTTP API:    http://localhost:${PORT}              ║
║   WebSocket:   ws://localhost:${PORT}/ws             ║
║   Results Dir: ${RESULTS_DIR}                        
║──────────────────────────────────────────────────║
║   Endpoints:                                     ║
║     GET  /api/status       - Test status         ║
║     GET  /api/summary      - Latest summary      ║
║     GET  /api/history      - Past test runs      ║
║     GET  /api/metrics      - Metric definitions  ║
║     POST /api/reset        - Clear buffer        ║
║     POST /api/run-test     - Start k6 test       ║
║     POST /api/stop-test    - Stop k6 test        ║
║     GET  /api/runner-status - Runner info        ║
║     GET  /api/presets      - List presets        ║
║     POST /api/presets      - Save preset         ║
║     DEL  /api/presets/:name- Delete preset       ║
║     WS   /ws               - Realtime stream    ║
╚══════════════════════════════════════════════════╝
  `);

  startWatcher();
});
