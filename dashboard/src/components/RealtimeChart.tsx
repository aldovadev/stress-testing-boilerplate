import {
  ResponsiveContainer,
  LineChart,
  AreaChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import type { ChartDataPoint } from '../types/metrics';
import { useTheme } from '../store/themeStore';

interface RealtimeChartProps {
  title: string;
  data: ChartDataPoint[];
  chartType?: 'line' | 'area';
  lines?: Array<{
    dataKey: string;
    color: string;
    label: string;
    dashed?: boolean;
  }>;
  thresholdLine?: { value: number; label: string; color?: string };
  yAxisUnit?: string;
  height?: number;
}

const defaultLines = [
  { dataKey: 'avg', color: '#3b82f6', label: 'Average' },
];

export default function RealtimeChart({
  title,
  data,
  chartType = 'line',
  lines = defaultLines,
  thresholdLine,
  yAxisUnit = '',
  height = 250,
}: RealtimeChartProps) {
  const ChartComponent = chartType === 'area' ? AreaChart : LineChart;
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Theme-aware chart colors
  const gridColor = isDark ? '#1f2937' : '#e5e7eb';
  const tickColor = isDark ? '#6b7280' : '#9ca3af';
  const axisColor = isDark ? '#374151' : '#d1d5db';
  const tooltipBg = isDark ? '#1f2937' : '#ffffff';
  const tooltipBorder = isDark ? '#374151' : '#e5e7eb';
  const tooltipLabel = isDark ? '#9ca3af' : '#6b7280';

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-4 transition-colors">
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">{title}</h3>

      {data.length === 0 ? (
        <div className="flex items-center justify-center text-gray-400 dark:text-gray-600 text-sm" style={{ height }}>
          Waiting for data...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <ChartComponent data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="timeLabel"
              tick={{ fill: tickColor, fontSize: 11 }}
              axisLine={{ stroke: axisColor }}
              tickLine={{ stroke: axisColor }}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              tick={{ fill: tickColor, fontSize: 11 }}
              axisLine={{ stroke: axisColor }}
              tickLine={{ stroke: axisColor }}
              unit={yAxisUnit}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: '8px',
                fontSize: '13px',
              }}
              labelStyle={{ color: tooltipLabel }}
              formatter={(value: number) => [
                `${value.toFixed(2)}${yAxisUnit}`,
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
            />

            {thresholdLine && (
              <ReferenceLine
                y={thresholdLine.value}
                stroke={thresholdLine.color || '#ef4444'}
                strokeDasharray="8 4"
                label={{
                  value: thresholdLine.label,
                  fill: thresholdLine.color || '#ef4444',
                  fontSize: 11,
                  position: 'right',
                }}
              />
            )}

            {lines.map((line) =>
              chartType === 'area' ? (
                <Area
                  key={line.dataKey}
                  type="monotone"
                  dataKey={line.dataKey}
                  stroke={line.color}
                  fill={line.color}
                  fillOpacity={0.15}
                  strokeWidth={2}
                  name={line.label}
                  dot={false}
                  isAnimationActive={false}
                />
              ) : (
                <Line
                  key={line.dataKey}
                  type="monotone"
                  dataKey={line.dataKey}
                  stroke={line.color}
                  strokeWidth={2}
                  name={line.label}
                  dot={false}
                  strokeDasharray={line.dashed ? '5 5' : undefined}
                  isAnimationActive={false}
                />
              )
            )}
          </ChartComponent>
        </ResponsiveContainer>
      )}
    </div>
  );
}
