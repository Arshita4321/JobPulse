import test from 'node:test';
import assert from 'node:assert';
import { validationService } from '../src/services/validationService.js';
import { retryService } from '../src/services/retryService.js';
import { publicRssAdapter } from '../src/adapters/publicRssAdapter.js';

test('Validation Service - validates correct jobs', () => {
  const validJob = {
    title: 'Senior Software Engineer',
    company: 'Acme Corp',
    url: 'https://example.com/job/1',
    externalId: 'ext-1',
    source: 'weworkremotely'
  };
  
  const result = validationService.validate(validJob);
  assert.strictEqual(result.isValid, true);
});

test('Validation Service - rejects missing required fields', () => {
  const invalidJob = {
    title: '', // Empty title
    company: 'Acme Corp',
    url: 'https://example.com/job/1',
    externalId: 'ext-1',
    source: 'weworkremotely'
  };
  
  const result = validationService.validate(invalidJob);
  assert.strictEqual(result.isValid, false);
  assert.match(result.reason, /Missing required field: title/);
});

test('Validation Service - rejects invalid URL structures', () => {
  const invalidJob = {
    title: 'Engineer',
    company: 'Acme Corp',
    url: 'not-a-valid-url',
    externalId: 'ext-1',
    source: 'weworkremotely'
  };
  
  const result = validationService.validate(invalidJob);
  assert.strictEqual(result.isValid, false);
  assert.match(result.reason, /Invalid URL format/);
});

test('Retry Service - distinguishes retryable and non-retryable status codes', () => {
  // Retryable codes
  assert.strictEqual(retryService.isRetryable(429), true);
  assert.strictEqual(retryService.isRetryable(500), true);
  assert.strictEqual(retryService.isRetryable(503), true);
  
  // Non-retryable codes
  assert.strictEqual(retryService.isRetryable(400), false);
  assert.strictEqual(retryService.isRetryable(401), false);
  assert.strictEqual(retryService.isRetryable(403), false);
  assert.strictEqual(retryService.isRetryable(404), false);
});

test('Retry Service - detects network connection errors as retryable', () => {
  const networkError = new Error('getaddrinfo ENOTFOUND');
  networkError.code = 'ENOTFOUND';
  
  const timeoutError = new Error('Connection timed out');
  timeoutError.code = 'ETIMEDOUT';
  
  assert.strictEqual(retryService.isRetryable(networkError), true);
  assert.strictEqual(retryService.isRetryable(timeoutError), true);
  
  // Custom non-retryable error
  const customError = new Error('Syntax error in code');
  assert.strictEqual(retryService.isRetryable(customError), false);
});

test('RSS Adapter Parsing - correctly splits Title from Company Name', async () => {
  // Mock response object
  const mockResponse = {
    text: async () => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <link>http://localhost</link>
    <item>
      <title>Stripe: Senior Node Developer</title>
      <link>https://stripe.com/jobs/1</link>
      <pubDate>Mon, 17 Aug 2026 19:21:19 +0000</pubDate>
      <region>Remote</region>
      <description>Work with Node.js APIs</description>
    </item>
  </channel>
</rss>`
  };

  const parsedJobs = await publicRssAdapter.parseJobs(mockResponse);
  assert.strictEqual(parsedJobs.length, 1);
  assert.strictEqual(parsedJobs[0].company, 'Stripe');
  assert.strictEqual(parsedJobs[0].title, 'Senior Node Developer');
  assert.strictEqual(parsedJobs[0].location, 'Remote');
});

test('RSS Adapter Parsing - handles parse failures with malformed XML structure', async () => {
  const malformedResponse = {
    text: async () => `This is not XML content at all.`
  };

  await assert.rejects(
    async () => {
      await publicRssAdapter.parseJobs(malformedResponse);
    },
    /Invalid XML response structure/
  );
});
