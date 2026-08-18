import xml2js from 'xml2js';
import crypto from 'crypto';
import { config } from '../config/env.js';

export const publicRssAdapter = {
  name: 'public-rss',

  /**
   * Fetch the RSS feed content
   */
  async fetchJobs(options = {}) {
    const url = options.url || config.primarySourceUrl;
    const timeout = options.timeoutMs || config.requestTimeoutMs;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'JobPulse/1.0.0 IngestionEngine'
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
   * Parse RSS XML response to normalized job objects
   */
  async parseJobs(response) {
    const xmlText = await response.text();
    
    // Check if XML text is empty or not XML
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

    // Verify channel and items exist (RSS 2.0 structure)
    if (!result?.rss?.channel) {
      throw new Error('Unexpected RSS format: rss or channel missing');
    }

    const items = result.rss.channel.item;
    if (!items) {
      return []; // Return empty array if no jobs found
    }

    const rawJobs = Array.isArray(items) ? items : [items];
    const normalizedJobs = [];

    for (const item of rawJobs) {
      // Extract title and company. WeWorkRemotely titles are typically: "Company Name: Job Title"
      let title = item.title || '';
      let company = 'Unknown Company';
      
      if (title.includes(':')) {
        const parts = title.split(':');
        company = parts[0].trim();
        title = parts.slice(1).join(':').trim();
      }

      const externalId = item.guid || item.link;
      
      // Calculate content hash for deduplication and update checks
      const fieldsToHash = `${title}|${company}|${item.description || ''}|${item.link || ''}`;
      const contentHash = crypto.createHash('sha256').update(fieldsToHash).digest('hex');

      normalizedJobs.push({
        externalId,
        source: config.primarySourceName,
        title,
        company,
        location: item.region || item.location || 'Remote',
        description: item.description || '',
        url: item.link || '',
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        contentHash
      });
    }

    return normalizedJobs;
  }
};
