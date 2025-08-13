'use client'

export default function SkipLinks() {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <a
        href="#main-content"
        className="fixed top-4 left-4 z-[60] bg-olive-600 text-white px-4 py-3 rounded-lg font-medium 
                   focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600
                   transform -translate-y-16 focus:translate-y-0 transition-transform duration-300
                   min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        Skip to main content
      </a>
      <a
        href="#navigation"
        className="fixed top-4 left-[180px] z-[60] bg-olive-600 text-white px-4 py-3 rounded-lg font-medium 
                   focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600
                   transform -translate-y-16 focus:translate-y-0 transition-transform duration-300
                   min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        Skip to navigation
      </a>
    </div>
  )
}

// Higher-order component to wrap page content with proper skip targets
export function withSkipTargets(WrappedComponent) {
  return function SkipTargetWrapper(props) {
    return (
      <>
        <SkipLinks />
        <div id="navigation" className="sr-only">Navigation</div>
        <main id="main-content" className="focus:outline-none" tabIndex={-1}>
          <WrappedComponent {...props} />
        </main>
      </>
    )
  }
}

// Touch-friendly skip link component for mobile
export function MobileSkipLinks() {
  return (
    <div className="md:hidden sr-only focus-within:not-sr-only">
      <a
        href="#main-content"
        className="fixed top-4 left-4 z-[60] bg-olive-600 text-white px-6 py-4 rounded-lg font-medium 
                   focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600
                   transform -translate-y-20 focus:translate-y-0 transition-transform duration-300
                   min-h-[48px] text-base shadow-lg"
      >
        Skip to main content
      </a>
      <a
        href="#mobile-navigation"
        className="fixed top-4 right-4 z-[60] bg-olive-600 text-white px-6 py-4 rounded-lg font-medium 
                   focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600
                   transform -translate-y-20 focus:translate-y-0 transition-transform duration-300
                   min-h-[48px] text-base shadow-lg"
      >
        Open menu
      </a>
    </div>
  )
}