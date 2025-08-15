'use client'

/**
 * ButtonAdapter - Migration wrapper from custom Button to shadcn Button
 * Maps existing Button API to shadcn/ui button component
 */

import { Button as ShadcnButton } from '@/components/ui/button'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

const variantMap = {
  primary: 'default',
  secondary: 'secondary',
  outline: 'outline',
  ghost: 'ghost',
  cta: 'default', // Will add extra styles
  danger: 'destructive'
}

const sizeMap = {
  sm: 'sm',
  md: 'default',
  lg: 'lg',
  xl: 'lg' // shadcn doesn't have xl, use lg with extra padding
}

export default function ButtonAdapter({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  loadingText = 'Loading...',
  className = '',
  onClick,
  ...props
}) {
  const shadcnVariant = variantMap[variant] || 'default'
  const shadcnSize = sizeMap[size] || 'default'
  
  const extraClasses = cn(
    variant === 'cta' && 'bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 hover:from-yellow-300 hover:to-orange-300 font-bold',
    size === 'xl' && 'px-8 py-4 text-xl',
    loading && 'cursor-not-allowed opacity-70'
  )
  
  const isDisabled = disabled || loading
  
  return (
    <ShadcnButton
      variant={shadcnVariant}
      size={shadcnSize}
      disabled={isDisabled}
      onClick={onClick}
      className={cn(extraClasses, className)}
      {...props}
    >
      {loading && (
        <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
      )}
      {loading ? loadingText : children}
    </ShadcnButton>
  )
}

export function CTAButton({ 
  children, 
  loading = false, 
  success = false,
  loadingText = 'Processing...',
  successText = 'Success!',
  className = '',
  ...props 
}) {
  if (success) {
    return (
      <ShadcnButton
        variant="default"
        className={cn('bg-green-500 hover:bg-green-600', className)}
        disabled
        {...props}
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        {successText}
      </ShadcnButton>
    )
  }
  
  return (
    <ButtonAdapter
      variant="cta"
      loading={loading}
      loadingText={loadingText}
      className={className}
      {...props}
    >
      {children}
    </ButtonAdapter>
  )
}

export function ButtonGroup({ children, className = '' }) {
  return (
    <div className={cn('flex flex-col sm:flex-row gap-4', className)}>
      {children}
    </div>
  )
}