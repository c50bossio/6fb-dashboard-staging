module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      'xs': '375px',    // Mobile small
      'sm': '640px',    // Mobile large / Tablet small
      'md': '768px',    // Tablet
      'lg': '1024px',   // Desktop small
      'xl': '1280px',   // Desktop
      '2xl': '1536px',  // Desktop large
    },
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
      spacing: {
        'touch': '44px',      // Minimum touch target size
        'touch-lg': '48px',   // Large touch target
        'touch-xl': '56px',   // Extra large touch target
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      fontSize: {
        'mobile-xs': ['0.75rem', { lineHeight: '1rem' }],
        'mobile-sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'mobile-base': ['1rem', { lineHeight: '1.5rem' }],
        'mobile-lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'mobile-xl': ['1.25rem', { lineHeight: '1.75rem' }],
        'mobile-2xl': ['1.5rem', { lineHeight: '2rem' }],
        'mobile-3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-left': 'slideLeft 0.3s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 0.6s ease-out',
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'swipe-indicator': 'swipeIndicator 2s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideLeft: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 20%, 53%, 80%, 100%': { transform: 'translate3d(0,0,0)' },
          '40%, 43%': { transform: 'translate3d(0,-8px,0)' },
          '70%': { transform: 'translate3d(0,-4px,0)' },
          '90%': { transform: 'translate3d(0,-2px,0)' },
        },
        fadeInUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        swipeIndicator: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(10px)' },
        },
      },
      backdropBlur: {
        'xs': '2px',
      },
      boxShadow: {
        'mobile': '0 2px 8px -2px rgba(0, 0, 0, 0.1)',
        'mobile-lg': '0 4px 16px -4px rgba(0, 0, 0, 0.15)',
        'mobile-xl': '0 8px 32px -8px rgba(0, 0, 0, 0.2)',
        'touch': '0 2px 4px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        'touch-active': '0 1px 2px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(0, 0, 0, 0.1)',
      },
      zIndex: {
        'mobile-nav': '50',
        'mobile-menu': '40',
        'mobile-overlay': '30',
        'mobile-modal': '60',
      },
    },
  },
  plugins: [
    function({ addUtilities, theme, addComponents }) {
      const newUtilities = {
        '.touch-target': {
          minWidth: theme('spacing.touch'),
          minHeight: theme('spacing.touch'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        '.touch-target-lg': {
          minWidth: theme('spacing.touch-lg'),
          minHeight: theme('spacing.touch-lg'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        '.touch-target-xl': {
          minWidth: theme('spacing.touch-xl'),
          minHeight: theme('spacing.touch-xl'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        '.mobile-container': {
          paddingLeft: theme('spacing.4'),
          paddingRight: theme('spacing.4'),
          paddingTop: theme('spacing.safe-top'),
          paddingBottom: theme('spacing.safe-bottom'),
        },
        '.mobile-scroll': {
          '-webkit-overflow-scrolling': 'touch',
          scrollBehavior: 'smooth',
        },
        '.mobile-tap': {
          '-webkit-tap-highlight-color': 'transparent',
          touchAction: 'manipulation',
        },
        '.swipeable': {
          touchAction: 'pan-x',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        },
        '.pinchable': {
          touchAction: 'pinch-zoom',
        },
        '.scrollable-x': {
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          '-webkit-overflow-scrolling': 'touch',
        },
        '.scrollable-y': {
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollSnapType: 'y mandatory',
          '-webkit-overflow-scrolling': 'touch',
        },
        '.scroll-snap-item': {
          scrollSnapAlign: 'start',
          scrollSnapStop: 'always',
        },
        '.ios-bounce-disable': {
          '-webkit-overflow-scrolling': 'touch',
          overscrollBehavior: 'none',
        },
        '.safe-area-full': {
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        },
      }

      const newComponents = {
        '.mobile-card': {
          backgroundColor: theme('colors.white'),
          borderRadius: theme('borderRadius.lg'),
          boxShadow: theme('boxShadow.mobile'),
          padding: theme('spacing.4'),
          transition: 'all 0.2s ease',
          '&:active': {
            transform: 'scale(0.98)',
            boxShadow: theme('boxShadow.touch-active'),
          },
        },
        '.mobile-btn': {
          minHeight: theme('spacing.touch'),
          padding: `${theme('spacing.3')} ${theme('spacing.6')}`,
          borderRadius: theme('borderRadius.lg'),
          fontWeight: theme('fontWeight.medium'),
          fontSize: theme('fontSize.mobile-base[0]'),
          lineHeight: theme('fontSize.mobile-base[1].lineHeight'),
          touchAction: 'manipulation',
          userSelect: 'none',
          transition: 'all 0.2s ease',
          '&:active': {
            transform: 'scale(0.96)',
          },
        },
        '.mobile-nav': {
          position: 'fixed',
          bottom: '0',
          left: '0',
          right: '0',
          backgroundColor: theme('colors.white'),
          borderTopWidth: '1px',
          borderTopColor: theme('colors.gray.200'),
          paddingBottom: 'env(safe-area-inset-bottom)',
          zIndex: theme('zIndex.mobile-nav'),
        },
      }

      addUtilities(newUtilities)
      addComponents(newComponents)
    },
  ],
}