import React from 'react';

export const StatCard = ({ title, value, subtext, icon: Icon, color = 'blue' }) => {
  const colorMap = {
    blue: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    yellow: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    red: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    purple: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
  };

  const selectedColor = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex items-center justify-between card-hover">
      <div>
        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1">
          {title}
        </span>
        <h3 className="text-2xl font-bold text-slate-100">{value}</h3>
        {subtext && <p className="text-slate-400 text-xs mt-1">{subtext}</p>}
      </div>
      {Icon && (
        <div className={`p-3 rounded-lg border ${selectedColor}`}>
          <Icon className="w-6 h-6" />
        </div>
      )}
    </div>
  );
};
