import React from 'react';
import { SimulatorPanel } from '../components/SimulatorPanel.jsx';

export const Simulator = ({ onTriggerSimulation, loading }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Failure Simulator</h2>
        <p className="text-slate-400 text-sm mt-0.5">
          Simulate external network failures, rate throttling, timeouts, and structure changes safely on a local sandbox.
        </p>
      </div>

      <SimulatorPanel onTriggerSimulation={onTriggerSimulation} loading={loading} />
    </div>
  );
};
