
import { NextResponse } from 'next/server'

export async function GET(request) {
  const demoData = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Elite Cuts Barbershop',
    description: 'Professional barbering services with attention to detail and customer satisfaction.',
    tagline: 'Premium Cuts, Professional Service',
    address: '123 Main Street',
    city: 'New York',
    state: 'NY',
    zip_code: '10001',
    phone: '(555) 123-4567',
    email: 'info@barbershop.com',
    hero_title: 'Welcome to Elite Cuts Barbershop',
    hero_subtitle: 'Experience professional barbering with master craftsmen',
    about_text: 'Professional barbering services with attention to detail and customer satisfaction.',
    website_enabled: true,
    shop_slug: 'elite-cuts-barbershop',
    brand_colors: {
      primary: '#3B82F6',
      secondary: '#1E40AF',
      accent: '#10B981',
      text: '#1F2937',
      background: '#FFFFFF'
    },
    custom_fonts: {
      heading: 'Inter',
      body: 'Inter'
    },
    theme_preset: 'default',
    social_links: {
      instagram: 'https://instagram.com/elitecuts',
      facebook: 'https://facebook.com/elitecuts'
    },
    seo_title: 'Elite Cuts Barbershop | Professional Haircuts',
    seo_description: 'Experience premium barbering at Elite Cuts.',
    booking_enabled: true,
    online_booking_enabled: true
  };

  return NextResponse.json(demoData);
}

export async function PUT(request) {
  const settings = await request.json();
  console.log('💾 Settings saved locally:', settings.name);
  
  return NextResponse.json({ 
    message: 'Settings saved successfully!',
    data: settings 
  });
}
