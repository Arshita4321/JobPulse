import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const initializeDatabase = async () => {
  try {
    console.log('[DB] Initializing database schema...');
    const sqlPath = path.join(__dirname, 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await db.query(sql);
    console.log('[DB] Database schema initialized successfully.');
  } catch (error) {
    console.error('[DB] Error initializing database schema:', error);
    throw error;
  }
};

// If run directly, execute the initialization
if (process.argv[1] === __filename) {
  initializeDatabase()
    .then(() => {
      console.log('[DB] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[DB] Failed:', err);
      process.exit(1);
    });
}
