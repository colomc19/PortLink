import type { DeviceSummary } from '@/types/devices';

interface DeviceSummaryBarProps {
  devices: DeviceSummary[];
}

export function DeviceSummaryBar({ devices }: DeviceSummaryBarProps) {
  const available = devices.filter((d) => d.status === 'available').length;
  const assigned = devices.filter((d) => d.status === 'assigned').length;
  const urgent = devices.filter((d) => d.status === 'needs_retrieval').length;

  const stats = [
    {
      count: available,
      label: available === 1 ? 'available' : 'available',
      bg: 'bg-[#F0FDF4]',
      text: 'text-[#14532D]',
      dot: 'bg-[#15803D]',
    },
    {
      count: assigned,
      label: assigned === 1 ? 'assigned' : 'assigned',
      bg: 'bg-[#EFF6FF]',
      text: 'text-[#1E3A5F]',
      dot: 'bg-[#2C5282]',
    },
    ...(urgent > 0
      ? [
          {
            count: urgent,
            label: urgent === 1 ? 'needs retrieval' : 'need retrieval',
            bg: 'bg-[#FEF2F2]',
            text: 'text-[#7F1D1D]',
            dot: 'bg-[#B91C1C]',
          },
        ]
      : []),
  ];

  return (
    <div
      className="flex flex-col sm:flex-row gap-2"
      role="status"
      aria-label="Device inventory summary"
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={[
            'flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm',
            stat.bg,
            stat.text,
          ].join(' ')}
        >
          <span
            className={['w-2.5 h-2.5 rounded-full shrink-0', stat.dot].join(' ')}
            aria-hidden="true"
          />
          <span>
            <span className="text-base font-bold">{stat.count}</span>{' '}
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}
