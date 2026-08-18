import React from 'react';
import { RunHistoryTable } from '../components/RunHistoryTable.jsx';

export const History = ({ runs, loading, totalCount }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Ingestion History Log</h2>
        <p className="text-slate-400 text-sm mt-0.5">
          Audit trail showing the status and statistics of all {totalCount} completed ingestion runs.
        </p>
      </div>

      <RunHistoryTable runs={runs} loading={loading} />
    </div>
  );
};
