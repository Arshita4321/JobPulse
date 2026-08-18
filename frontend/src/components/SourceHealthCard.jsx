import React from 'react';
import { Activity, ShieldAlert, Heart, Calendar } from 'lucide-react';
import { StatusBadge } from './StatusBadge.jsx';

export const SourceHealthCard = ({ source }) => {
  if (!source) return null;

  const formattedDate = (dateStr) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between card-hover">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div>
          <h4 className="text-slate-100 font-bold uppercase tracking-wider text-sm">{source.source}</h4>
          <p className="text-slate-500 text-xs mt-0.5">Circuit Health monitor</p>
        </div>
        <StatusBadge status={source.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div className="bg-slate-950/40 p-2.5 rounded border border-slate-800/40">
          <span className="text-slate-500 block mb-0.5">Consecutive Failures</span>
          <span className={`font-mono text-base font-bold ${source.consecutive_failures > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
            {source.consecutive_failures}
          </span>
        </div>

        <div className="bg-slate-950/40 p-2.5 rounded border border-slate-800/40">
          <span className="text-slate-500 block mb-0.5">Response Time</span>
          <span className="font-mono text-base font-bold text-sky-400">
            {source.last_response_time_ms ? `${source.last_response_time_ms}ms` : 'N/A'}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-2.5 text-xs border-t border-slate-800/60 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 flex items-center">
            <Heart className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
            Last Successful Fetch
          </span>
          <span className="text-slate-300 font-mono">{formattedDate(source.last_success_at)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 flex items-center">
            <ShieldAlert className="w-3.5 h-3.5 mr-1.5 text-rose-500" />
            Last Failed Fetch
          </span>
          <span className="text-slate-300 font-mono">{formattedDate(source.last_failure_at)}</span>
        </div>

        {source.status === 'OPEN' && (
          <div className="bg-rose-500/5 border border-rose-500/10 rounded p-2.5 mt-2">
            <span className="text-rose-400 font-bold block mb-1">Circuit State: OPEN</span>
            <div className="text-[11px] text-slate-400 space-y-1">
              <div>Opened: {formattedDate(source.circuit_opened_at)}</div>
              <div>Next Health Check attempt: {formattedDate(source.circuit_next_attempt_at)}</div>
            </div>
          </div>
        )}

        {source.last_error && (
          <div className="mt-2 p-2 bg-slate-950/60 rounded border border-slate-800 text-[11px] text-rose-300 font-mono break-all max-h-24 overflow-y-auto">
            <strong>Last Error:</strong> {source.last_error}
          </div>
        )}
      </div>
    </div>
  );
};
