import React from 'react';

const STATUS_CONFIG = {
  online: { color: 'bg-green-500', label: 'Online' },
  idle: { color: 'bg-yellow-500', label: 'Idle' },
  'in-call': { color: 'bg-yellow-600', label: 'In Call' },
  transmitting: { color: 'bg-orange-500', label: 'TX' },
  away: { color: 'bg-red-500', label: 'Away' },
  offline: { color: 'bg-zinc-600', label: 'Offline' },
};

export default function StatusBadge({ status = 'offline', compact = false }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.offline;

  if (compact) {
    return (
      <div
        className={`w-2 h-2 rounded-full ${config.color}`}
        title={config.label}
      />
    );
  }

  return (
    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border ${config.color.replace('bg-', 'border-').replace('500', '700')} bg-black/30 text-[8px] font-bold uppercase tracking-wider text-white`}>
      <div className={`w-1.5 h-1.5 rounded-full ${config.color}`} />
      {config.label}
    </div>
  );
}