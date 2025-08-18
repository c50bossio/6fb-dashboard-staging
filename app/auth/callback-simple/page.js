'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function SimpleAuthCallback() {
  const router = useRouter()
  
  useEffect(() => {
    // Super simple approach - let Supabase handle everything
    // The browser client should auto-detect the code in URL
    const timer = setTimeout(() => {
      console.log('Redirecting to dashboard after OAuth callback')
      router.push('/dashboard')
    }, 1500) // Give Supabase time to process
    
    return () => clearTimeout(timer)
  }, [router])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        <p className="mt-4 text-white">Completing sign in...</p>
      </div>
    </div>
  )
}