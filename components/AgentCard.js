'use client'

export default function AgentCard({ agent, tier, selected, onClick, mobile = false }) {
  const tierColors = {
    business: 'border-blue-200 hover:border-blue-300 bg-blue-50',
    orchestration: 'border-purple-200 hover:border-purple-300 bg-purple-50', 
    specialized: 'border-gray-200 hover:border-gray-300 bg-gray-50'
  }

  const selectedColors = {
    business: 'border-blue-500 bg-blue-100',
    orchestration: 'border-purple-500 bg-purple-100',
    specialized: 'border-gray-500 bg-gray-100'
  }

  const baseClasses = `
    p-3 border rounded-lg cursor-pointer transition-all duration-200
    ${mobile ? 'text-xs' : 'text-sm'}
    ${selected 
      ? selectedColors[tier] || 'border-blue-500 bg-blue-50'
      : tierColors[tier] || 'border-gray-200 hover:border-gray-300'
    }
  `

  return (
    <div 
      className={baseClasses}
      onClick={onClick}
    >
      <div className={`font-medium ${mobile ? 'text-xs' : 'text-sm'} truncate`}>
        {agent.name}
      </div>
      <div className={`text-gray-500 mt-1 ${mobile ? 'text-xs' : 'text-xs'} line-clamp-2`}>
        {agent.description}
      </div>
      {!mobile && (
        <div className="text-xs text-gray-400 mt-1 line-clamp-1">
          {agent.specialties?.join(', ') || 'General'}
        </div>
      )}
    </div>
  )
}