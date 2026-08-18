import React, { useState } from 'react';
import { JobTable } from '../components/JobTable.jsx';
import { Search, MapPin, Building2, Filter } from 'lucide-react';

export const Jobs = ({ jobs, loading, onFilterChange, totalCount }) => {
  const [search, setSearch] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [source, setSource] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    onFilterChange({ search, company, location, source });
  };

  const handleClear = () => {
    setSearch('');
    setCompany('');
    setLocation('');
    setSource('');
    onFilterChange({ search: '', company: '', location: '', source: '' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Job Listings Directory</h2>
        <p className="text-slate-400 text-sm mt-0.5">
          Showing {jobs.length} of {totalCount} total normalized and deduplicated jobs.
        </p>
      </div>

      {/* Filter Form */}
      <form onSubmit={handleSearch} className="bg-slate-900 border border-slate-800 p-5 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4 shadow-md">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search title/desc..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 placeholder-slate-600"
          />
        </div>

        <div className="relative">
          <Building2 className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Filter Company..."
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 placeholder-slate-600"
          />
        </div>

        <div className="relative">
          <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Filter Location..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 placeholder-slate-600"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="">All Sources</option>
            <option value="weworkremotely">WeWorkRemotely</option>
            <option value="sandbox">Sandbox</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg shadow transition-colors text-xs flex items-center justify-center gap-1 shrink-0"
          >
            <Filter className="w-3.5 h-3.5" />
            Apply
          </button>
          
          {(search || company || location || source) && (
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition-colors text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Jobs Table */}
      <JobTable jobs={jobs} loading={loading} />
    </div>
  );
};
