'use client'

import { useState } from 'react'

export default function HandoffFlowDiagram({ flows, collaborationStats }) {
  const [selectedFlow, setSelectedFlow] = useState(null)

  // Group flows by source agent
  const flowsBySource = flows.reduce((acc, flow) => {
    if (!acc[flow.from]) {
      acc[flow.from] = []
    }
    acc[flow.from].push(flow)
    return acc
  }, {})

  // Get unique agents
  const allAgents = new Set()
  flows.forEach(flow => {
    allAgents.add(flow.from)
    allAgents.add(flow.to)
  })

  // Calculate max flow for scaling
  const maxFlow = Math.max(...flows.map(f => f.count), 1)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Agent Handoff Flow</h2>
        <p className="text-sm text-gray-600 mt-1">
          Query routing and collaboration between AI agents
        </p>
      </div>

      <div className="p-6">
        {/* Collaboration Statistics */}
        {collaborationStats && (
          <div className="mb-6 grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-lg font-bold text-blue-700">
                {collaborationStats.single_agent}
              </div>
              <div className="text-xs text-gray-600 mt-1">Single Agent</div>
              <div className="text-xs text-blue-600 font-medium">
                {collaborationStats.single_agent_pct || 0}%
              </div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-lg font-bold text-purple-700">
                {collaborationStats.multi_agent}
              </div>
              <div className="text-xs text-gray-600 mt-1">Multi-Agent</div>
              <div className="text-xs text-purple-600 font-medium">
                {collaborationStats.multi_agent_pct || 0}%
              </div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-lg font-bold text-green-700">
                {collaborationStats.handoff}
              </div>
              <div className="text-xs text-gray-600 mt-1">With Handoffs</div>
              <div className="text-xs text-green-600 font-medium">
                {collaborationStats.handoff_pct || 0}%
              </div>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="text-lg font-bold text-amber-700">
                {collaborationStats.avg_handoffs_per_query}
              </div>
              <div className="text-xs text-gray-600 mt-1">Avg Handoffs</div>
              <div className="text-xs text-amber-600 font-medium">per query</div>
            </div>
          </div>
        )}

        {/* Flow Visualization */}
        <div className="space-y-4">
          {Object.entries(flowsBySource).map(([source, sourceFlows]) => (
            <div key={source} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="flex-shrink-0 w-40">
                  <div className="px-4 py-2 bg-olive-100 text-olive-800 rounded-lg font-medium text-sm text-center border-2 border-olive-300">
                    {source}
                  </div>
                </div>
                <div className="flex-1 ml-4">
                  <div className="space-y-2">
                    {sourceFlows
                      .sort((a, b) => b.count - a.count)
                      .map((flow, index) => {
                        const flowWidth = (flow.count / maxFlow) * 100
                        const isSelected = selectedFlow === `${flow.from}-${flow.to}`

                        return (
                          <div
                            key={index}
                            className={`relative cursor-pointer transition-all ${
                              isSelected ? 'scale-105' : 'hover:scale-102'
                            }`}
                            onClick={() => setSelectedFlow(isSelected ? null : `${flow.from}-${flow.to}`)}
                          >
                            <div className="flex items-center">
                              {/* Flow line */}
                              <div className="flex-1 relative h-8">
                                <div
                                  className={`absolute left-0 top-0 h-full rounded-lg transition-all ${
                                    isSelected
                                      ? 'bg-olive-500'
                                      : 'bg-gradient-to-r from-blue-400 to-green-400'
                                  }`}
                                  style={{ width: `${flowWidth}%` }}
                                >
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xs font-bold text-white">
                                      {flow.count} {flow.count === 1 ? 'query' : 'queries'}
                                    </span>
                                  </div>
                                </div>
                                {/* Arrow */}
                                <div
                                  className={`absolute top-1/2 -translate-y-1/2 ${
                                    isSelected ? 'text-olive-500' : 'text-green-400'
                                  }`}
                                  style={{ left: `${flowWidth}%` }}
                                >
                                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              </div>

                              {/* Target agent */}
                              <div className="flex-shrink-0 w-40 ml-4">
                                <div className={`px-4 py-2 rounded-lg font-medium text-sm text-center border-2 ${
                                  isSelected
                                    ? 'bg-olive-600 text-white border-olive-700'
                                    : 'bg-green-100 text-green-800 border-green-300'
                                }`}>
                                  {flow.to}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No flows message */}
        {flows.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No handoff data</h3>
            <p className="mt-1 text-sm text-gray-500">
              No agent handoffs have been recorded yet.
            </p>
          </div>
        )}

        {/* Legend */}
        {flows.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">How to Read This Chart</h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-4 h-4 bg-olive-100 border-2 border-olive-300 rounded"></div>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Source Agent:</span> Initial agent that receives the query
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Target Agent:</span> Agent that handles the query
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-16 h-4 bg-gradient-to-r from-blue-400 to-green-400 rounded"></div>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Flow Width:</span> Proportional to number of handoffs
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 mt-1">
                  <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Click flows</span> to highlight specific handoffs
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
