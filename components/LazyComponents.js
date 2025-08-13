/**
 * Lazy-loaded components for code splitting
 * These components are loaded on-demand to reduce initial bundle size
 */

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

// Loading component for lazy-loaded components
const ComponentLoader = () => (
  <div className="space-y-4 p-4">
    <Skeleton className="h-12 w-3/4" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-5/6" />
  </div>
)

// AI Chat component - Heavy component loaded on demand
export const LazyAIChat = dynamic(
  () => import('@/components/AIChat'),
  {
    loading: ComponentLoader,
    ssr: false // Disable SSR for client-only components
  }
)

// Calendar component - Heavy FullCalendar library
export const LazyCalendar = dynamic(
  () => import('@/components/calendar/Calendar'),
  {
    loading: ComponentLoader,
    ssr: false
  }
)

// Analytics Dashboard - Charts and data visualizations
export const LazyAnalyticsDashboard = dynamic(
  () => import('@/components/analytics/AnalyticsDashboard'),
  {
    loading: ComponentLoader,
    ssr: true
  }
)

// Marketing Campaign Manager
export const LazyMarketingManager = dynamic(
  () => import('@/components/marketing/MarketingCampaignManager'),
  {
    loading: ComponentLoader,
    ssr: true
  }
)

// Onboarding Flow
export const LazyOnboardingWizard = dynamic(
  () => import('@/components/onboarding/OnboardingWizard'),
  {
    loading: ComponentLoader,
    ssr: true
  }
)

// Settings Panels
export const LazySettingsPanel = dynamic(
  () => import('@/components/settings/SettingsPanel'),
  {
    loading: ComponentLoader,
    ssr: true
  }
)

// PDF Reports Generator
export const LazyReportGenerator = dynamic(
  () => import('@/components/reports/ReportGenerator'),
  {
    loading: ComponentLoader,
    ssr: false
  }
)

// Advanced Forms
export const LazyAdvancedForm = dynamic(
  () => import('@/components/forms/AdvancedForm'),
  {
    loading: ComponentLoader,
    ssr: true
  }
)

// Data Tables with sorting/filtering
export const LazyDataTable = dynamic(
  () => import('@/components/tables/DataTable'),
  {
    loading: ComponentLoader,
    ssr: true
  }
)

// Rich Text Editor
export const LazyRichTextEditor = dynamic(
  () => import('@/components/editors/RichTextEditor'),
  {
    loading: ComponentLoader,
    ssr: false
  }
)

// QR Code Generator
export const LazyQRCodeGenerator = dynamic(
  () => import('@/components/tools/QRCodeGenerator'),
  {
    loading: ComponentLoader,
    ssr: false
  }
)

// Video Player
export const LazyVideoPlayer = dynamic(
  () => import('@/components/media/VideoPlayer'),
  {
    loading: ComponentLoader,
    ssr: false
  }
)

// File Uploader
export const LazyFileUploader = dynamic(
  () => import('@/components/upload/FileUploader'),
  {
    loading: ComponentLoader,
    ssr: false
  }
)

// Map Component
export const LazyMapView = dynamic(
  () => import('@/components/maps/MapView'),
  {
    loading: ComponentLoader,
    ssr: false
  }
)

// Export all lazy components as default
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