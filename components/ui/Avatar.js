'use client'

import { useState } from 'react'
import { cva } from 'class-variance-authority'
import { cn, getInitials, getAvatarColor } from '../../lib/utils'

const avatarVariants = cva(
  'relative flex shrink-0 items-center justify-center rounded-full font-medium text-white overflow-hidden',
  {
    variants: {
      size: {
        xs: 'w-6 h-6 text-xs',
        sm: 'w-8 h-8 text-sm',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-16 h-16 text-lg',
        '2xl': 'w-20 h-20 text-xl'
      }
    },
    defaultVariants: {
      size: 'md'
    }
  }
)

const Avatar = ({ 
  src, 
  alt, 
  name, 
  size = 'md', 
  className, 
  fallbackClassName,
  ...props 
}) => {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  const handleImageError = () => {
    setImageError(true)
    setImageLoading(false)
  }

  const handleImageLoad = () => {
    setImageLoading(false)
  }

  const showFallback = !src || imageError || imageLoading
  const initials = getInitials(name || alt)
  const colorClass = getAvatarColor(name || alt || 'default')

  return (
    <div 
      className={cn(
        avatarVariants({ size }),
        showFallback && colorClass,
        className
      )} 
      {...props}
    >
      {src && !imageError && (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-200',
            imageLoading ? 'opacity-0' : 'opacity-100'
          )}
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      )}
      
      {showFallback && (
        <span className={cn('select-none', fallbackClassName)}>
          {initials}
        </span>
      )}
    </div>
  )
}

// Avatar with status indicator
const AvatarWithStatus = ({ 
  status = 'offline', 
  statusPosition = 'bottom-right',
  children, 
  className,
  size = 'md',
  ...props 
}) => {
  const getStatusColor = (status) => {
    const colors = {
      online: 'bg-success-500',
      offline: 'bg-gray-400',
      away: 'bg-warning-500',
      busy: 'bg-error-500',
      active: 'bg-success-500',
      inactive: 'bg-gray-400'
    }
    return colors[status] || 'bg-gray-400'
  }

  const getStatusSize = (avatarSize) => {
    const sizes = {
      xs: 'w-1.5 h-1.5',
      sm: 'w-2 h-2',
      md: 'w-2.5 h-2.5',
      lg: 'w-3 h-3',
      xl: 'w-4 h-4',
      '2xl': 'w-5 h-5'
    }
    return sizes[avatarSize] || 'w-2.5 h-2.5'
  }

  const getStatusPosition = (position) => {
    const positions = {
      'top-right': 'top-0 right-0',
      'top-left': 'top-0 left-0',
      'bottom-right': 'bottom-0 right-0',
      'bottom-left': 'bottom-0 left-0'
    }
    return positions[position] || 'bottom-0 right-0'
  }

  return (
    <div className={cn('relative inline-block', className)}>
      <Avatar size={size} {...props}>
        {children}
      </Avatar>
      <div
        className={cn(
          'absolute rounded-full border-2 border-white dark:border-gray-800',
          getStatusSize(size),
          getStatusColor(status),
          getStatusPosition(statusPosition)
        )}
      />
    </div>
  )
}

// Avatar group for showing multiple avatars
const AvatarGroup = ({ 
  children, 
  max = 5, 
  size = 'md',
  className,
  showCount = true,
  spacing = 'default'
}) => {
  const childArray = Array.isArray(children) ? children : [children]
  const visibleChildren = childArray.slice(0, max)
  const remainingCount = childArray.length - max

  const getSpacing = (spacing, size) => {
    const spacingMap = {
      tight: {
        xs: '-space-x-1',
        sm: '-space-x-1',
        md: '-space-x-2',
        lg: '-space-x-2',
        xl: '-space-x-3',
        '2xl': '-space-x-4'
      },
      default: {
        xs: '-space-x-0.5',
        sm: '-space-x-1',
        md: '-space-x-1.5',
        lg: '-space-x-2',
        xl: '-space-x-2.5',
        '2xl': '-space-x-3'
      },
      loose: {
        xs: 'space-x-0.5',
        sm: 'space-x-1',
        md: 'space-x-1.5',
        lg: 'space-x-2',
        xl: 'space-x-2.5',
        '2xl': 'space-x-3'
      }
    }
    return spacingMap[spacing][size] || spacingMap.default[size]
  }

  return (
    <div className={cn('flex items-center', getSpacing(spacing, size), className)}>
      {visibleChildren.map((child, index) => (
        <div
          key={index}
          className="ring-2 ring-white dark:ring-gray-800 rounded-full"
        >
          {child}
        </div>
      ))}
      
      {remainingCount > 0 && showCount && (
        <Avatar
          size={size}
          name={`+${remainingCount}`}
          className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 ring-2 ring-white dark:ring-gray-800"
        />
      )}
    </div>
  )
}

export { Avatar, AvatarWithStatus, AvatarGroup, avatarVariants }