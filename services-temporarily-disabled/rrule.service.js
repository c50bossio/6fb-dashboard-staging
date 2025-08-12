// Use require for CommonJS compatibility with Next.js
const { RRule, RRuleSet, rrulestr } = require('rrule');
const { DateTime } = require('luxon');

/**
 * Service for handling RRule generation, parsing, and expansion
 * Following RFC 5545 standard for recurring events
 */
class RRuleService {
  /**
   * Create an RRule from user-friendly options
   * @param {Object} options - Recurrence options
   * @returns {RRule} RRule instance
   */
  static createRule(options) {
    const {
      frequency = 'WEEKLY',
      interval = 1,
      daysOfWeek = [],
      startDate,
      endDate,
      count,
      until,
      byMonthDay,
      byMonth,
      timezone = 'America/New_York'
    } = options;

    // Convert start date to UTC for RRule
    const dtstart = DateTime.fromISO(startDate, { zone: timezone }).toUTC().toJSDate();
    
    // Build RRule options
    const rruleOptions = {
      freq: RRule[frequency.toUpperCase()],
      interval: interval,
      dtstart: dtstart
    };

    // Add optional parameters
    if (daysOfWeek && daysOfWeek.length > 0) {
      rruleOptions.byweekday = daysOfWeek.map(day => {
        const dayMap = {
          'sunday': RRule.SU,
          'monday': RRule.MO,
          'tuesday': RRule.TU,
          'wednesday': RRule.WE,
          'thursday': RRule.TH,
          'friday': RRule.FR,
          'saturday': RRule.SA
        };
        return dayMap[day.toLowerCase()] || day;
      });
    }

    if (count) {
      rruleOptions.count = count;
    } else if (until) {
      rruleOptions.until = DateTime.fromISO(until, { zone: timezone }).toUTC().toJSDate();
    }

    if (byMonthDay) {
      rruleOptions.bymonthday = byMonthDay;
    }

    if (byMonth) {
      rruleOptions.bymonth = byMonth;
    }

    return new RRule(rruleOptions);
  }

  /**
   * Parse an RRule string
   * @param {string} rruleString - RRule string in RFC 5545 format
   * @returns {RRule} RRule instance
   */
  static parseRule(rruleString) {
    // Handle both with and without DTSTART prefix
    if (rruleString.includes('DTSTART')) {
      return rrulestr(rruleString);
    } else {
      return RRule.fromString(rruleString);
    }
  }

  /**
   * Generate occurrences between two dates
   * @param {string} rruleString - RRule string
   * @param {Date} startDate - Start of range
   * @param {Date} endDate - End of range
   * @param {string} timezone - Timezone for display
   * @returns {Array} Array of occurrence dates
   */
  static generateOccurrences(rruleString, startDate, endDate, timezone = 'America/New_York') {
    try {
      const rule = this.parseRule(rruleString);
      const occurrences = rule.between(startDate, endDate, true);
      
      // Convert to timezone-aware dates
      return occurrences.map(date => {
        const dt = DateTime.fromJSDate(date, { zone: 'UTC' }).setZone(timezone);
        return {
          date: date,
          localDate: dt.toJSDate(),
          displayTime: dt.toFormat('fff'), // Full format
          isoString: dt.toISO()
        };
      });
    } catch (error) {
      console.error('Error generating occurrences:', error);
      return [];
    }
  }

  /**
   * Convert RRule to FullCalendar-compatible format
   * @param {string} rruleString - RRule string
   * @param {string} startTime - Start time in ISO format
   * @param {string} endTime - End time in ISO format
   * @returns {Object} FullCalendar event object with RRule
   */
  static toFullCalendarFormat(rruleString, startTime, endTime) {
    // Ensure DTSTART is included for FullCalendar
    if (!rruleString.includes('DTSTART')) {
      const dtstart = new Date(startTime)
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '');
      
      rruleString = `DTSTART:${dtstart}\n${rruleString}`;
    }

    // Calculate duration for FullCalendar
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end - start;
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    let duration = null;
    if (hours > 0 || minutes > 0) {
      duration = 'PT';
      if (hours > 0) duration += `${hours}H`;
      if (minutes > 0) duration += `${minutes}M`;
    }

    return {
      rrule: rruleString,
      duration: duration
    };
  }

  /**
   * Create an RRule string from a pattern object
   * @param {Object} pattern - Pattern object from UI
   * @returns {string} RRule string
   */
  static createRRuleString(pattern) {
    const {
      frequency = 'WEEKLY',
      interval = 1,
      daysOfWeek = [],
      count,
      until,
      byMonthDay
    } = pattern;

    let parts = [`FREQ=${frequency.toUpperCase()}`];
    
    if (interval > 1) {
      parts.push(`INTERVAL=${interval}`);
    }

    if (daysOfWeek && daysOfWeek.length > 0) {
      const dayAbbr = {
        'sunday': 'SU',
        'monday': 'MO',
        'tuesday': 'TU',
        'wednesday': 'WE',
        'thursday': 'TH',
        'friday': 'FR',
        'saturday': 'SA'
      };
      const days = daysOfWeek.map(d => dayAbbr[d.toLowerCase()] || d.toUpperCase());
      parts.push(`BYDAY=${days.join(',')}`);
    }

    if (count) {
      parts.push(`COUNT=${count}`);
    } else if (until) {
      const untilDate = new Date(until)
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '');
      parts.push(`UNTIL=${untilDate}`);
    }

    if (byMonthDay) {
      parts.push(`BYMONTHDAY=${byMonthDay}`);
    }

    return parts.join(';');
  }

  /**
   * Validate an RRule string
   * @param {string} rruleString - RRule string to validate
   * @returns {Object} Validation result
   */
  static validateRRule(rruleString) {
    try {
      const rule = this.parseRule(rruleString);
      
      // Check for potential issues
      const warnings = [];
      
      // Check if count is too high
      if (rruleString.includes('COUNT')) {
        const countMatch = rruleString.match(/COUNT=(\d+)/);
        if (countMatch && parseInt(countMatch[1]) > 365) {
          warnings.push('Count exceeds 365 occurrences');
        }
      }

      // Check if interval is reasonable
      if (rruleString.includes('INTERVAL')) {
        const intervalMatch = rruleString.match(/INTERVAL=(\d+)/);
        if (intervalMatch && parseInt(intervalMatch[1]) > 12) {
          warnings.push('Interval seems unusually large');
        }
      }

      // Generate test occurrences to verify
      const testOccurrences = rule.between(
        new Date(),
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        true
      ).slice(0, 10);

      return {
        valid: true,
        warnings: warnings,
        testOccurrences: testOccurrences,
        originalString: rruleString
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        originalString: rruleString
      };
    }
  }

  /**
   * Handle exceptions for recurring events
   * @param {string} rruleString - Original RRule
   * @param {Array} exceptions - Array of exception dates
   * @returns {RRuleSet} RRuleSet with exceptions
   */
  static createRRuleWithExceptions(rruleString, exceptions = []) {
    const rruleSet = new RRuleSet();
    
    // Add the main rule
    const rule = this.parseRule(rruleString);
    rruleSet.rrule(rule);
    
    // Add exception dates
    exceptions.forEach(exDate => {
      rruleSet.exdate(new Date(exDate));
    });
    
    return rruleSet;
  }

  /**
   * Get human-readable description of RRule
   * @param {string} rruleString - RRule string
   * @returns {string} Human-readable description
   */
  static toHumanReadable(rruleString) {
    try {
      const rule = this.parseRule(rruleString);
      return rule.toText();
    } catch (error) {
      return 'Invalid recurrence rule';
    }
  }

  /**
   * Check if a date matches the recurrence pattern
   * @param {string} rruleString - RRule string
   * @param {Date} date - Date to check
   * @returns {boolean} True if date matches pattern
   */
  static dateMatchesPattern(rruleString, date) {
    try {
      const rule = this.parseRule(rruleString);
      const occurrences = rule.between(
        new Date(date.getTime() - 1),
        new Date(date.getTime() + 1),
        true
      );
      return occurrences.length > 0;
    } catch (error) {
      console.error('Error checking date match:', error);
      return false;
    }
  }
}

module.exports = RRuleService;