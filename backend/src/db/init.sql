-- Drop tables if they exist (clean setup)
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS ingestion_runs;
DROP TABLE IF EXISTS source_health;

-- Source Health Table
CREATE TABLE source_health (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  source VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'HEALTHY', -- HEALTHY, DEGRADED, OPEN, RECOVERING
  consecutive_failures INT DEFAULT 0,
  last_success_at DATETIME NULL,
  last_failure_at DATETIME NULL,
  last_error TEXT NULL,
  last_response_status INT NULL,
  last_response_time_ms INT NULL,
  circuit_opened_at DATETIME NULL,
  circuit_next_attempt_at DATETIME NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Ingestion Runs Table
CREATE TABLE ingestion_runs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  source VARCHAR(255) NOT NULL,
  started_at DATETIME NOT NULL,
  completed_at DATETIME NULL,
  status VARCHAR(50) NOT NULL, -- RUNNING, COMPLETED, FAILED
  fetched_count INT DEFAULT 0,
  inserted_count INT DEFAULT 0,
  duplicate_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  retry_count INT DEFAULT 0,
  response_status INT NULL,
  duration_ms INT NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Jobs Table
CREATE TABLE jobs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  source VARCHAR(255) NOT NULL,
  external_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  location VARCHAR(255) NULL,
  description TEXT NULL,
  url VARCHAR(1000) NOT NULL,
  published_at DATETIME NULL,
  first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  content_hash VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT unique_source_external_id UNIQUE (source, external_id)
);

-- Indexes for performance
CREATE INDEX idx_jobs_source ON jobs(source);
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_published_at ON jobs(published_at DESC);
CREATE INDEX idx_ingestion_runs_created_at ON ingestion_runs(created_at DESC);
