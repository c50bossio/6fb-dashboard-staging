import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Helper functions for common operations
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

// Real-time subscription helper
export function subscribeToTable(table, callback) {
  return supabase
    .channel(`public:${table}`)
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table 
    }, callback)
    .subscribe()
}

// Database helpers
export const db = {
  // Users
  users: {
    async create(userData) {
      const { data, error } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single()
      if (error) throw error
      return data
    },
    
    async findByEmail(email) {
      const { data, error } = await supabase
        .from('users')
        .select()
        .eq('email', email)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    
    async update(id, updates) {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    }
  },
  
  // AI Sessions
  sessions: {
    async create(sessionData) {
      const { data, error } = await supabase
        .from('ai_sessions')
        .insert(sessionData)
        .select()
        .single()
      if (error) throw error
      return data
    },
    
    async getByUser(userId) {
      const { data, error } = await supabase
        .from('ai_sessions')
        .select('*, messages(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  },
  
  // Messages
  messages: {
    async create(messageData) {
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single()
      if (error) throw error
      return data
    },
    
    async getBySession(sessionId) {
      const { data, error } = await supabase
        .from('messages')
        .select()
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    }
  }
}