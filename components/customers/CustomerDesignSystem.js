/**
 * Customer Management Design System
 * 
 * Unified design language for all customer-related components
 * Follows the barbershop app's olive/moss color scheme and design patterns
 */

// Customer-specific design tokens extending the base design system
export const customerDesignTokens = {
  // Color palette following olive/moss theme
  colors: {
    primary: {
      50: '#f7f8f4',
      100: '#eef1e8', 
      200: '#dde3d1',
      300: '#c4d1b0',
      400: '#a6ba89',
      500: '#8ba362', // Main olive
      600: '#6f8a4c',
      700: '#586b3e',
      800: '#485534',
      900: '#3d472c'
    },
    moss: {
      50: '#f5f7f3',
      100: '#eaefe6',
      200: '#d6e0cc',
      300: '#b8c9a6',
      400: '#95ad7a',
      500: '#7a9458', // Main moss
      600: '#627844',
      700: '#4f5f37',
      800: '#414e2f',
      900: '#384229'
    },
    gold: {
      50: '#fefdf7',
      100: '#fdfbef',
      200: '#faf5d6',
      300: '#f5eab5',
      400: '#eed988',
      500: '#e5c55c', // Gold accent
      600: '#d4a943',
      700: '#b18636',
      800: '#8f6b31',
      900: '#755729'
    },
    semantic: {
      success: '#22c55e',
      successLight: '#dcfce7',
      warning: '#f59e0b',
      warningLight: '#fef3c7',
      error: '#ef4444',
      errorLight: '#fee2e2',
      info: '#3b82f6',
      infoLight: '#dbeafe'
    }
  },

  // Component-specific spacing
  spacing: {
    customerCard: {
      padding: '1.5rem',
      gap: '1rem',
      avatarSize: '3rem',
      badgeGap: '0.5rem'
    },
    modal: {
      padding: '2rem',
      maxWidth: '42rem',
      headerHeight: '4rem'
    },
    list: {
      itemHeight: '5rem',
      itemPadding: '1rem',
      itemGap: '0.75rem'
    }
  },

  // Typography scale for customer components
  typography: {
    customerName: {
      fontSize: '1.125rem',
      fontWeight: '600',
      lineHeight: '1.5'
    },
    customerDetail: {
      fontSize: '0.875rem',
      fontWeight: '400',
      lineHeight: '1.4'
    },
    stat: {
      fontSize: '1.5rem',
      fontWeight: '700',
      lineHeight: '1.2'
    },
    badge: {
      fontSize: '0.75rem',
      fontWeight: '500',
      lineHeight: '1'
    }
  },

  // Shadows and elevation
  shadows: {
    card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    cardHover: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    floating: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
  },

  // Border radius values
  borderRadius: {
    sm: '0.25rem',
    default: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px'
  },

  // Animation timing
  animation: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms'
  }
}

// CSS utility classes for customer components
export const customerUtilityClasses = {
  // Container classes
  container: {
    page: 'min-h-screen bg-gray-50 py-8',
    content: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    card: 'bg-white rounded-lg shadow-sm border border-gray-200',
    modal: 'bg-white rounded-xl shadow-xl border border-gray-200 max-w-2xl w-full'
  },

  // Customer card variants
  customerCard: {
    base: 'bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-0.5',
    vip: 'bg-gradient-to-r from-gold-50 to-yellow-50 border-gold-200 hover:shadow-gold-200/50',
    new: 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:shadow-green-200/50',
    lapsed: 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-200 hover:shadow-orange-200/50',
    regular: 'hover:bg-gray-50'
  },

  // Badge variants for customer segments
  badge: {
    base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
    vip: 'bg-gold-100 text-gold-800 border-gold-200',
    new: 'bg-green-100 text-green-800 border-green-200',
    regular: 'bg-olive-100 text-olive-800 border-olive-200',
    lapsed: 'bg-orange-100 text-orange-800 border-orange-200',
    inactive: 'bg-gray-100 text-gray-700 border-gray-200'
  },

  // Button variants following the design system
  button: {
    primary: 'bg-olive-600 hover:bg-olive-700 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-olive-500 focus:ring-offset-2',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
    ghost: 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-3 py-1.5 rounded-md transition-all duration-200',
    icon: 'p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-all duration-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2'
  },

  // Input field styles
  input: {
    base: 'block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:ring-2 focus:ring-olive-500 focus:border-olive-500 transition-colors duration-200',
    search: 'block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:ring-2 focus:ring-olive-500 focus:border-olive-500 transition-colors duration-200'
  },

  // Loading states
  loading: {
    skeleton: 'animate-pulse bg-gray-200 rounded',
    shimmer: 'relative overflow-hidden bg-gray-200 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent',
    spinner: 'animate-spin rounded-full border-2 border-gray-300 border-t-olive-600'
  },

  // Layout utilities
  layout: {
    flex: {
      between: 'flex items-center justify-between',
      center: 'flex items-center justify-center',
      start: 'flex items-center',
      column: 'flex flex-col',
      wrap: 'flex flex-wrap items-center gap-2'
    },
    grid: {
      stats: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6',
      customers: 'grid gap-4',
      responsive: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
    },
    spacing: {
      section: 'space-y-6',
      items: 'space-y-4',
      tight: 'space-y-2'
    }
  },

  // Accessibility and focus states
  a11y: {
    focusRing: 'focus:outline-none focus:ring-2 focus:ring-olive-500 focus:ring-offset-2',
    srOnly: 'sr-only',
    skipLink: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-olive-600 text-white px-4 py-2 rounded-lg z-50'
  },

  // Responsive utilities
  responsive: {
    hide: {
      mobile: 'hidden sm:block',
      tablet: 'hidden lg:block',
      desktop: 'lg:hidden'
    },
    show: {
      mobile: 'sm:hidden',
      tablet: 'hidden sm:block lg:hidden',
      desktop: 'hidden lg:block'
    }
  }
}

// Component composition helpers
export const composeClasses = (...classes) => {
  return classes.filter(Boolean).join(' ')
}

// Theme-aware class selector
export const getThemeClass = (variant, type = 'badge') => {
  const classMap = customerUtilityClasses[type]
  return classMap ? classMap[variant] || classMap.base : ''
}

// Generate customer card classes based on segment
export const getCustomerCardClasses = (segment, isSelected = false) => {
  const baseClasses = customerUtilityClasses.customerCard.base
  const segmentClasses = customerUtilityClasses.customerCard[segment] || ''
  const selectedClasses = isSelected ? 'ring-2 ring-olive-500 ring-offset-2' : ''
  
  return composeClasses(baseClasses, segmentClasses, selectedClasses)
}

// Generate badge classes based on customer properties
export const getCustomerBadgeClasses = (segment) => {
  const baseClasses = customerUtilityClasses.badge.base
  const segmentClasses = customerUtilityClasses.badge[segment] || customerUtilityClasses.badge.regular
  
  return composeClasses(baseClasses, segmentClasses)
}

// Animation keyframes for custom animations
export const customerAnimations = {
  // Floating animation for success states
  float: `
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-4px); }
    }
    .animate-float { animation: float 3s ease-in-out infinite; }
  `,
  
  // Shimmer effect for loading states
  shimmer: `
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    .animate-shimmer { animation: shimmer 2s linear infinite; }
  `,
  
  // Bounce in animation for new items
  bounceIn: `
    @keyframes bounceIn {
      0% { 
        opacity: 0;
        transform: scale(0.3);
      }
      50% {
        opacity: 1;
        transform: scale(1.05);
      }
      70% { transform: scale(0.9); }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }
    .animate-bounce-in { animation: bounceIn 0.6s ease-out; }
  `,
  
  // Slide up animation for modals
  slideUp: `
    @keyframes slideUp {
      0% {
        opacity: 0;
        transform: translateY(10px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .animate-slide-up { animation: slideUp 0.3s ease-out; }
  `,
  
  // Pulse glow for important elements
  pulseGlow: `
    @keyframes pulseGlow {
      0%, 100% {
        box-shadow: 0 0 5px rgba(139, 163, 98, 0.5);
      }
      50% {
        box-shadow: 0 0 20px rgba(139, 163, 98, 0.8), 0 0 30px rgba(139, 163, 98, 0.6);
      }
    }
    .animate-pulse-glow { animation: pulseGlow 2s ease-in-out infinite; }
  `
}

// Inject animations into the document
export const injectCustomerAnimations = () => {
  if (typeof document === 'undefined') return
  
  const styleSheet = document.createElement('style')
  styleSheet.textContent = Object.values(customerAnimations).join('\n')
  document.head.appendChild(styleSheet)
}

// Export complete design system
export default {
  tokens: customerDesignTokens,
  classes: customerUtilityClasses,
  animations: customerAnimations,
  helpers: {
    composeClasses,
    getThemeClass,
    getCustomerCardClasses,
    getCustomerBadgeClasses,
    injectCustomerAnimations
  }
}