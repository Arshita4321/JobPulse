import { db } from '../db/index.js';

export const jobRepository = {
  /**
   * Find a single job by its ID
   */
  async findById(id) {
    const query = 'SELECT * FROM jobs WHERE id = ?';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  },

  /**
   * Find a single job by source and external ID
   */
  async findByExternalId(source, externalId) {
    const query = 'SELECT * FROM jobs WHERE source = ? AND external_id = ?';
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      
      const insertedId = result.rows.insertId;
      const insertedJob = await this.findById(insertedId);
      return { status: 'inserted', job: insertedJob };
    }

    // If it exists, check if content hash matches
    if (existing.content_hash === contentHash) {
      // Unchanged duplicate - update last_seen_at
      const updateQuery = `
        UPDATE jobs
        SET last_seen_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      await db.query(updateQuery, [existing.id]);
      const updatedJob = await this.findById(existing.id);
      return { status: 'duplicate', job: updatedJob };
    } else {
      // Content changed - update job content and last_seen_at
      const updateQuery = `
        UPDATE jobs
        SET title = ?,
            company = ?,
            location = ?,
            description = ?,
            url = ?,
            published_at = ?,
            content_hash = ?,
            last_seen_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      await db.query(updateQuery, [
        title,
        company,
        location,
        description,
        url,
        publishedAt,
        contentHash,
        existing.id
      ]);
      const updatedJob = await this.findById(existing.id);
      return { status: 'updated', job: updatedJob };
    }
  },

  /**
   * Find jobs with pagination, filters, and text search
   */
  async findAll({ source, company, location, search, limit = 20, offset = 0 } = {}) {
    const conditions = [];
    const params = [];

    if (source) {
      conditions.push('source = ?');
      params.push(source);
    }
    if (company) {
      conditions.push('company LIKE ?');
      params.push(`%${company}%`);
    }
    if (location) {
      conditions.push('location LIKE ?');
      params.push(`%${location}%`);
    }
    if (search) {
      conditions.push('(title LIKE ? OR description LIKE ?)');
      params.push(`%${search}%`);
      params.push(`%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get paginated jobs
    // To match PG's DESC NULLS LAST, we sort by `published_at IS NULL` ascending first.
    const dataQuery = `
      SELECT * FROM jobs
      ${whereClause}
      ORDER BY published_at IS NULL, published_at DESC, id DESC
      LIMIT ? OFFSET ?
    `;
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count FROM jobs
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
