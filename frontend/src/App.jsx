import React, { useState, useEffect } from 'react';
import { api } from './services/api.js';
import { Overview } from './pages/Overview.jsx';
import { Jobs } from './pages/Jobs.jsx';
import { History } from './pages/History.jsx';
import { SourceHealth } from './pages/SourceHealth.jsx';
import { Simulator } from './pages/Simulator.jsx';
import { 
  Activity, 
  Briefcase, 
  History as HistoryIcon, 
  Heart, 
  ShieldAlert, 
  LayoutDashboard,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [jobs, setJobs] = useState([]);
  const [runs, setRuns] = useState([]);
  const [latestRun, setLatestRun] = useState(null);
  const [sources, setSources] = useState([]);
  const [jobsCount, setJobsCount] = useState(0);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Filters state for Jobs page
  const [filters, setFilters] = useState({});

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Fetch all initial dashboard stats
  const fetchData = async () => {
    setLoading(true);
    try {
      const [jobsData, runsData, latestRunData, sourcesData] = await Promise.all([
        api.getJobs(filters),
        api.getRuns({ limit: 20 }),
        api.getLatestRun(),
        api.getSources()
      ]);

      setJobs(jobsData.jobs);
      setJobsCount(jobsData.total);
      setRuns(runsData.runs);
      setLatestRun(latestRunData);
      setSources(sourcesData);
    } catch (err) {
      console.error('Error fetching data:', err);
      showNotification('Error connecting to backend API server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleTriggerIngestion = async (source = 'public-rss', scenario = 'normal') => {
    setTriggerLoading(true);
    showNotification(`Triggering ingestion run for source=${source}...`, 'info');
    try {
      const response = await api.triggerIngestion(source, scenario);
      const resVal = response.result;
      
      if (resVal.success) {
        showNotification(
          `Ingestion completed successfully! Fetched: ${resVal.fetchedCount}, New: ${resVal.insertedCount}, Duplicates: ${resVal.duplicateCount}`, 
          'success'
        );
      } else {
        showNotification(`Ingestion run failed: ${resVal.error || 'Server error'}`, 'error');
      }
      
      // Refresh statistics after run completed
      await fetchData();
    } catch (err) {
      showNotification(`Pipeline request failed: ${err.message}`, 'error');
      // Refresh to grab the failed run record logged by the backend
      await fetchData();
    } finally {
      setTriggerLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <Overview
            latestRun={latestRun}
            sources={sources}
            onTriggerIngestion={(src) => handleTriggerIngestion(src)}
            triggerLoading={triggerLoading}
            recentRuns={runs}
            totalJobsCount={jobsCount}
          />
        );
      case 'jobs':
        return (
          <Jobs
            jobs={jobs}
            loading={loading}
            onFilterChange={handleFilterChange}
            totalCount={jobsCount}
          />
        );
      case 'history':
        return (
          <History
            runs={runs}
            loading={loading}
            totalCount={runs.length}
          />
        );
      case 'health':
        return (
          <SourceHealth
            sources={sources}
            loading={loading}
          />
        );
      case 'simulator':
        return (
          <Simulator
            onTriggerSimulation={(scen) => handleTriggerIngestion('sandbox', scen)}
            loading={triggerLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg border text-xs max-w-sm transition-all animate-bounce ${
          notification.type === 'error' 
            ? 'bg-rose-950/90 text-rose-200 border-rose-800' 
            : notification.type === 'info'
            ? 'bg-sky-950/90 text-sky-200 border-sky-800'
            : 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
        }`}>
          {notification.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Header navigation */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-sky-500/10 p-2 rounded-lg border border-sky-500/20">
              <Activity className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <h1 className="font-extrabold text-md tracking-tight text-slate-100">JobPulse</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Resilient Ingestion Engine</p>
            </div>
          </div>
          
          <nav className="flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-slate-900 text-sky-400 border border-slate-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'jobs'
                  ? 'bg-slate-900 text-sky-400 border border-slate-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Jobs
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-slate-900 text-sky-400 border border-slate-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <HistoryIcon className="w-3.5 h-3.5" />
              History
            </button>
            <button
              onClick={() => setActiveTab('health')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'health'
                  ? 'bg-slate-900 text-sky-400 border border-slate-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              Source Health
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'simulator'
                  ? 'bg-slate-900 text-sky-400 border border-slate-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Failure Simulator
            </button>
          </nav>
        </div>
      </header>

      {/* Main body Content container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && jobs.length === 0 && runs.length === 0 ? (
          <div className="flex flex-col justify-center items-center py-20 gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-sky-500"></div>
            <p className="text-slate-400 text-xs font-mono">Loading dashboard metrics...</p>
          </div>
        ) : (
          renderContent()
        )}
      </main>

      {/* Footer footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-[10px] text-slate-500">
        <p>© 2026 JobPulse Ingestion Pipeline Dashboard. Open-source demo portfolio.</p>
      </footer>
    </div>
  );
}
