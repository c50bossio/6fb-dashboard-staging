'use client'

import { useEffect, useState } from 'react'

export default function AutoRefreshComponent({ onRefresh, intervalMs = 5000 }) {
  const [lastCheck, setLastCheck] = useState(Date.now())
  const [isChecking, setIsChecking] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)
  
  useEffect(() => {
    
    const interval = setInterval(async () => {
      if (isChecking) {
        return // Prevent overlapping checks
      }
      
      setIsChecking(true)
      const startTime = Date.now()
      
      try {
        if (onRefresh) {
          await onRefresh()
        } else {
          console.warn('🔄 ENHANCED Auto-refresh: No onRefresh function provided')
        }
        setLastCheck(Date.now())
        setRefreshCount(prev => prev + 1)
      } catch (error) {
        console.error('❌ ENHANCED Auto-refresh error:', error)
      } finally {
        setIsChecking(false)
      }
    }, intervalMs)
    
    return () => {
      clearInterval(interval)
    }
  }, [intervalMs, onRefresh, isChecking, refreshCount])
  
  return (
    <div className="fixed bottom-4 right-4 bg-olive-500 text-white px-3 py-1 rounded text-sm shadow-lg">
      🔄 Auto-refresh: {isChecking ? 'Checking...' : `Last: ${new Date(lastCheck).toLocaleTimeString()}`}
    </div>
  )
}