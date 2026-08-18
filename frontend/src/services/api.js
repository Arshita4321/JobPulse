const API_BASE = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '');

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  async getJobs(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/api/jobs?${query}`);
    if (!res.ok) throw new Error('Failed to fetch jobs');
    return res.json();
  },

  async getSources() {
    const res = await fetch(`${API_BASE}/api/sources`);
    if (!res.ok) throw new Error('Failed to fetch sources');
    return res.json();
  },

  async getRuns(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/api/ingestion/runs?${query}`);
    if (!res.ok) throw new Error('Failed to fetch runs');
    return res.json();
  },

  async getLatestRun() {
    const res = await fetch(`${API_BASE}/api/ingestion/latest`);
    if (!res.ok) throw new Error('Failed to fetch latest run');
    return res.json();
  },

  async triggerIngestion(source = 'public-rss', scenario = 'normal') {
    const res = await fetch(`${API_BASE}/api/ingestion/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ source, scenario })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to trigger ingestion');
    }
    return data;
  }
};
