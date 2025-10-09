import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PublicBookingPage from '@/components/booking/PublicBookingPage'

/**
 * Public Booking Page (Server Component)
 * SEO-friendly server-rendered page for staff booking
 * Route: /book/[staffSlug]
 *
 * Supports both:
 * - New slug format: /book/john-smith
 * - Old UUID format: /book/abc-123-def (redirects to slug)
 */

// Check if string is a UUID
function isUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// Generate metadata for SEO
export async function generateMetadata({ params }) {
  const { staffSlug } = params
  const supabase = createClient()

  const { data: staff } = await supabase
    .from('profiles')
    .select('first_name, last_name, bio, specialties, image')
    .eq('booking_slug', staffSlug)
    .eq('role', 'BARBER')
    .single()

  if (!staff) {
    return {
      title: 'Staff Not Found',
      description: 'The requested staff member could not be found.',
    }
  }

  const fullName = `${staff.first_name} ${staff.last_name}`
  const specialtiesList = staff.specialties?.join(', ') || 'various services'

  return {
    title: `Book ${fullName} - Professional Barber Services`,
    description: staff.bio || `Schedule an appointment with ${fullName}, specializing in ${specialtiesList}`,
    openGraph: {
      title: `Book ${fullName}`,
      description: staff.bio || `Professional barber services by ${fullName}`,
      images: staff.image ? [{ url: staff.image }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Book ${fullName}`,
      description: staff.bio || `Professional barber services by ${fullName}`,
      images: staff.image ? [staff.image] : [],
    },
  }
}

// Main page component (Server Component)
export default async function StaffBookingPage({ params }) {
  const { staffSlug } = params
  const supabase = createClient()

  // Check if this is an old UUID-based URL
  if (isUUID(staffSlug)) {
    // Lookup barber by ID to get their booking slug
    const { data: staffById } = await supabase
      .from('profiles')
      .select('booking_slug')
      .eq('id', staffSlug)
      .eq('role', 'BARBER')
      .single()

    if (staffById?.booking_slug) {
      // Redirect to new slug-based URL (301 permanent redirect)
      redirect(`/book/${staffById.booking_slug}`)
    }

    // If no booking slug, barber not found
    notFound()
  }

  // Fetch staff member by booking slug
  const { data: staff, error } = await supabase
    .from('profiles')
    .select(`
      id,
      first_name,
      last_name,
      email,
      phone,
      bio,
      specialties,
      booking_slug,
      image,
      barbershop_id,
      financial_model,
      commission_percentage
    `)
    .eq('booking_slug', staffSlug)
    .eq('role', 'BARBER')
    .single()

  if (error || !staff) {
    console.error('Staff not found:', error)
    notFound()
  }

  // Fetch staff's services
  const { data: staffServices } = await supabase
    .from('barber_services')
    .select(`
      service_id,
      services:service_id (
        id,
        name,
        description,
        price,
        duration_minutes,
        category,
        active
      )
    `)
    .eq('barber_id', staff.id)

  // Extract services array
  const services = staffServices
    ?.map(bs => bs.services)
    .filter(s => s && s.active) || []

  // Fetch barbershop details
  const { data: barbershop } = await supabase
    .from('barbershops')
    .select('id, name, address, phone, business_hours')
    .eq('id', staff.barbershop_id)
    .single()

  // Generate structured data for Google
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": `${staff.first_name} ${staff.last_name}`,
    "description": staff.bio || `Professional barber services by ${staff.first_name} ${staff.last_name}`,
    "image": staff.image || '',
    "priceRange": services.length > 0
      ? `$${Math.min(...services.map(s => s.price))}-$${Math.max(...services.map(s => s.price))}`
      : '$25-$150',
    "telephone": staff.phone || barbershop?.phone,
    "address": barbershop?.address ? {
      "@type": "PostalAddress",
      "streetAddress": barbershop.address
    } : undefined,
  }

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Client Component for Interactive Booking */}
      <PublicBookingPage
        staff={staff}
        services={services}
        barbershop={barbershop}
      />
    </>
  )
}

// Optional: Generate static params for popular staff (ISR)
export async function generateStaticParams() {
  const supabase = createClient()

  const { data: staff } = await supabase
    .from('profiles')
    .select('booking_slug')
    .eq('role', 'BARBER')
    .not('booking_slug', 'is', null)
    .limit(50) // Limit to top 50 barbers

  return (staff || []).map((member) => ({
    staffSlug: member.booking_slug,
  }))
}

// Revalidate every hour (ISR)
export const revalidate = 3600
