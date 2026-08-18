import React, { useState } from 'react';
import { Play, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

export const SimulatorPanel = ({ onTriggerSimulation, loading }) => {
  const [scenario, setScenario] = useState('normal');

  const scenarios = [
    {
      id: 'normal',
      name: 'Normal Ingestion',
      description: 'Fetches jobs from the sandbox normally. Simulates smooth parsing, validation, and storage.',
      badge: 'Success'
    },
    {
      id: '429',
      name: '429 Rate Limit',
      description: 'Sandbox returns 429 Too Many Requests with "Retry-After: 2" header. Ingestion will back off, wait 2 seconds, and retry successfully.',
      badge: 'Retry-After'
    },
    {
      id: '503',
      name: '503 Temporary Outage',
      description: 'Sandbox returns 503 Service Unavailable. Ingestion applies exponential backoff with jitter and retries.',
      badge: 'Backoff'
    },
    {
      id: 'timeout',
      name: 'Request Timeout',
      description: 'Sandbox hangs for 15 seconds. Client AbortController times out, triggering backoff and retry pacing.',
      badge: 'Timeout'
    },
    {
      id: 'malformed',
      name: 'Malformed Records',
      description: 'Sandbox returns job records missing required fields (e.g., empty title/company). Ingestion rejects them and increments fail counts.',
      badge: 'Validation'
    },
    {
      id: 'repeated-failure',
      name: 'Repeated Failures (Circuit Open)',
      description: 'Sandbox returns 500 errors repeatedly. After 3 failures, the circuit breaker opens to protect the network.',
      badge: 'Circuit Open'
    },
    {
      id: 'recovery',
      name: 'Recovery (Circuit Reset)',
      description: 'Sandbox recovers. During HALF_OPEN, a successful request resets circuit breaker state back to CLOSED.',
      badge: 'Circuit Close'
    },
    {
      id: 'schema-change',
      name: 'Schema Change Failure',
      description: 'Sandbox returns jobs with altered key names (e.g. jobTitle). Ingestion detects layout changes and marks the run failed to prevent data pollution.',
      badge: 'Schema Guard'
    }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onTriggerSimulation(scenario);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
        <ShieldAlert className="w-5 h-5 text-amber-400" />
        <h3 className="text-slate-100 font-bold text-lg">Resilience Simulator Panel</h3>
      </div>
      
      <p className="text-slate-400 text-sm mb-6 leading-relaxed">
        Toggle simulated failure modes to demonstrate circuit breaker transitions, rate limit throttling, and parser safeguards on the sandbox endpoint.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenarios.map((scen) => (
            <label
              key={scen.id}
              className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                scenario === scen.id
                  ? 'border-sky-500 bg-sky-500/5'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/20'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="scenario"
                    value={scen.id}
                    checked={scenario === scen.id}
                    onChange={() => setScenario(scen.id)}
                    className="text-sky-500 focus:ring-sky-500"
                  />
                  <span className="font-semibold text-slate-200 text-sm">{scen.name}</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  {scen.badge}
                </span>
              </div>
              <p className="text-slate-400 text-xs pl-6 leading-relaxed">{scen.description}</p>
            </label>
          ))}
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-500/50 text-white font-semibold rounded-lg shadow-md transition-colors text-sm"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Simulating Ingestion Run...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Simulation
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
