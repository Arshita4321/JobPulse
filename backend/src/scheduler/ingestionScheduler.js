import cron from 'node-cron';
import { config } from '../config/env.js';
import { publicRssAdapter } from '../adapters/publicRssAdapter.js';
import { ingestionEngine } from '../services/ingestionEngine.js';

let isCronRunning = false;
let cronTask = null;

export const startScheduler = () => {
  const intervalMinutes = config.ingestionIntervalMinutes;
  const cronExpression = `*/${intervalMinutes} * * * *`;
  
  console.log(`[SCHEDULER] Initializing ingestion cron scheduler: "${cronExpression}"`);

  cronTask = cron.schedule(cronExpression, async () => {
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

export const stopScheduler = () => {
  if (cronTask) {
    console.log('[SCHEDULER] Stopping scheduled cron job...');
    cronTask.stop();
    cronTask = null;
  }
};
