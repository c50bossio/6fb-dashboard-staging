import { useState, useCallback, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { businessCoach } from '../lib/langchain/ai-agent'
import { supabase } from '../lib/supabase'

export function useAIAgent() {
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [insights, setInsights] = useState([])

  useEffect(() => {
    async function initSession() {
      if (!user) return

      try {
        const { data: supabaseUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.primaryEmailAddress?.emailAddress)
          .single()

        if (supabaseUser) {
          const { data: existingSession } = await supabase
            .from('ai_sessions')
            .select('*')
            .eq('user_id', supabaseUser.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (existingSession) {
            setSessionId(existingSession.id)
            await loadMessages(existingSession.id)
          } else {
            const newSessionId = await businessCoach.createSession(supabaseUser.id)
            setSessionId(newSessionId)
          }
        }
      } catch (err) {
        console.error('Session initialization error:', err)
        setError(err.message)
      }
    }

    initSession()
  }, [user])

  const loadMessages = async (sessionId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (err) {
      console.error('Error loading messages:', err)
    }
  }

  const sendMessage = useCallback(async (message, context = {}) => {
    if (!sessionId) {
      setError('No active session')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const userMessage = {
        role: 'user',
        content: message,
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, userMessage])

      const response = await businessCoach.chat(sessionId, message, context)

      const aiMessage = {
        role: 'assistant',
        content: response.response,
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, aiMessage])

      if (response.insights.length > 0) {
        setInsights(prev => [...prev, ...response.insights])
      }

      return response
    } catch (err) {
      setError(err.message)
      setMessages(prev => prev.slice(0, -1))
      return null
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  const coachMarketing = useCallback(async (question, businessData) => {
    if (!sessionId) return null
    
    setLoading(true)
    try {
      const response = await businessCoach.coachMarketing(sessionId, question, businessData)
      return response
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  const coachFinancial = useCallback(async (question, financialData) => {
    if (!sessionId) return null
    
    setLoading(true)
    try {
      const response = await businessCoach.coachFinancial(sessionId, question, financialData)
      return response
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  const coachOperations = useCallback(async (question, operationsData) => {
    if (!sessionId) return null
    
    setLoading(true)
    try {
      const response = await businessCoach.coachOperations(sessionId, question, operationsData)
      return response
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  const startNewSession = useCallback(async () => {
    if (!user) return

    try {
      const { data: supabaseUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.primaryEmailAddress?.emailAddress)
        .single()

      if (supabaseUser) {
        const newSessionId = await businessCoach.createSession(supabaseUser.id)
        setSessionId(newSessionId)
        setMessages([])
        setInsights([])
      }
    } catch (err) {
      setError(err.message)
    }
  }, [user])

  return {
    loading,
    error,
    sessionId,
    messages,
    insights,
    sendMessage,
    coachMarketing,
    coachFinancial,
    coachOperations,
    startNewSession
  }
}