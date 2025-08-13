/**
 * Lazy-loaded component definitions for performance optimization
 */

import dynamic from 'next/dynamic'
import { LoadingSkeleton } from '@/lib/lazy-load'

// Dashboard components with lazy loading
export const DashboardMetrics = dynamic(
  () => import('@/components/dashboard/metrics'),
  {
    loading: () => <LoadingSkeleton type="card" />,
    ssr: false
  }
)

export const DashboardActions = dynamic(
  () => import('@/components/dashboard/actions'),
  {
    loading: () => <LoadingSkeleton type="default" />,
    ssr: false
  }
)

export const BookingCalendar = dynamic(
  () => import('@/components/calendar/BookingCalendar'),
  {
    loading: () => <LoadingSkeleton type="chart" />,
    ssr: false
  }
)

// Analytics components with heavy charting libraries
export const AnalyticsChart = dynamic(
  () => import('recharts').then(mod => mod.LineChart),
  {
    loading: () => <LoadingSkeleton type="chart" />,
    ssr: false
  }
)

export const PerformanceChart = dynamic(
  () => import('recharts').then(mod => mod.AreaChart),
  {
    loading: () => <LoadingSkeleton type="chart" />,
    ssr: false
  }
)

// AI components
export const AIChat = dynamic(
  () => import('@/components/ai/AIChat'),
  {
    loading: () => <LoadingSkeleton type="default" />,
    ssr: false,
    suspense: true
  }
)

export const AIRecommendations = dynamic(
  () => import('@/components/ai/AIRecommendations'),
  {
    loading: () => <LoadingSkeleton type="card" />,
    ssr: false
  }
)

// Settings and configuration components
export const SettingsPanel = dynamic(
  () => import('@/components/settings/SettingsPanel'),
  {
    loading: () => <LoadingSkeleton type="form" />,
    ssr: false
  }
)

export const ProfileSettings = dynamic(
  () => import('@/components/settings/ProfileSettings'),
  {
    loading: () => <LoadingSkeleton type="form" />,
    ssr: false
  }
)

// Notification components
export const NotificationCenter = dynamic(
  () => import('@/components/notifications/NotificationCenter'),
  {
    loading: () => <LoadingSkeleton type="default" />,
    ssr: false
  }
)

// Heavy third-party integrations
export const StripeCheckout = dynamic(
  () => import('@/components/payments/StripeCheckout'),
  {
    loading: () => <LoadingSkeleton type="form" />,
    ssr: false
  }
)

export const GoogleMapsWidget = dynamic(
  () => import('@/components/maps/GoogleMapsWidget'),
  {
    loading: () => <LoadingSkeleton type="chart" />,
    ssr: false
  }
)

// Table components
export const DataTable = dynamic(
  () => import('@/components/ui/DataTable'),
  {
    loading: () => <LoadingSkeleton type="table" />,
    ssr: false
  }
)

export const BookingTable = dynamic(
  () => import('@/components/bookings/BookingTable'),
  {
    loading: () => <LoadingSkeleton type="table" />,
    ssr: false
  }
)

// Modal components
export const BookingModal = dynamic(
  () => import('@/components/modals/BookingModal'),
  {
    loading: () => null,
    ssr: false
  }
)

export const PaymentModal = dynamic(
  () => import('@/components/modals/PaymentModal'),
  {
    loading: () => null,
    ssr: false
  }
)

// PDF generation components
export const InvoiceGenerator = dynamic(
  () => import('@/components/pdf/InvoiceGenerator'),
  {
    loading: () => <LoadingSkeleton type="default" />,
    ssr: false
  }
)

export const ReportGenerator = dynamic(
  () => import('@/components/pdf/ReportGenerator'),
  {
    loading: () => <LoadingSkeleton type="default" />,
    ssr: false
  }
)

// Export all lazy components
export default {
  DashboardMetrics,
  DashboardActions,
  BookingCalendar,
  AnalyticsChart,
  PerformanceChart,
  AIChat,
  AIRecommendations,
  SettingsPanel,
  ProfileSettings,
  NotificationCenter,
  StripeCheckout,
  GoogleMapsWidget,
  DataTable,
  BookingTable,
  BookingModal,
  PaymentModal,
  InvoiceGenerator,
  ReportGenerator
}