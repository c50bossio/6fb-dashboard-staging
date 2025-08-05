'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export function useAgentCollaboration() {
  const [collaborationData, setCollaborationData] = useState(null)
  const [isCollaborating, setIsCollaborating] = useState(false)
  const [activeAgents, setActiveAgents] = useState([])
  const [collaborationHistory, setCollaborationHistory] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const abortControllerRef = useRef(null)

  // Process agent response and extract collaboration data
  const processAgentResponse = useCallback((response) => {
    if (!response) return null

    // Check if this is a collaborative response from the agent manager
    if (response.primary_agent && response.collaborative_responses) {
      const collaborationInfo = {
        primary_agent: response.primary_agent,
        collaborative_responses: response.collaborative_responses || [],
        coordination_summary: response.coordination_summary || '',
        collaboration_score: response.collaboration_score || 0,
        total_confidence: response.total_confidence || 0,
        combined_recommendations: response.combined_recommendations || [],
        timestamp: response.timestamp || new Date().toISOString(),
        is_collaborative: response.collaborative_responses?.length > 0
      }

      setCollaborationData(collaborationInfo)
      setIsCollaborating(collaborationInfo.is_collaborative)
      
      // Extract active agents
      const agents = [response.primary_agent]
      if (response.collaborative_responses) {
        agents.push(...response.collaborative_responses.map(r => 
          r.agent_id?.replace('_', ' ').replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
          ) || 'Unknown Agent'
        ))
      }
      setActiveAgents(agents)

      // Add to history
      setCollaborationHistory(prev => [
        collaborationInfo,
        ...prev.slice(0, 9) // Keep last 10 collaborations
      ])

      return collaborationInfo
    }

    // Handle single agent response
    if (response.agent_id || response.provider) {
      const singleAgentInfo = {
        primary_agent: response.agent_id || response.provider || 'AI Assistant',
        collaborative_responses: [],
        coordination_summary: `${response.agent_id || response.provider || 'AI Assistant'} provided specialized guidance.`,
        collaboration_score: response.confidence || 0.8,
        total_confidence: response.confidence || 0.8,
        combined_recommendations: response.recommendations || [],
        timestamp: response.timestamp || new Date().toISOString(),
        is_collaborative: false
      }

      setCollaborationData(singleAgentInfo)
      setIsCollaborating(false)
      setActiveAgents([singleAgentInfo.primary_agent])

      return singleAgentInfo
    }

    return null
  }, [])

  // Fetch agent status from the backend
  const fetchAgentStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/agents/status')
      if (response.ok) {
        const statusData = await response.json()
        return statusData
      }
    } catch (error) {
      console.error('Failed to fetch agent status:', error)
    }
    return null
  }, [])

  // Send a message to the agent system and process collaboration
  const sendToAgents = useCallback(async (message, context = {}) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setIsLoading(true)
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/ai/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          context,
          request_collaboration: true // Flag to request collaboration data
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`Agent request failed: ${response.status}`)
      }

      const data = await response.json()
      
      // Process the response for collaboration data
      const collaborationInfo = processAgentResponse(data)
      
      return {
        success: true,
        data,
        collaboration: collaborationInfo
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        return { success: false, error: 'Request cancelled', aborted: true }
      }
      
      console.error('Agent collaboration error:', error)
      return { success: false, error: error.message }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [processAgentResponse])

  // Clear collaboration data
  const clearCollaboration = useCallback(() => {
    setCollaborationData(null)
    setIsCollaborating(false)
    setActiveAgents([])
  }, [])

  // Get collaboration statistics
  const getCollaborationStats = useCallback(() => {
    if (!collaborationHistory.length) {
      return {
        total_collaborations: 0,
        avg_collaboration_score: 0,
        most_active_agent: null,
        collaboration_rate: 0
      }
    }

    const totalCollaborations = collaborationHistory.length
    const multiAgentCollaborations = collaborationHistory.filter(c => c.is_collaborative).length
    const avgScore = collaborationHistory.reduce((sum, c) => sum + c.collaboration_score, 0) / totalCollaborations

    // Find most active agent
    const agentCounts = {}
    collaborationHistory.forEach(collab => {
      agentCounts[collab.primary_agent] = (agentCounts[collab.primary_agent] || 0) + 1
      collab.collaborative_responses?.forEach(response => {
        const agentName = response.agent_id?.replace('_', ' ') || 'Unknown'
        agentCounts[agentName] = (agentCounts[agentName] || 0) + 1
      })
    })

    const mostActiveAgent = Object.entries(agentCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null

    return {
      total_collaborations: totalCollaborations,
      multi_agent_collaborations: multiAgentCollaborations,
      avg_collaboration_score: avgScore,
      most_active_agent: mostActiveAgent,
      collaboration_rate: multiAgentCollaborations / totalCollaborations
    }
  }, [collaborationHistory])

  // Cancel any ongoing requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    // Current collaboration state
    collaborationData,
    isCollaborating,
    activeAgents,
    isLoading,

    // History and stats
    collaborationHistory,
    getCollaborationStats,

    // Actions
    sendToAgents,
    processAgentResponse,
    clearCollaboration,
    fetchAgentStatus,

    // Utilities
    hasCollaborationData: !!collaborationData,
    collaborationScore: collaborationData?.collaboration_score || 0,
    totalConfidence: collaborationData?.total_confidence || 0,
    coordinationSummary: collaborationData?.coordination_summary || ''
  }
}

// Hook for just monitoring agent activity (no message sending)
export function useAgentStatus() {
  const [agentStatus, setAgentStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/ai/agents/status')
      if (response.ok) {
        const data = await response.json()
        setAgentStatus(data)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch agent status:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  return {
    agentStatus,
    isLoading,
    lastUpdate,
    refetch: fetchStatus,
    activeAgents: agentStatus?.active_agents || 0,
    totalAgents: agentStatus?.total_agents || 0,
    systemStatus: agentStatus?.system_status || 'unknown'
  }
}