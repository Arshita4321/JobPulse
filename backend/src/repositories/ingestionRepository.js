import { db } from '../db/index.js';

export const ingestionRepository = {
  /**
   * Create a new ingestion run log entry
   */
  async createRun({ source, startedAt = new Date() } = {}) {
    const query = `
      INSERT INTO ingestion_runs (
        source, started_at, status, fetched_count, inserted_count, duplicate_count, failed_count, retry_count
      ) VALUES ($1, $2, 'RUNNING', 0, 0, 0, 0, 0)
      RETURNING *
    `;
    const result = await db.query(query, [source, startedAt]);
    return result.rows[0];
  },

  /**
   * Update an ingestion run log entry with final stats and status
   */
  async updateRun(id, data = {}) {
    const fields = [];
    const params = [id];
    let paramIndex = 2;

    const allowedFields = [
      'completed_at',
      'status',
      'fetched_count',
      'inserted_count',
      'duplicate_count',
      'failed_count',
      'retry_count',
      'response_status',
      'duration_ms',
      'error_message'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = $${paramIndex++}`);
        params.push(data[field]);
      }
    }

    if (fields.length === 0) return null;

    const query = `
      UPDATE ingestion_runs
      SET ${fields.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, params);
    return result.rows[0] || null;
  },

  /**
   * Get latest run for a specific source
   */
  async getLatest(source) {
    const query = `
      SELECT * FROM ingestion_runs
      WHERE source = $1
      ORDER BY started_at DESC
      LIMIT 1
    `;
    const result = await db.query(query, [source]);
    return result.rows[0] || null;
  },

  /**
   * Get the single absolute latest run
   */
  async getLatestRun() {
    const query = `
      SELECT * FROM ingestion_runs
      ORDER BY started_at DESC
      LIMIT 1
    `;
    const result = await db.query(query);
    return result.rows[0] || null;
  },

  /**
   * Find ingestion runs with pagination
   */
  async findAll({ limit = 20, offset = 0 } = {}) {
    const query = `
      SELECT * FROM ingestion_runs
      ORDER BY started_at DESC
      LIMIT $1 OFFSET $2
    `;
    const countQuery = 'SELECT COUNT(*) FROM ingestion_runs';

    const [dataResult, countResult] = await Promise.all([
      db.query(query, [limit, offset]),
      db.query(countQuery)
    ]);

    return {
      runs: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
      limit,
      offset
    };
  }
};
