'use client'

export default function TestDevAuthPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6">🔐 Dev Auth Mode Tester</h1>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 font-semibold mb-2">Instructions:</p>
            <ul className="text-blue-700 space-y-1 list-disc list-inside">
              <li>Click "Enable Dev Auth" to use mock authentication</li>
              <li>Click "Disable Dev Auth" to use Supabase authentication</li>
              <li>The page will reload with the selected auth mode</li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={() => {
                localStorage.setItem('forceDevAuth', 'true')
                window.location.href = '/test-react-query-enhanced?devauth=true'
              }}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              ✅ Enable Dev Auth Mode
            </button>
            
            <button
              onClick={() => {
                localStorage.removeItem('forceDevAuth')
                window.location.href = '/test-react-query-enhanced'
              }}
              className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              ❌ Disable Dev Auth Mode
            </button>
            
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">Direct Links:</p>
              <div className="space-y-2">
                <a
                  href="/test-react-query-enhanced?devauth=true"
                  className="block text-blue-600 hover:underline"
                >
                  → Test Page with Dev Auth
                </a>
                <a
                  href="/test-react-query-enhanced"
                  className="block text-blue-600 hover:underline"
                >
                  → Test Page with Normal Auth
                </a>
              </div>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <p className="text-sm font-semibold text-gray-700 mb-2">🛠️ Developer Console Commands:</p>
            <pre className="text-xs bg-white p-2 rounded border border-gray-300">
{`// Toggle dev auth mode
window.toggleDevAuth()

// Check current auth mode
localStorage.getItem('forceDevAuth')

// Force dev auth
localStorage.setItem('forceDevAuth', 'true')

// Disable dev auth
localStorage.removeItem('forceDevAuth')`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}