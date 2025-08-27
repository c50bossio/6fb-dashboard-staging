/**
 * Financial Display Utilities
 * Standardized formatting for financial data across the 6FB AI Agent System
 * 
 * Database Storage Convention:
 * - Commission rates: Stored as decimals (0.6 = 60%)
 * - Monetary amounts: Stored as numbers (1500 = $1,500)
 * - Arrangement types: 'commission', 'booth_rent', 'hybrid'
 */

/**
 * Format commission rate for display
 * @param {number} decimal - Commission rate as decimal (0.6)
 * @returns {string} Formatted percentage (60%)
 */
export const formatCommissionDisplay = (decimal) => {
  if (!decimal && decimal !== 0) return '0%'
  return `${Math.round(decimal * 100)}%`
}

/**
 * Format commission rate for input fields
 * @param {number} decimal - Commission rate as decimal (0.6) 
 * @returns {number} Percentage value for input (60)
 */
export const formatCommissionInput = (decimal) => {
  if (!decimal && decimal !== 0) return 0
  return Math.round(decimal * 100)
}

/**
 * Parse commission input to database format
 * @param {string|number} percentage - User input percentage (60 or "60")
 * @returns {number} Decimal format for database (0.6)
 */
export const parseCommissionInput = (percentage) => {
  const num = parseFloat(percentage) || 0
  return Math.min(Math.max(num / 100, 0), 1) // Clamp between 0 and 1
}

/**
 * Format booth rent for display
 * @param {number} amount - Rent amount (1500)
 * @param {string} frequency - Payment frequency ('weekly', 'bi_weekly', 'monthly')
 * @returns {string} Formatted currency with frequency ($1,500/month)
 */
export const formatBoothRent = (amount, frequency = 'monthly') => {
  if (!amount && amount !== 0) return '$0'
  
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
  
  const frequencyLabels = {
    'weekly': '/week',
    'bi_weekly': '/2 weeks', 
    'monthly': '/month'
  }
  
  const frequencyLabel = frequencyLabels[frequency] || '/month'
  return `${formatted}${frequencyLabel}`
}

/**
 * Parse booth rent input to database format
 * @param {string|number} input - User input ("$1,500" or 1500)
 * @returns {number} Clean number for database (1500)
 */
export const parseBoothRentInput = (input) => {
  if (!input) return 0
  // Remove currency symbols, commas, and whitespace
  const cleaned = input.toString().replace(/[$,\s]/g, '')
  return parseFloat(cleaned) || 0
}

/**
 * Format financial arrangement type for display
 * @param {string} type - Arrangement type ('booth_rent', 'commission', 'hybrid')
 * @returns {string} Human-readable label
 */
export const formatFinancialModel = (type) => {
  const labels = {
    'commission': 'Commission Split',
    'booth_rent': 'Booth Rent', 
    'hybrid': 'Hybrid Model',
    'hourly': 'Hourly Rate',
    'tiered': 'Tiered Commission'
  }
  return labels[type] || type?.replace('_', ' ') || 'Not Set'
}

/**
 * Format rent payment frequency for display
 * @param {string} frequency - Payment frequency ('weekly', 'bi_weekly', 'monthly')
 * @returns {string} Human-readable frequency label
 */
export const formatRentFrequency = (frequency) => {
  const labels = {
    'weekly': 'Weekly',
    'bi_weekly': 'Bi-weekly',
    'monthly': 'Monthly'
  }
  return labels[frequency] || 'Monthly'
}

/**
 * Get rent frequency options for dropdowns
 * @returns {Array} Array of frequency options
 */
export const getRentFrequencyOptions = () => [
  { value: 'weekly', label: 'Weekly', description: 'Paid every week' },
  { value: 'bi_weekly', label: 'Bi-weekly', description: 'Paid every 2 weeks' },
  { value: 'monthly', label: 'Monthly', description: 'Paid once per month' }
]

/**
 * Format hybrid model details for display
 * @param {Object} arrangement - Financial arrangement data
 * @returns {string} Hybrid model description
 */
export const formatHybridModelDisplay = (arrangement) => {
  if (!arrangement || arrangement.arrangement_type !== 'hybrid') {
    return ''
  }

  const baseRent = formatBoothRent(arrangement.hybrid_base_rent || arrangement.booth_rent_amount)
  const threshold = formatBoothRent(arrangement.hybrid_revenue_threshold || 3000)
  const commission = formatCommissionDisplay(arrangement.hybrid_commission_rate || arrangement.commission_rate)

  return `${baseRent}/month + ${commission} on revenue over ${threshold}`
}

/**
 * Get appropriate commission rate based on arrangement type
 * @param {Object} arrangement - Financial arrangement data
 * @returns {number} Commission rate as decimal
 */
export const getEffectiveCommissionRate = (arrangement) => {
  if (!arrangement) return 0

  switch (arrangement.arrangement_type || arrangement.financial_model || arrangement.type) {
    case 'commission':
      return arrangement.commission_rate || arrangement.commission_percentage || 0.6
    case 'hybrid':
      return arrangement.hybrid_commission_rate || arrangement.commission_rate || 0.2
    case 'booth_rent':
      return 0 // Booth renters keep 100%, pay fixed rent
    default:
      return arrangement.commission_rate || arrangement.commission_percentage || 0
  }
}

/**
 * Calculate earnings preview for different arrangement types
 * @param {number} revenue - Monthly revenue amount
 * @param {Object} arrangement - Financial arrangement data
 * @returns {Object} Earnings breakdown
 */
export const calculateEarningsPreview = (revenue, arrangement) => {
  const amount = parseFloat(revenue) || 0
  const type = arrangement?.arrangement_type || arrangement?.financial_model || arrangement?.type

  switch (type) {
    case 'commission':
      const commissionRate = getEffectiveCommissionRate(arrangement)
      return {
        barberEarns: amount * commissionRate,
        shopEarns: amount * (1 - commissionRate),
        monthlyDue: 0,
        description: `Barber keeps ${formatCommissionDisplay(commissionRate)}, shop gets ${formatCommissionDisplay(1 - commissionRate)}`
      }

    case 'booth_rent':
      const rentAmount = arrangement?.booth_rent_amount || 1500
      return {
        barberEarns: amount,
        shopEarns: 0,
        monthlyDue: rentAmount,
        description: `Barber keeps 100% of revenue, pays ${formatBoothRent(rentAmount)}/month rent`
      }

    case 'hybrid':
      const baseRent = arrangement?.hybrid_base_rent || arrangement?.booth_rent_amount || 800
      const threshold = arrangement?.hybrid_revenue_threshold || 3000
      const hybridRate = arrangement?.hybrid_commission_rate || arrangement?.commission_rate || 0.2

      if (amount <= threshold) {
        return {
          barberEarns: amount,
          shopEarns: 0,
          monthlyDue: baseRent,
          description: `Below ${formatBoothRent(threshold)} threshold - barber keeps 100%, pays ${formatBoothRent(baseRent)}/month`
        }
      } else {
        const excess = amount - threshold
        const commission = excess * hybridRate
        return {
          barberEarns: amount - commission,
          shopEarns: commission,
          monthlyDue: baseRent,
          description: `Above threshold - ${formatCommissionDisplay(hybridRate)} on revenue over ${formatBoothRent(threshold)}, plus ${formatBoothRent(baseRent)}/month`
        }
      }

    default:
      return {
        barberEarns: 0,
        shopEarns: amount,
        monthlyDue: 0,
        description: 'No arrangement configured'
      }
  }
}

/**
 * Validate financial arrangement data
 * @param {Object} arrangement - Financial arrangement data
 * @returns {Object} Validation result with errors
 */
export const validateFinancialArrangement = (arrangement) => {
  const errors = []
  const type = arrangement?.arrangement_type || arrangement?.financial_model || arrangement?.type

  if (!type) {
    errors.push('Financial arrangement type is required')
    return { isValid: false, errors }
  }

  switch (type) {
    case 'commission':
      const commissionRate = arrangement.commission_rate ?? arrangement.commission_percentage ?? null
      if (commissionRate === null || commissionRate < 0 || commissionRate > 1) {
        errors.push('Commission rate must be between 0% and 100%')
      }
      break

    case 'booth_rent':
      const boothRent = arrangement.booth_rent_amount ?? null
      if (boothRent === null || boothRent <= 0) {
        errors.push('Booth rent amount must be greater than $0')
      }
      break

    case 'hybrid':
      const hybridBase = arrangement.hybrid_base_rent ?? arrangement.booth_rent_amount ?? null
      const hybridThreshold = arrangement.hybrid_revenue_threshold ?? null
      const hybridRate = arrangement.hybrid_commission_rate ?? arrangement.commission_rate ?? null

      if (hybridBase === null || hybridBase <= 0) {
        errors.push('Hybrid base rent must be greater than $0')
      }
      if (hybridThreshold === null || hybridThreshold <= 0) {
        errors.push('Hybrid revenue threshold must be greater than $0')
      }
      if (hybridRate === null || hybridRate < 0 || hybridRate > 1) {
        errors.push('Hybrid commission rate must be between 0% and 100%')
      }
      if (hybridBase && hybridThreshold && hybridBase >= hybridThreshold) {
        errors.push('Revenue threshold should be higher than base rent for hybrid model to make sense')
      }
      break
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Get default arrangement for a given type
 * @param {string} type - Arrangement type
 * @returns {Object} Default arrangement configuration
 */
export const getDefaultArrangement = (type) => {
  const defaults = {
    commission: {
      arrangement_type: 'commission',
      commission_rate: 0.6, // 60% to barber, 40% to shop
      description: 'Standard commission split'
    },
    booth_rent: {
      arrangement_type: 'booth_rent',
      booth_rent_amount: 1500,
      rent_frequency: 'monthly',
      rent_due_day: 1,
      description: 'Fixed monthly booth rental'
    },
    hybrid: {
      arrangement_type: 'hybrid',
      hybrid_base_rent: 800,
      hybrid_revenue_threshold: 3000,
      hybrid_commission_rate: 0.2, // 20% commission on excess
      description: 'Low base rent plus commission on high performers'
    }
  }

  return defaults[type] || defaults.commission
}

/**
 * Standardize field names for consistency
 * @param {Object} data - Raw financial data
 * @returns {Object} Standardized financial data
 */
export const standardizeFinancialFields = (data) => {
  if (!data) return {}

  return {
    ...data,
    // Standardize arrangement type field name
    arrangement_type: data.arrangement_type || data.financial_model || data.type,
    // Remove deprecated field names
    financial_model: undefined,
    type: data.type && !data.arrangement_type ? data.type : undefined,
    // Ensure commission rates are decimals
    commission_rate: data.commission_rate || data.commission_percentage || 0,
    commission_percentage: undefined // Remove to avoid confusion
  }
}

// Export commonly used formatters as default
export default {
  formatCommissionDisplay,
  formatCommissionInput,
  parseCommissionInput,
  formatBoothRent,
  parseBoothRentInput,
  formatFinancialModel,
  formatHybridModelDisplay,
  getEffectiveCommissionRate,
  calculateEarningsPreview,
  validateFinancialArrangement,
  getDefaultArrangement,
  standardizeFinancialFields
}