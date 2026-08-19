import mysql from 'mysql2/promise';
import fs from 'fs';
import { config } from '../config/env.js';

// Resolve SSL CA certificate
let caCert = undefined;
if (config.dbSslCa) {
  const processedCa = config.dbSslCa.replace(/\\n/g, '\n');
  if (processedCa.startsWith('-----BEGIN CERTIFICATE-----')) {
    caCert = processedCa;
  } else {
    try {
      caCert = fs.readFileSync(config.dbSslCa, 'utf-8');
    } catch (err) {
      console.error('[DB] Failed to read SSL CA certificate file:', err.message);
    }
  }
}

// Enforce strict verification in production mode, fallback to no-SSL only in development if no CA is set
const getSslConfig = (hostOrUri) => {
  if (config.nodeEnv === 'production') {
    if (!caCert) {
      throw new Error('[DB CONFIG ERROR] DB_SSL_CA environment variable is required in production mode for strict certificate verification.');
    }
    return {
      ca: caCert,
      rejectUnauthorized: true
    };
  }

  if (caCert) {
    return {
      ca: caCert,
      rejectUnauthorized: true
    };
  }
  
  return undefined;
};

// Setup MySQL Connection Pool Configuration
const poolConfig = config.databaseUrl
  ? {
      uri: config.databaseUrl,
      multipleStatements: true, // Enabled for running schema init scripts
      ssl: getSslConfig(config.databaseUrl)
    }
  : {
      host: config.dbHost,
      port: config.dbPort,
      user: config.dbUser,
      password: config.dbPassword,
      database: config.dbName,
      multipleStatements: true, // Enabled for running schema init scripts
      ssl: getSslConfig(config.dbHost)
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
