'use client'

import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  
  const handleLaunchDashboard = () => {
    router.push('/dashboard')
  }
  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
          <span className="block">6FB-AI</span>
          <span className="block text-blue-600">Unified Next.js</span>
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          Successfully converted from monorepo to unified Next.js application!
        </p>
        
        {/* Key Features */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-2xl mb-2">🎯</div>
            <h3 className="font-medium text-gray-900">Master Coach</h3>
            <p className="text-sm text-gray-500">Strategic guidance</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-2xl mb-2">💰</div>
            <h3 className="font-medium text-gray-900">Financial Agent</h3>
            <p className="text-sm text-gray-500">Revenue optimization</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-2xl mb-2">📈</div>
            <h3 className="font-medium text-gray-900">Growth Agent</h3>
            <p className="text-sm text-gray-500">Expansion planning</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-2xl mb-2">⚙️</div>
            <h3 className="font-medium text-gray-900">Operations Agent</h3>
            <p className="text-sm text-gray-500">Efficiency optimization</p>
          </div>
        </div>

        <div className="mt-10">
          <button 
            onClick={handleLaunchDashboard}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg"
          >
            Launch AI Dashboard
          </button>
        </div>
        
        <div className="mt-8 p-4 bg-green-50 rounded-lg">
          <h2 className="text-lg font-medium text-green-800 mb-2">✅ Conversion Complete!</h2>
          <p className="text-green-700">
            Your monorepo has been successfully converted to a unified Next.js 14 application.
            All workspace dependencies have been inlined and the build system simplified.
          </p>
        </div>
      </div>
    </div>
  )
}