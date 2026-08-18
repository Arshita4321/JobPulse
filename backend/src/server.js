import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { initializeDatabase } from './db/init.js';
import { apiRouter } from './routes/apiRouter.js';
import { sandboxRouter } from './routes/sandboxRouter.js';
import { startScheduler } from './scheduler/ingestionScheduler.js';

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
app.use(sandboxRouter); // Mounts /source under sandbox
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

// Bootstrap application
const startServer = async () => {
  try {
    // Ensure DB is initialized
    await initializeDatabase();
    
    // Start background ingestion cron
    startScheduler();

    app.listen(config.port, () => {
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

startServer();
