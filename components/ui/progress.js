import React from 'react'

export const Progress = ({ 
  value = 0, 
  max = 100, 
  className = '', 
  style = {},
  ...props 
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  
  return (
    <div 
      className={`w-full bg-gray-200 rounded-full h-2 ${className}`}
      style={style}
      {...props}
    >
      <div 
        className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}