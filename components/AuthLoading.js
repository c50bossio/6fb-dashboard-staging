'use client'

export default function AuthLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="relative">
          {/* Professional loading spinner */}
          <div className="w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 animate-spin"></div>
          </div>
        </div>
        <p className="mt-4 text-gray-600 font-medium">Setting up your account...</p>
      </div>
    </div>
  )
}