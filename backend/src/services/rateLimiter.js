import { config } from '../config/env.js';

// Map storing last request times for each source
const lastRequestTimes = new Map();

export const rateLimiter = {
  /**
   * Enforces request delay/pacing for the source
   */
  async pace(source) {
    const lastTime = lastRequestTimes.get(source);
    if (!lastTime) {
      lastRequestTimes.set(source, Date.now());
      return;
    }

    const elapsed = Date.now() - lastTime;
    const requiredDelay = config.requestDelayMs;

    if (elapsed < requiredDelay) {
      const waitTime = requiredDelay - elapsed;
      console.log(`[RATE LIMITER] Pacing request for source=${source}. Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Update last request time to current time (which is post-wait if we waited)
    lastRequestTimes.set(source, Date.now());
  }
};
