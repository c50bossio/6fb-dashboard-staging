import dynamic from 'next/dynamic'

// Dynamically import the monitoring dashboard to avoid SSR issues with charts
const MonitoringDashboard = dynamic(
  () => import('@/components/monitoring/MonitoringDashboard'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading monitoring dashboard...</p>
        </div>
      </div>
    )
  }
)

export default function MonitoringPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <MonitoringDashboard />
    </div>
  )
}