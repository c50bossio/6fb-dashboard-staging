# Error Boundary Components

Comprehensive error handling system for the 6FB AI Agent System.

## Components

### 1. ErrorBoundary
Main error boundary for catching JavaScript errors in the component tree.

```jsx
import { ErrorBoundary } from '@/components/error-boundary'

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

### 2. AsyncErrorBoundary
Handles errors in async operations and Suspense boundaries with automatic retry logic.

```jsx
import { AsyncErrorBoundary } from '@/components/error-boundary'

<AsyncErrorBoundary 
  maxRetries={3}
  loadingMessage="Loading data..."
  showSkeleton={true}
>
  <AsyncComponent />
</AsyncErrorBoundary>
```

### 3. RouteErrorBoundary
Specialized for route-level errors (404s, permission errors, network issues).

```jsx
import { RouteErrorBoundary } from '@/components/error-boundary'

<RouteErrorBoundary>
  <PageContent />
</RouteErrorBoundary>
```

### 4. ComponentErrorBoundary
Lightweight boundary for individual components with inline error display.

```jsx
import { ComponentErrorBoundary } from '@/components/error-boundary'

<ComponentErrorBoundary name="UserProfile" inline={false}>
  <UserProfile />
</ComponentErrorBoundary>
```

### 5. AppErrorBoundary
Root-level boundary that combines all error handling strategies. Used in ClientWrapper.

## HOCs and Hooks

### withErrorBoundary HOC
Wrap any component with error handling:

```jsx
import { withErrorBoundary } from '@/components/error-boundary'

const SafeComponent = withErrorBoundary(YourComponent, {
  name: 'YourComponent',
  fallback: <div>Custom fallback UI</div>
})
```

### useErrorHandler Hook
Handle errors in functional components:

```jsx
import { useErrorHandler } from '@/components/error-boundary'

function MyComponent() {
  const { error, resetError, captureError } = useErrorHandler((err) => {
    console.error('Component error:', err)
  })

  // Use captureError in try-catch blocks
  try {
    riskyOperation()
  } catch (err) {
    captureError(err)
  }

  if (error) {
    return <div>Error: {error.message}</div>
  }

  return <div>Component content</div>
}
```

### useRouteError Hook
Monitor route navigation errors:

```jsx
import { useRouteError } from '@/components/error-boundary'

function Navigation() {
  const routeError = useRouteError()
  
  if (routeError) {
    console.error('Navigation failed:', routeError)
  }
  
  return <nav>...</nav>
}
```

## Features

- **Automatic Retry**: Network errors are automatically retried with exponential backoff
- **Error Reporting**: Errors are reported to Sentry when configured
- **Development Mode**: Detailed error information in development
- **Production Mode**: User-friendly error messages in production
- **Fallback UI**: Customizable fallback components
- **Error Recovery**: Reset functionality to recover from errors
- **Type Safety**: Full TypeScript support with JSDoc annotations

## Best Practices

1. **Use AppErrorBoundary at the root** - Already configured in ClientWrapper
2. **Use AsyncErrorBoundary for data fetching** - Handles loading and error states
3. **Use ComponentErrorBoundary for risky components** - Prevents cascading failures
4. **Provide meaningful names** - Helps with debugging and error tracking
5. **Custom fallbacks for critical UX** - Maintain user experience during errors

## Error Types Handled

- JavaScript runtime errors
- React component errors
- Async/Promise rejections
- Network/fetch errors
- Route navigation errors
- Code splitting/chunk loading errors
- Permission/authorization errors

## Integration with Services

The error boundaries automatically integrate with:
- **Sentry**: Error tracking and monitoring
- **Console**: Development debugging
- **Custom API**: Error reporting endpoint

Configure these services via environment variables:
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry error tracking
- `NEXT_PUBLIC_API_URL` - Custom error reporting endpoint