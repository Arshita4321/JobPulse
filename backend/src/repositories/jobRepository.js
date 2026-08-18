import { db } from '../db/index.js';

export const jobRepository = {
  /**
   * Find a single job by its ID
   */
  async findById(id) {
    const query = 'SELECT * FROM jobs WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  },

  /**
   * Find a single job by source and external ID
   */
  async findByExternalId(source, externalId) {
    const query = 'SELECT * FROM jobs WHERE source = $1 AND external_id = $2';
    const result = await db.query(query, [source, externalId]);
    return result.rows[0] || null;
  },

  /**
   * Upsert a job listing.
   * Returns a status object indicating if the job was 'inserted' or 'duplicate' (and potentially 'updated').
   */
  async upsert(job) {
    const {
      source,
      externalId,
      title,
      company,
      location,
      description,
      url,
      publishedAt,
      contentHash
    } = job;

    // Check if job exists
    const existing = await this.findByExternalId(source, externalId);

    if (!existing) {
      // Insert new job
      const query = `
        INSERT INTO jobs (
          source, external_id, title, company, location, description, url, published_at, content_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const result = await db.query(query, [
        source,
        externalId,
        title,
        company,
        location,
        description,
        url,
        publishedAt,
        contentHash
      ]);
      return { status: 'inserted', job: result.rows[0] };
    }

    // If it exists, check if content hash matches
    if (existing.content_hash === contentHash) {
      // Unchanged duplicate - update last_seen_at
      const updateQuery = `
        UPDATE jobs
        SET last_seen_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      const result = await db.query(updateQuery, [existing.id]);
      return { status: 'duplicate', job: result.rows[0] };
    } else {
      // Content changed - update job content and last_seen_at
      const updateQuery = `
        UPDATE jobs
        SET title = $2,
            company = $3,
            location = $4,
            description = $5,
            url = $6,
            published_at = $7,
            content_hash = $8,
            last_seen_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      const result = await db.query(updateQuery, [
        existing.id,
        title,
        company,
        location,
        description,
        url,
        publishedAt,
        contentHash
      ]);
      return { status: 'updated', job: result.rows[0] };
    }
  },

  /**
   * Find jobs with pagination, filters, and full text search
   */
  async findAll({ source, company, location, search, limit = 20, offset = 0 } = {}) {
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (source) {
      conditions.push(`source = $${paramIndex++}`);
      params.push(source);
    }
    if (company) {
      conditions.push(`company ILIKE $${paramIndex++}`);
      params.push(`%${company}%`);
    }
    if (location) {
      conditions.push(`location ILIKE $${paramIndex++}`);
      params.push(`%${location}%`);
    }
    if (search) {
      conditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get paginated jobs
    const dataQuery = `
      SELECT * FROM jobs
      ${whereClause}
      ORDER BY published_at DESC NULLS LAST, id DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) FROM jobs
      ${whereClause}
    `;

    const dataParams = [...params, limit, offset];
    
    const [dataResult, countResult] = await Promise.all([
      db.query(dataQuery, dataParams),
      db.query(countQuery, params)
    ]);

    return {
      jobs: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
      limit,
      offset
    };
  }
};
