import { config } from '../config/env.js';
import { sourceHealthRepository } from '../repositories/sourceHealthRepository.js';

export const circuitBreaker = {
  /**
   * Determine whether a request is allowed to proceed.
   * If circuit is OPEN and cooldown has expired, transitions to HALF_OPEN.
   */
  async checkAllowed(source) {
    const health = await sourceHealthRepository.findBySource(source);
    if (!health) {
      // First time running, default is allowed
      return true;
    }

    if (health.status === 'CLOSED') {
      return true;
    }

    if (health.status === 'OPEN') {
      const now = new Date();
      const nextAttemptAt = new Date(health.circuit_next_attempt_at);

      if (now >= nextAttemptAt) {
        console.log(`[CIRCUIT BREAKER] Cooldown expired for source=${source}. Transitioning to HALF_OPEN.`);
        await sourceHealthRepository.update(source, {
          status: 'HALF_OPEN'
        });
        return true;
      }

      console.warn(`[CIRCUIT BREAKER] Circuit is OPEN for source=${source}. Requests blocked until ${nextAttemptAt.toISOString()}`);
      return false;
    }

    if (health.status === 'HALF_OPEN') {
      return true;
    }

    return true;
  },

  /**
   * Records a request failure. If threshold met, opens the circuit.
   */
  async recordFailure(source, errorMsg, responseStatus) {
    const health = await sourceHealthRepository.findBySource(source);
    const consecutiveFailures = (health?.consecutive_failures || 0) + 1;
    const threshold = config.circuitFailureThreshold;

    const updateData = {
      consecutive_failures: consecutiveFailures,
      last_failure_at: new Date(),
      last_error: errorMsg || 'Unknown Ingestion Error',
      last_response_status: responseStatus || null
    };

    if (consecutiveFailures >= threshold || health?.status === 'HALF_OPEN') {
      const cooldownMs = config.circuitCooldownMs;
      const openedAt = new Date();
      const nextAttemptAt = new Date(openedAt.getTime() + cooldownMs);

      console.error(`[CIRCUIT BREAKER] Threshold reached (${consecutiveFailures}/${threshold}). Opening circuit for source=${source}. Cooldown until ${nextAttemptAt.toISOString()}`);
      
      updateData.status = 'OPEN';
      updateData.circuit_opened_at = openedAt;
      updateData.circuit_next_attempt_at = nextAttemptAt;
    } else {
      // Degraded status if failing but not open
      updateData.status = 'DEGRADED';
    }

    await sourceHealthRepository.update(source, updateData);
  },

  /**
   * Records a request success, closing the circuit.
   */
  async recordSuccess(source, responseTimeMs, responseStatus) {
    console.log(`[CIRCUIT BREAKER] Success recorded for source=${source}. Closing circuit.`);
    
    await sourceHealthRepository.update(source, {
      status: 'CLOSED',
      consecutive_failures: 0,
      last_success_at: new Date(),
      last_response_status: responseStatus || 200,
      last_response_time_ms: responseTimeMs,
      circuit_opened_at: null,
      circuit_next_attempt_at: null
    });
  }
};
