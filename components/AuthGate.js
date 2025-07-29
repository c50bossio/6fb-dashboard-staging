import { useState } from 'react'
import { useAuth } from './AuthProvider'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'

export default function AuthGate({ children }) {
  const { user, loading, isAuthenticated } = useAuth()
  const [showRegister, setShowRegister] = useState(false)

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login/register forms if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              🧠 6FB AI Agent System
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Enterprise-grade AI agents powered by advanced RAG technology. 
              Get personalized business insights and strategies from 7 specialized AI consultants.
            </p>
          </div>

          {/* Authentication Forms */}
          {showRegister ? (
            <RegisterForm
              onSuccess={() => {
                // User will be automatically logged in after registration
                // The AuthProvider will handle the state update and this component will re-render
              }}
              onSwitchToLogin={() => setShowRegister(false)}
            />
          ) : (
            <LoginForm
              onSuccess={() => {
                // User will be automatically logged in
                // The AuthProvider will handle the state update and this component will re-render
              }}
              onSwitchToRegister={() => setShowRegister(true)}
            />
          )}

          {/* Features Preview */}
          <div className="mt-12 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">
              What You'll Get Access To
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-3xl mb-3">🎯</div>
                <h3 className="font-semibold text-gray-800 mb-2">Master Coach</h3>
                <p className="text-gray-600 text-sm">
                  Overall business strategy and performance optimization
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-3xl mb-3">💰</div>
                <h3 className="font-semibold text-gray-800 mb-2">Financial Agent</h3>
                <p className="text-gray-600 text-sm">
                  Revenue optimization and pricing strategies
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-3xl mb-3">📈</div>
                <h3 className="font-semibold text-gray-800 mb-2">Client Acquisition</h3>
                <p className="text-gray-600 text-sm">
                  Marketing strategies and customer growth
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-3xl mb-3">⚙️</div>
                <h3 className="font-semibold text-gray-800 mb-2">Operations Agent</h3>
                <p className="text-gray-600 text-sm">
                  Workflow optimization and efficiency improvements
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-3xl mb-3">🏆</div>
                <h3 className="font-semibold text-gray-800 mb-2">Brand Development</h3>
                <p className="text-gray-600 text-sm">
                  Premium positioning and brand strategy
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-3xl mb-3">🚀</div>
                <h3 className="font-semibold text-gray-800 mb-2">Growth Agent</h3>
                <p className="text-gray-600 text-sm">
                  Scaling strategies and expansion planning
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // User is authenticated, show the protected content
  return children
}