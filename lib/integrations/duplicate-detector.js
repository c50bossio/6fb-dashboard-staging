/**
 * Duplicate Detector - Intelligent duplicate detection for imported data
 * Uses fuzzy matching and configurable similarity thresholds
 */

import { createClient } from '@supabase/supabase-js'

export class DuplicateDetector {
  constructor(supabase, options = {}) {
    this.supabase = supabase
    this.options = {
      threshold: options.threshold || 0.85, // 85% similarity threshold
      checkEmail: options.checkEmail !== false,
      checkPhone: options.checkPhone !== false,
      checkName: options.checkName !== false,
      batchSize: options.batchSize || 100,
      ...options
    }
  }

  /**
   * Check for duplicates in a batch of records
   * @param {Array} records - Records to check
   * @param {string} entityType - Type of entity (customers, appointments, services)
   * @param {string} barbershopId - Barbershop ID to check within
   * @returns {Object} Duplicate detection results
   */
  async checkDuplicates(records, entityType, barbershopId) {
    const results = {
      records: [],
      stats: {
        total: records.length,
        unique: 0,
        duplicates: 0,
        potentialDuplicates: 0
      }
    }

    // Get existing records from database
    const existing = await this.fetchExistingRecords(entityType, barbershopId)
    
    // Build search indexes for efficient matching
    const emailIndex = this.buildIndex(existing, 'email')
    const phoneIndex = this.buildIndex(existing, 'phone')
    const nameIndex = this.buildNameIndex(existing)

    // Check each record
    for (const record of records) {
      const duplicateCheck = await this.checkSingleRecord(
        record,
        entityType,
        { emailIndex, phoneIndex, nameIndex },
        existing
      )
      
      results.records.push(duplicateCheck)
      
      if (duplicateCheck.isDuplicate) {
        results.stats.duplicates++
      } else if (duplicateCheck.potentialDuplicates.length > 0) {
        results.stats.potentialDuplicates++
      } else {
        results.stats.unique++
      }
    }

    return results
  }

  /**
   * Check a single record for duplicates
   * @param {Object} record - Record to check
   * @param {string} entityType - Entity type
   * @param {Object} indexes - Search indexes
   * @param {Array} existing - Existing records
   * @returns {Object} Duplicate check result
   */
  async checkSingleRecord(record, entityType, indexes, existing) {
    const result = {
      original: record,
      isDuplicate: false,
      duplicateOf: null,
      potentialDuplicates: [],
      matchDetails: {}
    }

    // Check exact matches first (faster)
    if (this.options.checkEmail && record.email) {
      const emailMatch = indexes.emailIndex[record.email.toLowerCase()]
      if (emailMatch) {
        result.isDuplicate = true
        result.duplicateOf = emailMatch
        result.matchDetails.email = { type: 'exact', score: 1.0 }
        return result
      }
    }

    if (this.options.checkPhone && record.phone) {
      const normalizedPhone = this.normalizePhone(record.phone)
      const phoneMatch = indexes.phoneIndex[normalizedPhone]
      if (phoneMatch) {
        result.isDuplicate = true
        result.duplicateOf = phoneMatch
        result.matchDetails.phone = { type: 'exact', score: 1.0 }
        return result
      }
    }

    // Fuzzy matching for names and potential duplicates
    if (this.options.checkName && record.name) {
      const nameMatches = this.findSimilarNames(record.name, indexes.nameIndex)
      
      for (const match of nameMatches) {
        if (match.score >= this.options.threshold) {
          // High confidence match
          if (!result.isDuplicate || match.score > result.matchDetails.name?.score) {
            result.isDuplicate = true
            result.duplicateOf = match.record
            result.matchDetails.name = { type: 'fuzzy', score: match.score }
          }
        } else if (match.score >= 0.7) {
          // Potential duplicate for manual review
          result.potentialDuplicates.push({
            record: match.record,
            score: match.score,
            matchType: 'name'
          })
        }
      }
    }

    // Check for combination matches (name + partial phone/email)
    if (!result.isDuplicate && result.potentialDuplicates.length > 0) {
      result.potentialDuplicates = this.rankPotentialDuplicates(
        record,
        result.potentialDuplicates
      )
    }

    return result
  }

  /**
   * Fetch existing records from database
   * @param {string} entityType - Entity type
   * @param {string} barbershopId - Barbershop ID
   * @returns {Array} Existing records
   */
  async fetchExistingRecords(entityType, barbershopId) {
    let query
    
    switch (entityType) {
      case 'customers':
        query = this.supabase
          .from('customers')
          .select('id, name, email, phone, created_at')
          .eq('barbershop_id', barbershopId)
        break
      
      case 'appointments':
        query = this.supabase
          .from('appointments')
          .select('id, customer_id, service_id, appointment_date, appointment_time')
          .eq('barbershop_id', barbershopId)
        break
      
      case 'services':
        query = this.supabase
          .from('services')
          .select('id, name, duration, price')
          .eq('barbershop_id', barbershopId)
        break
      
      default:
        throw new Error(`Unknown entity type: ${entityType}`)
    }

    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching existing records:', error)
      return []
    }
    
    return data || []
  }

  /**
   * Build index for efficient lookups
   * @param {Array} records - Records to index
   * @param {string} field - Field to index by
   * @returns {Object} Index object
   */
  buildIndex(records, field) {
    const index = {}
    
    for (const record of records) {
      if (record[field]) {
        const key = field === 'email' 
          ? record[field].toLowerCase()
          : field === 'phone' 
          ? this.normalizePhone(record[field])
          : record[field]
        
        index[key] = record
      }
    }
    
    return index
  }

  /**
   * Build name index with normalized variations
   * @param {Array} records - Records to index
   * @returns {Array} Name index
   */
  buildNameIndex(records) {
    const index = []
    
    for (const record of records) {
      if (record.name) {
        index.push({
          record: record,
          normalized: this.normalizeName(record.name),
          tokens: this.tokenizeName(record.name)
        })
      }
    }
    
    return index
  }

  /**
   * Find similar names using fuzzy matching
   * @param {string} name - Name to match
   * @param {Array} nameIndex - Name index
   * @returns {Array} Similar names with scores
   */
  findSimilarNames(name, nameIndex) {
    const normalized = this.normalizeName(name)
    const tokens = this.tokenizeName(name)
    const matches = []
    
    for (const entry of nameIndex) {
      // Calculate similarity score
      let score = 0
      
      // Exact match
      if (normalized === entry.normalized) {
        score = 1.0
      } else {
        // Token-based similarity
        const tokenScore = this.calculateTokenSimilarity(tokens, entry.tokens)
        
        // Levenshtein distance
        const distanceScore = this.calculateLevenshteinSimilarity(
          normalized,
          entry.normalized
        )
        
        // Weighted average
        score = (tokenScore * 0.6 + distanceScore * 0.4)
      }
      
      if (score >= 0.7) {
        matches.push({
          record: entry.record,
          score: score
        })
      }
    }
    
    return matches.sort((a, b) => b.score - a.score)
  }

  /**
   * Calculate token-based similarity
   * @param {Array} tokens1 - First token set
   * @param {Array} tokens2 - Second token set
   * @returns {number} Similarity score (0-1)
   */
  calculateTokenSimilarity(tokens1, tokens2) {
    const set1 = new Set(tokens1)
    const set2 = new Set(tokens2)
    
    const intersection = new Set([...set1].filter(x => set2.has(x)))
    const union = new Set([...set1, ...set2])
    
    return intersection.size / union.size
  }

  /**
   * Calculate Levenshtein distance similarity
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  calculateLevenshteinSimilarity(str1, str2) {
    const distance = this.levenshteinDistance(str1, str2)
    const maxLength = Math.max(str1.length, str2.length)
    
    if (maxLength === 0) return 1.0
    
    return 1 - (distance / maxLength)
  }

  /**
   * Calculate Levenshtein distance
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  /**
   * Rank potential duplicates by multiple factors
   * @param {Object} record - Record being checked
   * @param {Array} potentials - Potential duplicates
   * @returns {Array} Ranked potential duplicates
   */
  rankPotentialDuplicates(record, potentials) {
    return potentials.map(potential => {
      let totalScore = potential.score
      let matchCount = 1
      
      // Boost score for additional matching fields
      if (record.email && potential.record.email) {
        const emailSimilarity = this.calculateLevenshteinSimilarity(
          record.email.toLowerCase(),
          potential.record.email.toLowerCase()
        )
        if (emailSimilarity > 0.8) {
          totalScore += emailSimilarity * 0.3
          matchCount++
        }
      }
      
      if (record.phone && potential.record.phone) {
        const phone1 = this.normalizePhone(record.phone)
        const phone2 = this.normalizePhone(potential.record.phone)
        
        if (phone1.slice(-7) === phone2.slice(-7)) {
          totalScore += 0.2 // Last 7 digits match
          matchCount++
        }
      }
      
      return {
        ...potential,
        combinedScore: totalScore / matchCount,
        matchedFields: matchCount
      }
    }).sort((a, b) => b.combinedScore - a.combinedScore)
  }

  /**
   * Normalize name for comparison
   * @param {string} name - Name to normalize
   * @returns {string} Normalized name
   */
  normalizeName(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')         // Normalize whitespace
      .trim()
  }

  /**
   * Tokenize name into parts
   * @param {string} name - Name to tokenize
   * @returns {Array} Name tokens
   */
  tokenizeName(name) {
    return this.normalizeName(name)
      .split(' ')
      .filter(token => token.length > 1) // Ignore single characters
  }

  /**
   * Normalize phone number for comparison
   * @param {string} phone - Phone number
   * @returns {string} Normalized phone
   */
  normalizePhone(phone) {
    return String(phone).replace(/\D/g, '')
  }

  /**
   * Merge duplicate records
   * @param {Object} existing - Existing record
   * @param {Object} incoming - Incoming record
   * @param {string} strategy - Merge strategy
   * @returns {Object} Merged record
   */
  mergeRecords(existing, incoming, strategy = 'preserve_existing') {
    const merged = { ...existing }
    
    switch (strategy) {
      case 'preserve_existing':
        // Only add missing fields from incoming
        for (const [key, value] of Object.entries(incoming)) {
          if (!merged[key] && value) {
            merged[key] = value
          }
        }
        break
      
      case 'overwrite':
        // Overwrite with incoming data
        Object.assign(merged, incoming)
        break
      
      case 'newest':
        // Use the newer value for each field
        for (const [key, value] of Object.entries(incoming)) {
          if (value && (!merged[key] || incoming.updated_at > existing.updated_at)) {
            merged[key] = value
          }
        }
        break
      
      case 'manual':
        // Return both for manual review
        return {
          existing: existing,
          incoming: incoming,
          requiresReview: true
        }
    }
    
    merged.updated_at = new Date().toISOString()
    return merged
  }
}

export default DuplicateDetector