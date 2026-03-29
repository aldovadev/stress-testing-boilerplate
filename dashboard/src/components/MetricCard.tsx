import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import { MagicCard } from '@/components/ui/magic-card';

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
  success: 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/30',
  warning: 'border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30',
  danger: 'border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30',
  neutral: 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50',
};

const statusGradientColors: Record<string, string> = {
  success: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
  neutral: '#f43f5e',
};

const statusValueColors = {
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
  neutral: 'text-gray-900 dark:text-gray-100',
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
    <MagicCard
      className={`rounded-xl border p-4 transition-colors ${statusColors[status]}`}
      gradientColor={statusGradientColors[status]}
      gradientOpacity={0.1}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {title}
        </span>
        {icon && <span className="text-gray-400 dark:text-gray-500">{icon}</span>}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl font-bold ${statusValueColors[status]}`}>
          {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value}
        </span>
        {unit && <span className="text-sm text-gray-400 dark:text-gray-500">{unit}</span>}
      </div>

      {/* Footer: trend + subtitle */}
      <div className="flex items-center justify-between mt-2">
        {subtitle && (
          <span className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</span>
        )}
        {trendValue && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${
            trend === 'up' ? 'text-red-500 dark:text-red-400' :
            trend === 'down' ? 'text-emerald-500 dark:text-emerald-400' :
            'text-gray-400 dark:text-gray-500'
          }`}>
            <TrendIcon className="w-3 h-3" />
            {trendValue}
          </span>
        )}
      </div>
    </MagicCard>
  );
}
