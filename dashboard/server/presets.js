/**
 * Test Configuration Presets Manager
 * ─────────────────────────────────────────────────────────────────────
 * Manages saved test configurations (presets) in a local JSON file.
 * Allows users to save, load, and delete test configurations from the dashboard.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const PRESETS_FILE = resolve(process.cwd(), 'server', 'presets.json');

// ─── Default Presets ────────────────────────────────────────────────
const defaultPresets = [
  {
    name: 'Smoke — Homepage (FE)',
    config: {
      testType: 'fe',
      baseUrl: 'http://localhost:3000',
      endpoint: '/',
      method: 'GET',
      body: '',
      headers: {},
      authToken: '',
      testPhase: 'smoke',
      metricName: 'homepage',
    },
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  },
  {
    name: 'Smoke — API Health (BE)',
    config: {
      testType: 'be',
      baseUrl: 'http://localhost:3000',
      endpoint: '/health',
      method: 'GET',
      body: '',
      headers: {},
      authToken: '',
      testPhase: 'smoke',
      metricName: 'health',
    },
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  },
  {
    name: 'Load — REST API (BE)',
    config: {
      testType: 'be',
      baseUrl: 'http://localhost:3000',
      endpoint: '/api/v1/resource',
      method: 'GET',
      body: '',
      headers: {},
      authToken: '',
      testPhase: 'load',
      metricName: 'api_v1_resource',
    },
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  },
];

// ─── Helpers ────────────────────────────────────────────────────────

function loadPresets() {
  if (!existsSync(PRESETS_FILE)) {
    // Initialize with defaults
    savePresetsFile(defaultPresets);
    return defaultPresets;
  }

  try {
    const data = JSON.parse(readFileSync(PRESETS_FILE, 'utf-8'));
    return Array.isArray(data) ? data : defaultPresets;
  } catch {
    return defaultPresets;
  }
}

function savePresetsFile(presets) {
  writeFileSync(PRESETS_FILE, JSON.stringify(presets, null, 2), 'utf-8');
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Get all saved presets.
 * @returns {Array} Array of preset objects
 */
export function getPresets() {
  return loadPresets();
}

/**
 * Save or update a preset.
 * If a preset with the same name exists, it is updated.
 *
 * @param {string} name - Preset name
 * @param {object} config - Test configuration
 * @returns {{ ok: boolean, preset: object }}
 */
export function savePreset(name, config) {
  const presets = loadPresets();
  const existingIndex = presets.findIndex(p => p.name === name);

  const preset = {
    name,
    config,
    createdAt: existingIndex >= 0 ? presets[existingIndex].createdAt : new Date().toISOString(),
    lastUsedAt: null,
  };

  if (existingIndex >= 0) {
    presets[existingIndex] = preset;
  } else {
    presets.push(preset);
  }

  savePresetsFile(presets);
  return { ok: true, preset };
}

/**
 * Delete a preset by name.
 *
 * @param {string} name - Preset name
 * @returns {{ ok: boolean, error?: string }}
 */
export function deletePreset(name) {
  const presets = loadPresets();
  const filtered = presets.filter(p => p.name !== name);

  if (filtered.length === presets.length) {
    return { ok: false, error: `Preset "${name}" not found.` };
  }

  savePresetsFile(filtered);
  return { ok: true };
}

/**
 * Mark a preset as recently used.
 *
 * @param {string} name - Preset name
 */
export function markPresetUsed(name) {
  const presets = loadPresets();
  const preset = presets.find(p => p.name === name);
  if (preset) {
    preset.lastUsedAt = new Date().toISOString();
    savePresetsFile(presets);
  }
}
