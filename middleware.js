// Temporarily disabled middleware to fix deployment issues
// All security and routing logic moved to component/API level

export function middleware(request) {
  // Minimal middleware - just pass through
  return
}

export const config = {
  matcher: []
}