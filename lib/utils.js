/**
 * Utility functions for the 6FB AI Agent System
 */

import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combine class names conditionally with Tailwind merge
 * @param {...any} inputs - Class names or conditional objects
 * @returns {string} Combined and merged class string
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date string to a readable format
 * @param {string|Date} date - Date to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
  if (!date) return ''
  
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  }
  
  return d.toLocaleDateString('en-US', defaultOptions)
}

/**
 * Format a number with appropriate separators and decimals
 * @param {number} number - Number to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted number string
 */
export function formatNumber(number, options = {}) {
  if (typeof number !== 'number' || isNaN(number)) return '0'
  
  const defaultOptions = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options
  }
  
  return number.toLocaleString('en-US', defaultOptions)
}

/**
 * Format currency values
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'USD') {
  if (typeof amount !== 'number' || isNaN(amount)) return '$0.00'
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

/**
 * Format percentage values
 * @param {number} value - Percentage value (0-100)
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
export function formatPercentage(value, decimals = 1) {
  if (typeof value !== 'number' || isNaN(value)) return '0%'
  
  return `${value.toFixed(decimals)}%`
}

/**
 * Truncate text to a specified length
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @param {string} suffix - Suffix to add when truncated
 * @returns {string} Truncated text
 */
export function truncateText(text, length = 100, suffix = '...') {
  if (!text || text.length <= length) return text || ''
  
  return text.substring(0, length).trim() + suffix
}

/**
 * Generate a random ID
 * @param {number} length - Length of the ID
 * @returns {string} Random ID string
 */
export function generateId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}

/**
 * Debounce a function call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param {any} value - Value to check
 * @returns {boolean} True if empty
 */
export function isEmpty(value) {
  if (value == null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/**
 * Get relative time string (e.g., "2 hours ago")
 * @param {string|Date} date - Date to compare
 * @returns {string} Relative time string
 */
export function getRelativeTime(date) {
  if (!date) return ''
  
  const now = new Date()
  const past = new Date(date)
  const diffMs = now - past
  
  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  if (seconds > 0) return `${seconds} second${seconds > 1 ? 's' : ''} ago`
  
  return 'just now'
}

/**
 * Calculate percentage change between two values
 * @param {number} oldValue - Original value
 * @param {number} newValue - New value
 * @returns {number} Percentage change
 */
export function calculatePercentageChange(oldValue, newValue) {
  if (!oldValue || oldValue === 0) return newValue ? 100 : 0
  return ((newValue - oldValue) / oldValue) * 100
}

/**
 * Get initials from a name
 * @param {string} name - Full name
 * @returns {string} Initials
 */
export function getInitials(name) {
  if (!name) return ''
  
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after the specified time
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Get avatar color based on name or ID
 * @param {string} name - Name or ID to generate color from
 * @returns {string} CSS color class or hex color
 */
export function getAvatarColor(name) {
  if (!name) return 'bg-gray-500'
  
  const colors = [
    'bg-olive-500',
    'bg-green-500',
    'bg-gold-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-olive-500',
    'bg-pink-500',
    'bg-teal-500'
  ]
  
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}