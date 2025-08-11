// Temporary fix: Return mock client to avoid Next.js build issues
// TODO: Properly implement server-side Supabase client for app directory

export function createClient() {
  console.warn('⚠️ Using mock Supabase server client to avoid build issues')
  
  // Return a mock client for testing
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
    from: (table) => ({
      select: () => ({ 
        limit: () => Promise.resolve({ data: [], error: null }),
        then: (callback) => callback({ data: [], error: null })
      }),
      insert: () => Promise.resolve({ data: null, error: new Error('Mock Supabase - not configured') }),
      update: () => Promise.resolve({ data: null, error: new Error('Mock Supabase - not configured') }),
      delete: () => Promise.resolve({ data: null, error: new Error('Mock Supabase - not configured') })
    })
  }
}