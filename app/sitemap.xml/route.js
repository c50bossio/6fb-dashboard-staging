import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://6fb.ai'

export async function GET() {
  try {
    // Fetch all active barbers and booking links for dynamic sitemap
    const { data: barbers } = await supabase
      .from('auth.users')
      .select('id')
      .limit(100) // Reasonable limit for sitemap

    const { data: activeBookingLinks } = await supabase
      .from('booking_links')
      .select('id, barber_id, url, updated_at')
      .eq('active', true)
      .limit(500) // SEO-friendly limit

    const currentDate = new Date().toISOString().split('T')[0]
    
    // Static pages
    const staticPages = [
      {
        url: baseUrl,
        lastmod: currentDate,
        changefreq: 'daily',
        priority: 1.0
      },
      {
        url: `${baseUrl}/book`,
        lastmod: currentDate,
        changefreq: 'hourly',
        priority: 0.9
      }
    ]

    // Dynamic barber booking pages
    const barberPages = (barbers || []).map(barber => ({
      url: `${baseUrl}/book/${barber.id}`,
      lastmod: currentDate,
      changefreq: 'hourly',
      priority: 0.8
    }))

    // Custom booking link pages (for popular/frequently accessed links)
    const bookingLinkPages = (activeBookingLinks || [])
      .filter(link => link.url.includes('?')) // Only include parameterized links
      .map(link => ({
        url: `${baseUrl}${link.url}`,
        lastmod: new Date(link.updated_at).toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: 0.7
      }))

    const allPages = [...staticPages, ...barberPages, ...bookingLinkPages]

    // Generate XML sitemap
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${allPages.map(page => `  <url>
    <loc>${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    <mobile:mobile/>
  </url>`).join('\n')}
</urlset>`

    return new Response(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
        'CDN-Cache-Control': 'public, max-age=3600',
        'Vercel-CDN-Cache-Control': 'public, max-age=3600'
      }
    })

  } catch (error) {
    console.error('Sitemap generation error:', error)
    
    // Fallback minimal sitemap
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/book</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`

    return new Response(fallbackSitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=1800', // 30 minutes cache for fallback
      }
    })
  }
}