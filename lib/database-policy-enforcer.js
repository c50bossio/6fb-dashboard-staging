/**
 * Database Policy Enforcer
 * 
 * This utility enforces the NO MOCK DATA policy across the entire application.
 * It provides centralized validation and monitoring to ensure only real database
 * data is used throughout the system.
 * 
 * @policy NO MOCK DATA - All data must come from real database sources
 */

class DatabasePolicyEnforcer {
  constructor() {
    this.violations = [];
    this.mockDataPatterns = [
      /mock/i,
      /fake/i,
      /dummy/i,
      /sample/i,
      /test data/i,
      /generateMock/i,
      /generateFake/i,
      /generateDummy/i,
      /hardcoded/i,
      /Customer \d+/,  // Pattern like "Customer 1", "Customer 2"
      /Service$/,      // Ends with just "Service" (not a real service name)
      /Test User/i,
      /John Doe/i,
      /Jane Doe/i,
      /foo@example\.com/i,
      /test@test\.com/i,
      /Lorem ipsum/i,
      /placeholder/i
    ];
    
    this.isProduction = process.env.NODE_ENV === 'production';
    this.strictMode = process.env.ENFORCE_NO_MOCK_DATA !== 'false';
  }

  /**
   * Check if a value appears to be mock data
   * @param {any} value - The value to check
   * @param {string} context - Where this value came from (for logging)
   * @returns {boolean} True if the value appears to be mock data
   */
  isMockData(value, context = '') {
    if (!value) return false;
    
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    for (const pattern of this.mockDataPatterns) {
      if (pattern.test(stringValue)) {
        this.logViolation({
          type: 'MOCK_DATA_DETECTED',
          value: stringValue.substring(0, 100), // Truncate for logging
          pattern: pattern.toString(),
          context,
          timestamp: new Date().toISOString()
        });
        return true;
      }
    }
    
    return false;
  }

  /**
   * Validate that data comes from a legitimate database source
   * @param {any} data - The data to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validateData(data, options = {}) {
    const {
      source = 'unknown',
      allowEmpty = true,
      requireDatabase = true,
      context = ''
    } = options;

    const result = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Check if data is empty
    if (!data || (Array.isArray(data) && data.length === 0)) {
      if (!allowEmpty) {
        result.valid = false;
        result.errors.push('Empty data not allowed - must fetch from database');
      }
      return result;
    }

    // Check for mock data patterns
    if (this.isMockData(data, context)) {
      result.valid = false;
      result.errors.push('Mock data detected - violates NO MOCK DATA policy');
    }

    // Check for common mock data structures
    if (Array.isArray(data)) {
      const hasMockItems = data.some(item => 
        this.isMockData(item, `${context}[array item]`)
      );
      if (hasMockItems) {
        result.valid = false;
        result.errors.push('Array contains mock data items');
      }
    }

    // Validate source
    if (requireDatabase && !this.isValidDatabaseSource(source)) {
      result.warnings.push(`Data source '${source}' may not be a real database`);
    }

    return result;
  }

  /**
   * Check if a source is a valid database source
   * @param {string} source - The data source identifier
   * @returns {boolean} True if the source is a valid database
   */
  isValidDatabaseSource(source) {
    const validSources = [
      'supabase',
      'postgresql',
      'postgres',
      'mysql',
      'mongodb',
      'sqlite',
      'database',
      'db',
      'api/database',
      'api/supabase'
    ];

    return validSources.some(valid => 
      source.toLowerCase().includes(valid)
    );
  }

  /**
   * Wrap a data fetching function to ensure it returns real data
   * @param {Function} fetchFn - The function that fetches data
   * @param {Object} options - Options for validation
   * @returns {Function} Wrapped function that validates data
   */
  wrapDataFetcher(fetchFn, options = {}) {
    const enforcer = this;
    
    return async function(...args) {
      const data = await fetchFn.apply(this, args);
      
      const validation = enforcer.validateData(data, {
        ...options,
        context: `${fetchFn.name || 'anonymous'}(${args.join(', ')})`
      });

      if (!validation.valid && enforcer.strictMode) {
        console.error('❌ DATABASE POLICY VIOLATION:', validation.errors);
        if (enforcer.isProduction) {
          // In production, log but don't break the app
          console.error('Mock data detected in production!', {
            function: fetchFn.name,
            errors: validation.errors
          });
        } else {
          // In development, throw an error to catch violations early
          throw new Error(`NO MOCK DATA POLICY VIOLATION: ${validation.errors.join(', ')}`);
        }
      }

      if (validation.warnings.length > 0) {
        console.warn('⚠️ Database Policy Warning:', validation.warnings);
      }

      return data;
    };
  }

  /**
   * Create a safe data generator that uses database seeds
   * @param {Object} supabase - Supabase client instance
   * @returns {Object} Data generator functions
   */
  createDatabaseSeeder(supabase) {
    return {
      /**
       * Get random real data from database
       * @param {string} table - Table name
       * @param {number} limit - Number of records to fetch
       */
      async getRandomData(table, limit = 10) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(limit)
          .order('random()');
        
        if (error) throw error;
        return data;
      },

      /**
       * Get test data (marked with is_test flag)
       * @param {string} table - Table name
       * @param {number} limit - Number of records to fetch  
       */
      async getTestData(table, limit = 10) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('is_test', true)
          .limit(limit);
        
        if (error) throw error;
        return data;
      },

      /**
       * Seed database with realistic test data
       * @param {string} table - Table name
       * @param {Array} records - Records to insert
       */
      async seedTestData(table, records) {
        // Mark all records as test data
        const testRecords = records.map(record => ({
          ...record,
          is_test: true,
          created_at: new Date().toISOString()
        }));

        const { data, error } = await supabase
          .from(table)
          .insert(testRecords)
          .select();
        
        if (error) throw error;
        return data;
      }
    };
  }

  /**
   * Log a policy violation
   * @param {Object} violation - Violation details
   */
  logViolation(violation) {
    this.violations.push(violation);
    
    if (this.violations.length % 10 === 0) {
      console.warn(`⚠️ ${this.violations.length} mock data violations detected`);
    }
  }

  /**
   * Get violation report
   * @returns {Object} Summary of violations
   */
  getViolationReport() {
    const report = {
      total: this.violations.length,
      byType: {},
      byContext: {},
      recent: this.violations.slice(-10)
    };

    this.violations.forEach(v => {
      report.byType[v.type] = (report.byType[v.type] || 0) + 1;
      report.byContext[v.context] = (report.byContext[v.context] || 0) + 1;
    });

    return report;
  }

  /**
   * Clear violation log
   */
  clearViolations() {
    this.violations = [];
  }

  /**
   * Middleware for Express/Next.js to check responses for mock data
   */
  createMiddleware() {
    const enforcer = this;
    
    return (req, res, next) => {
      const originalJson = res.json;
      
      res.json = function(data) {
        const validation = enforcer.validateData(data, {
          context: `API Response: ${req.method} ${req.url}`,
          source: 'api'
        });

        if (!validation.valid) {
          console.error('❌ Mock data in API response:', req.url, validation.errors);
          if (enforcer.strictMode && !enforcer.isProduction) {
            return originalJson.call(this, {
              error: 'NO_MOCK_DATA_POLICY_VIOLATION',
              message: 'Response contains mock data',
              violations: validation.errors
            });
          }
        }

        return originalJson.call(this, data);
      };

      next();
    };
  }

  /**
   * React hook to validate component data
   */
  useValidateData(data, componentName) {
    if (typeof window !== 'undefined') {
      const validation = this.validateData(data, {
        context: `React Component: ${componentName}`,
        source: 'component'
      });

      if (!validation.valid && this.strictMode) {
        console.error(`❌ Mock data in ${componentName}:`, validation.errors);
      }

      return validation;
    }
    return { valid: true, errors: [], warnings: [] };
  }
}

// Create singleton instance
const enforcer = new DatabasePolicyEnforcer();

// Export for use across the application
module.exports = enforcer;

// Also export the class for testing or custom instances
module.exports.DatabasePolicyEnforcer = DatabasePolicyEnforcer;