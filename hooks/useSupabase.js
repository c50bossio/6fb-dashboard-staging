import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase/client'

const supabase = createClient()

export function useSupabaseUser() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}

export function useSupabaseQuery(table, filters = {}, options = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        let query = supabase.from(table).select(options.select || '*')

        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            query = query.eq(key, value)
          }
        })

        if (options.orderBy) {
          query = query.order(options.orderBy, { 
            ascending: options.ascending ?? false 
          })
        }

        if (options.limit) {
          query = query.limit(options.limit)
        }

        const { data, error } = await query

        if (error) throw error
        setData(data)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [table, JSON.stringify(filters), JSON.stringify(options)])

  return { data, loading, error }
}

export function useSupabaseRealtime(table, filters = {}, callback) {
  useEffect(() => {
    const channel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: Object.entries(filters)
            .map(([key, value]) => `${key}=eq.${value}`)
            .join(',')
        },
        (payload) => {
          callback(payload)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, JSON.stringify(filters)])
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export async function signUp(email, password, metadata = {}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function resetPassword(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })
  return { data, error }
}