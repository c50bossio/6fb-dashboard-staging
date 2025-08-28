'use client'

import { useEffect, useState } from 'react'

export default function TestEnvPage() {
  const [envVars, setEnvVars] = useState({})
  
  useEffect(() => {
    const vars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET (' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length + ' chars)' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
      hostname: window.location.hostname
    }
    setEnvVars(vars)
    console.log('Environment check:', vars)
  }, [])
  
  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Environment Variables Test</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Browser Environment</h2>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-100 p-4 rounded">
            {JSON.stringify(envVars, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}