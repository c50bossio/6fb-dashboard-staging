/**
 * Customer Loading States Component
 * 
 * Provides sophisticated loading skeletons and states for customer management
 * Designed to improve perceived performance and user experience
 */

'use client'

import React from 'react'
import { customerDesignTokens, customerUtilityClasses } from './CustomerDesignSystem'

/**
 * Base skeleton component with shimmer effect
 */
export function SkeletonBase({ 
  width = '100%', 
  height = '1rem', 
  className = '',
  variant = 'default' // 'default', 'circular', 'text'
}) {
  const variantClasses = {
    default: 'rounded',
    circular: 'rounded-full',
    text: 'rounded h-4'
  }

  return (
    <div 
      className={`
        ${customerUtilityClasses.loading.shimmer} 
        ${variantClasses[variant]} 
        ${className}
      `}
      style={{ width, height }}
      role="status"
      aria-label="Loading..."
    />
  )
}

/**
 * Customer card skeleton
 */
export function CustomerCardSkeleton({ count = 1 }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div 
          key={i}
          className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex items-start space-x-4">
            {/* Avatar skeleton */}
            <SkeletonBase 
              width="3rem" 
              height="3rem" 
              variant="circular"
              className="flex-shrink-0"
            />
            
            {/* Content skeleton */}
            <div className="flex-1 space-y-3">
              {/* Name and badge row */}
              <div className="flex items-center gap-3">
                <SkeletonBase width="8rem" height="1.25rem" />
                <SkeletonBase width="3rem" height="1rem" className="rounded-full" />
              </div>
              
              {/* Loyalty points skeleton */}
              <div className="flex items-center space-x-3">
                <SkeletonBase width="2rem" height="1.5rem" variant="circular" />
                <SkeletonBase width="4rem" height="1rem" />
                <SkeletonBase width="3rem" height="0.75rem" className="rounded-full" />
              </div>
              
              {/* Contact info skeleton */}
              <div className="flex items-center space-x-4">
                <SkeletonBase width="10rem" height="0.875rem" />
                <SkeletonBase width="8rem" height="0.875rem" />
              </div>
              
              {/* Stats skeleton */}
              <div className="flex items-center space-x-4">
                <SkeletonBase width="4rem" height="0.875rem" />
                <SkeletonBase width="5rem" height="0.875rem" />
                <SkeletonBase width="6rem" height="0.875rem" />
              </div>
            </div>
            
            {/* Action buttons skeleton */}
            <div className="flex space-x-2">
              <SkeletonBase width="4rem" height="2rem" className="rounded-md" />
              <SkeletonBase width="3rem" height="2rem" className="rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

/**
 * Customer stats skeleton
 */
export function CustomerStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {Array.from({ length: 4 }, (_, i) => (
        <div 
          key={i}
          className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="flex items-center">
            <SkeletonBase 
              width="2rem" 
              height="2rem" 
              variant="circular"
              className="flex-shrink-0"
            />
            <div className="ml-4 space-y-2">
              <SkeletonBase width="6rem" height="0.875rem" />
              <SkeletonBase width="3rem" height="1.5rem" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Search and filter skeleton
 */
export function SearchFilterSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SkeletonBase height="2.5rem" className="rounded-lg" />
        </div>
        <div className="sm:w-48">
          <SkeletonBase height="2.5rem" className="rounded-lg" />
        </div>
      </div>
    </div>
  )
}

/**
 * Customer profile modal skeleton
 */
export function CustomerProfileSkeleton() {
  return (
    <div className="bg-white rounded-xl p-8 animate-pulse max-w-4xl w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <SkeletonBase width="4rem" height="4rem" variant="circular" />
          <div className="space-y-2">
            <SkeletonBase width="12rem" height="1.5rem" />
            <SkeletonBase width="8rem" height="1rem" />
          </div>
        </div>
        <SkeletonBase width="2rem" height="2rem" variant="circular" />
      </div>
      
      {/* Content */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-3">
            <SkeletonBase width="8rem" height="1.25rem" />
            <SkeletonBase width="100%" height="0.875rem" />
            <SkeletonBase width="80%" height="0.875rem" />
          </div>
          
          {/* Visit history */}
          <div className="space-y-3">
            <SkeletonBase width="6rem" height="1.25rem" />
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="p-3 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <SkeletonBase width="10rem" height="1rem" />
                    <SkeletonBase width="6rem" height="0.875rem" />
                  </div>
                  <SkeletonBase width="4rem" height="0.875rem" />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          <div className="space-y-3">
            <SkeletonBase width="6rem" height="1.25rem" />
            <SkeletonBase width="100%" height="0.875rem" />
            <SkeletonBase width="100%" height="0.875rem" />
          </div>
          
          <div className="space-y-3">
            <SkeletonBase width="8rem" height="1.25rem" />
            <SkeletonBase width="100%" height="4rem" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Table/list skeleton
 */
export function CustomerTableSkeleton({ rows = 5 }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-gray-200 animate-pulse">
        <div className="flex items-center space-x-4">
          <SkeletonBase width="3rem" height="1rem" />
          <SkeletonBase width="8rem" height="1rem" />
          <SkeletonBase width="6rem" height="1rem" />
          <SkeletonBase width="5rem" height="1rem" />
          <SkeletonBase width="4rem" height="1rem" />
        </div>
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }, (_, i) => (
        <div 
          key={i}
          className="px-6 py-4 border-b border-gray-100 animate-pulse"
          style={{ animationDelay: `${i * 75}ms` }}
        >
          <div className="flex items-center space-x-4">
            <SkeletonBase width="2rem" height="2rem" variant="circular" />
            <SkeletonBase width="8rem" height="1rem" />
            <SkeletonBase width="10rem" height="0.875rem" />
            <SkeletonBase width="6rem" height="0.875rem" />
            <SkeletonBase width="4rem" height="0.875rem" />
            <SkeletonBase width="3rem" height="1.5rem" className="rounded-md" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Chart/analytics skeleton
 */
export function CustomerChartSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <SkeletonBase width="8rem" height="1.25rem" />
          <SkeletonBase width="4rem" height="1rem" />
        </div>
        
        {/* Chart area */}
        <div className="h-64 flex items-end space-x-2">
          {Array.from({ length: 12 }, (_, i) => (
            <SkeletonBase 
              key={i}
              width="100%"
              height={`${Math.random() * 80 + 20}%`}
              className="flex-1"
            />
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex justify-center space-x-6">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <SkeletonBase width="0.75rem" height="0.75rem" variant="circular" />
              <SkeletonBase width="4rem" height="0.875rem" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Progressive loading component
 * Shows different skeleton states based on loading progress
 */
export function ProgressiveCustomerLoader({ 
  stage = 'initial', // 'initial', 'partial', 'complete'
  customerCount = 3 
}) {
  switch (stage) {
    case 'initial':
      return (
        <div className="space-y-6">
          <CustomerStatsSkeleton />
          <SearchFilterSkeleton />
          <div className="text-center py-8">
            <div className={customerUtilityClasses.loading.spinner + ' h-8 w-8 mx-auto'} />
            <p className="mt-2 text-sm text-gray-500">Loading customer data...</p>
          </div>
        </div>
      )
    
    case 'partial':
      return (
        <div className="space-y-6">
          <CustomerStatsSkeleton />
          <SearchFilterSkeleton />
          <div className="space-y-4">
            <CustomerCardSkeleton count={Math.min(customerCount, 2)} />
            <div className="text-center py-4">
              <div className={customerUtilityClasses.loading.spinner + ' h-6 w-6 mx-auto'} />
              <p className="mt-2 text-xs text-gray-500">Loading more customers...</p>
            </div>
          </div>
        </div>
      )
    
    default:
      return <CustomerCardSkeleton count={customerCount} />
  }
}

/**
 * Contextual loading wrapper
 * Wraps components and shows appropriate loading state
 */
export function CustomerLoadingWrapper({ 
  isLoading, 
  error, 
  skeleton, 
  children,
  fallback = null 
}) {
  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-2">⚠️</div>
        <p className="text-sm text-gray-600">{error}</p>
      </div>
    )
  }
  
  if (isLoading) {
    return skeleton || fallback || <CustomerCardSkeleton />
  }
  
  return children
}

export default {
  SkeletonBase,
  CustomerCardSkeleton,
  CustomerStatsSkeleton,
  SearchFilterSkeleton,
  CustomerProfileSkeleton,
  CustomerTableSkeleton,
  CustomerChartSkeleton,
  ProgressiveCustomerLoader,
  CustomerLoadingWrapper
}