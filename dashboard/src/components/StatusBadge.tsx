import type { TestStatus } from '../types/metrics';

interface StatusBadgeProps {
  status: TestStatus;
  size?: 'sm' | 'md';
}

const config: Record<TestStatus, { label: string; color: string; dot: string }> = {
  idle: {
    label: 'Idle',
    color: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700',
    dot: 'bg-gray-400 dark:bg-gray-500',
  },
  running: {
    label: 'Running',
    color: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500 dark:bg-emerald-400 animate-pulse',
  },
  completed: {
    label: 'Completed',
    color: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500 dark:bg-blue-400',
  },
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const { label, color, dot } = config[status];

  return (
    <span className={`
      inline-flex items-center gap-1.5 border rounded-full font-medium
      ${color}
      ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'}
    `}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
