import React from 'react'
import { cn } from '@/lib/utils'

const Avatar = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef(({ className, ...props }, ref) => (
  <img
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = "AvatarFallback"

// Additional component for initials fallback
const AvatarInitials = React.forwardRef(({ name, className, ...props }, ref) => {
  const initials = name
    ? name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : ''
    
  return (
    <AvatarFallback
      ref={ref}
      className={cn("bg-olive-100 text-olive-700", className)}
      {...props}
    >
      {initials}
    </AvatarFallback>
  )
})
AvatarInitials.displayName = "AvatarInitials"

export { Avatar, AvatarImage, AvatarFallback, AvatarInitials }