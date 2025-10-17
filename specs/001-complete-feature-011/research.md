# Technical Implementation Research: Feature 001 - Complete Feature 011

**Research Date**: 2025-10-07
**Feature**: Public Booking & Staff Onboarding
**Codebase**: Next.js 14 App Router + React 18 + Tailwind CSS + Stripe

---

## 1. FullCalendar.io Integration for Availability Display

### Decision
Use **FullCalendar v6** with the `@fullcalendar/react` connector and TimeGrid view for displaying 30-minute booking slots. Mark component as `'use client'` for Next.js 14 App Router compatibility.

### Rationale
- **v6 Advantages**: FullCalendar v6 injects CSS via JavaScript instead of external stylesheets, solving bundler compatibility issues with Next.js
- **Existing Implementation**: Codebase already uses FullCalendar extensively (`/components/calendar/EnhancedProfessionalCalendar.js`) with proven patterns
- **TimeGrid Plugin**: Purpose-built for appointment booking with time-based slot selection
- **React Compatibility**: Official `@fullcalendar/react` connector provides React-first API with hooks support
- **App Router Ready**: Works with Next.js 14 App Router when marked as Client Component with `'use client'` directive

### Implementation Notes

**1. Required Packages** (already installed in codebase):
```json
{
  "@fullcalendar/core": "^6.x.x",
  "@fullcalendar/react": "^6.x.x",
  "@fullcalendar/timegrid": "^6.x.x",
  "@fullcalendar/interaction": "^6.x.x",
  "@fullcalendar/daygrid": "^6.x.x"
}
```

**2. Client Component Pattern** (Next.js App Router):
```javascript
'use client' // REQUIRED at top of file

import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
```

**3. 30-Minute Interval Configuration**:
```javascript
<FullCalendar
  plugins={[timeGridPlugin, interactionPlugin]}
  initialView="timeGridWeek"
  slotDuration="00:30:00"  // 30-minute slots (default)
  slotLabelInterval="00:30:00"  // Label every 30 minutes
  snapDuration="00:30:00"  // Snap to 30-minute intervals when dragging
  minTime="09:00:00"  // Business hours start
  maxTime="20:00:00"  // Business hours end
  allDaySlot={false}  // Hide all-day row for appointment booking
  height="auto"  // Responsive height
/>
```

**4. Marking Slots as Unavailable**:
```javascript
// Fetch existing appointments from API
const bookedSlots = await fetch(`/api/book/${staffSlug}/availability?date=${date}`)
  .then(res => res.json())

// Convert to FullCalendar events (blocks availability)
const events = bookedSlots.map(slot => ({
  start: slot.scheduled_at,
  end: new Date(new Date(slot.scheduled_at).getTime() + slot.duration_minutes * 60000),
  display: 'background',  // Shows as unavailable block
  backgroundColor: '#e5e7eb',  // Gray background
  editable: false
}))
```

**5. Performance Optimization for 30-Day Range**:
- Use `datesSet` callback to fetch events only when date range changes
- Implement client-side caching with `useMemo` for processed events
- Lazy load calendar component with `React.lazy()` or `next/dynamic` if needed
- Limit initial fetch to 7-14 days, load more on scroll

**6. Mobile Responsiveness**:
```javascript
// View switching based on screen size
const isMobile = window.innerWidth < 768

<FullCalendar
  initialView={isMobile ? 'timeGridDay' : 'timeGridWeek'}
  headerToolbar={{
    left: 'prev,next today',
    center: 'title',
    right: isMobile ? '' : 'timeGridWeek,timeGridDay'
  }}
  windowResize={(arg) => {
    // Dynamically switch views on resize
    if (arg.view.calendar.el.clientWidth < 768) {
      arg.view.calendar.changeView('timeGridDay')
    }
  }}
/>
```

### Alternatives Considered

**❌ React Big Calendar**
- Less feature-rich for booking systems
- Requires more custom CSS for professional appearance
- No built-in resource scheduling
- **Why Rejected**: FullCalendar already integrated and more powerful

**❌ Custom Time Slot Grid**
- Full control over UI and behavior
- Lighter weight bundle size
- **Why Rejected**: Reinventing the wheel, FullCalendar handles edge cases (DST, timezones, drag-and-drop) that would require significant custom development

**❌ FullCalendar Dynamic Import with SSR Disabled**
- Old workaround for Next.js compatibility issues
- **Why Rejected**: No longer needed with v6 + `'use client'` directive; adds unnecessary complexity

### References
- [FullCalendar React Documentation](https://fullcalendar.io/docs/react)
- [FullCalendar v6 Upgrade Guide](https://fullcalendar.io/docs/upgrading-from-v5)
- [TimeGrid View Documentation](https://fullcalendar.io/docs/timegrid-view)
- [Next.js App Router Client Components](https://nextjs.org/docs/app/building-your-application/rendering/client-components)
- Existing implementation: `/components/calendar/EnhancedProfessionalCalendar.js`

---

## 2. Stripe React SDK for Embedded Payments

### Decision
Use **Stripe Elements** with `@stripe/react-stripe-js` and the **CardElement** component for embedded payment forms. Wrap payment step in `<Elements>` provider with server-generated `clientSecret` from Payment Intent API.

### Rationale
- **PCI Compliance**: Stripe Elements are PCI DSS SAQ A compliant - card data never touches your servers
- **Existing Implementation**: Codebase already uses this pattern in `/components/booking/steps/PaymentStep.js`
- **Best Practice**: Payment Element (recommended by Stripe in 2025) auto-handles multiple payment methods, but CardElement sufficient for MVP
- **App Router Compatible**: Works seamlessly with Next.js 14 App Router using client components
- **Proven Pattern**: Production-ready with built-in validation, error handling, and styling

### Implementation Notes

**1. Required Packages** (already installed):
```json
{
  "@stripe/stripe-js": "^7.8.0",
  "@stripe/react-stripe-js": "^3.9.0"
}
```

**2. Payment Flow Architecture**:

```
Client                          Server API                    Stripe
------                          ----------                    ------
1. User selects service
   & time slot

2. Submit booking form    -->   3. POST /api/book/[staffSlug]/create
                                   - Validate availability
                                   - Create Payment Intent
                                   - Return clientSecret
                    <--
4. Load Stripe Elements
   with clientSecret

5. User enters card
   details

6. Submit payment        -->    7. Confirm Payment Intent     -->  8. Process payment
                                   with Stripe API

                         <--                                  <--  9. Payment confirmed

10. Show confirmation
    & booking details
```

**3. Server-Side: Payment Intent Creation** (Next.js API Route):
```javascript
// app/api/book/[staffSlug]/create/route.ts
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request, { params }) {
  const { staffSlug } = params
  const { serviceId, scheduledAt, customerEmail } = await request.json()

  // 1. Validate availability (prevent double booking)
  const isAvailable = await checkAvailability(staffSlug, scheduledAt)
  if (!isAvailable) {
    return NextResponse.json({ error: 'Time slot no longer available' }, { status: 409 })
  }

  // 2. Create Payment Intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: servicePrice * 100, // Convert to cents
    currency: 'usd',
    metadata: {
      staff_slug: staffSlug,
      service_id: serviceId,
      scheduled_at: scheduledAt
    },
    receipt_email: customerEmail,
    automatic_payment_methods: {
      enabled: true // Recommended in 2025
    }
  })

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id
  })
}
```

**4. Client-Side: Elements Provider Wrapper**:
```javascript
'use client'

import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

// Initialize Stripe (do this outside component to avoid recreating)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

export default function PaymentStep({ onSuccess }) {
  const [clientSecret, setClientSecret] = useState(null)

  // Fetch client secret on mount
  useEffect(() => {
    fetch('/api/book/john-smith/create', {
      method: 'POST',
      body: JSON.stringify(bookingData)
    })
    .then(res => res.json())
    .then(data => setClientSecret(data.clientSecret))
  }, [])

  if (!clientSecret) return <LoadingSpinner />

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm onSuccess={onSuccess} />
    </Elements>
  )
}
```

**5. Payment Form Component**:
```javascript
function PaymentForm({ onSuccess }) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState(null)
  const [processing, setProcessing] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return // Stripe.js hasn't loaded yet
    }

    setProcessing(true)
    setError(null)

    // Confirm payment with card element
    const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: customerName,
            email: customerEmail
          }
        }
      }
    )

    if (confirmError) {
      setError(confirmError.message)
      setProcessing(false)
    } else if (paymentIntent.status === 'succeeded') {
      // Payment successful - create booking record
      onSuccess(paymentIntent.id)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardElement
        options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              '::placeholder': { color: '#aab7c4' }
            },
            invalid: { color: '#9e2146' }
          }
        }}
      />
      {error && <div className="text-red-600">{error}</div>}
      <button disabled={!stripe || processing}>
        {processing ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  )
}
```

**6. Error Handling & Retry Logic**:
```javascript
// Idempotency key for safe retries (prevent double-charging)
const idempotencyKey = `booking_${Date.now()}_${Math.random()}`

const paymentIntent = await stripe.paymentIntents.create(
  { /* ... */ },
  { idempotencyKey }
)

// Error types to handle
const handleStripeError = (error) => {
  switch (error.type) {
    case 'card_error':
      // Customer's card was declined
      return 'Your card was declined. Please try a different payment method.'

    case 'validation_error':
      // Invalid parameters (shouldn't happen with Elements validation)
      return 'Invalid payment information. Please check your details.'

    case 'api_error':
      // Stripe server error - safe to retry
      return 'Payment processing error. Please try again.'

    case 'network_error':
      // Network connectivity issue - safe to retry
      return 'Network error. Please check your connection and try again.'

    default:
      return 'An unexpected error occurred. Please try again.'
  }
}

// Retry logic (only for retriable errors)
const retriableErrors = ['api_error', 'network_error']
let retryCount = 0
const maxRetries = 3

async function confirmPaymentWithRetry() {
  try {
    return await stripe.confirmCardPayment(clientSecret, paymentMethod)
  } catch (error) {
    if (retriableErrors.includes(error.type) && retryCount < maxRetries) {
      retryCount++
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)) // Exponential backoff
      return confirmPaymentWithRetry()
    }
    throw error
  }
}
```

**7. PCI Compliance Considerations (2025)**:
- ✅ **Never log card numbers** or CVV codes (even in error logs)
- ✅ **Use Stripe Elements** - keeps card data out of your DOM
- ✅ **HTTPS only** - enforce in production
- ✅ **Content Security Policy**: Whitelist Stripe domains
  ```javascript
  // next.config.js
  async headers() {
    return [{
      source: '/:path*',
      headers: [{
        key: 'Content-Security-Policy',
        value: "frame-src https://js.stripe.com"
      }]
    }]
  }
  ```
- ✅ **Webhook signature verification** for payment confirmation events
- ✅ **Monitor dependencies** (Jan 2025 PCI requirement for third-party scripts)

**8. Test Mode Configuration**:
```javascript
// .env.local
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  // Test mode
STRIPE_SECRET_KEY=sk_test_...                   // Test mode

// .env.production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  // Production
STRIPE_SECRET_KEY=sk_live_...                   // Production

// Test cards
// Success: 4242 4242 4242 4242 (any future expiry, any CVC)
// Decline: 4000 0000 0000 0002
// Requires auth: 4000 0025 0000 3155
```

### Alternatives Considered

**❌ Stripe Checkout (Hosted)**
- Faster integration (redirect to Stripe-hosted page)
- Less customization control
- **Why Rejected**: User leaves your site, breaks booking flow UX; embedded payment keeps users on barbershop domain

**❌ Stripe Payment Element** (vs CardElement)
- Newer component (recommended by Stripe 2025)
- Supports Apple Pay, Google Pay, Link, etc. automatically
- **Why Rejected**: Overkill for MVP; CardElement sufficient for credit card payments; can migrate later

**❌ Manual Stripe API Integration** (without Elements)
- Full UI control
- **Why Rejected**: Not PCI compliant (requires SAQ D); Elements provide security and UX best practices out-of-box

### References
- [Stripe Elements React Documentation](https://docs.stripe.com/stripe-js/react)
- [Payment Intents API Guide](https://docs.stripe.com/payments/payment-intents)
- [Stripe Error Handling](https://docs.stripe.com/error-handling)
- [PCI DSS Compliance Guide](https://stripe.com/guides/pci-compliance)
- [2025 Integration Security Guide](https://docs.stripe.com/security/guide)
- Existing implementation: `/components/booking/steps/PaymentStep.js`

---

## 3. Next.js App Router Patterns for Public/Protected Routes

### Decision
Use **Next.js Middleware** in `middleware.ts` for authentication checks + **server-side session validation** in protected routes. Public booking pages (`/book/[staffSlug]`) bypass auth; admin routes (`/admin/staff`) require authentication.

### Rationale
- **Official Pattern**: Next.js recommends middleware for auth (runs before request is processed)
- **Performance**: Middleware checks are faster than client-side redirects (no layout shift)
- **SEO Friendly**: Public booking pages are server-rendered, fully crawlable by search engines
- **Security**: Server-side checks prevent unauthorized API access
- **Existing Implementation**: Codebase already has middleware pattern (can extend it)

### Implementation Notes

**1. Route Structure**:
```
app/
├── book/
│   └── [staffSlug]/
│       └── page.tsx              # PUBLIC (no auth required)
├── (protected)/
│   ├── admin/
│   │   └── staff/
│   │       ├── page.tsx          # PROTECTED (admin only)
│   │       └── new/
│   │           └── page.tsx      # Staff onboarding wizard
│   └── dashboard/
│       └── page.tsx              # PROTECTED (barber or admin)
└── api/
    └── book/
        └── [staffSlug]/
            ├── route.ts           # PUBLIC API
            ├── services/route.ts  # PUBLIC API
            └── create/route.ts    # PUBLIC API (validates booking data)
```

**2. Middleware Authentication Pattern**:
```typescript
// middleware.ts (root of project)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Define route patterns
  const publicRoutes = ['/book/*', '/api/book/*', '/', '/login']
  const protectedRoutes = ['/admin/*', '/dashboard/*']

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route =>
    pathname.match(new RegExp(`^${route.replace('*', '.*')}$`))
  )

  if (isPublicRoute) {
    return NextResponse.next() // Allow access
  }

  // For protected routes, validate session
  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, options) => response.cookies.set(name, value, options),
        remove: (name, options) => response.cookies.delete(name)
      }
    }
  )

  // Validate session (IMPORTANT: Use getUser() not getSession())
  const { data: { user }, error } = await supabase.auth.getUser()

  if (!user) {
    // Redirect to login if not authenticated
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname) // Preserve intended destination
    return NextResponse.redirect(loginUrl)
  }

  // Check role-based access (if needed)
  if (pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'shop_owner') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

// Configure which routes middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ]
}
```

**3. Server Component Protection** (additional layer):
```typescript
// app/(protected)/admin/staff/page.tsx
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'

export default async function StaffManagementPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value
      }
    }
  )

  // Double-check authentication (defense in depth)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch staff data server-side
  const { data: staff } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'barber')

  return <StaffList staff={staff} />
}
```

**4. Public Booking Page** (Server-Rendered for SEO):
```typescript
// app/book/[staffSlug]/page.tsx
import { notFound } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function generateMetadata({ params }) {
  const { staffSlug } = params
  const staff = await fetchStaffBySlug(staffSlug)

  return {
    title: `Book ${staff.first_name} ${staff.last_name} - ${staff.title}`,
    description: `Schedule an appointment with ${staff.first_name}, specializing in ${staff.specialties?.join(', ')}`,
    openGraph: {
      images: [staff.profile_image_url]
    }
  }
}

export default async function StaffBookingPage({ params }) {
  const { staffSlug } = params

  // Fetch staff data server-side (for SEO)
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value
      }
    }
  )

  const { data: staff } = await supabase
    .from('profiles')
    .select('*, services(*)')
    .eq('booking_slug', staffSlug)
    .single()

  if (!staff) {
    notFound() // 404 page
  }

  // Render booking page (client component for interactivity)
  return <BookingWizard staff={staff} />
}
```

**5. API Route Protection**:
```typescript
// app/api/admin/staff/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Admin operations
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value
      }
    }
  )

  // Verify user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'shop_owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch staff data
  const { data: staff } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'barber')

  return NextResponse.json(staff)
}
```

**6. SEO Optimization for Public Routes**:
```typescript
// app/book/[staffSlug]/page.tsx

// Generate static params for popular staff (ISR)
export async function generateStaticParams() {
  const staff = await fetchAllStaff()
  return staff.map((s) => ({
    staffSlug: s.booking_slug
  }))
}

// Revalidate every hour (ISR)
export const revalidate = 3600

// Structured data for Google
export default function StaffBookingPage({ staff }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": `${staff.first_name} ${staff.last_name}`,
    "description": staff.bio,
    "image": staff.profile_image_url,
    "priceRange": "$25-$150",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": staff.rating || 5,
      "reviewCount": staff.review_count || 0
    }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <BookingWizard staff={staff} />
    </>
  )
}
```

### Alternatives Considered

**❌ Client-Side Auth Check** (useEffect redirect)
- Easy to implement
- **Why Rejected**: SEO issues (flash of protected content), performance (layout shift), not secure (easy to bypass in DevTools)

**❌ next.config.js Redirects**
- Simple configuration
- **Why Rejected**: Can't access session/cookies in config file; static rules only

**❌ Route Groups Only** (no middleware)
- Clean folder structure with `(public)` and `(protected)` groups
- **Why Rejected**: No enforcement mechanism; still need middleware or page-level checks

### References
- [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Supabase Server-Side Auth Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js Authentication Patterns](https://nextjs.org/docs/app/building-your-application/authentication)
- [generateMetadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- Existing implementation: `/middleware.js`

---

## 4. Multi-Step Wizard UX with Headless UI

### Decision
Build a **custom multi-step wizard** using local React state management with `useState`, Headless UI's **Tab component** for navigation, and **Tailwind CSS** for styling. Implement step validation with per-step progress indicators.

### Rationale
- **Existing Pattern**: Codebase already has multi-step booking wizard in `/app/book/[barberId]/page.js` (3-step: Services → Time → Details)
- **Headless UI Tabs**: Perfect for wizard navigation - accessible, keyboard-friendly, and unstyled
- **Local State Management**: Simple `useState` hook sufficient for 4-step wizard (no need for form library overhead)
- **Tailwind Styling**: Consistent with codebase design system, rapid prototyping
- **Accessibility**: Headless UI provides ARIA attributes out-of-box

### Implementation Notes

**1. Wizard State Structure**:
```typescript
// 4-step onboarding wizard state
const [currentStep, setCurrentStep] = useState(0)
const [wizardData, setWizardData] = useState({
  // Step 1: Basic Info
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  title: '',
  bio: '',
  profileImage: null,

  // Step 2: Service Assignment
  selectedServices: [], // Array of service IDs

  // Step 3: Financial Configuration
  paymentModel: 'commission', // 'commission' | 'booth_rent' | 'hybrid'
  commissionRate: 60, // Percentage (0-100)
  boothRentAmount: 0,

  // Step 4: Review & Generate Link
  bookingSlug: '', // Auto-generated, can be customized
  slugCustomized: false
})
```

**2. Wizard Container Component**:
```typescript
'use client'

import { useState } from 'react'
import { Tab } from '@headlessui/react'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

const STEPS = [
  { id: 0, name: 'Basic Info', description: 'Name, photo, and bio' },
  { id: 1, name: 'Services', description: 'Assign services' },
  { id: 2, name: 'Financials', description: 'Commission & rent' },
  { id: 3, name: 'Review', description: 'Generate booking link' }
]

export default function StaffOnboardingWizard({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [wizardData, setWizardData] = useState(/* ... */)
  const [completedSteps, setCompletedSteps] = useState(new Set())

  const updateData = (stepData) => {
    setWizardData(prev => ({ ...prev, ...stepData }))
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Basic Info
        return wizardData.firstName && wizardData.lastName && wizardData.email
      case 1: // Services
        return wizardData.selectedServices.length > 0
      case 2: // Financials
        return wizardData.commissionRate >= 0 && wizardData.commissionRate <= 100
      case 3: // Review
        return wizardData.bookingSlug.length >= 3
      default:
        return false
    }
  }

  const handleNext = () => {
    if (canProceed()) {
      setCompletedSteps(prev => new Set([...prev, currentStep]))
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  const handleComplete = async () => {
    // Submit to API
    const response = await fetch('/api/admin/staff', {
      method: 'POST',
      body: JSON.stringify(wizardData)
    })

    if (response.ok) {
      const { staff } = await response.json()
      onComplete(staff)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Indicator */}
      <nav aria-label="Progress" className="mb-8">
        <ol className="flex items-center justify-between">
          {STEPS.map((step, idx) => (
            <li key={step.id} className="relative flex-1">
              <button
                onClick={() => setCurrentStep(idx)}
                disabled={!completedSteps.has(idx) && idx > currentStep}
                className={`group flex flex-col items-center ${
                  idx <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
              >
                {/* Step Circle */}
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  completedSteps.has(idx)
                    ? 'bg-olive-600'
                    : idx === currentStep
                    ? 'border-2 border-olive-600 bg-white'
                    : 'border-2 border-gray-300 bg-white'
                }`}>
                  {completedSteps.has(idx) ? (
                    <CheckCircleIcon className="h-6 w-6 text-white" />
                  ) : (
                    <span className={idx === currentStep ? 'text-olive-600 font-semibold' : 'text-gray-500'}>
                      {idx + 1}
                    </span>
                  )}
                </div>

                {/* Step Label */}
                <span className="mt-2 text-sm font-medium text-gray-900">
                  {step.name}
                </span>
                <span className="text-xs text-gray-500">
                  {step.description}
                </span>
              </button>

              {/* Connector Line */}
              {idx < STEPS.length - 1 && (
                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-full h-0.5 bg-gray-300"
                     style={{ width: 'calc(100% - 2.5rem)' }} />
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Step Content */}
      <div className="bg-white shadow rounded-lg p-6 min-h-[400px]">
        {currentStep === 0 && <BasicInfoStep data={wizardData} onChange={updateData} />}
        {currentStep === 1 && <ServiceSelectionStep data={wizardData} onChange={updateData} />}
        {currentStep === 2 && <FinancialConfigStep data={wizardData} onChange={updateData} />}
        {currentStep === 3 && <ReviewStep data={wizardData} onChange={updateData} />}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 0}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </button>

        {currentStep < STEPS.length - 1 ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-6 py-2 text-white bg-olive-600 rounded-lg hover:bg-olive-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleComplete}
            disabled={!canProceed()}
            className="px-6 py-2 text-white bg-moss-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Complete Onboarding
          </button>
        )}
      </div>
    </div>
  )
}
```

**3. Step Component Example** (Service Selection):
```typescript
function ServiceSelectionStep({ data, onChange }) {
  const [services, setServices] = useState([])

  useEffect(() => {
    // Fetch available services
    fetch('/api/services')
      .then(res => res.json())
      .then(data => setServices(data.services))
  }, [])

  const toggleService = (serviceId) => {
    const isSelected = data.selectedServices.includes(serviceId)
    const newServices = isSelected
      ? data.selectedServices.filter(id => id !== serviceId)
      : [...data.selectedServices, serviceId]

    onChange({ selectedServices: newServices })
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Select Services</h2>
        <p className="text-gray-600">Choose which services this barber will offer</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {services.map(service => (
          <button
            key={service.id}
            onClick={() => toggleService(service.id)}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              data.selectedServices.includes(service.id)
                ? 'border-olive-500 bg-olive-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900">{service.name}</h3>
                <p className="text-sm text-gray-600">{service.duration} min</p>
              </div>
              <span className="text-xl font-bold text-gray-900">${service.price}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>{data.selectedServices.length}</strong> services selected
        </p>
      </div>
    </div>
  )
}
```

**4. Per-Step Validation Strategy**:
```typescript
// Define validation rules per step
const validationRules = {
  0: (data) => ({
    firstName: data.firstName?.trim().length >= 2,
    lastName: data.lastName?.trim().length >= 2,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email),
    phone: /^\(\d{3}\) \d{3}-\d{4}$/.test(data.phone)
  }),
  1: (data) => ({
    services: data.selectedServices.length > 0
  }),
  2: (data) => ({
    commission: data.commissionRate >= 0 && data.commissionRate <= 100,
    boothRent: data.paymentModel === 'booth_rent' ? data.boothRentAmount > 0 : true
  }),
  3: (data) => ({
    slug: data.bookingSlug.length >= 3 && /^[a-z0-9-]+$/.test(data.bookingSlug)
  })
}

// Show validation errors inline
const [errors, setErrors] = useState({})

const validateStep = (step) => {
  const rules = validationRules[step](wizardData)
  const newErrors = {}

  Object.entries(rules).forEach(([field, isValid]) => {
    if (!isValid) {
      newErrors[field] = true
    }
  })

  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
}
```

**5. Accessibility Considerations**:
- ✅ **Keyboard Navigation**: Use Tab key to navigate form fields, Enter to proceed
- ✅ **ARIA Labels**:
  ```jsx
  <div role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={4}>
    Step {currentStep + 1} of {STEPS.length}
  </div>
  ```
- ✅ **Focus Management**: Auto-focus first input on step change
  ```jsx
  const firstInputRef = useRef()
  useEffect(() => {
    firstInputRef.current?.focus()
  }, [currentStep])
  ```
- ✅ **Error Announcements**: Use `aria-live` for validation errors
  ```jsx
  <div role="alert" aria-live="polite">
    {errors.email && 'Please enter a valid email address'}
  </div>
  ```
- ✅ **Screen Reader Support**: Label all form fields with `<label htmlFor="...">`

### Alternatives Considered

**❌ Formik + Yup** (Form library)
- Powerful validation with Yup schemas
- Built-in error handling
- **Why Rejected**: Overkill for 4-step wizard; local state simpler; existing codebase doesn't use Formik

**❌ React Hook Form**
- Excellent performance (uncontrolled components)
- TypeScript support
- **Why Rejected**: Similar to Formik - unnecessary dependency for this use case

**❌ Headless UI Disclosure** (instead of custom wizard)
- Collapsible sections for each step
- **Why Rejected**: Wizard UX requires linear progression; Disclosure allows expanding multiple sections

**❌ External Wizard Library** (e.g., react-step-wizard)
- Pre-built wizard logic
- **Why Rejected**: Adds dependency for simple state management; custom solution more flexible

### References
- [Headless UI Tab Component](https://headlessui.com/react/tabs)
- [React Multi-Step Form Tutorial](https://www.flexyui.com/blogs/react-multi-step-form)
- [Tailwind CSS Stepper Examples](https://flowbite.com/docs/components/stepper/)
- [WCAG 2.2 Form Accessibility](https://www.w3.org/WAI/WCAG22/Understanding/)
- Existing implementation: `/app/book/[barberId]/page.js` (3-step booking wizard)

---

## 5. URL Migration and Backward Compatibility

### Decision
Use **Next.js Middleware** for server-side redirects from old `/book/[barberId]` to new `/book/[staffSlug]` format. Store mapping in database (`profiles` table with `id` and `booking_slug` columns) and implement **301 permanent redirects** for SEO.

### Rationale
- **SEO Preservation**: 301 redirects tell search engines the URL has permanently moved, preserving page rank
- **Database-Driven**: Dynamic redirects based on actual barber data (no hardcoded mapping)
- **Zero Downtime**: Old URLs continue working during migration period
- **Performance**: Middleware redirects are faster than client-side (no JavaScript execution)
- **Analytics Tracking**: Can track usage of old URLs to measure migration success

### Implementation Notes

**1. Database Schema**:
```sql
-- Add booking_slug column to profiles table (migration)
ALTER TABLE profiles
ADD COLUMN booking_slug VARCHAR(100) UNIQUE,
ADD COLUMN booking_slug_customized BOOLEAN DEFAULT FALSE;

-- Create index for fast lookups
CREATE INDEX idx_profiles_booking_slug ON profiles(booking_slug);

-- Create index on id for reverse lookups (old URL format)
CREATE INDEX idx_profiles_id ON profiles(id);
```

**2. Middleware Redirect Logic**:
```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if this is an old-format booking URL
  const oldUrlPattern = /^\/book\/([0-9a-f-]{36})$/i // UUID format
  const match = pathname.match(oldUrlPattern)

  if (match) {
    const barberId = match[1]

    // Lookup staff member by ID
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => request.cookies.get(name)?.value
        }
      }
    )

    const { data: staff } = await supabase
      .from('profiles')
      .select('booking_slug')
      .eq('id', barberId)
      .single()

    if (staff?.booking_slug) {
      // Redirect to new URL format (301 permanent)
      const newUrl = new URL(`/book/${staff.booking_slug}`, request.url)

      // Preserve query parameters
      request.nextUrl.searchParams.forEach((value, key) => {
        newUrl.searchParams.set(key, value)
      })

      return NextResponse.redirect(newUrl, { status: 301 })
    }
  }

  return NextResponse.next()
}
```

**3. Slug Generation Strategy**:
```typescript
// utils/slug-generator.ts
export function generateBookingSlug(firstName: string, lastName: string): string {
  const slug = `${firstName}-${lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/-+/g, '-')           // Collapse multiple hyphens
    .replace(/^-|-$/g, '')         // Remove leading/trailing hyphens

  return slug
}

export async function ensureUniqueSlug(
  baseSlug: string,
  excludeId?: string
): Promise<string> {
  const supabase = createClient()
  let slug = baseSlug
  let counter = 2

  while (true) {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('booking_slug', slug)
      .neq('id', excludeId || '') // Exclude current staff member when updating
      .single()

    if (!data) {
      return slug // Slug is unique
    }

    // Slug exists, append number
    slug = `${baseSlug}-${counter}`
    counter++
  }
}

// Usage in onboarding wizard
const baseSlug = generateBookingSlug('John', 'Smith') // "john-smith"
const uniqueSlug = await ensureUniqueSlug(baseSlug)   // "john-smith" or "john-smith-2"
```

**4. Migration Wizard** (Admin Tool):
```typescript
// app/(protected)/admin/migration/page.tsx
'use client'

import { useState } from 'react'

export default function SlugMigrationPage() {
  const [status, setStatus] = useState('idle') // idle | running | complete
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [results, setResults] = useState([])

  const runMigration = async () => {
    setStatus('running')

    // Fetch all staff without booking_slug
    const response = await fetch('/api/admin/staff?missing_slug=true')
    const { staff } = await response.json()

    setProgress({ current: 0, total: staff.length })

    for (let i = 0; i < staff.length; i++) {
      const member = staff[i]

      // Generate slug
      const baseSlug = generateBookingSlug(member.first_name, member.last_name)

      // Check uniqueness
      const uniqueSlug = await fetch('/api/admin/staff/validate-slug', {
        method: 'POST',
        body: JSON.stringify({ slug: baseSlug, excludeId: member.id })
      }).then(res => res.json())

      // Update profile
      await fetch(`/api/admin/staff/${member.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ booking_slug: uniqueSlug.slug })
      })

      setProgress(prev => ({ ...prev, current: i + 1 }))
      setResults(prev => [...prev, {
        name: `${member.first_name} ${member.last_name}`,
        oldUrl: `/book/${member.id}`,
        newUrl: `/book/${uniqueSlug.slug}`
      }])
    }

    setStatus('complete')
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Booking URL Migration</h1>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h2 className="font-semibold text-yellow-900">Migration Overview</h2>
        <p className="text-yellow-700 text-sm">
          This tool will generate unique booking slugs for all existing barbers
          and enable automatic redirects from old URLs to new ones.
        </p>
      </div>

      {status === 'idle' && (
        <button
          onClick={runMigration}
          className="px-6 py-3 bg-olive-600 text-white rounded-lg hover:bg-olive-700"
        >
          Start Migration
        </button>
      )}

      {status === 'running' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-gray-200 rounded-full h-4">
              <div
                className="bg-olive-600 h-4 rounded-full transition-all"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium">
              {progress.current} / {progress.total}
            </span>
          </div>

          <div className="text-sm text-gray-600">
            Migrating staff profiles...
          </div>
        </div>
      )}

      {status === 'complete' && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h2 className="font-semibold text-green-900">Migration Complete!</h2>
            <p className="text-green-700 text-sm">
              {results.length} staff members migrated successfully.
            </p>
          </div>

          <table className="w-full border rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Staff Member</th>
                <th className="px-4 py-2 text-left">Old URL</th>
                <th className="px-4 py-2 text-left">New URL</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-4 py-2">{result.name}</td>
                  <td className="px-4 py-2 text-sm text-gray-600 font-mono">
                    {result.oldUrl}
                  </td>
                  <td className="px-4 py-2 text-sm text-olive-600 font-mono">
                    {result.newUrl}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

**5. SEO Considerations**:

**Canonical URLs**:
```tsx
// app/book/[staffSlug]/page.tsx
export default function StaffBookingPage({ params }) {
  const { staffSlug } = params
  const canonicalUrl = `https://yourbarbershop.com/book/${staffSlug}`

  return (
    <>
      <link rel="canonical" href={canonicalUrl} />
      {/* ... rest of page */}
    </>
  )
}
```

**Sitemap Update**:
```typescript
// app/sitemap.ts
export default async function sitemap() {
  const staff = await fetchAllStaff()

  const staffUrls = staff.map(member => ({
    url: `https://yourbarbershop.com/book/${member.booking_slug}`,
    lastModified: member.updated_at,
    changeFrequency: 'weekly',
    priority: 0.8
  }))

  return [
    { url: 'https://yourbarbershop.com', priority: 1 },
    ...staffUrls
  ]
}
```

**robots.txt** (disallow old format):
```
User-agent: *
Allow: /book/*

# Prefer new slug format over UUID format
Disallow: /book/????????-????-????-????-????????????
```

**6. Analytics Tracking**:
```typescript
// Track redirect events
export async function middleware(request: NextRequest) {
  // ... redirect logic ...

  if (staff?.booking_slug) {
    // Log redirect for analytics
    await fetch('https://analytics.example.com/track', {
      method: 'POST',
      body: JSON.stringify({
        event: 'url_redirect',
        old_format: pathname,
        new_format: `/book/${staff.booking_slug}`,
        timestamp: new Date().toISOString()
      })
    })

    return NextResponse.redirect(newUrl, { status: 301 })
  }
}
```

**7. Performance Impact**:
- **Caching**: Middleware runs on every request → consider caching slug mappings in Redis
- **Database Query**: Add index on `id` and `booking_slug` columns (already included in schema)
- **Edge Function**: Deploy middleware to edge for faster redirects globally

### Alternatives Considered

**❌ next.config.js Redirects**
- Static configuration only
- **Why Rejected**: Can't access database to map IDs to slugs; would need hardcoded list

**❌ Client-Side Redirect** (JavaScript)
- useEffect to detect old URL and redirect
- **Why Rejected**: Bad for SEO (search engines see 200, not 301); slower (requires JS execution)

**❌ API Route Redirect**
- `/api/redirect/[barberId]` endpoint
- **Why Rejected**: Extra network hop; middleware is faster and more direct

**❌ Dual Routing** (support both formats indefinitely)
- Keep both `/book/[barberId]` and `/book/[staffSlug]` pages
- **Why Rejected**: Duplicate content issues (SEO penalty); maintenance overhead

### References
- [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Next.js Redirects Configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects)
- [HTTP 301 Redirects Best Practices](https://developers.google.com/search/docs/crawling-indexing/301-redirects)
- [Next.js Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)
- [Sitemap Generation](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)

---

## Summary & Recommendations

### Implementation Priority

1. **Start with FullCalendar Integration** (Lowest Risk)
   - Existing implementation provides solid foundation
   - Focus on 30-minute slot display and availability filtering
   - Can be developed/tested independently

2. **Build Multi-Step Onboarding Wizard** (Core Feature)
   - 4 steps: Basic Info → Services → Financials → Review
   - Generate unique booking slugs during wizard
   - Stores all data in `profiles` table

3. **Create Public Booking Pages** (User-Facing)
   - Server-rendered for SEO (`/book/[staffSlug]`)
   - Integrate FullCalendar for time selection
   - Connect to existing Feature 011 APIs

4. **Integrate Stripe Payment Flow** (Critical for Revenue)
   - Use existing `PaymentStep.js` pattern
   - Create Payment Intent before booking
   - Confirm payment, then save booking record

5. **Implement URL Migration** (Production Deployment)
   - Run migration wizard to generate slugs
   - Deploy middleware redirects
   - Monitor redirect analytics

### Key Success Factors

✅ **Leverage Existing Code**: Codebase has working examples of all patterns needed
✅ **Server Components for SEO**: Public booking pages must be server-rendered
✅ **Security First**: Middleware auth checks + server-side validation
✅ **Progressive Enhancement**: Features work without JavaScript where possible
✅ **Accessibility**: WCAG 2.2 compliance with Headless UI + proper ARIA labels
✅ **Performance**: Optimize FullCalendar rendering for 30-day ranges
✅ **Testing**: E2E tests for booking flow (existing Playwright setup)

### Technology Stack Confirmation

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Framework | Next.js 14 App Router | Already in use, server components for SEO |
| UI Library | React 18 | Latest features (Suspense, Server Components) |
| Styling | Tailwind CSS | Existing design system, rapid development |
| Components | Headless UI v2 | Accessibility out-of-box, unstyled (flexible) |
| Calendar | FullCalendar v6 | Premium features, existing integration |
| Payments | Stripe Elements | PCI compliant, existing implementation |
| Auth | Supabase Auth | Already configured, RLS for security |
| Database | Supabase PostgreSQL | Production database with real-time features |

---

**End of Research Document**
