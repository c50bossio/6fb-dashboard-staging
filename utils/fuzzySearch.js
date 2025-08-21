/**
 * Advanced Fuzzy Search Utilities
 * 
 * Provides sophisticated search algorithms with typo tolerance,
 * relevance scoring, and performance optimization for customer search.
 * 
 * Features:
 * - Levenshtein distance for typo tolerance
 * - Soundex matching for phonetic similarity
 * - Multi-field weighted search
 * - Performance-optimized algorithms
 * - Configurable search thresholds
 * - Search result ranking and scoring
 */

/**
 * Calculate Levenshtein distance between two strings
 * Used for typo tolerance in search queries
 */
export function levenshteinDistance(str1, str2) {
  if (!str1 || !str2) return Math.max(str1?.length || 0, str2?.length || 0)
  
  const matrix = []
  const len1 = str1.length
  const len2 = str2.length
  
  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }
  
  // Calculate distances
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // deletion
        matrix[i][j - 1] + 1,     // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }
  
  return matrix[len1][len2]
}

/**
 * Calculate similarity score based on Levenshtein distance
 * Returns a score between 0 and 1 (1 being exact match)
 */
export function calculateSimilarityScore(str1, str2) {
  if (!str1 || !str2) return 0
  
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
  const maxLength = Math.max(str1.length, str2.length)
  
  return maxLength === 0 ? 1 : 1 - (distance / maxLength)
}

/**
 * Generate Soundex code for phonetic matching
 * Useful for names that sound similar but are spelled differently
 */
export function soundex(str) {
  if (!str) return ''
  
  const soundexMap = {
    'B': '1', 'F': '1', 'P': '1', 'V': '1',
    'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2', 'S': '2', 'X': '2', 'Z': '2',
    'D': '3', 'T': '3',
    'L': '4',
    'M': '5', 'N': '5',
    'R': '6'
  }
  
  const cleanStr = str.toUpperCase().replace(/[^A-Z]/g, '')
  if (!cleanStr) return ''
  
  let soundexCode = cleanStr[0]
  let prevCode = soundexMap[cleanStr[0]] || ''
  
  for (let i = 1; i < cleanStr.length && soundexCode.length < 4; i++) {
    const currentCode = soundexMap[cleanStr[i]] || ''
    
    if (currentCode && currentCode !== prevCode) {
      soundexCode += currentCode
    }
    
    if (currentCode) {
      prevCode = currentCode
    }
  }
  
  // Pad with zeros if necessary
  return soundexCode.padEnd(4, '0')
}

/**
 * Check if two strings are phonetically similar using Soundex
 */
export function isPhoneticMatch(str1, str2) {
  if (!str1 || !str2) return false
  return soundex(str1) === soundex(str2)
}

/**
 * Advanced fuzzy matching with multiple algorithms
 * Combines exact match, similarity, and phonetic matching
 */
export function fuzzyMatch(text, pattern, options = {}) {
  const {
    caseSensitive = false,
    exactMatchBonus = 50,
    similarityThreshold = 0.6,
    phoneticBonus = 20,
    substringBonus = 30,
    prefixBonus = 40,
    wordBoundaryBonus = 25
  } = options
  
  if (!text || !pattern) return { score: 0, matches: [], type: 'none' }
  
  const textToCheck = caseSensitive ? text : text.toLowerCase()
  const patternToCheck = caseSensitive ? pattern : pattern.toLowerCase()
  
  let score = 0
  let matches = []
  let matchType = 'none'
  
  // 1. Exact match (highest priority)
  if (textToCheck === patternToCheck) {
    return {
      score: 100,
      matches: [{ start: 0, end: text.length }],
      type: 'exact'
    }
  }
  
  // 2. Substring match
  const substringIndex = textToCheck.indexOf(patternToCheck)
  if (substringIndex !== -1) {
    score += exactMatchBonus + substringBonus
    matches.push({ start: substringIndex, end: substringIndex + pattern.length })
    matchType = 'substring'
    
    // Bonus for prefix match
    if (substringIndex === 0) {
      score += prefixBonus
      matchType = 'prefix'
    }
    
    // Bonus for word boundary match
    if (substringIndex === 0 || /\s/.test(text[substringIndex - 1])) {
      score += wordBoundaryBonus
    }
  } else {
    // 3. Similarity-based matching
    const similarity = calculateSimilarityScore(textToCheck, patternToCheck)
    if (similarity >= similarityThreshold) {
      score += similarity * exactMatchBonus
      matchType = 'similarity'
      
      // Find character-level matches for highlighting
      let patternIndex = 0
      for (let i = 0; i < textToCheck.length && patternIndex < patternToCheck.length; i++) {
        if (textToCheck[i] === patternToCheck[patternIndex]) {
          matches.push({ start: i, end: i + 1 })
          patternIndex++
        }
      }
    }
    
    // 4. Phonetic matching for names
    if (isPhoneticMatch(textToCheck, patternToCheck)) {
      score += phoneticBonus
      if (matchType === 'none') {
        matchType = 'phonetic'
      }
    }
  }
  
  // 5. Word-level fuzzy matching for multi-word queries
  const patternWords = patternToCheck.split(/\s+/).filter(word => word.length > 0)
  const textWords = textToCheck.split(/\s+/)
  
  if (patternWords.length > 1) {
    let wordMatches = 0
    let wordScore = 0
    
    patternWords.forEach(patternWord => {
      let bestWordScore = 0
      let bestWordMatch = null
      
      textWords.forEach((textWord, wordIndex) => {
        const wordSimilarity = calculateSimilarityScore(textWord, patternWord)
        if (wordSimilarity > bestWordScore && wordSimilarity >= similarityThreshold) {
          bestWordScore = wordSimilarity
          bestWordMatch = { word: textWord, index: wordIndex, similarity: wordSimilarity }
        }
      })
      
      if (bestWordMatch) {
        wordMatches++
        wordScore += bestWordScore * 20
      }
    })
    
    const wordMatchRatio = wordMatches / patternWords.length
    if (wordMatchRatio >= 0.5) {
      score += wordScore * wordMatchRatio
      if (matchType === 'none') {
        matchType = 'word-fuzzy'
      }
    }
  }
  
  return {
    score: Math.min(100, Math.max(0, score)),
    matches,
    type: matchType
  }
}

/**
 * Multi-field search with weighted scoring
 * Searches across multiple customer fields with different priorities
 */
export function multiFieldSearch(customer, query, fieldWeights = {}) {
  const defaultWeights = {
    name: 1.0,
    email: 0.8,
    phone: 0.7,
    notes: 0.6,
    address: 0.5,
    preferred_services: 0.6,
    tags: 0.7
  }
  
  const weights = { ...defaultWeights, ...fieldWeights }
  let totalScore = 0
  let bestMatch = null
  let fieldMatches = {}
  
  Object.entries(weights).forEach(([field, weight]) => {
    const fieldValue = customer[field]
    if (!fieldValue) return
    
    const fieldText = Array.isArray(fieldValue) ? fieldValue.join(' ') : String(fieldValue)
    const matchResult = fuzzyMatch(fieldText, query)
    
    if (matchResult.score > 0) {
      const weightedScore = matchResult.score * weight
      totalScore += weightedScore
      
      fieldMatches[field] = {
        ...matchResult,
        weightedScore,
        weight
      }
      
      if (!bestMatch || weightedScore > bestMatch.weightedScore) {
        bestMatch = { field, ...matchResult, weightedScore }
      }
    }
  })
  
  return {
    customer: {
      ...customer,
      _searchScore: totalScore,
      _searchMatches: fieldMatches,
      _bestMatch: bestMatch
    },
    totalScore,
    fieldMatches,
    bestMatch
  }
}

/**
 * Search and rank customers based on query
 * Returns sorted array of customers with relevance scores
 */
export function searchCustomers(customers, query, options = {}) {
  const {
    fieldWeights,
    minScore = 10,
    maxResults = 100,
    includeScores = false
  } = options
  
  if (!query || !customers || customers.length === 0) {
    return customers
  }
  
  const results = customers
    .map(customer => multiFieldSearch(customer, query, fieldWeights))
    .filter(result => result.totalScore >= minScore)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, maxResults)
    .map(result => includeScores ? result : result.customer)
  
  return results
}

/**
 * Generate search suggestions based on customer data
 * Returns relevant suggestions for autocomplete
 */
export function generateSearchSuggestions(customers, query, options = {}) {
  const {
    maxSuggestions = 8,
    minQueryLength = 2,
    includeFields = ['name', 'email', 'phone', 'preferred_services', 'tags']
  } = options
  
  if (!query || query.length < minQueryLength) return []
  
  const suggestions = new Set()
  const queryLower = query.toLowerCase()
  
  customers.forEach(customer => {
    includeFields.forEach(field => {
      const fieldValue = customer[field]
      if (!fieldValue) return
      
      const values = Array.isArray(fieldValue) ? fieldValue : [fieldValue]
      values.forEach(value => {
        const valueStr = String(value).toLowerCase()
        
        // Exact substring matches
        if (valueStr.includes(queryLower)) {
          suggestions.add(String(value))
        }
        
        // Fuzzy matches for typo tolerance
        const fuzzyResult = fuzzyMatch(valueStr, queryLower, { similarityThreshold: 0.7 })
        if (fuzzyResult.score > 30) {
          suggestions.add(String(value))
        }
      })
    })
  })
  
  return Array.from(suggestions)
    .sort((a, b) => {
      // Prioritize suggestions that start with the query
      const aStarts = a.toLowerCase().startsWith(queryLower)
      const bStarts = b.toLowerCase().startsWith(queryLower)
      
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      
      // Then by length (shorter first)
      return a.length - b.length
    })
    .slice(0, maxSuggestions)
}

/**
 * Highlight matching text in search results
 * Returns array of text segments with highlight information
 */
export function highlightMatches(text, matches) {
  if (!text || !matches || matches.length === 0) {
    return [{ type: 'text', content: text }]
  }
  
  // Sort and merge overlapping matches
  const sortedMatches = [...matches].sort((a, b) => a.start - b.start)
  const mergedMatches = []
  
  sortedMatches.forEach(match => {
    const lastMatch = mergedMatches[mergedMatches.length - 1]
    if (lastMatch && match.start <= lastMatch.end) {
      lastMatch.end = Math.max(lastMatch.end, match.end)
    } else {
      mergedMatches.push({ ...match })
    }
  })
  
  // Generate segments
  const segments = []
  let currentIndex = 0
  
  mergedMatches.forEach(match => {
    // Add text before match
    if (currentIndex < match.start) {
      segments.push({
        type: 'text',
        content: text.substring(currentIndex, match.start)
      })
    }
    
    // Add highlighted match
    segments.push({
      type: 'highlight',
      content: text.substring(match.start, match.end)
    })
    
    currentIndex = match.end
  })
  
  // Add remaining text
  if (currentIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(currentIndex)
    })
  }
  
  return segments
}

/**
 * Export filtered customers to CSV format
 * Generates CSV string with proper escaping and headers
 */
export function exportToCSV(customers, options = {}) {
  const {
    fields = ['name', 'email', 'phone', 'total_spent', 'visit_count', 'last_visit', 'health_score'],
    headers = {
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      total_spent: 'Total Spent',
      visit_count: 'Visit Count',
      last_visit: 'Last Visit',
      health_score: 'Health Score',
      loyalty_tier: 'Loyalty Tier',
      churn_risk: 'Churn Risk'
    },
    filename = `customers-export-${new Date().toISOString().split('T')[0]}.csv`
  } = options
  
  if (!customers || customers.length === 0) {
    throw new Error('No customers to export')
  }
  
  // CSV escape function
  const escapeCSV = (value) => {
    if (value == null) return ''
    const str = String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }
  
  // Generate headers
  const csvHeaders = fields.map(field => headers[field] || field).join(',')
  
  // Generate rows
  const csvRows = customers.map(customer => {
    return fields.map(field => {
      let value = customer[field]
      
      // Format special fields
      if (field === 'total_spent' && typeof value === 'number') {
        value = `$${value.toFixed(2)}`
      } else if (field === 'last_visit' && value) {
        value = new Date(value).toLocaleDateString()
      } else if (Array.isArray(value)) {
        value = value.join('; ')
      }
      
      return escapeCSV(value)
    }).join(',')
  })
  
  const csvContent = [csvHeaders, ...csvRows].join('\n')
  
  return {
    content: csvContent,
    filename,
    mimeType: 'text/csv'
  }
}

/**
 * Download CSV file in browser
 */
export function downloadCSV(csvData) {
  const blob = new Blob([csvData.content], { type: csvData.mimeType })
  const url = window.URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = csvData.filename
  link.style.display = 'none'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  window.URL.revokeObjectURL(url)
}

// Named export for the main search function
export const fuzzySearch = multiFieldSearch

export default {
  levenshteinDistance,
  calculateSimilarityScore,
  soundex,
  isPhoneticMatch,
  fuzzyMatch,
  multiFieldSearch,
  searchCustomers,
  generateSearchSuggestions,
  highlightMatches,
  exportToCSV,
  downloadCSV,
  fuzzySearch
}