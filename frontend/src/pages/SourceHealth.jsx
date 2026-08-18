import React from 'react';
import { SourceHealthCard } from '../components/SourceHealthCard.jsx';
import { Activity } from 'lucide-react';

export const SourceHealth = ({ sources, loading }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Sources Health status</h2>
        <p className="text-slate-400 text-sm mt-0.5">
          Real-time circuit breaker status and fail-safe diagnostics.
        </p>
      </div>

      {sources.length === 0 ? (
        <div className="text-center py-10 bg-slate-900 border border-slate-800 rounded-xl">
          <Activity className="w-12 h-12 mx-auto text-slate-600 mb-3 animate-pulse" />
          <h3 className="text-slate-300 font-semibold text-lg">No active sources registered</h3>
          <p className="text-slate-500 text-sm">Sources register dynamically when ingestion is first triggered.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sources.map((source) => (
            <SourceHealthCard key={source.id} source={source} />
          ))}
        </div>
      )}
    </div>
  );
};
