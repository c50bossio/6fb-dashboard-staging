'use client'

export default function AuthTest() {
  // Only show in development if debug flag is enabled
  if (process.env.NODE_ENV !== 'development' || !process.env.NEXT_PUBLIC_DEBUG_AUTH_TEST) {
    return null
  }
  
  return (
    <div className="fixed top-4 right-4 bg-green-500 text-white px-2 py-1 text-xs rounded z-50 opacity-75">
      DEV
    </div>
  )
}