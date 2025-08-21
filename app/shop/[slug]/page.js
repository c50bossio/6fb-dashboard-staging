import { notFound } from 'next/navigation'
import PublicShopWebsite from './PublicShopWebsite'

// Generate metadata for SEO
export async function generateMetadata({ params }) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}/api/barbershop/${params.slug}/public`,
      { cache: 'no-store' }
    )
    
    if (!response.ok) {
      return {
        title: 'Barbershop Not Found',
        description: 'The barbershop you are looking for does not exist.'
      }
    }
    
    const { data } = await response.json()
    
    return {
      title: data.seo?.title || `${data.name} - Professional Barbershop`,
      description: data.seo?.description || data.description || `Visit ${data.name} for professional barbering services. Book your appointment online today!`,
      keywords: data.seo?.keywords || 'barbershop, haircut, barber, grooming, mens haircut',
      openGraph: {
        title: data.seo?.title || data.name,
        description: data.seo?.description || data.description,
        type: 'website',
        url: `${process.env.NEXT_PUBLIC_APP_URL}/shop/${params.slug}`,
        images: data.cover_image_url ? [
          {
            url: data.cover_image_url,
            width: 1200,
            height: 630,
            alt: data.name
          }
        ] : [],
        siteName: data.name
      },
      twitter: {
        card: 'summary_large_image',
        title: data.seo?.title || data.name,
        description: data.seo?.description || data.description,
        images: data.cover_image_url ? [data.cover_image_url] : []
      },
      alternates: {
        canonical: data.seo?.canonical_url || `${process.env.NEXT_PUBLIC_APP_URL}/shop/${params.slug}`
      },
      robots: {
        index: data.is_published !== false,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1
      }
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Barbershop',
      description: 'Professional barbershop services'
    }
  }
}

// Server component that fetches data
export default async function ShopPage({ params }) {
  let shopData = null
  
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}/api/barbershop/${params.slug}/public`,
      { cache: 'no-store' }
    )
    
    if (!response.ok) {
      notFound()
    }
    
    const { data } = await response.json()
    shopData = data
    
    // Check if website is published
    if (shopData.website_enabled === false || shopData.is_published === false) {
      notFound()
    }
  } catch (error) {
    console.error('Error fetching shop data:', error)
    notFound()
  }
  
  // Render the client component with the fetched data
  return <PublicShopWebsite initialData={shopData} slug={params.slug} />
}