import express from 'express';
import { db } from '../db/index.js';
import { jobRepository } from '../repositories/jobRepository.js';
import { ingestionRepository } from '../repositories/ingestionRepository.js';
import { sourceHealthRepository } from '../repositories/sourceHealthRepository.js';
import { ingestionEngine } from '../services/ingestionEngine.js';
import { publicRssAdapter } from '../adapters/publicRssAdapter.js';
import { sandboxAdapter } from '../adapters/sandboxAdapter.js';

export const apiRouter = express.Router();

// Overlap guard
let isIngestingInProgress = false;

/**
 * Health endpoint checking MySQL connection
 */
apiRouter.get('/health', async (req, res) => {
  try {
    // Simple query to verify db connectivity
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    console.error('[HEALTH] Database healthcheck failed:', err.message);
    res.status(500).json({ status: 'error', database: 'disconnected', message: err.message });
  }
});

/**
 * GET /api/jobs
 */
apiRouter.get('/api/jobs', async (req, res, next) => {
  try {
    const { source, company, location, search, limit, offset } = req.query;
    
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    const result = await jobRepository.findAll({
      source,
      company,
      location,
      search,
      limit: parsedLimit,
      offset: parsedOffset
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/jobs/:id
 */
apiRouter.get('/api/jobs/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsedId = parseInt(id, 10);
    
    if (isNaN(parsedId)) {
      return res.status(400).json({ error: 'Invalid Job ID format' });
    }

    const job = await jobRepository.findById(parsedId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/sources
 */
apiRouter.get('/api/sources', async (req, res, next) => {
  try {
    const sources = await sourceHealthRepository.findAll();
    res.json(sources);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/ingestion/runs
 */
apiRouter.get('/api/ingestion/runs', async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    const result = await ingestionRepository.findAll({
      limit: parsedLimit,
      offset: parsedOffset
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/ingestion/latest
 */
apiRouter.get('/api/ingestion/latest', async (req, res, next) => {
  try {
    const latest = await ingestionRepository.getLatestRun();
    res.json(latest || null);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/ingestion/run
 */
apiRouter.post('/api/ingestion/run', async (req, res, next) => {
  if (isIngestingInProgress) {
    return res.status(429).json({ error: 'Ingestion pipeline is already running. Please wait.' });
  }

  isIngestingInProgress = true;
  try {
    const targetSource = req.body.source || 'public-rss'; // public-rss or sandbox
    const scenario = req.body.scenario || 'normal'; // sandbox simulation scenario

    let result;
    if (targetSource === 'sandbox') {
      result = await ingestionEngine.run(sandboxAdapter, { scenario });
    } else {
      result = await ingestionEngine.run(publicRssAdapter);
    }

    res.json({
      message: 'Ingestion completed',
      result
    });
  } catch (err) {
    next(err);
  } finally {
    isIngestingInProgress = false;
  }
});
