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

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
      <h3 className="text-sm font-medium text-gray-300 mb-3">{title}</h3>

      {data.length === 0 ? (
        <div className="flex items-center justify-center text-gray-600 text-sm" style={{ height }}>
          Waiting for data...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <ChartComponent data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="timeLabel"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={{ stroke: '#374151' }}
              tickLine={{ stroke: '#374151' }}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={{ stroke: '#374151' }}
              tickLine={{ stroke: '#374151' }}
              unit={yAxisUnit}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                fontSize: '13px',
              }}
              labelStyle={{ color: '#9ca3af' }}
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
