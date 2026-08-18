import test from 'node:test';
import assert from 'node:assert';
import { db } from '../src/db/index.js';
import { jobRepository } from '../src/repositories/jobRepository.js';
import { ingestionRepository } from '../src/repositories/ingestionRepository.js';
import { sourceHealthRepository } from '../src/repositories/sourceHealthRepository.js';

test('Database Repository Tests', async (t) => {
  // Gracefully skip tests if local MySQL is offline/unreachable
  try {
    await db.query('SELECT 1');
  } catch (err) {
    console.warn('\n[TEST] Skipping database tests because MySQL is not running or accessible.\n');
    return;
  }

  // Clean up table states for testing isolation
  await db.query('DELETE FROM jobs');
  await db.query('DELETE FROM ingestion_runs');
  await db.query('DELETE FROM source_health');

  await t.test('Job Repository - inserts, updates and prevents duplicates', async () => {
    const job = {
      source: 'test-source',
      externalId: 'job-1',
      title: 'Software Engineer',
      company: 'TechCorp',
      location: 'Remote',
      description: 'Cool job',
      url: 'https://example.com/job1',
      publishedAt: new Date(),
      contentHash: 'hash-1'
    };

    // Verify insertion works
    const insertResult = await jobRepository.upsert(job);
    assert.strictEqual(insertResult.status, 'inserted');
    assert.ok(insertResult.job.id);
    assert.strictEqual(insertResult.job.title, 'Software Engineer');

    // Verify duplicate handling (same hash results in 'duplicate')
    const duplicateResult = await jobRepository.upsert(job);
    assert.strictEqual(duplicateResult.status, 'duplicate');

    // Verify content modification update (different hash results in 'updated')
    const updatedJob = { ...job, contentHash: 'hash-2', title: 'Senior Software Engineer' };
    const updateResult = await jobRepository.upsert(updatedJob);
    assert.strictEqual(updateResult.status, 'updated');
    assert.strictEqual(updateResult.job.title, 'Senior Software Engineer');
  });

  await t.test('Ingestion Repository - logs runs', async () => {
    const run = await ingestionRepository.createRun({ source: 'test-source' });
    assert.ok(run.id);
    assert.strictEqual(run.source, 'test-source');
    assert.strictEqual(run.status, 'RUNNING');

    const updated = await ingestionRepository.updateRun(run.id, {
      status: 'COMPLETED',
      fetched_count: 10,
      inserted_count: 5,
      duplicate_count: 5
    });
    assert.strictEqual(updated.status, 'COMPLETED');
    assert.strictEqual(updated.fetched_count, 10);
  });

  await t.test('Source Health Repository - updates source health metrics', async () => {
    const health = await sourceHealthRepository.update('test-source', {
      status: 'DEGRADED',
      consecutive_failures: 2
    });
    assert.strictEqual(health.source, 'test-source');
    assert.strictEqual(health.status, 'DEGRADED');
    assert.strictEqual(health.consecutive_failures, 2);

    const retrieved = await sourceHealthRepository.findBySource('test-source');
    assert.strictEqual(retrieved.status, 'DEGRADED');
  });

  // Tear down pool connections
  await db.pool.end();
});
