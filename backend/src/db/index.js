import mysql from 'mysql2/promise';
import { config } from '../config/env.js';

// Setup MySQL Connection Pool Configuration
const poolConfig = config.databaseUrl
  ? {
      uri: config.databaseUrl,
      multipleStatements: true, // Enabled for running schema init scripts
      ssl: config.nodeEnv === 'production' || config.databaseUrl.includes('aivencloud.com')
        ? { rejectUnauthorized: false }
        : undefined
    }
  : {
      host: config.dbHost,
      port: config.dbPort,
      user: config.dbUser,
      password: config.dbPassword,
      database: config.dbName,
      multipleStatements: true, // Enabled for running schema init scripts
      ssl: config.nodeEnv === 'production' || (config.dbHost && config.dbHost.includes('aivencloud.com'))
        ? { rejectUnauthorized: false }
        : undefined
    };

console.log(`[DB] Creating MySQL connection pool to host: ${config.dbHost || 'URI'}`);

export const pool = mysql.createPool(poolConfig);

// Helper for running queries, adapting mysql2 array response to standard rows object
export const db = {
  query: async (text, params) => {
    const [rows, fields] = await pool.query(text, params);
    return { rows, fields };
  },
  pool
};
