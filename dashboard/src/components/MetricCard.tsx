import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  status?: 'success' | 'warning' | 'danger' | 'neutral';
}

const statusColors = {
  success: 'border-emerald-800/50 bg-emerald-950/30',
  warning: 'border-amber-800/50 bg-amber-950/30',
  danger: 'border-red-800/50 bg-red-950/30',
  neutral: 'border-gray-800 bg-gray-900/50',
};

const statusValueColors = {
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  danger: 'text-red-400',
  neutral: 'text-gray-100',
};

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

export default function MetricCard({
  title,
  value,
  unit,
  subtitle,
  icon,
  trend = 'neutral',
  trendValue,
  status = 'neutral',
}: MetricCardProps) {
  const TrendIcon = trendIcons[trend];

  return (
    <div className={`rounded-xl border p-4 transition-colors hover:brightness-110 ${statusColors[status]}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          {title}
        </span>
        {icon && <span className="text-gray-500">{icon}</span>}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl font-bold ${statusValueColors[status]}`}>
          {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value}
        </span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>

      {/* Footer: trend + subtitle */}
      <div className="flex items-center justify-between mt-2">
        {subtitle && (
          <span className="text-xs text-gray-500">{subtitle}</span>
        )}
        {trendValue && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${
            trend === 'up' ? 'text-red-400' :
            trend === 'down' ? 'text-emerald-400' :
            'text-gray-500'
          }`}>
            <TrendIcon className="w-3 h-3" />
            {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}
