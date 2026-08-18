import cron from 'node-cron';
import { config } from '../config/env.js';
import { publicRssAdapter } from '../adapters/publicRssAdapter.js';
import { ingestionEngine } from '../services/ingestionEngine.js';

let isCronRunning = false;

export const startScheduler = () => {
  const intervalMinutes = config.ingestionIntervalMinutes;
  
  // Format cron expression: run every N minutes
  // E.g., '*/5 * * * *'
  const cronExpression = `*/${intervalMinutes} * * * *`;
  
  console.log(`[SCHEDULER] Initializing ingestion cron scheduler: "${cronExpression}"`);

  cron.schedule(cronExpression, async () => {
    if (isCronRunning) {
      console.warn('[SCHEDULER] Previous scheduled ingestion run still active. Skipping overlap.');
      return;
    }

    isCronRunning = true;
    try {
      console.log('[SCHEDULER] Triggering scheduled ingestion...');
      await ingestionEngine.run(publicRssAdapter);
    } catch (err) {
      console.error('[SCHEDULER] Scheduled ingestion run encountered error:', err.message);
    } finally {
      isCronRunning = false;
    }
  });
};
