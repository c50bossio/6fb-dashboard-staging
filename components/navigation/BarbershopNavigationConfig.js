import {
  HomeIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ScissorsIcon,
  ClockIcon,
  PhoneIcon,
  StarIcon,
  BellIcon,
  CogIcon,
  SparklesIcon,
  MapPinIcon,
  TrendingUpIcon,
  PresentationChartLineIcon,
  DevicePhoneMobileIcon,
  MegaphoneIcon
} from '@heroicons/react/24/outline'

// Barbershop-focused navigation structure
export const BARBERSHOP_NAVIGATION = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    description: 'Today\'s overview and quick actions',
    badge: null,
    isHome: true
  },
  {
    id: 'schedule',
    name: 'Schedule',
    href: '/dashboard/bookings-realtime',
    icon: CalendarDaysIcon,
    description: 'Appointments, bookings & calendar',
    badge: 'Live',
    children: [
      {
        name: 'Today\'s Schedule',
        href: '/dashboard/bookings-realtime',
        icon: CalendarDaysIcon,
        badge: 'Live'
      },
      {
        name: 'Book Appointment',
        href: '/dashboard/bookings-mobile',
        icon: PhoneIcon
      },
      {
        name: 'Recurring Clients',
        href: '/dashboard/bookings-recurring',
        icon: ClockIcon
      },
      {
        name: 'Walk-ins',
        href: '/dashboard/walk-ins',
        icon: UserGroupIcon
      }
    ]
  },
  {
    id: 'customers',
    name: 'Customers',
    href: '/dashboard/customers',
    icon: UserGroupIcon,
    description: 'Client profiles & history',
    children: [
      {
        name: 'All Customers',
        href: '/dashboard/customers',
        icon: UserGroupIcon
      },
      {
        name: 'Loyalty Program',
        href: '/dashboard/loyalty',
        icon: StarIcon
      },
      {
        name: 'Reviews & Feedback',
        href: '/dashboard/reviews',
        icon: StarIcon
      }
    ]
  },
  {
    id: 'business',
    name: 'Business',
    href: '/dashboard/analytics',
    icon: ChartBarIcon,
    description: 'Revenue, analytics & insights',
    children: [
      {
        name: 'Analytics',
        href: '/dashboard/analytics',
        icon: PresentationChartLineIcon
      },
      {
        name: 'Revenue Reports',
        href: '/dashboard/revenue',
        icon: CurrencyDollarIcon
      },
      {
        name: 'Performance',
        href: '/dashboard/performance',
        icon: TrendingUpIcon
      }
    ]
  },
  {
    id: 'ai-tools',
    name: 'AI Assistant',
    href: '/ai-tools',
    icon: SparklesIcon,
    description: 'AI-powered business insights',
    badge: 'AI',
    children: [
      {
        name: 'Business Insights',
        href: '/ai-insights',
        icon: SparklesIcon,
        badge: 'AI'
      },
      {
        name: 'Forecasting',
        href: '/dashboard/forecasting',
        icon: TrendingUpIcon,
        badge: 'Predict'
      },
      {
        name: 'Marketing AI',
        href: '/dashboard/marketing-ai',
        icon: MegaphoneIcon,
        badge: 'AI'
      }
    ]
  },
  {
    id: 'operations',
    name: 'Operations',
    href: '/dashboard/operations',
    icon: CogIcon,
    description: 'Staff, inventory & settings',
    children: [
      {
        name: 'Staff Schedule',
        href: '/dashboard/staff',
        icon: UserGroupIcon
      },
      {
        name: 'Inventory',
        href: '/dashboard/inventory',
        icon: ScissorsIcon
      },
      {
        name: 'Shop Settings',
        href: '/dashboard/settings',
        icon: CogIcon
      },
      {
        name: 'Notifications',
        href: '/dashboard/notifications',
        icon: BellIcon
      }
    ]
  }
]

// Quick Actions for the navigation
export const QUICK_ACTIONS = [
  {
    name: 'Book Walk-in',
    href: '/dashboard/bookings/new',
    icon: CalendarDaysIcon,
    color: 'bg-blue-600 hover:bg-blue-700',
    description: 'Quick booking for walk-in customer'
  },
  {
    name: 'Check-in Customer',
    href: '/dashboard/checkin',
    icon: UserGroupIcon,
    color: 'bg-green-600 hover:bg-green-700',
    description: 'Mark customer as arrived'
  },
  {
    name: 'Quick Payment',
    href: '/dashboard/payment',
    icon: CurrencyDollarIcon,
    color: 'bg-purple-600 hover:bg-purple-700',
    description: 'Process payment'
  },
  {
    name: 'AI Insights',
    href: '/ai-insights',
    icon: SparklesIcon,
    color: 'bg-amber-600 hover:bg-amber-700',
    description: 'Get business recommendations'
  }
]

// Navigation utility functions
export function getActiveNavItem(pathname) {
  // Find main nav item
  for (const item of BARBERSHOP_NAVIGATION) {
    if (pathname === item.href) {
      return { main: item, sub: null }
    }
    
    // Check children
    if (item.children) {
      for (const child of item.children) {
        if (pathname === child.href || pathname.startsWith(child.href + '/')) {
          return { main: item, sub: child }
        }
      }
    }
    
    // Check if path starts with main item
    if (pathname.startsWith(item.href + '/')) {
      return { main: item, sub: null }
    }
  }
  
  return null
}

export function getBreadcrumbs(pathname) {
  const active = getActiveNavItem(pathname)
  if (!active) return []
  
  const breadcrumbs = [
    { name: 'Home', href: '/dashboard' },
    { name: active.main.name, href: active.main.href }
  ]
  
  if (active.sub) {
    breadcrumbs.push({ name: active.sub.name, href: active.sub.href })
  }
  
  return breadcrumbs
}

// Color themes for different sections
export const NAVIGATION_THEMES = {
  dashboard: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    hover: 'hover:bg-amber-100',
    accent: 'bg-amber-600'
  },
  schedule: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    hover: 'hover:bg-blue-100',
    accent: 'bg-blue-600'
  },
  customers: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    hover: 'hover:bg-green-100',
    accent: 'bg-green-600'
  },
  business: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    hover: 'hover:bg-purple-100',
    accent: 'bg-purple-600'
  },
  'ai-tools': {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    hover: 'hover:bg-indigo-100',
    accent: 'bg-indigo-600'
  },
  operations: {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
    hover: 'hover:bg-gray-100',
    accent: 'bg-gray-600'
  }
}

export default BARBERSHOP_NAVIGATION