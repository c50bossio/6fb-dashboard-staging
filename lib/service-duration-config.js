/**
 * Service Duration Configuration
 * Based on industry research and barbershop best practices
 */

export const SERVICE_DURATIONS = {
  // Quick Services (15-20 minutes)
  'Buzz Cut': 15,
  'Beard Trim': 15,
  'Mustache Trim': 10,
  'Eyebrow Trim': 10,
  'Touch Up': 15,
  
  // Standard Services (25-30 minutes)
  'Haircut': 25,
  'Kids Haircut': 20,
  'Senior Haircut': 30,
  'Basic Cut': 25,
  'Trim': 20,
  
  // Premium Services (35-45 minutes)
  'Fade': 35,
  'Skin Fade': 40,
  'Beard & Mustache': 35,
  'Full Service': 45,
  'Deluxe Cut': 40,
  
  // Specialized Services (45-60 minutes)
  'Hot Towel Shave': 45,
  'Straight Razor Shave': 50,
  'The Works': 60,
  'Premium Package': 55,
  'Wedding Prep': 60,
  
  // Default fallback
  'DEFAULT': 30
}

/**
 * Get service duration in minutes
 * @param {string} serviceName - Name of the service
 * @returns {number} Duration in minutes
 */
export function getServiceDuration(serviceName) {
  if (!serviceName) return SERVICE_DURATIONS.DEFAULT
  
  // Exact match first
  if (SERVICE_DURATIONS[serviceName]) {
    return SERVICE_DURATIONS[serviceName]
  }
  
  // Fuzzy matching for common variations
  const normalizedService = serviceName.toLowerCase().trim()
  
  // Quick services
  if (normalizedService.includes('buzz') || normalizedService.includes('quick')) {
    return SERVICE_DURATIONS['Buzz Cut']
  }
  
  if (normalizedService.includes('beard') && !normalizedService.includes('mustache')) {
    return SERVICE_DURATIONS['Beard Trim']
  }
  
  if (normalizedService.includes('fade')) {
    return SERVICE_DURATIONS['Fade']
  }
  
  if (normalizedService.includes('shave')) {
    return normalizedService.includes('hot towel') ? 
      SERVICE_DURATIONS['Hot Towel Shave'] : 
      SERVICE_DURATIONS['Straight Razor Shave']
  }
  
  if (normalizedService.includes('kid') || normalizedService.includes('child')) {
    return SERVICE_DURATIONS['Kids Haircut']
  }
  
  if (normalizedService.includes('senior') || normalizedService.includes('elderly')) {
    return SERVICE_DURATIONS['Senior Haircut']
  }
  
  // Default to standard haircut
  return SERVICE_DURATIONS['Haircut']
}

/**
 * Calculate smart wait time considering multiple barbers working in parallel
 * @param {number} queuePosition - Position in queue (1-based)
 * @param {number} serviceDuration - Service duration in minutes
 * @param {number} activeBarbers - Number of active barbers (default: 1)
 * @returns {number} Estimated wait time in minutes
 */
export function calculateWaitTime(queuePosition, serviceDuration, activeBarbers = 1) {
  if (queuePosition <= 0) return 0
  if (activeBarbers <= 0) activeBarbers = 1
  
  // If we have enough barbers to serve everyone immediately
  if (queuePosition <= activeBarbers) {
    return 5 // Just a few minutes to get settled
  }
  
  // Calculate which "round" this customer is in
  // Round 1: positions 1-N (where N = activeBarbers)
  // Round 2: positions N+1 to 2N, etc.
  const round = Math.ceil(queuePosition / activeBarbers)
  
  // Wait time = (round - 1) * service duration + setup time
  const baseWaitTime = (round - 1) * serviceDuration
  const setupTime = 5 // Time to get settled, payment, etc.
  
  return Math.max(baseWaitTime + setupTime, 5)
}

/**
 * Get estimated number of active barbers based on time of day
 * This could be enhanced later to query actual staff schedules
 * @param {Date} timestamp - Current time (defaults to now)
 * @returns {number} Estimated number of active barbers
 */
export function getEstimatedActiveBarbers(timestamp = new Date()) {
  const hour = timestamp.getHours()
  const dayOfWeek = timestamp.getDay() // 0 = Sunday, 6 = Saturday
  
  // Weekend patterns
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    // Weekends - busier, more staff
    if (hour >= 9 && hour <= 17) return 3 // Peak weekend hours
    if (hour >= 8 && hour <= 19) return 2 // Extended weekend hours
    return 1 // Early/late weekend
  }
  
  // Weekday patterns
  if (hour >= 10 && hour <= 14) return 2 // Lunch rush
  if (hour >= 16 && hour <= 19) return 3 // After work rush
  if (hour >= 8 && hour <= 20) return 2 // Regular business hours
  return 1 // Early/late weekday
}

/**
 * Complete smart wait time estimation
 * @param {string} serviceName - Name of the service
 * @param {number} queuePosition - Position in queue
 * @param {number|null} activeBarbers - Number of active barbers (auto-estimated if null)
 * @param {Date} timestamp - Current time for barber estimation
 * @returns {Object} Wait time estimation with breakdown
 */
export function estimateSmartWaitTime(serviceName, queuePosition, activeBarbers = null, timestamp = new Date()) {
  const serviceDuration = getServiceDuration(serviceName)
  const estimatedBarbers = activeBarbers || getEstimatedActiveBarbers(timestamp)
  const waitTime = calculateWaitTime(queuePosition, serviceDuration, estimatedBarbers)
  
  return {
    estimatedWaitMinutes: waitTime,
    serviceDuration,
    activeBarbers: estimatedBarbers,
    queuePosition,
    breakdown: {
      round: Math.ceil(queuePosition / estimatedBarbers),
      baseWait: Math.max((Math.ceil(queuePosition / estimatedBarbers) - 1) * serviceDuration, 0),
      setupTime: 5
    }
  }
}

export default {
  SERVICE_DURATIONS,
  getServiceDuration,
  calculateWaitTime,
  getEstimatedActiveBarbers,
  estimateSmartWaitTime
}