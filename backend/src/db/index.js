import mysql from 'mysql2/promise';
import fs from 'fs';
import { config } from '../config/env.js';

// Resolve SSL CA certificate
let caCert = undefined;
if (config.dbSslCa) {
  if (config.dbSslCa.startsWith('-----BEGIN CERTIFICATE-----')) {
    caCert = config.dbSslCa;
  } else {
    try {
      caCert = fs.readFileSync(config.dbSslCa, 'utf-8');
    } catch (err) {
      console.error('[DB] Failed to read SSL CA certificate file:', err.message);
    }
  }
}

// Enforce strict verification when CA is present, fallback to encrypted connection without verification in prod/Aiven if no CA is set
const getSslConfig = (hostOrUri) => {
  if (caCert) {
    return {
      ca: caCert,
      rejectUnauthorized: true
    };
  }
  
  const isCloudHost = hostOrUri && (hostOrUri.includes('aivencloud.com') || hostOrUri.includes('render.com'));
  if (config.nodeEnv === 'production' || isCloudHost) {
    return {
      rejectUnauthorized: false
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
