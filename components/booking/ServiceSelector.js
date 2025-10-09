'use client'

import { CheckCircleIcon, ClockIcon, CurrencyDollarIcon } from '@heroicons/react/24/solid'

/**
 * Service Selector
 * Displays available services and allows client to select one
 */
export default function ServiceSelector({ services, onSelect }) {
  // Group services by category
  const groupedServices = services.reduce((acc, service) => {
    const category = service.category || 'Services'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(service)
    return acc
  }, {})

  if (services.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full">
            <ClockIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No Services Available</h3>
        <p className="text-muted-foreground">
          This barber hasn't set up any services yet. Please check back later.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Select a Service</h2>
        <p className="text-muted-foreground mt-1">Choose the service you'd like to book</p>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedServices).map(([category, categoryServices]) => (
          <div key={category}>
            {/* Category Header */}
            <h3 className="text-lg font-semibold text-foreground mb-3">{category}</h3>

            {/* Service Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryServices.map((service) => (
                <button
                  key={service.id}
                  onClick={() => onSelect(service)}
                  className="relative p-6 border-2 border-border rounded-xl text-left hover:border-olive-500 hover:shadow-md transition-all group"
                >
                  {/* Service Name */}
                  <h4 className="text-lg font-semibold text-foreground mb-2 group-hover:text-olive-700 dark:group-hover:text-olive-400 transition-colors">
                    {service.name}
                  </h4>

                  {/* Service Description */}
                  {service.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {service.description}
                    </p>
                  )}

                  {/* Service Details */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm">
                      {/* Duration */}
                      <div className="flex items-center text-muted-foreground">
                        <ClockIcon className="h-4 w-4 mr-1.5" />
                        <span>{service.duration_minutes} min</span>
                      </div>

                      {/* Price */}
                      <div className="flex items-center font-semibold text-foreground">
                        <CurrencyDollarIcon className="h-4 w-4 mr-0.5" />
                        <span>{service.price.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Select Indicator */}
                    <div className="flex items-center text-olive-600 dark:text-olive-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <CheckCircleIcon className="h-6 w-6" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Help Text */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          💡 <strong>Tip:</strong> Not sure which service to choose? Call us and we'll help you find the perfect option!
        </p>
      </div>
    </div>
  )
}
