'use client'

import { forwardRef } from 'react'

const ResponsiveContainer = forwardRef(({
  children,
  size = 'default',
  padding = 'default',
  className = '',
  ...props
}, ref) => {
  const sizes = {
    sm: 'max-w-2xl',
    default: 'max-w-7xl',
    lg: 'max-w-full',
    fluid: 'w-full'
  }

  const paddings = {
    none: '',
    sm: 'px-4 sm:px-6',
    default: 'px-4 sm:px-6 lg:px-8',
    lg: 'px-4 sm:px-6 lg:px-8 xl:px-12'
  }

  return (
    <div
      ref={ref}
      className={`mx-auto ${sizes[size]} ${paddings[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
})

ResponsiveContainer.displayName = 'ResponsiveContainer'

export default ResponsiveContainer

export function ResponsiveGrid({ 
  children, 
  cols = { sm: 1, md: 2, lg: 3, xl: 4 },
  gap = 'default',
  className = '' 
}) {
  const gaps = {
    sm: 'gap-4',
    default: 'gap-6',
    lg: 'gap-8'
  }

  const gridCols = `grid-cols-${cols.sm} md:grid-cols-${cols.md} lg:grid-cols-${cols.lg} xl:grid-cols-${cols.xl}`

  return (
    <div className={`grid ${gridCols} ${gaps[gap]} ${className}`}>
      {children}
    </div>
  )
}

export function ResponsiveStack({ 
  children, 
  spacing = 'default',
  alignItems = 'stretch',
  className = '' 
}) {
  const spacings = {
    sm: 'space-y-4',
    default: 'space-y-6',
    lg: 'space-y-8'
  }

  const alignments = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch'
  }

  return (
    <div className={`flex flex-col ${spacings[spacing]} ${alignments[alignItems]} ${className}`}>
      {children}
    </div>
  )
}