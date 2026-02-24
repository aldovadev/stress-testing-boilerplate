import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, Square, Monitor, Server, Save, Trash2, ChevronRight,
  Globe, Key, Zap, Tag, RotateCcw, Terminal, Loader2,
} from 'lucide-react';
import { useMetricsStore } from '../store/metricsStore';
import HeaderKeyValueEditor from '../components/HeaderKeyValueEditor';
import JsonEditor from '../components/JsonEditor';
import type {
  TestConfig, TestType, HttpMethod, Preset, RunnerStatus,
} from '../types/testConfig';
import {
  HTTP_METHODS, TEST_PHASES, DEFAULT_CONFIG,
} from '../types/testConfig';

export default function TestConfigPage() {
  const navigate = useNavigate();
  const { state } = useMetricsStore();

  // ─── Config State ───────────────────────────────────────────────
  const [config, setConfig] = useState<TestConfig>({ ...DEFAULT_CONFIG });
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [runnerStatus, setRunnerStatus] = useState<RunnerStatus | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [showConsole, setShowConsole] = useState(false);

  const isRunning = state.testStatus === 'running' || runnerStatus?.running;

  // ─── Load presets + runner status ───────────────────────────────
  useEffect(() => {
    fetch('/api/presets').then(r => r.json()).then(setPresets).catch(() => {});
    fetch('/api/runner-status').then(r => r.json()).then(setRunnerStatus).catch(() => {});
  }, []);

  // ─── Poll runner status while test is running ────────────────────
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      fetch('/api/runner-status').then(r => r.json()).then((s: RunnerStatus) => {
        setRunnerStatus(s);
        if (s.output.length > 0) {
          setConsoleOutput(s.output);
        }
      }).catch(() => {});
    }, 2000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // ─── Derive metric name from endpoint ───────────────────────────
  const deriveMetricName = (endpoint: string) => {
    return endpoint
      .replace(/^\/+/, '')
      .replace(/\/+$/, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase() || 'root';
  };

  const updateConfig = useCallback((updates: Partial<TestConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...updates };
      // Auto-derive metric name when endpoint changes (if not manually set)
      if (updates.endpoint !== undefined && !prev.metricName) {
        next.metricName = deriveMetricName(updates.endpoint);
      }
      // FE mode forces GET
      if (updates.testType === 'fe') {
        next.method = 'GET';
        next.body = '';
      }
      return next;
    });
    setError(null);
  }, []);

  // ─── Run Test ───────────────────────────────────────────────────
  const handleRunTest = async () => {
    if (!config.baseUrl.trim()) {
      setError('Base URL is required.');
      return;
    }

    setIsStarting(true);
    setError(null);
    setConsoleOutput([]);
    setShowConsole(true);

    try {
      // Prepare config for the API
      const payload = {
        ...config,
        metricName: config.metricName || deriveMetricName(config.endpoint),
        body: config.body ? (() => { try { return JSON.parse(config.body); } catch { return config.body; } })() : undefined,
      };

      const res = await fetch('/api/run-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!result.ok) {
        setError(result.error || 'Failed to start test.');
      }
    } catch (err) {
      setError(`Network error: ${(err as Error).message}`);
    } finally {
      setIsStarting(false);
    }
  };

  // ─── Stop Test ──────────────────────────────────────────────────
  const handleStopTest = async () => {
    try {
      await fetch('/api/stop-test', { method: 'POST' });
    } catch { /* ignore */ }
  };

  // ─── Presets ────────────────────────────────────────────────────
  const handleSavePreset = async () => {
    const name = presetName.trim();
    if (!name) return;

    const res = await fetch('/api/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, config }),
    });
    const result = await res.json();
    if (result.ok) {
      setPresetName('');
      const updated = await fetch('/api/presets').then(r => r.json());
      setPresets(updated);
    }
  };

  const handleLoadPreset = (preset: Preset) => {
    setConfig({ ...preset.config });
    fetch(`/api/presets/${encodeURIComponent(preset.name)}/use`, { method: 'POST' });
  };

  const handleDeletePreset = async (name: string) => {
    await fetch(`/api/presets/${encodeURIComponent(name)}`, { method: 'DELETE' });
    const updated = await fetch('/api/presets').then(r => r.json());
    setPresets(updated);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Test Configuration</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Configure and launch stress tests for any endpoint or route
          </p>
        </div>
        {isRunning && (
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            View Live Dashboard
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ─── Presets Sidebar ──────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">Saved Presets</h3>

          {presets.length === 0 ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4 text-center text-xs text-gray-400 dark:text-gray-500 transition-colors">
              No presets saved yet.
            </div>
          ) : (
            <div className="space-y-1.5">
              {presets.map((preset) => (
                <div
                  key={preset.name}
                  className="group flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <button
                    onClick={() => handleLoadPreset(preset)}
                    disabled={!!isRunning}
                    className="flex-1 text-left p-2.5 min-w-0 disabled:opacity-50"
                  >
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{preset.name}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">
                      {preset.config.testType.toUpperCase()} · {preset.config.method} · {preset.config.testPhase}
                    </p>
                  </button>
                  <button
                    onClick={() => handleDeletePreset(preset.name)}
                    className="p-2 text-gray-400 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    title="Delete preset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Save Preset */}
          <div className="flex gap-2">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name..."
              className="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 dark:focus:border-blue-600 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
            />
            <button
              onClick={handleSavePreset}
              disabled={!presetName.trim()}
              className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-30"
              title="Save current config as preset"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>

          {/* Runner Info */}
          {runnerStatus && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-3 space-y-2 transition-colors">
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Runner</h4>
              <div className="space-y-1 text-xs text-gray-400 dark:text-gray-500">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${runnerStatus.availableRunners.native ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  k6 CLI: {runnerStatus.availableRunners.native ? 'Available' : 'Not found'}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${runnerStatus.availableRunners.docker ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  Docker: {runnerStatus.availableRunners.docker ? 'Available' : 'Not found'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Main Config Form ────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-5">
          {/* Test Type Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => updateConfig({ testType: 'be' as TestType })}
              disabled={!!isRunning}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                config.testType === 'be'
                  ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700'
                  : 'bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Server className="w-4 h-4" />
              Backend API
            </button>
            <button
              onClick={() => updateConfig({ testType: 'fe' as TestType })}
              disabled={!!isRunning}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                config.testType === 'fe'
                  ? 'bg-purple-50 dark:bg-purple-600/20 text-purple-600 dark:text-purple-400 border border-purple-300 dark:border-purple-700'
                  : 'bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Monitor className="w-4 h-4" />
              Frontend Page
            </button>
          </div>

          {config.testType === 'fe' && (
            <div className="rounded-lg border border-purple-200 dark:border-purple-800/30 bg-purple-50 dark:bg-purple-950/20 px-4 py-2.5 text-xs text-purple-600 dark:text-purple-300">
              Frontend mode tests page load times using GET requests. Measures TTFB, response time, availability, and data transfer for web pages and routes.
            </div>
          )}

          {/* URL + Method Row */}
          <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_1fr] gap-3">
            {/* HTTP Method */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Method</label>
              <select
                value={config.method}
                onChange={(e) => updateConfig({ method: e.target.value as HttpMethod })}
                disabled={config.testType === 'fe' || !!isRunning}
                className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-blue-500 dark:focus:border-blue-600 disabled:opacity-50 transition-colors"
              >
                {HTTP_METHODS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Base URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Globe className="w-3 h-3" />
                Base URL
              </label>
              <input
                type="text"
                value={config.baseUrl}
                onChange={(e) => updateConfig({ baseUrl: e.target.value })}
                placeholder="https://api.example.com"
                disabled={!!isRunning}
                className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 dark:focus:border-blue-600 disabled:opacity-50 transition-colors"
              />
            </div>

            {/* Endpoint */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {config.testType === 'fe' ? 'Route' : 'Endpoint'}
              </label>
              <input
                type="text"
                value={config.endpoint}
                onChange={(e) => updateConfig({ endpoint: e.target.value })}
                placeholder={config.testType === 'fe' ? '/dashboard' : '/api/v1/users'}
                disabled={!!isRunning}
                className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 dark:focus:border-blue-600 disabled:opacity-50 transition-colors"
              />
            </div>
          </div>

          {/* Test Phase + Metric Name Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Test Phase */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Test Phase
              </label>
              <select
                value={config.testPhase}
                onChange={(e) => updateConfig({ testPhase: e.target.value })}
                disabled={!!isRunning}
                className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-blue-500 dark:focus:border-blue-600 disabled:opacity-50 transition-colors"
              >
                {TEST_PHASES.map(p => (
                  <option key={p.value} value={p.value}>
                    {p.label} — {p.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Metric Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Tag className="w-3 h-3" />
                Metric Name (auto-derived)
              </label>
              <input
                type="text"
                value={config.metricName || deriveMetricName(config.endpoint)}
                onChange={(e) => updateConfig({ metricName: e.target.value })}
                placeholder="api_v1_users"
                disabled={!!isRunning}
                className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 font-mono focus:outline-none focus:border-blue-500 dark:focus:border-blue-600 disabled:opacity-50 transition-colors"
              />
            </div>
          </div>

          {/* Auth Token */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Key className="w-3 h-3" />
              Auth Token (optional)
            </label>
            <input
              type="password"
              value={config.authToken}
              onChange={(e) => updateConfig({ authToken: e.target.value })}
              placeholder="Bearer token value (e.g., eyJhbGci...)"
              disabled={!!isRunning}
              className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 font-mono focus:outline-none focus:border-blue-500 dark:focus:border-blue-600 disabled:opacity-50 transition-colors"
            />
          </div>

          {/* Request Body (BE only, non-GET) */}
          {config.testType === 'be' && config.method !== 'GET' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Request Body (JSON)
              </label>
              <JsonEditor
                value={config.body}
                onChange={(body) => updateConfig({ body })}
                disabled={!!isRunning}
                placeholder={'{\n  "name": "Test User",\n  "email": "user@example.com"\n}'}
              />
            </div>
          )}

          {/* Custom Headers (BE only) */}
          {config.testType === 'be' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Custom Headers
              </label>
              <HeaderKeyValueEditor
                headers={config.headers}
                onChange={(headers) => updateConfig({ headers })}
                disabled={!!isRunning}
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400 transition-colors">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            {!isRunning ? (
              <button
                onClick={handleRunTest}
                disabled={isStarting || !config.baseUrl.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStarting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {isStarting ? 'Starting...' : 'Run Test'}
              </button>
            ) : (
              <button
                onClick={handleStopTest}
                className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Square className="w-4 h-4" />
                Stop Test
              </button>
            )}

            <button
              onClick={() => { setConfig({ ...DEFAULT_CONFIG }); setError(null); }}
              disabled={!!isRunning}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>

            <button
              onClick={() => setShowConsole(!showConsole)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                showConsole
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              <Terminal className="w-4 h-4" />
              Console
            </button>
          </div>

          {/* Console Output */}
          {showConsole && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 overflow-hidden transition-colors">
              <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">k6 Output</span>
                {isRunning && (
                  <span className="flex items-center gap-1.5 text-[10px] text-emerald-500 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                    Running
                  </span>
                )}
              </div>
              <div className="p-3 max-h-64 overflow-y-auto font-mono text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                {consoleOutput.length === 0 ? (
                  <p className="text-gray-300 dark:text-gray-600">Waiting for output...</p>
                ) : (
                  consoleOutput.map((line, i) => (
                    <div key={i} className={line.startsWith('[stderr]') ? 'text-amber-500 dark:text-amber-400' : ''}>
                      {line}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
