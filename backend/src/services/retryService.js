import { config } from '../config/env.js';

export const retryService = {
  /**
   * Check if a status code or error is retryable
   */
  isRetryable(statusOrError) {
    if (statusOrError instanceof Error) {
      const name = statusOrError.name;
      const code = statusOrError.code;
      // Network timeouts, abort errors, or DNS errors are retryable
      return name === 'AbortError' || name === 'TimeoutError' || code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ENOTFOUND';
    }

    const status = parseInt(statusOrError, 10);
    // 429 Too Many Requests and 5xx Server Errors are retryable
    return status === 429 || (status >= 500 && status <= 599);
  },

  /**
   * Execute fetch task with retries, exponential backoff, jitter, and Retry-After parsing
   */
  async executeWithRetry(fetchFn, source, onRetryAttempt = () => {}) {
    let attempt = 0;
    const maxRetries = config.maxRetries;

    while (true) {
      try {
        const response = await fetchFn();

        if (response.ok) {
          return response;
        }

        // Handle non-OK responses
        const status = response.status;
        console.warn(`[RETRY SERVICE] Source=${source} returned status=${status}`);

        if (!this.isRetryable(status)) {
          console.warn(`[RETRY SERVICE] Error status=${status} is not retryable. Skipping retries.`);
          return response; // Return response as is (caller will handle it)
        }

        if (attempt >= maxRetries) {
          console.error(`[RETRY SERVICE] Max retries (${maxRetries}) reached for source=${source}.`);
          return response;
        }

        // Determine delay
        let delayMs = 0;
        if (status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          if (retryAfter) {
            const parsedSeconds = parseInt(retryAfter, 10);
            if (!isNaN(parsedSeconds)) {
              delayMs = parsedSeconds * 1000;
              console.log(`[RETRY SERVICE] Respecting Retry-After header. Waiting ${delayMs}ms...`);
            }
          }
        }

        if (delayMs === 0) {
          // Calculate exponential backoff: base * 2^attempt
          const backoff = config.backoffBaseMs * Math.pow(2, attempt);
          // Add small jitter (between 0 and 200ms)
          const jitter = Math.random() * 200;
          delayMs = backoff + jitter;
        }

        attempt++;
        onRetryAttempt(attempt);

        console.log(`[RETRY SERVICE] Attempt ${attempt}/${maxRetries} failed. Retrying in ${Math.round(delayMs)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));

      } catch (error) {
        console.error(`[RETRY SERVICE] Fetch exception: ${error.message}`);

        if (!this.isRetryable(error)) {
          console.warn(`[RETRY SERVICE] Exception is not retryable. Skipping retries.`);
          throw error;
        }

        if (attempt >= maxRetries) {
          console.error(`[RETRY SERVICE] Max retries (${maxRetries}) reached for source=${source}.`);
          throw error;
        }

        // Exponential backoff
        const backoff = config.backoffBaseMs * Math.pow(2, attempt);
        const jitter = Math.random() * 200;
        const delayMs = backoff + jitter;

        attempt++;
        onRetryAttempt(attempt);

        console.log(`[RETRY SERVICE] Attempt ${attempt}/${maxRetries} failed with error. Retrying in ${Math.round(delayMs)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
};
