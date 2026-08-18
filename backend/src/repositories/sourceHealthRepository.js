import { db } from '../db/index.js';

export const sourceHealthRepository = {
  /**
   * Find a source health entry
   */
  async findBySource(source) {
    const query = 'SELECT * FROM source_health WHERE source = ?';
    const result = await db.query(query, [source]);
    return result.rows[0] || null;
  },

  /**
   * Update or create a source health entry
   */
  async update(source, data = {}) {
    const existing = await this.findBySource(source);

    if (!existing) {
      // Insert with initial values
      const query = `
        INSERT INTO source_health (
          source, status, consecutive_failures, last_success_at, last_failure_at, 
          last_error, last_response_status, last_response_time_ms, 
          circuit_opened_at, circuit_next_attempt_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
        )
      `;
      await db.query(query, [
        source,
        data.status || 'HEALTHY',
        data.consecutive_failures || 0,
        data.last_success_at || null,
        data.last_failure_at || null,
        data.last_error || null,
        data.last_response_status || null,
        data.last_response_time_ms || null,
        data.circuit_opened_at || null,
        data.circuit_next_attempt_at || null
      ]);
      return this.findBySource(source);
    }

    // Prepare update parameters
    const fields = [];
    const params = [];

    const allowedFields = [
      'status',
      'consecutive_failures',
      'last_success_at',
      'last_failure_at',
      'last_error',
      'last_response_status',
      'last_response_time_ms',
      'circuit_opened_at',
      'circuit_next_attempt_at'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(data[field]);
      }
    }

    if (fields.length === 0) return existing;

    params.push(source);

    const query = `
      UPDATE source_health
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE source = ?
    `;

    await db.query(query, params);
    return this.findBySource(source);
  },

  /**
   * Find all sources health details
   */
  async findAll() {
    const query = 'SELECT * FROM source_health ORDER BY source ASC';
    const result = await db.query(query);
    return result.rows;
  }
};
