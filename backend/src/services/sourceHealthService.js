import { sourceHealthRepository } from '../repositories/sourceHealthRepository.js';

export const sourceHealthService = {
  /**
   * Initializes source health record in database if not present
   */
  async ensureSourceRegistered(source) {
    const health = await sourceHealthRepository.findBySource(source);
    if (!health) {
      console.log(`[SOURCE HEALTH] Initializing health record for source=${source}...`);
      await sourceHealthRepository.update(source, {
        status: 'HEALTHY',
        consecutive_failures: 0
      });
    }
  },

  /**
   * Directly get health details of a source
   */
  async getHealth(source) {
    return sourceHealthRepository.findBySource(source);
  },

  /**
   * Get health of all sources
   */
  async getAllHealth() {
    return sourceHealthRepository.findAll();
  }
};
