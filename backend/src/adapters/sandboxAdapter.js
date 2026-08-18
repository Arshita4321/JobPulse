import xml2js from 'xml2js';
import crypto from 'crypto';
import { config } from '../config/env.js';

export const sandboxAdapter = {
  name: 'sandbox',

  /**
   * Fetch from local sandbox router
   */
  async fetchJobs(options = {}) {
    const scenario = options.scenario || 'normal';
    const timeout = options.timeoutMs || config.requestTimeoutMs;
    // Build URL pointing to the local Express app itself
    const url = `http://localhost:${config.port}/api/sandbox/source?scenario=${scenario}`;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'JobPulse/1.0.0 IngestionEngine Sandbox'
        }
      });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  },

  /**
   * Parse response from local sandbox router
   */
  async parseJobs(response) {
    const xmlText = await response.text();

    if (!xmlText || !xmlText.trim().startsWith('<')) {
      throw new Error('Invalid XML response structure');
    }

    const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
    let result;
    try {
      result = await parser.parseStringPromise(xmlText);
    } catch (err) {
      throw new Error(`XML parsing failed: ${err.message}`);
    }

    const channel = result?.rss?.channel;
    if (!channel) {
      throw new Error('Unexpected RSS format: rss or channel missing');
    }

    // Check for schema change simulation
    const isSchemaChanged = channel.schemaVersion === 'legacy-v1';

    const items = channel.item;
    if (!items) {
      return [];
    }

    const rawJobs = Array.isArray(items) ? items : [items];
    const normalizedJobs = [];

    for (const item of rawJobs) {
      let title, company, url, externalId;

      if (isSchemaChanged) {
        // Simulates modified properties (e.g. jobTitle instead of title)
        title = item.jobTitle;
        company = item.organization;
        url = item.jobUrl;
        externalId = item.guid;
      } else {
        title = item.title;
        company = item.company;
        url = item.link;
        externalId = item.guid || item.link;
      }

      // Calculate content hash
      const fieldsToHash = `${title || ''}|${company || ''}|${item.description || ''}|${url || ''}`;
      const contentHash = crypto.createHash('sha256').update(fieldsToHash).digest('hex');

      normalizedJobs.push({
        externalId,
        source: 'sandbox',
        title,
        company,
        location: item.location || 'Remote Sandbox',
        description: item.description || '',
        url,
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        contentHash
      });
    }

    return normalizedJobs;
  }
};
