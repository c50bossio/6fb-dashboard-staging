import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)

/**
 * List all tables in the database
 */
export async function listTables() {
  try {
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `
    
    const { data, error } = await supabase.rpc('exec_sql', { query })
    
    if (error) {
      const knownTables = [
        'profiles', 'tenants', 'agents', 'chat_history', 'notifications',
        'analytics_events', 'business_settings', 'feature_flags', 'token_usage',
        'tenant_subscriptions', 'usage_analytics', 'trial_tracking', 
        'usage_alerts', 'alert_preferences', 'payment_records', 'failed_payments'
      ]
      
      return knownTables.map(name => ({ table_name: name }))
    }
    
    return data || []
  } catch (err) {
    console.error('Error listing tables:', err)
    return []
  }
}

/**
 * Query a specific table
 * @param {string} tableName - Name of the table to query
 * @param {object} options - Query options (select, filter, limit, etc.)
 */
export async function queryTable(tableName, options = {}) {
  try {
    let query = supabase.from(tableName)
    
    if (options.select) {
      query = query.select(options.select)
    } else {
      query = query.select('*')
    }
    
    if (options.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }
    
    if (options.limit) {
      query = query.limit(options.limit)
    }
    
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? true })
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error(`Error querying ${tableName}:`, error)
      return { error: error.message }
    }
    
    return { data }
  } catch (err) {
    console.error(`Error querying ${tableName}:`, err)
    return { error: err.message }
  }
}

/**
 * Get table schema/structure
 * @param {string} tableName - Name of the table
 */
export async function getTableSchema(tableName) {
  try {
    const query = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = '${tableName}'
      ORDER BY ordinal_position
    `
    
    const { data, error } = await supabase.rpc('exec_sql', { query })
    
    if (error) {
      console.error(`Error fetching schema for ${tableName}:`, error)
      return { error: error.message }
    }
    
    return { data }
  } catch (err) {
    console.error(`Error fetching schema for ${tableName}:`, err)
    return { error: err.message }
  }
}

/**
 * Execute raw SQL query (read-only)
 * @param {string} sql - SQL query to execute
 */
export async function executeSQL(sql) {
  try {
    if (!sql.trim().toUpperCase().startsWith('SELECT')) {
      return { error: 'Only SELECT queries are allowed' }
    }
    
    const { data, error } = await supabase.rpc('exec_sql', { query: sql })
    
    if (error) {
      console.error('Error executing SQL:', error)
      return { error: error.message }
    }
    
    return { data }
  } catch (err) {
    console.error('Error executing SQL:', err)
    return { error: err.message }
  }
}

export default {
  listTables,
  queryTable,
  getTableSchema,
  executeSQL
}