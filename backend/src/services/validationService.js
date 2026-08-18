export const validationService = {
  /**
   * Validate a normalized job object
   */
  validate(job) {
    if (!job) {
      return { isValid: false, reason: 'Job object is null or undefined' };
    }

    const requiredFields = ['title', 'company', 'url', 'externalId', 'source'];

    for (const field of requiredFields) {
      if (!job[field] || (typeof job[field] === 'string' && job[field].trim() === '')) {
        return { isValid: false, reason: `Missing required field: ${field}` };
      }
    }

    // Basic URL validation
    try {
      new URL(job.url);
    } catch (err) {
      return { isValid: false, reason: `Invalid URL format: ${job.url}` };
    }

    return { isValid: true };
  }
};
