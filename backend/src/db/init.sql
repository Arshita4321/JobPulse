-- Drop tables if they exist (clean setup)
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS ingestion_runs;
DROP TABLE IF EXISTS source_health;

-- Source Health Table
CREATE TABLE source_health (
  id SERIAL PRIMARY KEY,
  source VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'HEALTHY', -- HEALTHY, DEGRADED, OPEN, RECOVERING
  consecutive_failures INTEGER DEFAULT 0,
  last_success_at TIMESTAMP WITH TIME ZONE,
  last_failure_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  last_response_status INTEGER,
  last_response_time_ms INTEGER,
  circuit_opened_at TIMESTAMP WITH TIME ZONE,
  circuit_next_attempt_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ingestion Runs Table
CREATE TABLE ingestion_runs (
  id SERIAL PRIMARY KEY,
  source VARCHAR(255) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) NOT NULL, -- RUNNING, COMPLETED, FAILED
  fetched_count INTEGER DEFAULT 0,
  inserted_count INTEGER DEFAULT 0,
  duplicate_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  response_status INTEGER,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Jobs Table
CREATE TABLE jobs (
  id SERIAL PRIMARY KEY,
  source VARCHAR(255) NOT NULL,
  external_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  description TEXT,
  url VARCHAR(2048) NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  content_hash VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_source_external_id UNIQUE (source, external_id)
);

-- Indexes for performance
CREATE INDEX idx_jobs_source_external_id ON jobs(source, external_id);
CREATE INDEX idx_jobs_published_at ON jobs(published_at DESC);
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_ingestion_runs_created_at ON ingestion_runs(created_at DESC);
