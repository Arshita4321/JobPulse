import React from 'react';
import { StatCard } from '../components/StatCard.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { 
  Database, 
  RefreshCw, 
  Activity, 
  Layers, 
  AlertOctagon, 
  CheckCircle2, 
  Play, 
  History 
} from 'lucide-react';

export const Overview = ({ 
  latestRun, 
  sources, 
  onTriggerIngestion, 
  triggerLoading, 
  recentRuns, 
  totalJobsCount 
}) => {
  const primarySource = sources.find(s => s.source === 'weworkremotely') || sources[0];

  const getSourceStatus = () => {
    return primarySource ? primarySource.status : 'HEALTHY';
  };

  const getCircuitState = () => {
    return primarySource ? primarySource.status : 'CLOSED';
  };

  return (
    <div className="space-y-8">
      {/* Welcome & Manual Trigger Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Ingestion Pipeline Control</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Monitor real-time feed processing logs, rate-limit state machines, and source integrity.
          </p>
        </div>
        <button
          onClick={() => onTriggerIngestion('public-rss')}
          disabled={triggerLoading}
          className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-500/50 text-white font-semibold rounded-lg shadow-md transition-colors text-sm"
        >
          {triggerLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Ingesting...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Ingestion
            </>
          )}
        </button>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Pipeline Status"
          value={getSourceStatus()}
          subtext={`Circuit: ${getCircuitState()}`}
          icon={Activity}
          color={getSourceStatus() === 'HEALTHY' || getSourceStatus() === 'CLOSED' ? 'green' : 'red'}
        />
        <StatCard
          title="Total Jobs Stored"
          value={totalJobsCount}
          subtext="Relational Database"
          icon={Database}
          color="blue"
        />
        <StatCard
          title="Last Run New Jobs"
          value={latestRun ? latestRun.inserted_count : 0}
          subtext={`Duplicates: ${latestRun ? latestRun.duplicate_count : 0}`}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title="Last Run Failures"
          value={latestRun ? latestRun.failed_count : 0}
          subtext={`Retries: ${latestRun ? latestRun.retry_count : 0}`}
          icon={AlertOctagon}
          color={latestRun && latestRun.failed_count > 0 ? 'red' : 'blue'}
        />
      </div>

      {/* Main Grid: Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Run Metadata */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Layers className="w-5 h-5 text-sky-400" />
            <h3 className="text-slate-100 font-bold">Latest Ingestion Run Summary</h3>
          </div>

          {latestRun ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 block">Status</span>
                <StatusBadge status={latestRun.status} />
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block">Trigger Source</span>
                <span className="text-slate-200 font-bold uppercase">{latestRun.source}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block">Duration</span>
                <span className="text-slate-200 font-semibold font-mono">
                  {latestRun.duration_ms ? `${(latestRun.duration_ms / 1000).toFixed(2)}s` : 'N/A'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block">Started At</span>
                <span className="text-slate-300 font-mono">
                  {new Date(latestRun.started_at).toLocaleTimeString()}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block">Completed At</span>
                <span className="text-slate-300 font-mono">
                  {latestRun.completed_at ? new Date(latestRun.completed_at).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block">Response Code</span>
                <span className="text-slate-300 font-mono font-bold">
                  {latestRun.response_status || 'N/A'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm py-4">No recent ingestion run logs found.</p>
          )}

          {latestRun && latestRun.error_message && (
            <div className="bg-rose-500/5 border border-rose-500/15 p-3.5 rounded-lg text-xs">
              <span className="text-rose-400 font-semibold block mb-1">Error Message</span>
              <p className="text-slate-300 font-mono break-words leading-relaxed">{latestRun.error_message}</p>
            </div>
          )}
        </div>

        {/* Live Activity Pipeline Logs */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
              <History className="w-5 h-5 text-sky-400" />
              <h3 className="text-slate-100 font-bold">Recent Runs Log</h3>
            </div>
            
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {recentRuns.slice(0, 4).map((run) => (
                <div key={run.id} className="flex justify-between items-center text-xs p-2 bg-slate-950/40 rounded border border-slate-800/40">
                  <div>
                    <span className="font-semibold text-slate-300 block">Run #{run.id}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">{run.source}</span>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={run.status} />
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {new Date(run.started_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              {recentRuns.length === 0 && (
                <p className="text-slate-500 text-xs py-4 text-center">No runs logged yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
