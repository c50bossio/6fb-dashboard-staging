// ❌ CURRENT: Static recharts import (adds ~400KB to initial bundle)
import { LineChart, BarChart, PieChart, Line, Bar, XAxis, YAxis } from 'recharts'

function DashboardCharts({ data }) {
  return (
    <div>
      <LineChart data={data} width={400} height={300}>
        <Line dataKey="value" />
        <XAxis dataKey="name" />
        <YAxis />
      </LineChart>
    </div>
  )
}

// ✅ OPTIMIZED: Dynamic import with loading state
import { Suspense, lazy } from 'react'

const LazyLineChart = lazy(() => 
  import('recharts').then(module => ({ 
    default: module.LineChart 
  }))
)

const LazyBarChart = lazy(() =>
  import('recharts').then(module => ({
    default: module.BarChart  
  }))
)

function ChartContainer({ chartType, data, ...props }) {
  const ChartComponent = chartType === 'line' ? LazyLineChart : LazyBarChart
  
  return (
    <Suspense 
      fallback={
        <div className="animate-pulse bg-gray-200 h-64 w-full rounded-lg flex items-center justify-center">
          <span className="text-gray-500">Loading chart...</span>
        </div>
      }
    >
      <ChartComponent data={data} {...props} />
    </Suspense>
  )
}

// ✅ EVEN BETTER: Route-based code splitting
import dynamic from 'next/dynamic'

const AnalyticsCharts = dynamic(
  () => import('@/components/AnalyticsCharts'), 
  { 
    loading: () => <ChartSkeleton />,
    ssr: false // Only load on client if needed
  }
)

