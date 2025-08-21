// Customer Management Components
// Comprehensive customer intelligence and management tools for barbershop platform

// Core Customer Components
export { default as CustomerIntelligenceDashboard } from './CustomerIntelligenceDashboard'
export { default as IntelligenceDashboardEmptyState } from './IntelligenceDashboardEmptyState'
export { default as CustomerJourneyVisualizer } from './CustomerJourneyVisualizer'
export { default as SegmentBuilder } from './SegmentBuilder'
export { default as CustomerProfileEnhanced } from './CustomerProfileEnhanced'
export { default as ChurnRiskMonitor } from './ChurnRiskMonitor'
export { default as SmartRebookButton } from './SmartRebookButton'
export { default as QuickNotesTimeline } from './QuickNotesTimeline'

// Loyalty & Points System
export { default as LoyaltyPointsDisplay } from './LoyaltyPointsDisplay'
export { default as LoyaltyPointsBadge, QuickRedeemButton } from './LoyaltyPointsBadge'
export { default as TierProgressVisualization } from './TierProgressVisualization'
export { AnimatedPointsEffect, PointsCounterAnimation, TierProgressAnimation, PulseEffect } from './AnimatedPointsEffect'
export { default as PointsExpirationWarning, PointsExpirationBadge } from './PointsExpirationWarning'

// Advanced Search and Filter Components
export { default as AdvancedSearchFilter } from './AdvancedSearchFilter'
export { default as SearchSuggestions } from './SearchSuggestions'
export { default as FilterTags } from './FilterTags'
export { default as SortOptions } from './SortOptions'
export { default as ExportCSV } from './ExportCSV'
export { default as SearchHighlight, HighlightedField, SearchResultCard, BatchHighlight } from './SearchHighlight'

// Achievement Badge System Components
export { default as AchievementBadges } from './AchievementBadges'
export { default as BadgeShowcase } from './BadgeShowcase'
export { default as BadgeUnlockAnimation } from './BadgeUnlockAnimation'
export { default as BadgeProgress } from './BadgeProgress'
export { default as BadgeLeaderboard } from './BadgeLeaderboard'

// UX Enhancement Components
export { default as EmptyBarberState } from './EmptyBarberState'

// Design System & Utilities
export { default as CustomerDesignSystem, customerDesignTokens, customerUtilityClasses } from './CustomerDesignSystem'

// Loading States & Skeletons
export { 
  SkeletonBase, 
  CustomerCardSkeleton, 
  CustomerStatsSkeleton, 
  SearchFilterSkeleton,
  CustomerProfileSkeleton,
  CustomerTableSkeleton,
  CustomerChartSkeleton,
  ProgressiveCustomerLoader,
  CustomerLoadingWrapper
} from './CustomerLoadingStates'

// Micro-Interactions & Animations
export {
  HoverCard,
  MicroButton,
  RippleEffect,
  MagneticHover,
  FloatingLabelInput,
  Tooltip,
  SmoothProgress,
  CountUp,
  StaggeredFadeIn,
  FocusTrap
} from './CustomerMicroInteractions'

// Notifications & Feedback
export {
  AnimatedCheckmark,
  AnimatedErrorX,
  CustomerToast,
  InlineNotification,
  AnimatedConfirmation,
  ProgressNotification,
  SuccessConfetti
} from './CustomerNotifications'

// Mobile Optimizations
export {
  MobileCustomerCard,
  MobileSearchBar,
  MobileFilterDrawer,
  MobileStatsGrid,
  MobileActionSheet
} from './CustomerMobileOptimizations'

// Keyboard Shortcuts & Power User Features
export {
  useKeyboardShortcut,
  CustomerCommandPalette,
  KeyboardShortcutsHelp,
  CustomerKeyboardProvider
} from './CustomerKeyboardShortcuts'

// Quick View & Modals
export { default as CustomerQuickView } from './CustomerQuickView'

// Comparison & Analytics
export { default as CustomerComparison } from './CustomerComparison'

// Data Visualizations & Charts
export {
  AnimatedBarChart,
  AnimatedDonutChart,
  CustomerTrendsChart,
  CustomerMetricsDashboard,
  MetricCard
} from './CustomerDataVisualizations'

// Usage Examples:
// Core functionality
// import { CustomerIntelligenceDashboard, CustomerJourneyVisualizer } from '../components/customers'

// UX enhancements
// import { CustomerQuickView, CustomerComparison, MobileCustomerCard } from '../components/customers'

// Design system
// import { customerDesignTokens, HoverCard, CustomerToast } from '../components/customers'

// Data visualization
// import { CustomerMetricsDashboard, AnimatedBarChart } from '../components/customers'

// Loading states
// import { CustomerCardSkeleton, ProgressiveCustomerLoader } from '../components/customers'

// Keyboard shortcuts
// import { CustomerKeyboardProvider, useKeyboardShortcut } from '../components/customers'

// Search and filter
// import { AdvancedSearchFilter, SearchSuggestions, FilterTags } from '../components/customers'

// Achievement system
// import { AchievementBadges, BadgeShowcase, BadgeProgress } from '../components/customers'