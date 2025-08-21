import React from 'react'

export function Separator({ className = '', orientation = 'horizontal', ...props }) {
  const orientationClasses = {
    horizontal: 'h-px w-full',
    vertical: 'w-px h-full'
  }

  return (
    <div
      className={`bg-gray-200 ${orientationClasses[orientation]} ${className}`}
      role="separator"
      aria-orientation={orientation}
      {...props}
    />
  )
}

export default Separator