/**
 * Layout components for the 6FB AI Agent System
 */

/**
 * Page wrapper component with consistent styling
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {string} props.title - Page title
 * @param {string} props.subtitle - Page subtitle
 * @param {React.ReactNode} props.actions - Action buttons or components
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Page wrapper component
 */
export function PageWrapper({ 
  children, 
  title, 
  subtitle, 
  actions, 
  className = '' 
}) {
  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      {(title || subtitle || actions) && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              <div>
                {title && (
                  <h1 className="text-3xl font-bold text-gray-900">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="mt-2 text-gray-600">
                    {subtitle}
                  </p>
                )}
              </div>
              {actions && (
                <div className="flex space-x-3">
                  {actions}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  )
}

/**
 * Container component with max width and padding
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.size - Container size (sm, md, lg, xl, full)
 * @returns {JSX.Element} Container component
 */
export function Container({ children, className = '', size = 'xl' }) {
  const sizeClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-full'
  }

  return (
    <div className={`${sizeClasses[size]} mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  )
}

/**
 * Grid layout component
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {string} props.className - Additional CSS classes
 * @param {number} props.cols - Number of columns (1-6)
 * @param {string} props.gap - Gap size (sm, md, lg)
 * @returns {JSX.Element} Grid component
 */
export function Grid({ children, className = '', cols = 1, gap = 'md' }) {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
  }

  const gapClasses = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8'
  }

  return (
    <div className={`grid ${colClasses[cols]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  )
}

/**
 * Section component with consistent spacing
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.title - Section title
 * @param {string} props.subtitle - Section subtitle
 * @param {React.ReactNode} props.actions - Action buttons or components
 * @returns {JSX.Element} Section component
 */
export function Section({ 
  children, 
  className = '', 
  title, 
  subtitle, 
  actions 
}) {
  return (
    <div className={`py-8 ${className}`}>
      {(title || subtitle || actions) && (
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              {title && (
                <h2 className="text-2xl font-bold text-gray-900">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="mt-1 text-gray-600">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex space-x-3">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  )
}

/**
 * Flex layout component
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.direction - Flex direction (row, col)
 * @param {string} props.align - Align items (start, center, end, stretch)
 * @param {string} props.justify - Justify content (start, center, end, between, around)
 * @param {string} props.gap - Gap size (sm, md, lg)
 * @returns {JSX.Element} Flex component
 */
export function Flex({ 
  children, 
  className = '', 
  direction = 'row', 
  align = 'start', 
  justify = 'start', 
  gap = 'md' 
}) {
  const directionClasses = {
    row: 'flex-row',
    col: 'flex-col'
  }

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch'
  }

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around'
  }

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  }

  return (
    <div className={`flex ${directionClasses[direction]} ${alignClasses[align]} ${justifyClasses[justify]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  )
}

/**
 * Stack component for vertical layouts
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.spacing - Spacing between items (sm, md, lg)
 * @returns {JSX.Element} Stack component
 */
export function Stack({ children, className = '', spacing = 'md' }) {
  const spacingClasses = {
    sm: 'space-y-2',
    md: 'space-y-4',
    lg: 'space-y-6'
  }

  return (
    <div className={`${spacingClasses[spacing]} ${className}`}>
      {children}
    </div>
  )
}

/**
 * Empty state component
 * @param {object} props - Component props
 * @param {string} props.title - Empty state title
 * @param {string} props.description - Empty state description
 * @param {React.ReactNode} props.icon - Icon component
 * @param {React.ReactNode} props.action - Action button or component
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Empty state component
 */
export function EmptyState({ 
  title = 'No data available', 
  description, 
  icon, 
  action, 
  className = '' 
}) {
  return (
    <div className={`text-center py-12 ${className}`}>
      {icon && (
        <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-gray-600 mb-6 max-w-sm mx-auto">
          {description}
        </p>
      )}
      {action && action}
    </div>
  )
}

export default {
  PageWrapper,
  Container,
  Grid,
  Section,
  Flex,
  Stack,
  EmptyState
}