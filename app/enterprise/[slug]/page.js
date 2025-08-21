import { notFound } from 'next/navigation'
import EnterprisePortal from './EnterprisePortal'

// Generate metadata for SEO
export async function generateMetadata({ params }) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}/api/enterprise/${params.slug}/public`,
      { cache: 'no-store' }
    )

    if (!response.ok) {
      return {
        title: 'Enterprise Portal Not Found',
        description: 'The requested enterprise portal could not be found.'
      }
    }

    const data = await response.json()
    const { enterprise, website_settings } = data

    return {
      title: `${enterprise.name} - Enterprise Portal`,
      description: website_settings.meta_description || `${enterprise.name} enterprise portal featuring multiple barbershop locations, services, and franchise opportunities.`,
      keywords: website_settings.meta_keywords || `${enterprise.name}, barbershop franchise, multiple locations, professional grooming`,
      openGraph: {
        title: `${enterprise.name} - Enterprise Portal`,
        description: website_settings.meta_description || `Discover ${enterprise.name} locations and services`,
        images: website_settings.hero_image ? [{ url: website_settings.hero_image }] : [],
        type: 'website'
      },
      twitter: {
        card: 'summary_large_image',
        title: `${enterprise.name} - Enterprise Portal`,
        description: website_settings.meta_description || `Discover ${enterprise.name} locations and services`
      },
      alternates: {
        canonical: `${process.env.NEXT_PUBLIC_APP_URL}/enterprise/${params.slug}`
      }
    }
  } catch (error) {
    console.error('Error generating enterprise metadata:', error)
    return {
      title: 'Enterprise Portal',
      description: 'Professional barbershop enterprise portal'
    }
  }
}

export default async function EnterprisePortalPage({ params }) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}/api/enterprise/${params.slug}/public`,
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
      throw new Error(`Failed to fetch enterprise data: ${response.status}`)
    }

    const data = await response.json()
    
    // Ensure we have the required data structure
    if (!data.enterprise || !data.website_settings) {
      notFound()
    }

    return <EnterprisePortal initialData={data} />
    
  } catch (error) {
    console.error('Error loading enterprise portal:', error)
    
    // Return error boundary or fallback
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Unable to Load Enterprise Portal
          </h1>
          <p className="text-gray-600 mb-6">
            There was a problem loading the enterprise portal. Please try again later.
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
    // In production, you might want to fetch a list of enterprise slugs
    // For now, return empty array to generate pages on-demand
    return []
  } catch (error) {
    console.error('Error generating static params for enterprise:', error)
    return []
  }
}