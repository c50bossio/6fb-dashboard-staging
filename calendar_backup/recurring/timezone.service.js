
const { DateTime, IANAZone } = require('luxon');

/**
 * Service for handling timezone conversions and DST transitions
 * Ensures appointments display at the correct local time regardless of timezone
 */
class TimezoneService {
  /**
   * Default timezone for the barbershop (configurable)
   */
  static DEFAULT_TIMEZONE = 'America/New_York';

  /**
   * Get the current timezone from environment or browser
   * @returns {string} IANA timezone identifier
   */
  static getCurrentTimezone() {
    if (process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE) {
      return process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE;
    }
    
    if (typeof window !== 'undefined' && Intl?.DateTimeFormat) {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    
    return this.DEFAULT_TIMEZONE;
  }

  /**
   * Convert a datetime from one timezone to another
   * @param {string|Date} dateTime - The datetime to convert
   * @param {string} fromZone - Source timezone
   * @param {string} toZone - Target timezone
   * @returns {Object} Converted datetime information
   */
  static convertTimezone(dateTime, fromZone, toZone) {
    const dt = typeof dateTime === 'string' 
      ? DateTime.fromISO(dateTime, { zone: fromZone })
      : DateTime.fromJSDate(dateTime, { zone: fromZone });
    
    const converted = dt.setZone(toZone);
    
    return {
      iso: converted.toISO(),
      jsDate: converted.toJSDate(),
      formatted: converted.toFormat('fff'), // Full format
      time: converted.toFormat('t'), // Time only
      date: converted.toFormat('DDD'), // Date only
      offset: converted.offset,
      offsetName: converted.offsetNameShort,
      isDST: converted.isInDST
    };
  }

  /**
   * Convert local time to UTC for storage
   * @param {string|Date} localDateTime - Local datetime
   * @param {string} timezone - Local timezone
   * @returns {string} UTC ISO string
   */
  static toUTC(localDateTime, timezone = this.DEFAULT_TIMEZONE) {
    const dt = typeof localDateTime === 'string'
      ? DateTime.fromISO(localDateTime, { zone: timezone })
      : DateTime.fromJSDate(localDateTime, { zone: timezone });
    
    return dt.toUTC().toISO();
  }

  /**
   * Convert UTC to local time for display
   * @param {string|Date} utcDateTime - UTC datetime
   * @param {string} timezone - Target timezone
   * @returns {string} Local ISO string
   */
  static fromUTC(utcDateTime, timezone = this.DEFAULT_TIMEZONE) {
    const dt = typeof utcDateTime === 'string'
      ? DateTime.fromISO(utcDateTime, { zone: 'UTC' })
      : DateTime.fromJSDate(utcDateTime, { zone: 'UTC' });
    
    return dt.setZone(timezone).toISO();
  }

  /**
   * Handle DST transitions for recurring appointments
   * @param {Date} appointmentDate - Original appointment date
   * @param {string} timezone - Appointment timezone
   * @returns {Object} DST adjustment information
   */
  static handleDSTTransition(appointmentDate, timezone = this.DEFAULT_TIMEZONE) {
    const dt = DateTime.fromJSDate(appointmentDate, { zone: timezone });
    
    const dayBefore = dt.minus({ days: 1 });
    const dayAfter = dt.plus({ days: 1 });
    
    const isDSTTransition = dayBefore.isInDST !== dt.isInDST || 
                            dt.isInDST !== dayAfter.isInDST;
    
    let adjustedTime = dt;
    if (isDSTTransition) {
      const targetHour = dt.hour;
      const targetMinute = dt.minute;
      
      adjustedTime = DateTime.fromObject({
        year: dt.year,
        month: dt.month,
        day: dt.day,
        hour: targetHour,
        minute: targetMinute,
        second: 0,
        millisecond: 0
      }, { zone: timezone });
    }
    
    return {
      originalTime: dt.toISO(),
      adjustedTime: adjustedTime.toISO(),
      isDSTTransition: isDSTTransition,
      isDST: dt.isInDST,
      offset: dt.offset,
      offsetName: dt.offsetNameShort,
      needsAdjustment: isDSTTransition && dt.toMillis() !== adjustedTime.toMillis()
    };
  }

  /**
   * Get timezone offset for a specific date
   * @param {Date} date - The date to check
   * @param {string} timezone - The timezone
   * @returns {number} Offset in minutes
   */
  static getOffset(date, timezone = this.DEFAULT_TIMEZONE) {
    const dt = DateTime.fromJSDate(date, { zone: timezone });
    return dt.offset;
  }

  /**
   * Format datetime for display with timezone
   * @param {string|Date} dateTime - The datetime to format
   * @param {string} timezone - The timezone
   * @param {string} format - Luxon format string
   * @returns {string} Formatted datetime string
   */
  static formatWithTimezone(dateTime, timezone = this.DEFAULT_TIMEZONE, format = 'fff') {
    const dt = typeof dateTime === 'string'
      ? DateTime.fromISO(dateTime, { zone: 'UTC' }).setZone(timezone)
      : DateTime.fromJSDate(dateTime, { zone: 'UTC' }).setZone(timezone);
    
    return dt.toFormat(format);
  }

  /**
   * Create a timezone-aware datetime for FullCalendar
   * @param {string} dateStr - Date string
   * @param {string} timeStr - Time string (HH:mm format)
   * @param {string} timezone - Timezone
   * @returns {Object} FullCalendar-compatible datetime object
   */
  static createFullCalendarDateTime(dateStr, timeStr, timezone = this.DEFAULT_TIMEZONE) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    const dt = DateTime.fromISO(dateStr, { zone: timezone })
      .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
    
    return {
      dateTime: dt.toISO(),
      timeZone: timezone,
      display: dt.toFormat('DDD t'), // e.g., "Aug 15, 2025 2:30 PM"
      utc: dt.toUTC().toISO(),
      local: dt.toISO()
    };
  }

  /**
   * Parse a datetime string with timezone awareness
   * @param {string} dateTimeStr - Datetime string to parse
   * @param {string} timezone - Expected timezone
   * @returns {Object} Parsed datetime information
   */
  static parseDateTime(dateTimeStr, timezone = this.DEFAULT_TIMEZONE) {
    let dt;
    
    try {
      dt = DateTime.fromISO(dateTimeStr, { zone: timezone });
    } catch (e) {
      try {
        dt = DateTime.fromRFC2822(dateTimeStr, { zone: timezone });
      } catch (e2) {
        try {
          dt = DateTime.fromSQL(dateTimeStr, { zone: timezone });
        } catch (e3) {
          console.error('Failed to parse datetime:', dateTimeStr);
          dt = DateTime.now().setZone(timezone);
        }
      }
    }
    
    return {
      valid: dt.isValid,
      iso: dt.toISO(),
      date: dt.toISODate(),
      time: dt.toISOTime(),
      hour: dt.hour,
      minute: dt.minute,
      dayOfWeek: dt.weekday,
      timezone: dt.zoneName,
      offset: dt.offset,
      isDST: dt.isInDST
    };
  }

  /**
   * Calculate appointment end time based on duration
   * @param {string|Date} startTime - Start time
   * @param {number} durationMinutes - Duration in minutes
   * @param {string} timezone - Timezone
   * @returns {Object} Start and end times
   */
  static calculateEndTime(startTime, durationMinutes, timezone = this.DEFAULT_TIMEZONE) {
    const start = typeof startTime === 'string'
      ? DateTime.fromISO(startTime, { zone: timezone })
      : DateTime.fromJSDate(startTime, { zone: timezone });
    
    const end = start.plus({ minutes: durationMinutes });
    
    return {
      start: start.toISO(),
      end: end.toISO(),
      startUTC: start.toUTC().toISO(),
      endUTC: end.toUTC().toISO(),
      duration: `PT${Math.floor(durationMinutes / 60)}H${durationMinutes % 60}M`
    };
  }

  /**
   * Get business hours in a specific timezone
   * @param {string} timezone - Timezone
   * @returns {Object} Business hours configuration
   */
  static getBusinessHours(timezone = this.DEFAULT_TIMEZONE) {
    return {
      daysOfWeek: [1, 2, 3, 4, 5, 6], // Monday - Saturday
      startTime: '09:00',
      endTime: '20:00',
      timezone: timezone
    };
  }

  /**
   * Check if a datetime is within business hours
   * @param {string|Date} dateTime - Datetime to check
   * @param {string} timezone - Timezone
   * @returns {boolean} True if within business hours
   */
  static isWithinBusinessHours(dateTime, timezone = this.DEFAULT_TIMEZONE) {
    const dt = typeof dateTime === 'string'
      ? DateTime.fromISO(dateTime, { zone: timezone })
      : DateTime.fromJSDate(dateTime, { zone: timezone });
    
    const businessHours = this.getBusinessHours(timezone);
    
    if (!businessHours.daysOfWeek.includes(dt.weekday)) {
      return false;
    }
    
    const [startHour, startMinute] = businessHours.startTime.split(':').map(Number);
    const [endHour, endMinute] = businessHours.endTime.split(':').map(Number);
    
    const timeInMinutes = dt.hour * 60 + dt.minute;
    const startInMinutes = startHour * 60 + startMinute;
    const endInMinutes = endHour * 60 + endMinute;
    
    return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
  }

  /**
   * Get available timezones grouped by region
   * @returns {Object} Grouped timezones
   */
  static getAvailableTimezones() {
    return {
      'US/Canada': [
        { value: 'America/New_York', label: 'Eastern Time (ET)' },
        { value: 'America/Chicago', label: 'Central Time (CT)' },
        { value: 'America/Denver', label: 'Mountain Time (MT)' },
        { value: 'America/Phoenix', label: 'Arizona Time' },
        { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
        { value: 'America/Anchorage', label: 'Alaska Time' },
        { value: 'Pacific/Honolulu', label: 'Hawaii Time' }
      ],
      'Europe': [
        { value: 'Europe/London', label: 'London (GMT/BST)' },
        { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
        { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
        { value: 'Europe/Moscow', label: 'Moscow (MSK)' }
      ],
      'Asia': [
        { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
        { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
        { value: 'Asia/Kolkata', label: 'India (IST)' },
        { value: 'Asia/Dubai', label: 'Dubai (GST)' }
      ],
      'Australia': [
        { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
        { value: 'Australia/Melbourne', label: 'Melbourne (AEDT/AEST)' },
        { value: 'Australia/Perth', label: 'Perth (AWST)' }
      ]
    };
  }

  /**
   * Validate timezone string
   * @param {string} timezone - Timezone to validate
   * @returns {boolean} True if valid
   */
  static isValidTimezone(timezone) {
    try {
      const zone = IANAZone.create(timezone);
      return zone.isValid;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get timezone abbreviation
   * @param {string} timezone - Timezone
   * @param {Date} date - Date for DST consideration
   * @returns {string} Timezone abbreviation (e.g., EST, PST)
   */
  static getTimezoneAbbreviation(timezone = this.DEFAULT_TIMEZONE, date = new Date()) {
    const dt = DateTime.fromJSDate(date, { zone: timezone });
    return dt.offsetNameShort;
  }
}

module.exports = TimezoneService;