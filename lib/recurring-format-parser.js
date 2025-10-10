/**
 * Recurring Format Parser
 *
 * Handles backward-compatible parsing of recurrence rules stored in different formats.
 * Supports:
 * - Legacy plain RRule strings: "DTSTART:20251008T100000Z\nFREQ=WEEKLY;COUNT=4"
 * - New JSON format: {"rrule": "...", "duration": "PT45M", "timezone": "America/Los_Angeles"}
 *
 * @module lib/recurring-format-parser
 */

const { DateTime } = require('luxon');

/**
 * Parse recurrence rule from database storage format
 *
 * @param {string} ruleText - Raw recurrence_rule value from database
 * @param {Object} options - Parsing options
 * @param {string} options.defaultTimezone - Fallback timezone for legacy format
 * @param {number} options.defaultDuration - Fallback duration in minutes for legacy format
 * @returns {Object} Parsed recurrence data
 */
function parseRecurrenceRule(ruleText, options = {}) {
  const {
    defaultTimezone = 'America/Los_Angeles',
    defaultDuration = 60
  } = options;

  // Handle null/undefined
  if (!ruleText) {
    return {
      success: false,
      error: 'Recurrence rule is null or undefined',
      format: 'invalid'
    };
  }

  // Attempt 1: Parse as JSON (new format)
  try {
    const parsed = JSON.parse(ruleText);

    // Validate required fields
    if (!parsed.rrule) {
      return {
        success: false,
        error: 'JSON format missing required "rrule" field',
        format: 'json',
        raw: ruleText
      };
    }

    // Normalize the data structure
    return {
      success: true,
      format: 'json',
      data: {
        rrule: parsed.rrule,
        duration: parsed.duration || `PT${defaultDuration}M`,
        timezone: parsed.timezone || defaultTimezone
      },
      raw: ruleText
    };
  } catch (jsonError) {
    // Not JSON format, continue to legacy parser
  }

  // Attempt 2: Treat as plain RRule string (legacy format)
  try {
    // Validate it looks like an RRule
    if (!ruleText.includes('FREQ=')) {
      return {
        success: false,
        error: 'Does not appear to be a valid RRule (missing FREQ parameter)',
        format: 'invalid',
        raw: ruleText
      };
    }

    // Extract timezone from DTSTART if present (e.g., TZID=America/New_York)
    let extractedTimezone = defaultTimezone;
    const tzidMatch = ruleText.match(/TZID=([^:\s]+)/);
    if (tzidMatch) {
      extractedTimezone = tzidMatch[1];
    }

    // Legacy format detected - convert to standardized JSON structure
    return {
      success: true,
      format: 'legacy',
      data: {
        rrule: ruleText.trim(),
        duration: `PT${defaultDuration}M`,
        timezone: extractedTimezone
      },
      raw: ruleText,
      migrationNeeded: true
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse as legacy RRule: ${error.message}`,
      format: 'invalid',
      raw: ruleText
    };
  }
}

/**
 * Convert parsed recurrence data back to standardized JSON storage format
 *
 * @param {Object} parsedData - Output from parseRecurrenceRule
 * @returns {string} JSON string for database storage
 */
function toStorageFormat(parsedData) {
  if (!parsedData.success) {
    throw new Error(`Cannot convert invalid recurrence data to storage format: ${parsedData.error}`);
  }

  return JSON.stringify({
    rrule: parsedData.data.rrule,
    duration: parsedData.data.duration,
    timezone: parsedData.data.timezone
  });
}

/**
 * Validate recurrence rule data structure
 *
 * @param {Object} data - Recurrence data object
 * @returns {Object} Validation result
 */
function validateRecurrenceData(data) {
  const errors = [];
  const warnings = [];

  // Required field validation
  if (!data.rrule || typeof data.rrule !== 'string') {
    errors.push('Missing or invalid "rrule" field (must be string)');
  }

  if (!data.duration || typeof data.duration !== 'string') {
    errors.push('Missing or invalid "duration" field (must be ISO 8601 duration string)');
  }

  if (!data.timezone || typeof data.timezone !== 'string') {
    errors.push('Missing or invalid "timezone" field (must be IANA timezone identifier)');
  }

  // RRule format validation
  if (data.rrule) {
    if (!data.rrule.includes('FREQ=')) {
      errors.push('RRule missing FREQ parameter');
    }

    // Check for DTSTART
    if (!data.rrule.includes('DTSTART')) {
      warnings.push('RRule missing DTSTART (expansion may fail)');
    }

    // Check for overly long COUNT
    const countMatch = data.rrule.match(/COUNT=(\d+)/);
    if (countMatch && parseInt(countMatch[1]) > 365) {
      warnings.push('COUNT exceeds 365 occurrences (may cause performance issues)');
    }
  }

  // Duration format validation
  if (data.duration) {
    const durationMatch = data.duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/);
    if (!durationMatch) {
      errors.push('Invalid duration format (must be ISO 8601, e.g., PT1H30M)');
    }
  }

  // Timezone validation (basic check for IANA format)
  if (data.timezone) {
    try {
      // Use Luxon to validate timezone
      DateTime.now().setZone(data.timezone);
    } catch (e) {
      errors.push(`Invalid timezone: ${data.timezone}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get statistics about recurrence rule formats in a dataset
 * Useful for monitoring migration progress
 *
 * @param {Array} appointments - Array of appointment objects with recurrence_rule field
 * @returns {Object} Format distribution statistics
 */
function analyzeFormatDistribution(appointments) {
  const stats = {
    total: appointments.length,
    json: 0,
    legacy: 0,
    invalid: 0,
    migrationNeeded: 0
  };

  appointments.forEach(apt => {
    if (!apt.recurrence_rule) {
      stats.invalid++;
      return;
    }

    const parsed = parseRecurrenceRule(apt.recurrence_rule);

    if (!parsed.success) {
      stats.invalid++;
    } else {
      stats[parsed.format]++;
      if (parsed.migrationNeeded) {
        stats.migrationNeeded++;
      }
    }
  });

  return stats;
}

/**
 * Migrate legacy format to new JSON format
 *
 * @param {string} legacyRule - Legacy RRule string
 * @param {Object} options - Migration options
 * @returns {Object} Migration result
 */
function migrateToJsonFormat(legacyRule, options = {}) {
  const parsed = parseRecurrenceRule(legacyRule, options);

  if (!parsed.success) {
    return {
      success: false,
      error: `Cannot migrate invalid rule: ${parsed.error}`,
      original: legacyRule
    };
  }

  if (parsed.format === 'json') {
    return {
      success: true,
      alreadyMigrated: true,
      result: legacyRule,
      message: 'Already in JSON format'
    };
  }

  try {
    const jsonFormat = toStorageFormat(parsed);
    return {
      success: true,
      alreadyMigrated: false,
      original: legacyRule,
      result: jsonFormat,
      data: parsed.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      original: legacyRule
    };
  }
}

module.exports = {
  parseRecurrenceRule,
  toStorageFormat,
  validateRecurrenceData,
  analyzeFormatDistribution,
  migrateToJsonFormat
};
