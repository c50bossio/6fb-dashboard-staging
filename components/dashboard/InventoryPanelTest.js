'use client'

export default function InventoryPanelTest() {
  return (
    <div className="space-y-6">
      {/* Simple test header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🧪 Inventory Panel Test - WORKING!
        </h2>
        <p className="text-gray-600">
          This is a simplified test version of the inventory panel to debug loading issues.
        </p>
        <div className="mt-4 p-4 bg-olive-100 rounded-lg">
          <h3 className="font-bold text-olive-800">✅ Component Loading Successfully</h3>
          <p className="text-olive-700">
            If you can see this, the inventory mode is working correctly.
          </p>
        </div>
      </div>

      {/* Test stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900">Test Stat 1</h3>
          <p className="text-2xl font-bold text-olive-600">✅ OK</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900">Test Stat 2</h3>
          <p className="text-2xl font-bold text-gold-600">🔌 CIN7 Ready</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900">Test Stat 3</h3>
          <p className="text-2xl font-bold text-green-600">🎯 Mode Active</p>
        </div>
      </div>

      {/* Test content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Inventory & POS Management</h3>
        <div className="space-y-2">
          <p>✅ Dashboard mode switching: <span className="font-bold text-green-600">WORKING</span></p>
          <p>✅ Component rendering: <span className="font-bold text-green-600">WORKING</span></p>
          <p>✅ BookedBarber styling: <span className="font-bold text-green-600">WORKING</span></p>
          <p>🔄 Next: Load full InventoryPanel with CIN7 integration</p>
        </div>
      </div>
    </div>
  )
}