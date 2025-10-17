'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

export default function ProfileUpdateTest({ userId }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const testUpdate = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/test-profile-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          testData: {
            firstName: `Test-${Date.now()}`,
            lastName: `User-${Date.now()}`,
            fullName: `Test User ${Date.now()}`
          }
        })
      })

      const data = await response.json()
      setResult(data)

    } catch (error) {
      console.error('Test failed:', error)
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-semibold mb-2">Profile Update Test</h3>
      <Button onClick={testUpdate} disabled={loading} variant="outline">
        {loading ? 'Testing...' : 'Test Profile Update'}
      </Button>
      
      {result && (
        <div className="mt-4">
          <h4 className="font-medium">Test Result:</h4>
          <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-64">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}