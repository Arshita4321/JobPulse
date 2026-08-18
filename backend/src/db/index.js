import pg from 'pg';
import { config } from '../config/env.js';

const { Pool } = pg;

// Create database connection pool
export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false
});

// Helper for running queries
export const db = {
  query: (text, params) => pool.query(text, params),
  pool
};
