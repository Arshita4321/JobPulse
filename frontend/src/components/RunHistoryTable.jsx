import React from 'react';
import { Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { StatusBadge } from './StatusBadge.jsx';

export const RunHistoryTable = ({ runs, loading }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  if (!runs || runs.length === 0) {
    return (
      <div className="text-center py-10 bg-slate-900 border border-slate-800 rounded-xl">
        <Clock className="w-12 h-12 mx-auto text-slate-600 mb-3" />
        <h3 className="text-slate-300 font-semibold text-lg">No history logs</h3>
        <p className="text-slate-500 text-sm">Trigger ingestion to log ingestion run details.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <th className="px-6 py-4">Run ID & Source</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Fetched</th>
              <th className="px-6 py-4">Inserted</th>
              <th className="px-6 py-4">Duplicates</th>
              <th className="px-6 py-4">Failed</th>
              <th className="px-6 py-4">Retries</th>
              <th className="px-6 py-4">Duration</th>
              <th className="px-6 py-4">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300 text-sm">
            {runs.map((run) => (
              <tr key={run.id} className="hover:bg-slate-800/35 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-100">Run #{run.id}</div>
                  <div className="text-xs text-slate-400 font-mono uppercase">{run.source}</div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={run.status} />
                </td>
                <td className="px-6 py-4 font-mono font-medium">{run.fetched_count}</td>
                <td className="px-6 py-4 font-mono font-medium text-emerald-400">+{run.inserted_count}</td>
                <td className="px-6 py-4 font-mono font-medium text-slate-400">{run.duplicate_count}</td>
                <td className="px-6 py-4 font-mono font-medium text-rose-400">{run.failed_count}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center font-mono ${run.retry_count > 0 ? 'text-amber-400 font-semibold' : 'text-slate-500'}`}>
                    {run.retry_count > 0 && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                    {run.retry_count}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono text-slate-400">
                  {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(2)}s` : '-'}
                </td>
                <td className="px-6 py-4 max-w-xs">
                  {run.error_message ? (
                    <div className="flex items-center text-rose-400 text-xs gap-1.5 bg-rose-500/5 p-1.5 rounded border border-rose-500/10">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span className="truncate">{run.error_message}</span>
                    </div>
                  ) : (
                    <span className="text-slate-500 text-xs">Clean run</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
