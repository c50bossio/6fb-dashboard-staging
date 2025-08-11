'use client'

import { useEffect, useState } from 'react'

export default function AutoRefreshComponent({ onRefresh, intervalMs = 5000 }) {
  const [lastCheck, setLastCheck] = useState(Date.now())
  const [isChecking, setIsChecking] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)
  
  useEffect(() => {
    console.log('🔄 ENHANCED Auto-refresh component started, checking every', intervalMs / 1000, 'seconds')
    
    const interval = setInterval(async () => {
      if (isChecking) {
        console.log('🔄 Auto-refresh: Skipping - already checking')
        return // Prevent overlapping checks
      }
      
      setIsChecking(true)
      const startTime = Date.now()
      console.log('🔄 ENHANCED Auto-refresh: Starting check #' + (refreshCount + 1))
      
      try {
        // Call the refresh function
        if (onRefresh) {
          await onRefresh()
          console.log('🔄 ENHANCED Auto-refresh: Completed successfully in', Date.now() - startTime, 'ms')
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
      console.log('🔄 ENHANCED Auto-refresh component unmounting')
      clearInterval(interval)
    }
  }, [intervalMs, onRefresh, isChecking, refreshCount])
  
  return (
    <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-3 py-1 rounded text-sm shadow-lg">
      🔄 Auto-refresh: {isChecking ? 'Checking...' : `Last: ${new Date(lastCheck).toLocaleTimeString()}`}
    </div>
  )
}