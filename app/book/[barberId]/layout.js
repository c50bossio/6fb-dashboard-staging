import { generateBarberMetadata, generateStructuredData } from '../../../lib/seo-utils'

export async function generateMetadata({ params, searchParams }) {
  try {
    // In production, fetch real barber data from API
    const Barber = {
      id: params.barberId,
      name: 'Marcus Johnson',
      title: 'Master Barber',
      rating: 4.9,
      reviewCount: 156,
      bio: 'Professional barber with over 10 years of experience specializing in fades, beard sculpting, and modern men\'s cuts.',
      location: {
        name: '6FB Downtown',
        address: '123 Main St, Downtown, NY 10001',
        phone: '(555) 123-4567',
        city: 'New York',
        state: 'NY',
        zipCode: '10001'
      },
      specialties: ['Fades', 'Beard Sculpting', 'Hot Towel Shaves', 'Classic Cuts'],
      services: [
        { name: 'Classic Cut', price: 35, duration: 30 },
        { name: 'Fade Cut', price: 45, duration: 45 },
        { name: 'Beard Trim', price: 20, duration: 20 },
        { name: 'Hot Towel Shave', price: 50, duration: 45 }
      ],
      image: '/barbers/marcus-johnson-barber.jpg',
      businessHours: {
        monday: '9:00 AM - 8:00 PM',
        tuesday: '9:00 AM - 8:00 PM', 
        wednesday: '9:00 AM - 8:00 PM',
        thursday: '9:00 AM - 8:00 PM',
        friday: '9:00 AM - 8:00 PM',
        saturday: '9:00 AM - 6:00 PM',
        sunday: '10:00 AM - 6:00 PM'
      }
    }

    return generateBarberMetadata(Barber, searchParams)
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Book Appointment | Professional Barber Services',
      description: 'Book your next haircut or grooming service with our professional barber. Online booking available.'
    }
  }
}

export default function BookingLayout({ children, params }) {
  // Generate structured data for the page
  const structuredData = generateStructuredData({
    id: params.barberId,
    name: 'Marcus Johnson',
    title: 'Master Barber', 
    rating: 4.9,
    reviewCount: 156,
    location: {
      name: '6FB Downtown',
      address: '123 Main St, Downtown, NY 10001',
      phone: '(555) 123-4567',
      city: 'New York',
      state: 'NY',
      zipCode: '10001'
    },
    services: [
      { name: 'Classic Cut', price: 35, duration: 30 },
      { name: 'Fade Cut', price: 45, duration: 45 },
      { name: 'Beard Trim', price: 20, duration: 20 },
      { name: 'Hot Towel Shave', price: 50, duration: 45 }
    ]
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData)
        }}
      />
      {children}
    </>
  )
}