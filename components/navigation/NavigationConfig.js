import {
  HomeIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  BoltIcon,
  BellIcon,
  FlagIcon,
  BuildingOffice2Icon,
  CreditCardIcon,
  MegaphoneIcon,
  UserGroupIcon,
  CogIcon,
  SparklesIcon,
  AcademicCapIcon,
  PresentationChartLineIcon,
  InformationCircleIcon,
  PhoneIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  BookOpenIcon,
  PuzzlePieceIcon,
  ComputerDesktopIcon,
  LifebuoyIcon
} from '@heroicons/react/24/outline'

// New organized navigation structure
export const NAVIGATION_CATEGORIES = [
  {
    id: 'overview',
    name: 'Overview',
    icon: HomeIcon,
    color: 'blue',
    description: 'Dashboard and real-time status',
    items: [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: HomeIcon,
        description: 'Main dashboard overview',
        isHome: true
      },
      {
        name: 'Real-time Status',
        href: '/dashboard/realtime',
        icon: BoltIcon,
        badge: 'Live',
        description: 'Live system monitoring'
      }
    ]
  },
  {
    id: 'ai-tools',
    name: 'AI Tools',
    icon: SparklesIcon,
    color: 'purple',
    description: 'AI-powered features and automation',
    items: [
      {
        name: 'AI Chat',
        href: '/dashboard/chat',
        icon: ChatBubbleLeftRightIcon,
        badge: 'GPT-4 & Claude',
        description: 'Multi-model AI assistant'
      },
      {
        name: 'AI Test Center',
        href: '/dashboard/ai-test',
        icon: SparklesIcon,
        badge: '3 Models',
        description: 'Test AI model responses'
      },
      {
        name: 'AI Training',
        href: '/dashboard/ai-training',
        icon: AcademicCapIcon,
        description: 'Train and customize AI agents'
      }
    ]
  },
  {
    id: 'business',
    name: 'Business',
    icon: ChartBarIcon,
    color: 'green',
    description: 'Operations and customer management',
    items: [
      {
        name: 'Bookings',
        href: '/dashboard/bookings',
        icon: CalendarDaysIcon,
        description: 'Smart scheduling system'
      },
      {
        name: 'Customers',
        href: '/dashboard/customers',
        icon: UserGroupIcon,
        description: 'Customer management'
      },
      {
        name: 'Analytics',
        href: '/dashboard/analytics',
        icon: PresentationChartLineIcon,
        description: 'Business insights and reports'
      },
      {
        name: 'Forecasting',
        href: '/dashboard/forecasting',
        icon: ChartBarIcon,
        badge: 'AI',
        description: 'Predictive analytics and forecasting'
      },
      {
        name: 'Marketing',
        href: '/dashboard/marketing',
        icon: MegaphoneIcon,
        description: 'Marketing automation'
      },
      {
        name: 'Campaigns',
        href: '/dashboard/campaigns',
        icon: MegaphoneIcon,
        badge: 'New',
        description: 'Marketing campaigns'
      }
    ]
  },
  {
    id: 'platform',
    name: 'Platform',
    icon: CogIcon,
    color: 'gray',
    description: 'Settings and administration',
    items: [
      {
        name: 'Notifications',
        href: '/dashboard/notifications',
        icon: BellIcon,
        description: 'Notification preferences'
      },
      {
        name: 'Billing',
        href: '/dashboard/billing',
        icon: CreditCardIcon,
        description: 'Subscription and billing'
      },
      {
        name: 'Settings',
        href: '/dashboard/settings',
        icon: CogIcon,
        description: 'Account and system settings'
      },
      {
        name: 'Feature Flags',
        href: '/dashboard/feature-flags',
        icon: FlagIcon,
        description: 'Feature toggle management'
      },
      {
        name: 'Enterprise',
        href: '/dashboard/enterprise',
        icon: BuildingOffice2Icon,
        description: 'Enterprise features',
        requiresRole: ['ENTERPRISE_OWNER', 'SUPER_ADMIN']
      }
    ]
  },
  {
    id: 'company',
    name: 'Company',
    icon: InformationCircleIcon,
    color: 'indigo',
    description: 'Company information and resources',
    items: [
      {
        name: 'About',
        href: '/dashboard/about',
        icon: InformationCircleIcon,
        description: 'About our company'
      },
      {
        name: 'Features',
        href: '/dashboard/features',
        icon: PuzzlePieceIcon,
        description: 'Platform features overview'
      },
      {
        name: 'Demo',
        href: '/dashboard/demo',
        icon: ComputerDesktopIcon,
        description: 'Interactive demo'
      },
      {
        name: 'Documentation',
        href: '/dashboard/docs',
        icon: BookOpenIcon,
        description: 'Technical documentation'
      },
      {
        name: 'Blog',
        href: '/dashboard/blog',
        icon: DocumentTextIcon,
        description: 'Company blog and updates'
      },
      {
        name: 'Contact',
        href: '/dashboard/contact',
        icon: PhoneIcon,
        description: 'Contact information'
      },
      {
        name: 'Support',
        href: '/dashboard/support',  
        icon: LifebuoyIcon,
        description: 'Help and support'
      },
      {
        name: 'Privacy',
        href: '/dashboard/privacy',
        icon: ShieldCheckIcon,
        description: 'Privacy policy'
      },
      {
        name: 'Terms',
        href: '/dashboard/terms',
        icon: DocumentTextIcon,
        description: 'Terms of service'
      },
      {
        name: 'Security',
        href: '/dashboard/security',
        icon: ShieldCheckIcon,
        description: 'Security information'
      }
    ]
  }
]

// Helper functions
export function getCategoryByPath(pathname) {
  for (const category of NAVIGATION_CATEGORIES) {
    const item = category.items.find(item => pathname.startsWith(item.href))
    if (item) {
      return { category, item }
    }
  }
  return null
}

export function getVisibleItems(category, userRole = null) {
  return category.items.filter(item => {
    if (!item.requiresRole) return true
    return item.requiresRole.includes(userRole)
  })
}

export function getCategoryColor(colorName) {
  const colors = {
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      hover: 'hover:bg-blue-100',
      accent: 'bg-blue-600'
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      hover: 'hover:bg-purple-100',
      accent: 'bg-purple-600'
    },
    green: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      hover: 'hover:bg-green-100',
      accent: 'bg-green-600'
    },
    gray: {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      border: 'border-gray-200',
      hover: 'hover:bg-gray-100',
      accent: 'bg-gray-600'
    },
    indigo: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      hover: 'hover:bg-indigo-100',
      accent: 'bg-indigo-600'
    }
  }
  return colors[colorName] || colors.gray
}

export default NAVIGATION_CATEGORIES