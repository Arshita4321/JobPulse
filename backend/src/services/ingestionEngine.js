import { config } from '../config/env.js';
import { rateLimiter } from './rateLimiter.js';
import { retryService } from './retryService.js';
import { circuitBreaker } from './circuitBreaker.js';
import { validationService } from './validationService.js';
import { sourceHealthService } from './sourceHealthService.js';
import { jobRepository } from '../repositories/jobRepository.js';
import { ingestionRepository } from '../repositories/ingestionRepository.js';

export const ingestionEngine = {
  /**
   * Run the ingestion pipeline for a specific adapter (e.g. publicRssAdapter or sandboxAdapter)
   */
  async run(adapter, options = {}) {
    const source = adapter.name;
    const startTime = new Date();
    
    console.log(`[INGESTION] Starting run for source=${source}...`);
    
    // 1. Register source health if it doesn't exist
    await sourceHealthService.ensureSourceRegistered(source);

    // 2. Create Ingestion Run record
    const runRecord = await ingestionRepository.createRun({ source, startedAt: startTime });
    const runId = runRecord.id;

    // Statistics trackers
    let fetchedCount = 0;
    let insertedCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;
    let retryCount = 0;
    let responseStatus = null;

    try {
      // 3. Check Circuit Breaker status
      const isAllowed = await circuitBreaker.checkAllowed(source);
      if (!isAllowed) {
        throw new Error('Circuit breaker is OPEN. Requests temporarily blocked.');
      }

      // 4. Rate Limiting pacing
      await rateLimiter.pace(source);

      // 5. Fetch resource with retries
      const startFetchTime = Date.now();
      
      const fetchFn = () => adapter.fetchJobs(options);
      
      const response = await retryService.executeWithRetry(
        fetchFn, 
        source,
        () => { retryCount++; }
      );

      responseStatus = response.status;
      const durationMs = Date.now() - startFetchTime;

      if (!response.ok) {
        const errorMsg = `Fetch failed with status: ${responseStatus}`;
        await circuitBreaker.recordFailure(source, errorMsg, responseStatus);
        throw new Error(errorMsg);
      }

      // Record successful fetch
      await circuitBreaker.recordSuccess(source, durationMs, responseStatus);

      // 6. Parse jobs
      let jobs = [];
      try {
        jobs = await adapter.parseJobs(response);
      } catch (parseError) {
        const errorMsg = `Parsing failed: ${parseError.message}`;
        await circuitBreaker.recordFailure(source, errorMsg, responseStatus);
        throw new Error(errorMsg);
      }

      fetchedCount = jobs.length;
      console.log(`[INGESTION] Fetched ${fetchedCount} jobs from source=${source}`);

      // 7. Validate and Persist
      for (const rawJob of jobs) {
        // Validation
        const valResult = validationService.validate(rawJob);
        if (!valResult.isValid) {
          console.warn(`[VALIDATE] Rejecting job externalId=${rawJob.externalId || 'unknown'} - Reason: ${valResult.reason}`);
          failedCount++;
          continue;
        }

        // Deduplication & Upsert
        try {
          const result = await jobRepository.upsert(rawJob);
          if (result.status === 'inserted') {
            insertedCount++;
          } else if (result.status === 'duplicate') {
            duplicateCount++;
          } else if (result.status === 'updated') {
            insertedCount++; // Count as updated/inserted listing
          }
        } catch (dbErr) {
          console.error(`[DB] Error upserting job: ${dbErr.message}`);
          failedCount++;
        }
      }

      const completedTime = new Date();
      const runDurationMs = completedTime.getTime() - startTime.getTime();

      // Update Run Record on success
      await ingestionRepository.updateRun(runId, {
        completed_at: completedTime,
        status: 'COMPLETED',
        fetched_count: fetchedCount,
        inserted_count: insertedCount,
        duplicate_count: duplicateCount,
        failed_count: failedCount,
        retry_count: retryCount,
        response_status: responseStatus,
        duration_ms: runDurationMs
      });

      console.log(`[INGESTION] Completed successfully for source=${source}. New=${insertedCount}, Duplicates=${duplicateCount}, Failed=${failedCount}`);

      return {
        success: true,
        fetchedCount,
        insertedCount,
        duplicateCount,
        failedCount,
        retryCount
      };

    } catch (error) {
      console.error(`[INGESTION] Run failed for source=${source}. Error: ${error.message}`);
      
      const completedTime = new Date();
      const runDurationMs = completedTime.getTime() - startTime.getTime();

      // Update Run Record on failure
      await ingestionRepository.updateRun(runId, {
        completed_at: completedTime,
        status: 'FAILED',
        fetched_count: fetchedCount,
        inserted_count: insertedCount,
        duplicate_count: duplicateCount,
        failed_count: failedCount,
        retry_count: retryCount,
        response_status: responseStatus,
        duration_ms: runDurationMs,
        error_message: error.message
      });

      return {
        success: false,
        error: error.message,
        retryCount
      };
    }
  }
};
