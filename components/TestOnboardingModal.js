'use client'

// Super simple test component to verify modal rendering works
export default function TestOnboardingModal() {
  console.log('🚨 TEST MODAL: Component is rendering!')
  
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 m-4 max-w-md w-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-green-600 mb-4">
            ✅ TEST MODAL WORKING!
          </h1>
          <p className="text-gray-700 mb-6">
            If you can see this modal, then React rendering is working properly.
          </p>
          <div className="bg-blue-100 p-4 rounded border text-sm">
            <p><strong>Debug Info:</strong></p>
            <p>Component: TestOnboardingModal</p>
            <p>Status: Successfully Rendered</p>
            <p>Time: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}