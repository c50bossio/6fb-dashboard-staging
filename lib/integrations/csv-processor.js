/**
 * CSV Processor - Core CSV parsing and processing functionality
 * Uses Papa Parse for robust CSV handling
 * Supports chunked processing for large files
 */

import Papa from 'papaparse'
import { EventEmitter } from 'events'

export class CSVProcessor extends EventEmitter {
  constructor(options = {}) {
    super()
    
    this.options = {
      maxFileSize: options.maxFileSize || 50 * 1024 * 1024, // 50MB default
      chunkSize: options.chunkSize || 1024 * 1024, // 1MB chunks
      batchSize: options.batchSize || 1000, // Process 1000 rows at a time
      encoding: options.encoding || 'UTF-8',
      ...options
    }
    
    this.stats = {
      totalRows: 0,
      processedRows: 0,
      validRows: 0,
      invalidRows: 0,
      startTime: null,
      endTime: null
    }
  }

  /**
   * Parse CSV file with automatic delimiter detection
   * @param {File|Blob|string} file - File to parse
   * @param {Object} options - Parsing options
   * @returns {Promise} Parsed data with metadata
   */
  async parseCSV(file, options = {}) {
    return new Promise((resolve, reject) => {
      this.stats.startTime = Date.now()
      
      // Validate file size
      if (file.size && file.size > this.options.maxFileSize) {
        reject(new Error(`File size ${this.formatBytes(file.size)} exceeds maximum of ${this.formatBytes(this.options.maxFileSize)}`))
        return
      }

      const results = {
        data: [],
        errors: [],
        meta: {},
        warnings: []
      }

      // Configure Papa Parse
      const config = {
        delimiter: options.delimiter || '', // Auto-detect if not specified
        header: options.hasHeaders !== false, // Default to true
        dynamicTyping: true, // Auto-convert numbers
        skipEmptyLines: 'greedy', // Skip empty lines
        encoding: this.options.encoding,
        chunk: file.size > 10 * 1024 * 1024 ? this.handleChunk.bind(this) : undefined, // Use chunks for files > 10MB
        complete: (parseResults) => {
          this.stats.endTime = Date.now()
          
          results.data = parseResults.data
          results.errors = parseResults.errors
          results.meta = {
            ...parseResults.meta,
            processingTime: this.stats.endTime - this.stats.startTime,
            totalRows: parseResults.data.length,
            delimiter: parseResults.meta.delimiter,
            encoding: this.options.encoding
          }

          // Add warnings for potential issues
          this.detectWarnings(results)
          
          this.emit('complete', results)
          resolve(results)
        },
        error: (error) => {
          this.emit('error', error)
          reject(error)
        },
        ...options.parserOptions
      }

      // Start parsing
      if (typeof file === 'string') {
        Papa.parse(file, config)
      } else {
        Papa.parse(file, config)
      }
    })
  }

  /**
   * Handle chunked parsing for large files
   * @param {Object} chunk - Chunk data from Papa Parse
   * @param {Object} parser - Parser instance
   */
  handleChunk(chunk, parser) {
    const rows = chunk.data
    this.stats.totalRows += rows.length
    
    // Emit progress event
    this.emit('progress', {
      processedRows: this.stats.totalRows,
      currentChunk: rows.length,
      errors: chunk.errors
    })

    // Process batch if needed
    if (this.options.onBatch) {
      this.options.onBatch(rows, chunk.meta)
    }

    // Pause if needed for backpressure
    if (this.options.pauseOnChunk) {
      parser.pause()
      this.options.pauseOnChunk(() => parser.resume())
    }
  }

  /**
   * Detect potential issues in parsed data
   * @param {Object} results - Parsed results
   */
  detectWarnings(results) {
    const warnings = []
    
    if (!results.data || results.data.length === 0) {
      warnings.push({ type: 'empty', message: 'No data found in file' })
    }

    // Check for inconsistent column counts
    if (results.data.length > 1) {
      const headerCount = Object.keys(results.data[0]).length
      const inconsistentRows = results.data.filter((row, index) => {
        const rowCount = Object.keys(row).length
        if (rowCount !== headerCount) {
          warnings.push({
            type: 'inconsistent_columns',
            row: index + 1,
            expected: headerCount,
            actual: rowCount
          })
          return true
        }
        return false
      })
    }

    // Check for common date format issues
    const datePatterns = {
      'MM/DD/YYYY': /^\d{1,2}\/\d{1,2}\/\d{4}$/,
      'DD/MM/YYYY': /^\d{1,2}\/\d{1,2}\/\d{4}$/,
      'YYYY-MM-DD': /^\d{4}-\d{2}-\d{2}$/,
      'MM-DD-YYYY': /^\d{1,2}-\d{1,2}-\d{4}$/
    }

    // Platform-specific delimiter warnings
    if (results.meta.delimiter === ';') {
      warnings.push({
        type: 'delimiter',
        message: 'Semicolon delimiter detected (common in Trafft exports)'
      })
    }

    results.warnings = warnings
  }

  /**
   * Validate CSV structure against expected schema
   * @param {Array} data - Parsed CSV data
   * @param {Object} schema - Expected schema
   * @returns {Object} Validation results
   */
  validateSchema(data, schema) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      fieldMapping: {}
    }

    if (!data || data.length === 0) {
      validation.isValid = false
      validation.errors.push({ type: 'empty', message: 'No data to validate' })
      return validation
    }

    const headers = Object.keys(data[0])
    
    // Check required fields
    if (schema.required) {
      schema.required.forEach(field => {
        const found = this.findMatchingField(field, headers)
        if (!found) {
          validation.isValid = false
          validation.errors.push({
            type: 'missing_required',
            field: field,
            message: `Required field "${field}" not found`
          })
        } else {
          validation.fieldMapping[field] = found
        }
      })
    }

    // Map optional fields
    if (schema.optional) {
      Object.keys(schema.optional).forEach(field => {
        const found = this.findMatchingField(field, headers, schema.optional[field])
        if (found) {
          validation.fieldMapping[field] = found
        } else {
          validation.warnings.push({
            type: 'missing_optional',
            field: field,
            message: `Optional field "${field}" not found`
          })
        }
      })
    }

    // Check for extra fields not in schema
    const mappedFields = Object.values(validation.fieldMapping)
    const extraFields = headers.filter(h => !mappedFields.includes(h))
    if (extraFields.length > 0) {
      validation.warnings.push({
        type: 'extra_fields',
        fields: extraFields,
        message: `Found ${extraFields.length} unmapped fields`
      })
    }

    return validation
  }

  /**
   * Find matching field using fuzzy matching
   * @param {string} targetField - Field to find
   * @param {Array} headers - Available headers
   * @param {Array} aliases - Alternative names
   * @returns {string|null} Matching field name
   */
  findMatchingField(targetField, headers, aliases = []) {
    // Exact match
    if (headers.includes(targetField)) {
      return targetField
    }

    // Case-insensitive match
    const lowerTarget = targetField.toLowerCase()
    const caseMatch = headers.find(h => h.toLowerCase() === lowerTarget)
    if (caseMatch) return caseMatch

    // Check aliases
    const allAliases = [targetField, ...aliases]
    for (const alias of allAliases) {
      const aliasLower = alias.toLowerCase()
      const match = headers.find(h => h.toLowerCase().includes(aliasLower) || aliasLower.includes(h.toLowerCase()))
      if (match) return match
    }

    // Fuzzy matching for common variations
    const variations = this.generateFieldVariations(targetField)
    for (const variation of variations) {
      const match = headers.find(h => h.toLowerCase() === variation.toLowerCase())
      if (match) return match
    }

    return null
  }

  /**
   * Generate common field name variations
   * @param {string} field - Field name
   * @returns {Array} Variations
   */
  generateFieldVariations(field) {
    const variations = []
    
    // Handle underscores and spaces
    variations.push(field.replace(/_/g, ' '))
    variations.push(field.replace(/ /g, '_'))
    variations.push(field.replace(/-/g, '_'))
    variations.push(field.replace(/_/g, '-'))
    
    // Common abbreviations
    const abbreviations = {
      'customer': ['cust', 'client'],
      'appointment': ['appt', 'booking'],
      'phone': ['tel', 'telephone', 'mobile', 'cell'],
      'email': ['e-mail', 'email_address'],
      'address': ['addr', 'location'],
      'description': ['desc', 'details'],
      'datetime': ['date_time', 'timestamp']
    }

    Object.keys(abbreviations).forEach(key => {
      if (field.toLowerCase().includes(key)) {
        abbreviations[key].forEach(abbr => {
          variations.push(field.toLowerCase().replace(key, abbr))
        })
      }
    })

    return [...new Set(variations)]
  }

  /**
   * Process CSV data in batches
   * @param {Array} data - Data to process
   * @param {Function} processor - Processing function
   * @param {Object} options - Processing options
   */
  async processBatches(data, processor, options = {}) {
    const batchSize = options.batchSize || this.options.batchSize
    const batches = []
    
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize))
    }

    const results = []
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      
      this.emit('batchStart', {
        batchNumber: i + 1,
        totalBatches: batches.length,
        batchSize: batch.length
      })

      try {
        const batchResult = await processor(batch, i)
        results.push(batchResult)
        
        this.emit('batchComplete', {
          batchNumber: i + 1,
          totalBatches: batches.length,
          results: batchResult
        })
      } catch (error) {
        this.emit('batchError', {
          batchNumber: i + 1,
          error: error
        })
        
        if (!options.continueOnError) {
          throw error
        }
      }

      // Add delay between batches if specified
      if (options.batchDelay && i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, options.batchDelay))
      }
    }

    return results
  }

  /**
   * Format bytes to human readable
   * @param {number} bytes - Bytes to format
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * Get import statistics
   * @returns {Object} Current statistics
   */
  getStats() {
    return {
      ...this.stats,
      processingTime: this.stats.endTime ? this.stats.endTime - this.stats.startTime : null,
      rowsPerSecond: this.stats.processedRows && this.stats.endTime 
        ? Math.round(this.stats.processedRows / ((this.stats.endTime - this.stats.startTime) / 1000))
        : null
    }
  }
}

// Platform-specific date parsers
export const DateParsers = {
  'MM/DD/YYYY': (dateStr) => {
    const [month, day, year] = dateStr.split('/')
    return new Date(year, month - 1, day)
  },
  'DD/MM/YYYY': (dateStr) => {
    const [day, month, year] = dateStr.split('/')
    return new Date(year, month - 1, day)
  },
  'YYYY-MM-DD': (dateStr) => {
    return new Date(dateStr)
  },
  'MM-DD-YYYY': (dateStr) => {
    const [month, day, year] = dateStr.split('-')
    return new Date(year, month - 1, day)
  }
}

// Export singleton instance for convenience
export default new CSVProcessor()