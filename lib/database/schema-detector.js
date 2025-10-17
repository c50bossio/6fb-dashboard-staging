/**
 * Database Schema Detection Utility
 * 
 * Provides runtime detection of database schema state to enable
 * backward-compatible code that works with different database versions.
 * 
 * Used by enterprise location management to handle organization_id
 * column presence/absence gracefully.
 */

import { createClient } from '@/lib/supabase/server'

// Cache for schema detection results (5-minute TTL)
const schemaCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Check if a specific column exists in a table
 * @param {string} tableName - Name of the table
 * @param {string} columnName - Name of the column
 * @param {string} schema - Database schema (default: 'public')
 * @returns {Promise<boolean>} True if column exists
 */
export async function columnExists(tableName, columnName, schema = 'public') {
  const cacheKey = `${schema}.${tableName}.${columnName}`
  
  // Check cache first
  const cached = schemaCache.get(cacheKey)
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.exists
  }
  
  try {
    const supabase = await createClient()
    
    // Try to query the table with just this column to see if it exists
    // This will fail if the column doesn't exist, which tells us what we need to know
    const { data, error } = await supabase
      .from(tableName)
      .select(columnName)
      .limit(0) // Don't return any rows, just test the column
    
    // If there's no error, the column exists
    const exists = !error || !error.message.includes('column') 
    
    console.log(`[Schema Detector] Column check ${tableName}.${columnName}: ${exists ? 'EXISTS' : 'MISSING'} ${error ? `(${error.message})` : ''}`)
    
    // Cache the result
    schemaCache.set(cacheKey, {
      exists,
      timestamp: Date.now()
    })
    
    return exists
    
  } catch (error) {
    console.error(`[Schema Detector] Exception checking column ${tableName}.${columnName}:`, error)
    return false
  }
}

/**
 * Check multiple columns at once
 * @param {string} tableName - Name of the table
 * @param {string[]} columnNames - Array of column names to check
 * @param {string} schema - Database schema (default: 'public')
 * @returns {Promise<Object>} Object with column names as keys, boolean values
 */
export async function checkColumns(tableName, columnNames, schema = 'public') {
  const results = {}
  
  // Check all columns in parallel
  const checks = columnNames.map(async (columnName) => {
    const exists = await columnExists(tableName, columnName, schema)
    results[columnName] = exists
    return { columnName, exists }
  })
  
  await Promise.all(checks)
  return results
}

/**
 * Get the complete schema information for a table
 * @param {string} tableName - Name of the table
 * @param {string} schema - Database schema (default: 'public')
 * @returns {Promise<Object[]>} Array of column information
 */
export async function getTableSchema(tableName, schema = 'public') {
  const cacheKey = `schema.${schema}.${tableName}`
  
  // Check cache first
  const cached = schemaCache.get(cacheKey)
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.schema
  }
  
  try {
    const supabase = await createClient()
    
    // Get a sample row to infer schema (safer than information_schema)
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
    
    if (error) {
      console.error(`[Schema Detector] Error getting table schema for ${tableName}:`, error)
      return []
    }
    
    // Extract column names from the first row (or empty if no data)
    const tableSchema = data && data.length > 0 
      ? Object.keys(data[0]).map(columnName => ({
          column_name: columnName,
          data_type: typeof data[0][columnName],
          is_nullable: 'YES', // We can't determine this from sample data
          column_default: null // We can't determine this from sample data
        }))
      : []
    
    console.log(`[Schema Detector] Table schema for ${tableName}:`, tableSchema.map(col => col.column_name))
    
    // Cache the result
    schemaCache.set(cacheKey, {
      schema: tableSchema,
      timestamp: Date.now()
    })
    
    return tableSchema
    
  } catch (error) {
    console.error(`[Schema Detector] Exception getting table schema for ${tableName}:`, error)
    return []
  }
}

/**
 * Check if a table exists
 * @param {string} tableName - Name of the table
 * @param {string} schema - Database schema (default: 'public')
 * @returns {Promise<boolean>} True if table exists
 */
export async function tableExists(tableName, schema = 'public') {
  const cacheKey = `table.${schema}.${tableName}`
  
  // Check cache first
  const cached = schemaCache.get(cacheKey)
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.exists
  }
  
  try {
    const supabase = await createClient()
    
    // Try to query the table to see if it exists
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0) // Don't return any rows, just test if table exists
    
    // If there's no error, the table exists
    const exists = !error || !error.message.includes('relation') 
    
    console.log(`[Schema Detector] Table check ${tableName}: ${exists ? 'EXISTS' : 'MISSING'} ${error ? `(${error.message})` : ''}`)
    
    // Cache the result
    schemaCache.set(cacheKey, {
      exists,
      timestamp: Date.now()
    })
    
    return exists
    
  } catch (error) {
    console.error(`[Schema Detector] Exception checking table ${tableName}:`, error)
    return false
  }
}

/**
 * Get detailed database information for troubleshooting
 * @returns {Promise<Object>} Database information object
 */
export async function getDatabaseInfo() {
  try {
    const supabase = await createClient()
    
    // Get current database version
    const { data: versionData, error: versionError } = await supabase
      .rpc('version')
    
    // Get list of all tables in public schema
    const { data: tablesData, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name')
    
    // Get barbershops table columns specifically
    const barbershopsSchema = await getTableSchema('barbershops')
    
    return {
      version: versionError ? 'Unknown' : versionData,
      tables: tablesError ? [] : tablesData?.map(t => t.table_name) || [],
      barbershopsColumns: barbershopsSchema.map(col => col.column_name),
      hasOrganizationId: barbershopsSchema.some(col => col.column_name === 'organization_id'),
      cacheSize: schemaCache.size,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('[Schema Detector] Error getting database info:', error)
    return {
      version: 'Error',
      tables: [],
      barbershopsColumns: [],
      hasOrganizationId: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Clear the schema cache (useful for testing or after migrations)
 */
export function clearSchemaCache() {
  schemaCache.clear()
  console.log('[Schema Detector] Schema cache cleared')
}

/**
 * Enterprise-specific schema checks
 * Checks for all columns needed by enterprise location management
 */
export async function checkEnterpriseSchema() {
  const checks = await Promise.all([
    // Profiles table
    checkColumns('profiles', ['organization_id', 'shop_id', 'barbershop_id']),
    // Barbershops table  
    checkColumns('barbershops', ['organization_id', 'owner_id']),
    // Organizations table
    tableExists('organizations'),
    // Barbershop staff table
    tableExists('barbershop_staff')
  ])
  
  const [profileColumns, barbershopColumns, organizationsExists, staffTableExists] = checks
  
  const schemaState = {
    profiles: profileColumns,
    barbershops: barbershopColumns,
    organizationsTable: organizationsExists,
    staffTable: staffTableExists,
    // Determine support level
    supportsBasicEnterprise: barbershopColumns.owner_id,
    supportsFullEnterprise: barbershopColumns.organization_id && organizationsExists,
    supportsStaffAccess: staffTableExists,
    timestamp: new Date().toISOString()
  }
  
  console.log('[Schema Detector] Enterprise schema check:', schemaState)
  return schemaState
}

export default {
  columnExists,
  checkColumns,
  getTableSchema,
  tableExists,
  getDatabaseInfo,
  clearSchemaCache,
  checkEnterpriseSchema
}