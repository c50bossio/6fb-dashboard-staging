import { ClerkProvider } from '@clerk/nextjs'

export const clerkConfig = {
  // Appearance customization
  appearance: {
    elements: {
      formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
      card: 'bg-white shadow-lg',
      headerTitle: 'text-2xl font-bold',
      headerSubtitle: 'text-gray-600',
      socialButtonsBlockButton: 'border-gray-300 hover:bg-gray-50',
      formFieldInput: 'border-gray-300 focus:border-blue-500',
      footerActionLink: 'text-blue-600 hover:text-blue-700',
    },
    layout: {
      socialButtonsPlacement: 'top',
      socialButtonsVariant: 'blockButton',
    },
  },
  
  // Sign in/up URLs
  signInUrl: '/sign-in',
  signUpUrl: '/sign-up',
  afterSignInUrl: '/dashboard',
  afterSignUpUrl: '/dashboard',
}

// Clerk public routes (no auth required)
export const publicRoutes = [
  '/',
  '/sign-in',
  '/sign-up',
  '/pricing',
  '/features',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
  '/api/webhooks/clerk',
  '/api/webhooks/stripe',
]

// Helper to check if route is public
export function isPublicRoute(pathname) {
  return publicRoutes.some(route => {
    if (route.includes('*')) {
      const regex = new RegExp('^' + route.replace('*', '.*') + '$')
      return regex.test(pathname)
    }
    return pathname === route || pathname.startsWith(route + '/')
  })
}