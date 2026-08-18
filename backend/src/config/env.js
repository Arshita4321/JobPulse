import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config();

const getEnv = (key, defaultValue) => {
  return process.env[key] || defaultValue;
};

const getEnvInt = (key, defaultValue) => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

export const config = {
  port: getEnvInt('PORT', 5000),
  dbHost: getEnv('DB_HOST', 'localhost'),
  dbPort: getEnvInt('DB_PORT', 3306),
  dbUser: getEnv('DB_USER', 'root'),
  dbPassword: getEnv('DB_PASSWORD', ''),
  dbName: getEnv('DB_NAME', 'jobpulse'),
  databaseUrl: getEnv('DATABASE_URL', ''),
  primarySourceUrl: getEnv('PRIMARY_SOURCE_URL', 'https://weworkremotely.com/remote-jobs.rss'),
  primarySourceName: getEnv('PRIMARY_SOURCE_NAME', 'weworkremotely'),
  requestTimeoutMs: getEnvInt('REQUEST_TIMEOUT_MS', 10000),
  requestDelayMs: getEnvInt('REQUEST_DELAY_MS', 2000),
  maxRetries: getEnvInt('MAX_RETRIES', 3),
  backoffBaseMs: getEnvInt('BACKOFF_BASE_MS', 1000),
  circuitFailureThreshold: getEnvInt('CIRCUIT_FAILURE_THRESHOLD', 3),
  circuitCooldownMs: getEnvInt('CIRCUIT_COOLDOWN_MS', 60000),
  ingestionIntervalMinutes: getEnvInt('INGESTION_INTERVAL_MINUTES', 5),
  frontendUrl: getEnv('FRONTEND_URL', 'http://localhost:5173'),
  nodeEnv: getEnv('NODE_ENV', 'development'),
};

// Simple sanity check validation
if (!config.databaseUrl && (!config.dbHost || !config.dbName)) {
  console.warn('[WARNING] Database is not configured.');
}
