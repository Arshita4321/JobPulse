import React from 'react';

export const StatusBadge = ({ status }) => {
  const normalized = status ? status.toUpperCase() : 'UNKNOWN';

  let colors = 'bg-gray-100 text-gray-800 border-gray-200';
  if (normalized === 'HEALTHY' || normalized === 'COMPLETED' || normalized === 'CLOSED') {
    colors = 'status-badge-healthy bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  } else if (normalized === 'DEGRADED' || normalized === 'HALF_OPEN' || normalized === 'RECOVERING') {
    colors = 'status-badge-warning bg-amber-500/10 text-amber-400 border-amber-500/20';
  } else if (normalized === 'OPEN' || normalized === 'FAILED' || normalized === 'UNHEALTHY') {
    colors = 'status-badge-danger bg-rose-500/10 text-rose-400 border-rose-500/20';
  } else if (normalized === 'RUNNING') {
    colors = 'status-badge-info bg-sky-500/10 text-sky-400 border-sky-500/20 animate-pulse';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors}`}>
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current"></span>
      {normalized}
    </span>
  );
};
