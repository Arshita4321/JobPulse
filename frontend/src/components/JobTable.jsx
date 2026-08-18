import React from 'react';
import { ExternalLink, MapPin, Briefcase, Calendar } from 'lucide-react';
import { StatusBadge } from './StatusBadge.jsx';

export const JobTable = ({ jobs, loading }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="text-center py-10 bg-slate-900 border border-slate-800 rounded-xl">
        <Briefcase className="w-12 h-12 mx-auto text-slate-600 mb-3" />
        <h3 className="text-slate-300 font-semibold text-lg">No jobs found</h3>
        <p className="text-slate-500 text-sm">Ingest some jobs or adjust your search filter.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <th className="px-6 py-4">Job Info</th>
              <th className="px-6 py-4">Company</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Source</th>
              <th className="px-6 py-4">Published At</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300 text-sm">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-slate-800/35 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-100">{job.title}</div>
                  <div className="text-xs text-slate-400 truncate max-w-xs">{job.url}</div>
                </td>
                <td className="px-6 py-4 font-medium text-slate-200">{job.company}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center text-slate-400 text-xs">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-slate-500" />
                    {job.location || 'Remote'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={job.source} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center text-slate-400 text-xs">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-slate-500" />
                    {new Date(job.published_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-xs font-semibold text-sky-400 hover:text-sky-300 hover:underline"
                  >
                    View Job
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
