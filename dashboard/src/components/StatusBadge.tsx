import type { TestStatus } from '../types/metrics';

interface StatusBadgeProps {
  status: TestStatus;
  size?: 'sm' | 'md';
}

const config: Record<TestStatus, { label: string; color: string; dot: string }> = {
  idle: {
    label: 'Idle',
    color: 'bg-gray-800 text-gray-400 border-gray-700',
    dot: 'bg-gray-500',
  },
  running: {
    label: 'Running',
    color: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    dot: 'bg-emerald-400 animate-pulse',
  },
  completed: {
    label: 'Completed',
    color: 'bg-blue-950 text-blue-400 border-blue-800',
    dot: 'bg-blue-400',
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
