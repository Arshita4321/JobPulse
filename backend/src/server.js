import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { initializeDatabase } from './db/init.js';
import { apiRouter } from './routes/apiRouter.js';
import { sandboxRouter } from './routes/sandboxRouter.js';
import { startScheduler, stopScheduler } from './scheduler/ingestionScheduler.js';
import { pool } from './db/index.js';

const app = express();

// Middleware
app.use(express.json());

// CORS configuration - Allow requests from configured frontend URL
app.use(cors({
  origin: config.frontendUrl,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Route mounting
app.use('/api/sandbox', sandboxRouter); // Mounts /source under sandbox
app.use(apiRouter); // Mounts /health, /api/jobs, /api/sources, /api/ingestion/runs, etc.

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  
  const status = err.status || 500;
  const message = config.nodeEnv === 'production' 
    ? 'An internal server error occurred.' 
    : err.message;
    
  res.status(status).json({
    error: message,
    ...(config.nodeEnv !== 'production' && { stack: err.stack })
  });
});

let serverInstance = null;

// Bootstrap application
const startServer = async () => {
  try {
    // Ensure DB is initialized
    await initializeDatabase();
    
    // Start background ingestion cron
    startScheduler();

    serverInstance = app.listen(config.port, () => {
      console.log(`==================================================`);
      console.log(`  JobPulse Server Listening on Port: ${config.port}`);
      console.log(`  Environment: ${config.nodeEnv}`);
      console.log(`  Frontend URL Allowed: ${config.frontendUrl}`);
      console.log(`==================================================`);
    });
  } catch (err) {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  }
};

// Graceful Shutdown Handler
const handleGracefulShutdown = async (signal) => {
  console.log(`\n[SHUTDOWN] ${signal} signal received. Starting graceful shutdown...`);
  
  // 1. Stop accepting new cron ticks
  stopScheduler();
  
  // 2. Close HTTP server connections
  if (serverInstance) {
    console.log('[SHUTDOWN] Closing HTTP server...');
    await new Promise((resolve) => serverInstance.close(resolve));
    console.log('[SHUTDOWN] HTTP server closed.');
  }
  
  // 3. End connection pool to database
  try {
    console.log('[SHUTDOWN] Closing database pool connection...');
    await pool.end();
    console.log('[SHUTDOWN] Database pool connections ended.');
  } catch (err) {
    console.error('[SHUTDOWN] Error closing database pool:', err.message);
  }
  
  console.log('[SHUTDOWN] Graceful shutdown complete. Safe exit.');
  process.exit(0);
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

startServer();
