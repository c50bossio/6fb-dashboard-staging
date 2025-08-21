import { notFound } from 'next/navigation'
import BarberProfile from './BarberProfile'

// Generate metadata for SEO
export async function generateMetadata({ params }) {
  try {
    const { barbershop, barber } = params
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}/api/public/barber/${barbershop}/${barber}`,
      { cache: 'no-store' }
    )

    if (!response.ok) {
      return {
        title: 'Barber Profile Not Found',
        description: 'The requested barber profile could not be found.'
      }
    }

    const data = await response.json()
    const { barber: barberData, shop_info, website_settings } = data

    return {
      title: `${barberData.name} - ${shop_info.name}`,
      description: website_settings.meta_description || `Book with ${barberData.name}, professional barber at ${shop_info.name}. ${barberData.bio}`,
      keywords: website_settings.meta_keywords || `${barberData.name}, barber, ${shop_info.name}, haircut, grooming`,
      openGraph: {
        title: `${barberData.name} - Professional Barber`,
        description: `Book with ${barberData.name} at ${shop_info.name}`,
        images: barberData.avatar_url ? [{ url: barberData.avatar_url }] : [],
        type: 'profile'
      },
      twitter: {
        card: 'summary_large_image',
        title: `${barberData.name} - Professional Barber`,
        description: `Book with ${barberData.name} at ${shop_info.name}`
      },
      alternates: {
        canonical: `${process.env.NEXT_PUBLIC_APP_URL}/barber/${barbershop}/${barber}`
      }
    }
  } catch (error) {
    console.error('Error generating barber metadata:', error)
    return {
      title: 'Barber Profile',
      description: 'Professional barber profile and booking'
    }
  }
}

export default async function BarberProfilePage({ params }) {
  try {
    const { barbershop, barber } = params
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}/api/public/barber/${barbershop}/${barber}`,
      { 
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        notFound()
      }
      throw new Error(`Failed to fetch barber data: ${response.status}`)
    }

    const data = await response.json()
    
    // Ensure we have the required data structure
    if (!data.barber || !data.shop_info) {
      notFound()
    }

    return <BarberProfile initialData={data} />
    
  } catch (error) {
    console.error('Error loading barber profile:', error)
    
    // Return error boundary or fallback
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Unable to Load Barber Profile
          </h1>
          <p className="text-gray-600 mb-6">
            There was a problem loading the barber profile. Please try again later.
          </p>
          <a 
            href="/" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Return Home
          </a>
        </div>
      </div>
    )
  }
}

// Enable static generation for performance
export async function generateStaticParams() {
  try {
    // In production, you might want to fetch a list of barber slugs
    // For now, return empty array to generate pages on-demand
    return []
  } catch (error) {
    console.error('Error generating static params for barber:', error)
    return []
  }
}