'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Dynamic imports for chart libraries to reduce initial bundle size
const Chart = dynamic(() => import('react-chartjs-2').then(mod => mod.Chart), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
})

const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
})

const Bar = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
})

const Doughnut = dynamic(() => import('react-chartjs-2').then(mod => mod.Doughnut), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
})

// Recharts dynamic imports
const RechartsLineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
})

const RechartsBarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
})

const RechartsPieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
})

export function DynamicLineChart(props) {
  return (
    <Suspense fallback={<div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>}>
      <Line {...props} />
    </Suspense>
  )
}

export function DynamicBarChart(props) {
  return (
    <Suspense fallback={<div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>}>
      <Bar {...props} />
    </Suspense>
  )
}

export function DynamicDoughnutChart(props) {
  return (
    <Suspense fallback={<div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>}>
      <Doughnut {...props} />
    </Suspense>
  )
}

export function DynamicRechartsLine(props) {
  return (
    <Suspense fallback={<div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>}>
      <RechartsLineChart {...props} />
    </Suspense>
  )
}

export function DynamicRechartsBar(props) {
  return (
    <Suspense fallback={<div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>}>
      <RechartsBarChart {...props} />
    </Suspense>
  )
}

export function DynamicRechartsPie(props) {
  return (
    <Suspense fallback={<div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>}>
      <RechartsPieChart {...props} />
    </Suspense>
  )
}

export { Chart, Line, Bar, Doughnut }