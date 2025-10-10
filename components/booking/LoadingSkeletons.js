'use client'

/**
 * Loading skeleton components for booking flow
 * Provides smooth loading states while data is fetched
 */

export function LocationSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function BarberSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="border border-gray-200 rounded-lg p-4">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-gray-200 rounded-full mb-3"></div>
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="flex space-x-1 mb-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <div key={star} className="w-4 h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ServiceSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      
      <div className="space-y-6 mt-6">
        {['Category 1', 'Category 2'].map((category, idx) => (
          <div key={idx}>
            <div className="h-4 bg-gray-200 rounded w-32 mb-3"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
                      <div className="flex items-center space-x-4">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                    <div className="w-20 h-20 bg-gray-200 rounded-lg ml-4"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TimeSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      
      {/* Service reminder skeleton */}
      <div className="bg-olive-50 border border-olive-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-olive-200 rounded w-32"></div>
          <div className="h-4 bg-olive-200 rounded w-32"></div>
          <div className="h-4 bg-olive-200 rounded w-24"></div>
        </div>
      </div>
      
      {/* Date selection skeleton */}
      <div>
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} className="border border-gray-200 rounded-lg p-3">
              <div className="h-3 bg-gray-200 rounded w-8 mx-auto mb-1"></div>
              <div className="h-6 bg-gray-200 rounded w-6 mx-auto mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-8 mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Time slots skeleton */}
      <div className="space-y-4">
        {['Morning', 'Afternoon', 'Evening'].map(period => (
          <div key={period}>
            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-10 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PaymentSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      
      {/* Customer info skeleton */}
      <div className="space-y-4 mt-6">
        <div>
          <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
        <div>
          <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
        <div>
          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
      
      {/* Payment method skeleton */}
      <div className="space-y-4">
        <div className="h-6 bg-gray-200 rounded w-40"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-gray-200 rounded-lg"></div>
          <div className="h-24 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    </div>
  )
}

export function BookingSummarySkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
      
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex justify-between">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        ))}
        
        <div className="border-t pt-3">
          <div className="flex justify-between">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
          </div>
          <div className="flex justify-between mt-3 pt-3 border-t">
            <div className="h-5 bg-gray-200 rounded w-16"></div>
            <div className="h-5 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
      </div>
    </div>
  )
}