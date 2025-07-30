'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AgentCoordinationPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [agents, setAgents] = useState({
    business: [],
    orchestration: [],
    specialized: []
  })
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [requestType, setRequestType] = useState('analyze')
  const [content, setContent] = useState('')
  const [businessObjective, setBusinessObjective] = useState('')
  const [priority, setPriority] = useState('medium')
  const [coordinationMode, setCoordinationMode] = useState('auto')
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (token) {
      fetchAgents()
    }
  }, [token])

  const checkAuth = async () => {
    try {
      const storedToken = localStorage.getItem('auth_token')
      if (!storedToken) {
        router.push('/auth')
        return
      }

      const response = await fetch('http://localhost:8002/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${storedToken}`
        }
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        setToken(storedToken)
      } else {
        localStorage.removeItem('auth_token')
        router.push('/auth')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/auth')
    } finally {
      setAuthLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    setUser(null)
    setToken(null)
    router.push('/auth')
  }

  const fetchAgents = async () => {
    try {
      const response = await fetch('http://localhost:8002/api/v1/agents/list')
      const data = await response.json()
      setAgents({
        business: data.business_agents || [],
        orchestration: data.orchestration_agents || [],
        specialized: data.specialized_agents || []
      })
    } catch (error) {
      console.error('Error fetching agents:', error)
    }
  }

  const coordinateAgents = async () => {
    if (!content.trim()) return

    setLoading(true)
    try {
      const requestBody = {
        request_type: requestType,
        content: content,
        agent_preference: selectedAgent?.id,
        context: {},
        business_objective: businessObjective || null,
        priority: priority,
        coordination_mode: coordinationMode
      }

      const response = await fetch('http://localhost:8002/api/v1/agents/coordinate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      setResponse(data)
    } catch (error) {
      console.error('Error coordinating agents:', error)
      setResponse({
        success: false,
        response: 'Error coordinating agents. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  const AgentCard = ({ agent, tier }) => (
    <div 
      className={`p-3 border rounded-lg cursor-pointer transition-all ${
        selectedAgent?.id === agent.id 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => setSelectedAgent(agent)}
    >
      <div className="font-medium text-sm">{agent.name}</div>
      <div className="text-xs text-gray-500 mt-1">{agent.description}</div>
      <div className="text-xs text-gray-400 mt-1">
        {agent.specialties?.join(', ') || 'General'}
      </div>
    </div>
  )

  const TierSection = ({ title, agents, tier, emoji }) => (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <span>{emoji}</span>
        {title}
        <span className="text-sm text-gray-500">({agents.length})</span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} tier={tier} />
        ))}
      </div>
    </div>
  )

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <h1 className="text-2xl font-bold text-gray-900">
                🎯 6FB AI Agent System
              </h1>
              <nav className="flex gap-4">
                <button 
                  onClick={() => router.push('/agent-coordination')}
                  className="px-3 py-2 text-blue-600 bg-blue-50 rounded-md font-medium"
                >
                  Coordination
                </button>
                <button 
                  onClick={() => router.push('/dashboard')}
                  className="px-3 py-2 text-gray-600 hover:text-gray-900 rounded-md font-medium"
                >
                  Dashboard
                </button>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                👤 {user?.email}
              </div>
              <button
                onClick={logout}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Agent Coordination Interface
          </h2>
          <p className="text-gray-600 mt-1">
            Coordinate 39 specialized AI agents across three intelligent tiers
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agent Selection Panel */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Available Agents</h2>
            
            <TierSection 
              title="Business Intelligence Agents"
              agents={agents.business}
              tier="business"
              emoji="🏢"
            />
            
            <TierSection 
              title="BMAD Orchestration Agents"
              agents={agents.orchestration}
              tier="orchestration"
              emoji="🎭"
            />
            
            <TierSection 
              title="Specialized Execution Agents"
              agents={agents.specialized}
              tier="specialized"
              emoji="⚙️"
            />
          </div>

          {/* Coordination Interface */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Coordinate Request</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Request Type
                </label>
                <select 
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="analyze">Analyze</option>
                  <option value="implement">Implement</option>
                  <option value="optimize">Optimize</option>
                  <option value="coordinate">Coordinate</option>
                  <option value="design">Design</option>
                  <option value="plan">Plan</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Request Content
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Describe what you need the agents to work on..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 h-24"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Objective (Optional)
                </label>
                <input
                  type="text"
                  value={businessObjective}
                  onChange={(e) => setBusinessObjective(e.target.value)}
                  placeholder="e.g., Increase revenue by 25%"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select 
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mode
                  </label>
                  <select 
                    value={coordinationMode}
                    onChange={(e) => setCoordinationMode(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="auto">Auto</option>
                    <option value="direct">Direct</option>
                    <option value="orchestrated">Orchestrated</option>
                  </select>
                </div>
              </div>

              {selectedAgent && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="text-sm font-medium text-blue-800">
                    Preferred Agent: {selectedAgent.name}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {selectedAgent.description}
                  </div>
                </div>
              )}

              <button
                onClick={coordinateAgents}
                disabled={loading || !content.trim()}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Coordinating...' : 'Coordinate Agents'}
              </button>
            </div>
          </div>
        </div>

        {/* Response Display */}
        {response && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Coordination Response</h2>
            
            {response.success ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="text-sm font-medium text-green-800">Primary Agent</div>
                    <div className="text-green-700">{response.primary_agent}</div>
                  </div>
                  
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="text-sm font-medium text-blue-800">Supporting Agents</div>
                    <div className="text-blue-700">{response.supporting_agents?.length || 0}</div>
                  </div>
                  
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
                    <div className="text-sm font-medium text-purple-800">Workflow</div>
                    <div className="text-purple-700">{response.coordination_workflow || 'Direct'}</div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                  <div className="text-sm font-medium text-gray-800 mb-2">Agent Response</div>
                  <div className="text-gray-700 whitespace-pre-wrap">{response.response}</div>
                </div>

                {response.recommendations && response.recommendations.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-800 mb-2">Recommendations</div>
                    <div className="space-y-2">
                      {response.recommendations.map((rec, index) => (
                        <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <div className="font-medium text-yellow-800">{rec.title}</div>
                          <div className="text-sm text-yellow-700 mt-1">{rec.description}</div>
                          <div className="text-xs text-yellow-600 mt-1">
                            Impact: {rec.estimated_impact} | Confidence: {(rec.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {response.next_suggested_actions && response.next_suggested_actions.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-800 mb-2">Next Actions</div>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      {response.next_suggested_actions.map((action, index) => (
                        <li key={index}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="text-red-800">{response.response || 'Coordination failed'}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}