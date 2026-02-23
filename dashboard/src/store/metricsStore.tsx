import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import type {
  MetricDefinition,
  ChartDataPoint,
  SummaryData,
  TestStatus,
  DataPoint,
  DashboardState,
} from '../types/metrics';

// ─── Constants ──────────────────────────────────────────────────────
const MAX_CHART_POINTS = 300;     // Max points per metric series
const BUCKET_MS = 1000;           // 1-second time buckets

// ─── Actions ────────────────────────────────────────────────────────
type Action =
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_TEST_STATUS'; payload: TestStatus }
  | { type: 'SET_TEST_START_TIME'; payload: string | null }
  | { type: 'ADD_DEFINITION'; payload: MetricDefinition }
  | { type: 'SET_DEFINITIONS'; payload: Record<string, MetricDefinition> }
  | { type: 'ADD_DATA_POINTS'; payload: DataPoint[] }
  | { type: 'SET_SUMMARY'; payload: SummaryData }
  | { type: 'INIT_BUFFER'; payload: DataPoint[] }
  | { type: 'RESET' };

// ─── Initial State ──────────────────────────────────────────────────
const initialState: DashboardState = {
  testStatus: 'idle',
  testStartTime: null,
  isConnected: false,
  definitions: {},
  series: {},
  summary: null,
  currentVUs: 0,
  currentRPS: 0,
  currentErrorRate: 0,
  currentP95: 0,
};

// ─── Helper: Bucket data points into chart series ───────────────────
function bucketize(points: DataPoint[]): Record<string, ChartDataPoint[]> {
  const buckets: Record<string, Map<number, { sum: number; count: number; min: number; max: number; values: number[] }>> = {};

  for (const point of points) {
    const key = point.metric;
    const time = Math.floor(new Date(point.timestamp).getTime() / BUCKET_MS) * BUCKET_MS;

    if (!buckets[key]) {
      buckets[key] = new Map();
    }

    const map = buckets[key];
    if (!map.has(time)) {
      map.set(time, { sum: 0, count: 0, min: Infinity, max: -Infinity, values: [] });
    }

    const bucket = map.get(time)!;
    bucket.sum += point.value;
    bucket.count += 1;
    bucket.min = Math.min(bucket.min, point.value);
    bucket.max = Math.max(bucket.max, point.value);
    bucket.values.push(point.value);
  }

  const result: Record<string, ChartDataPoint[]> = {};

  for (const [metric, map] of Object.entries(buckets)) {
    const series: ChartDataPoint[] = [];
    for (const [time, bucket] of map) {
      const sorted = bucket.values.sort((a, b) => a - b);
      const len = sorted.length;
      series.push({
        time,
        timeLabel: new Date(time).toLocaleTimeString('en-US', { hour12: false }),
        value: bucket.sum / bucket.count,
        avg: bucket.sum / bucket.count,
        min: bucket.min === Infinity ? 0 : bucket.min,
        max: bucket.max === -Infinity ? 0 : bucket.max,
        count: bucket.count,
        p50: sorted[Math.floor(len * 0.5)] ?? 0,
        p90: sorted[Math.floor(len * 0.9)] ?? 0,
        p95: sorted[Math.floor(len * 0.95)] ?? 0,
        p99: sorted[Math.floor(len * 0.99)] ?? 0,
      });
    }
    series.sort((a, b) => a.time - b.time);
    result[metric] = series;
  }

  return result;
}

function mergeSeries(
  existing: Record<string, ChartDataPoint[]>,
  incoming: Record<string, ChartDataPoint[]>
): Record<string, ChartDataPoint[]> {
  const result = { ...existing };

  for (const [metric, newPoints] of Object.entries(incoming)) {
    const current = result[metric] || [];
    // Merge by time, replacing existing buckets with updated ones
    const timeMap = new Map(current.map(p => [p.time, p]));
    for (const p of newPoints) {
      timeMap.set(p.time, p);
    }
    const merged = Array.from(timeMap.values()).sort((a, b) => a.time - b.time);
    result[metric] = merged.slice(-MAX_CHART_POINTS);
  }

  return result;
}

// ─── Compute live stats from latest data points ─────────────────────
function computeLiveStats(series: Record<string, ChartDataPoint[]>) {
  // Current VUs: latest value of 'vus' metric
  const vusSeries = series['vus'];
  const currentVUs = vusSeries?.[vusSeries.length - 1]?.value ?? 0;

  // Current RPS: latest count of 'http_reqs' metric
  const rpsSeries = series['http_reqs'];
  const currentRPS = rpsSeries?.[rpsSeries.length - 1]?.count ?? 0;

  // Error rate: latest value of 'http_req_failed' metric
  const errorSeries = series['http_req_failed'];
  const currentErrorRate = errorSeries?.[errorSeries.length - 1]?.value ?? 0;

  // P95: latest p95 of 'http_req_duration'
  const durationSeries = series['http_req_duration'];
  const currentP95 = durationSeries?.[durationSeries.length - 1]?.p95 ?? 0;

  return { currentVUs, currentRPS, currentErrorRate, currentP95 };
}

// ─── Reducer ────────────────────────────────────────────────────────
function metricsReducer(state: DashboardState, action: Action): DashboardState {
  switch (action.type) {
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };

    case 'SET_TEST_STATUS':
      return { ...state, testStatus: action.payload };

    case 'SET_TEST_START_TIME':
      return { ...state, testStartTime: action.payload };

    case 'ADD_DEFINITION':
      return {
        ...state,
        definitions: {
          ...state.definitions,
          [action.payload.name]: action.payload,
        },
      };

    case 'SET_DEFINITIONS':
      return { ...state, definitions: action.payload };

    case 'ADD_DATA_POINTS': {
      const incoming = bucketize(action.payload);
      const series = mergeSeries(state.series, incoming);
      const liveStats = computeLiveStats(series);
      return { ...state, series, ...liveStats };
    }

    case 'INIT_BUFFER': {
      const series = bucketize(action.payload);
      const trimmed: Record<string, ChartDataPoint[]> = {};
      for (const [k, v] of Object.entries(series)) {
        trimmed[k] = v.slice(-MAX_CHART_POINTS);
      }
      const liveStats = computeLiveStats(trimmed);
      return { ...state, series: trimmed, ...liveStats };
    }

    case 'SET_SUMMARY':
      return { ...state, summary: action.payload };

    case 'RESET':
      return { ...initialState, isConnected: state.isConnected };

    default:
      return state;
  }
}

// ─── Context ────────────────────────────────────────────────────────
interface MetricsContextValue {
  state: DashboardState;
  dispatch: React.Dispatch<Action>;
}

const MetricsContext = createContext<MetricsContextValue | null>(null);

export function MetricsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(metricsReducer, initialState);

  return (
    <MetricsContext.Provider value={{ state, dispatch }}>
      {children}
    </MetricsContext.Provider>
  );
}

export function useMetricsStore() {
  const context = useContext(MetricsContext);
  if (!context) {
    throw new Error('useMetricsStore must be used within a MetricsProvider');
  }
  return context;
}
