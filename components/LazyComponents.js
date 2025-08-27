/**
 * Lazy-loaded components for code splitting and performance optimization
 * These components are loaded on-demand to reduce initial bundle size
 * Updated for performance optimization
 */

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { useState, useEffect } from 'react'

const ComponentLoader = () => (
  <div className="space-y-4 p-4">
    <Skeleton className="h-12 w-3/4" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-5/6" />
  </div>
)

// Specialized loading skeletons
const ChartLoader = () => (
  <div className="animate-pulse">
    <div className="h-64 bg-gray-200 rounded-lg"></div>
  </div>
)

const CalendarLoader = () => (
  <div className="animate-pulse">
    <div className="h-96 bg-gray-200 rounded-lg"></div>
  </div>
)

// Heavy chart library components with code splitting
export const LazyChartJS = dynamic(
  () => import('react-chartjs-2').then(mod => ({ default: mod.Chart })),
  {
    loading: () => <ChartLoader />,
    ssr: false
  }
)

export const LazyFullCalendar = dynamic(
  () => import('@fullcalendar/react'),
  {
    loading: () => <CalendarLoader />,
    ssr: false
  }
)

// Recharts components with individual imports for tree-shaking
export const LazyLineChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.LineChart })),
  {
    loading: () => <ChartLoader />,
    ssr: false
  }
)

export const LazyBarChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.BarChart })),
  {
    loading: () => <ChartLoader />,
    ssr: false
  }
)

export const LazyAreaChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.AreaChart })),
  {
    loading: () => <ChartLoader />,
    ssr: false
  }
)

// Custom hook for intersection observer-based lazy loading
export function useIntersectionObserver({ 
  threshold = 0.1, 
  rootMargin = '100px',
  triggerOnce = true 
} = {}) {
  const [entry, setEntry] = useState()
  const [node, setNode] = useState()

  useEffect(() => {
    if (!node || typeof window === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setEntry(entry)
        if (triggerOnce && entry.isIntersecting) {
          observer.disconnect()
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [node, threshold, rootMargin, triggerOnce])

  return [setNode, entry?.isIntersecting ?? false]
}

// Wrapper component for viewport-based lazy loading
export function LazyLoadOnView({ children, placeholder = <div className="min-h-[200px]" /> }) {
  const [ref, isVisible] = useIntersectionObserver({ triggerOnce: true })
  
  return (
    <div ref={ref}>
      {isVisible ? children : placeholder}
    </div>
  )
}

export const LazyAIChat = dynamic(
  () => import('@/components/AIChat'),
  {
    loading: ComponentLoader,
    ssr: false // Disable SSR for client-only components
  }
)

export const LazyCalendar = dynamic(
  () => import('@/components/calendar/Calendar'),
  {
    loading: ComponentLoader,
    ssr: false
  }
)

export const LazyAnalyticsDashboard = dynamic(
  () => import('@/components/analytics/AnalyticsDashboard'),
  {
    loading: ComponentLoader,
    ssr: true
  }
)

export const LazyMarketingManager = dynamic(
  () => import('@/components/marketing/MarketingCampaignManager'),
  {
    loading: ComponentLoader,
    ssr: true
  }
)

export const LazyOnboardingWizard = dynamic(
  () => import('@/components/onboarding/OnboardingWizard'),
  {
    loading: ComponentLoader,
    ssr: true
  }
)

export const LazySettingsPanel = dynamic(
  () => import('@/components/settings/SettingsPanel'),
  {
    loading: ComponentLoader,
    ssr: true
  }
)

export const LazyReportGenerator = dynamic(
  () => import('@/components/reports/ReportGenerator'),
  {
    loading: ComponentLoader,
    ssr: false
  }
)

export const LazyAdvancedForm = dynamic(
  () => import('@/components/forms/AdvancedForm'),
  {
    loading: ComponentLoader,
    ssr: true
  }
)

export const LazyDataTable = dynamic(
  () => import('@/components/tables/DataTable'),
  {
    loading: ComponentLoader,
    ssr: true
  }
)

export const LazyRichTextEditor = dynamic(
  () => import('@/components/editors/RichTextEditor'),
  {
    loading: ComponentLoader,
    ssr: false
  }
)

export const LazyQRCodeGenerator = dynamic(
  () => import('@/components/tools/QRCodeGenerator'),
  {
    loading: ComponentLoader,
    ssr: false
  }
)

export const LazyVideoPlayer = dynamic(
  () => import('@/components/media/VideoPlayer'),
  {
    loading: ComponentLoader,
    ssr: false
  }
)

export const LazyFileUploader = dynamic(
  () => import('@/components/upload/FileUploader'),
  {
    loading: ComponentLoader,
    ssr: false
  }
)

export const LazyMapView = dynamic(
  () => import('@/components/maps/MapView'),
  {
    loading: ComponentLoader,
    ssr: false
  }
)

export default {
  AIChat: LazyAIChat,
  Calendar: LazyCalendar,
  AnalyticsDashboard: LazyAnalyticsDashboard,
  MarketingManager: LazyMarketingManager,
  OnboardingWizard: LazyOnboardingWizard,
  SettingsPanel: LazySettingsPanel,
  ReportGenerator: LazyReportGenerator,
  AdvancedForm: LazyAdvancedForm,
  DataTable: LazyDataTable,
  RichTextEditor: LazyRichTextEditor,
  QRCodeGenerator: LazyQRCodeGenerator,
  VideoPlayer: LazyVideoPlayer,
  FileUploader: LazyFileUploader,
  MapView: LazyMapView
}