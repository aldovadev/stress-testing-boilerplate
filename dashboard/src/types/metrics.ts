// ─── k6 NDJSON Stream Types ─────────────────────────────────────────

export interface MetricDefinition {
  type: 'metric_definition';
  name: string;
  metricType: 'gauge' | 'rate' | 'counter' | 'trend';
  contains: 'time' | 'default' | 'data';
  thresholds: string[];
  category?: MetricCategory;
}

export interface DataPoint {
  type: 'data_point';
  metric: string;
  timestamp: string;
  value: number;
  tags: Record<string, string>;
}

export type MetricCategory = 'latency' | 'throughput' | 'errors' | 'vus' | 'data' | 'custom';

// ─── Chart Data Types ───────────────────────────────────────────────

export interface ChartDataPoint {
  time: number;           // Unix timestamp in ms
  timeLabel: string;      // Formatted time string (HH:MM:SS)
  value: number;
  avg?: number;
  min?: number;
  max?: number;
  count?: number;
  p50?: number;
  p90?: number;
  p95?: number;
  p99?: number;
}

export interface MetricSeries {
  name: string;
  category: MetricCategory;
  metricType: string;
  data: ChartDataPoint[];
}

// ─── WebSocket Message Types ────────────────────────────────────────

export interface WsInitMessage {
  type: 'init';
  data: {
    status: { running: boolean; startTime: string | null };
    definitions: Record<string, MetricDefinition>;
    buffer: DataPoint[];
  };
}

export interface WsMetricDefMessage {
  type: 'metric_definition';
  data: MetricDefinition;
}

export interface WsDataPointsMessage {
  type: 'data_points';
  data: DataPoint[];
}

export interface WsTestStartMessage {
  type: 'test_start';
  data: { startTime: string };
}

export interface WsTestCompleteMessage {
  type: 'test_complete';
}

export interface WsSummaryMessage {
  type: 'summary';
  data: SummaryData;
}

export interface WsResetMessage {
  type: 'reset';
}

export type WsMessage =
  | WsInitMessage
  | WsMetricDefMessage
  | WsDataPointsMessage
  | WsTestStartMessage
  | WsTestCompleteMessage
  | WsSummaryMessage
  | WsResetMessage;

// ─── Summary Data Types ─────────────────────────────────────────────

export interface SummaryData {
  root_group?: GroupData;
  options?: Record<string, unknown>;
  state?: { testRunDurationMs: number };
  metrics?: Record<string, SummaryMetric>;
  metadata?: {
    timestamp: string;
    phase: string;
    vus: string;
    duration: string;
  };
}

export interface GroupData {
  path: string;
  name: string;
  groups: GroupData[];
  checks: CheckData[];
}

export interface CheckData {
  name: string;
  path: string;
  passes: number;
  fails: number;
}

export interface SummaryMetric {
  type: 'counter' | 'gauge' | 'rate' | 'trend';
  contains: string;
  values: Record<string, number>;
  thresholds?: Record<string, { ok: boolean }>;
}

// ─── Dashboard State Types ──────────────────────────────────────────

export type TestStatus = 'idle' | 'running' | 'completed';

export interface DashboardState {
  testStatus: TestStatus;
  testStartTime: string | null;
  isConnected: boolean;
  definitions: Record<string, MetricDefinition>;
  series: Record<string, ChartDataPoint[]>;
  summary: SummaryData | null;
  currentVUs: number;
  currentRPS: number;
  currentErrorRate: number;
  currentP95: number;
}

// ─── History Types ──────────────────────────────────────────────────

export interface HistoryEntry {
  filename: string;
  timestamp: string;
  phase: string;
  vus: string;
  duration: string;
}
