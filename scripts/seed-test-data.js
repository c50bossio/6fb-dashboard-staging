#!/usr/bin/env node

/**
 * Seed Test Data for 6FB AI Agent System
 * 
 * This script populates the database with test data for development and testing.
 * It creates barbershops, users, services, products, and financial arrangements.
 * 
 * Usage: node scripts/seed-test-data.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

dotenv.config({ path: '.env.local' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const testData = {
  barbershop: {
    name: "Premium Cuts Barbershop",
    slug: "premium-cuts",
    address: "123 Main Street",
    city: "New York",
    state: "NY",
    zip_code: "10001",
    country: "USA",
    phone: "(555) 123-4567",
    email: "info@premiumcuts.com",
    website: "https://premiumcuts.com",
    description: "Manhattan's premier barbershop offering classic cuts and modern styles",
    google_business_profile_id: "ChIJN1t_tDeuEmsRUsoyG83frY4", // Example ID
    opening_hours: {
      monday: { open: "09:00", close: "19:00" },
      tuesday: { open: "09:00", close: "19:00" },
      wednesday: { open: "09:00", close: "19:00" },
      thursday: { open: "09:00", close: "20:00" },
      friday: { open: "09:00", close: "20:00" },
      saturday: { open: "09:00", close: "18:00" },
      sunday: { open: "10:00", close: "16:00" }
    },
    social_links: {
      instagram: "https://instagram.com/premiumcuts",
      facebook: "https://facebook.com/premiumcuts"
    }
  },

  services: [
    {
      name: "Classic Haircut",
      description: "Traditional barbershop haircut with hot towel finish",
      category: "haircut",
      price: 35.00,
      duration_minutes: 30
    },
    {
      name: "Haircut & Beard Trim",
      description: "Full service haircut with beard shaping",
      category: "haircut",
      price: 50.00,
      duration_minutes: 45
    },
    {
      name: "Beard Trim",
      description: "Professional beard shaping and styling",
      category: "beard",
      price: 25.00,
      duration_minutes: 20
    },
    {
      name: "Hot Shave",
      description: "Classic straight razor shave with hot towels",
      category: "beard",
      price: 40.00,
      duration_minutes: 30
    },
    {
      name: "Kids Cut",
      description: "Haircut for children under 12",
      category: "haircut",
      price: 25.00,
      duration_minutes: 20
    }
  ],

  products: [
    {
      name: "Premium Pomade",
      description: "High-hold, medium-shine styling pomade",
      category: "hair_care",
      brand: "Premium Cuts",
      sku: "PC-POM-001",
      cost_price: 12.00,
      retail_price: 24.99,
      current_stock: 25,
      min_stock_level: 10
    },
    {
      name: "Beard Oil",
      description: "Nourishing beard oil with natural ingredients",
      category: "beard_care",
      brand: "Premium Cuts",
      sku: "PC-BO-001",
      cost_price: 8.00,
      retail_price: 18.99,
      current_stock: 30,
      min_stock_level: 15
    },
    {
      name: "Hair Clay",
      description: "Matte finish styling clay for textured looks",
      category: "hair_care",
      brand: "Premium Cuts",
      sku: "PC-HC-001",
      cost_price: 10.00,
      retail_price: 22.99,
      current_stock: 20,
      min_stock_level: 10
    },
    {
      name: "Shampoo",
      description: "Professional grade cleansing shampoo",
      category: "hair_care",
      brand: "Premium Cuts",
      sku: "PC-SH-001",
      cost_price: 6.00,
      retail_price: 14.99,
      current_stock: 40,
      min_stock_level: 20
    },
    {
      name: "Styling Comb",
      description: "Professional barber comb",
      category: "tools",
      brand: "Premium Tools",
      sku: "PT-COMB-001",
      cost_price: 3.00,
      retail_price: 9.99,
      current_stock: 15,
      min_stock_level: 5
    }
  ],

  users: [
    {
      email: "owner@premiumcuts.com",
      password: "TestPassword123!",
      full_name: "Michael Johnson",
      role: "SHOP_OWNER",
      phone: "(555) 100-0001"
    },
    {
      email: "john@premiumcuts.com",
      password: "TestPassword123!",
      full_name: "John Martinez",
      role: "BARBER",
      phone: "(555) 100-0002"
    },
    {
      email: "sarah@premiumcuts.com",
      password: "TestPassword123!",
      full_name: "Sarah Williams",
      role: "BARBER",
      phone: "(555) 100-0003"
    },
    {
      email: "mike@premiumcuts.com",
      password: "TestPassword123!",
      full_name: "Mike Rodriguez",
      role: "BARBER",
      phone: "(555) 100-0004"
    },
    {
      email: "testclient@example.com",
      password: "TestPassword123!",
      full_name: "James Smith",
      role: "CLIENT",
      phone: "(555) 200-0001"
    }
  ]
}

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n')
  
  try {
    console.log('👤 Creating test users...')
    const createdUsers = {}
    
    for (const userData of testData.users) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          full_name: userData.full_name,
          role: userData.role,
          phone: userData.phone
        }
      })
      
      if (authError) {
        console.log(`   ⚠️  User ${userData.email} might already exist:`, authError.message)
        const { data: users } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('email', userData.email)
          .single()
        
        if (users) {
          createdUsers[userData.role] = users.id
          console.log(`   ✓ Using existing user: ${userData.email}`)
        }
      } else if (authData?.user) {
        createdUsers[userData.role] = authData.user.id
        
        await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            email: userData.email,
            full_name: userData.full_name,
            role: userData.role,
            phone: userData.phone
          })
        
        console.log(`   ✓ Created user: ${userData.email} (${userData.role})`)
      }
    }
    
    console.log('\n🏪 Creating barbershop...')
    
    const { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .insert({
        ...testData.barbershop,
        owner_id: createdUsers['SHOP_OWNER']
      })
      .select()
      .single()
    
    if (shopError) {
      console.error('   ❌ Error creating barbershop:', shopError)
      const { data: existingShop } = await supabase
        .from('barbershops')
        .select('*')
        .eq('slug', testData.barbershop.slug)
        .single()
      
      if (existingShop) {
        console.log('   ✓ Using existing barbershop:', existingShop.name)
        barbershop = existingShop
      } else {
        throw shopError
      }
    } else {
      console.log('   ✓ Created barbershop:', barbershop.name)
    }
    
    console.log('\n✂️  Creating services...')
    
    for (const service of testData.services) {
      const { error: serviceError } = await supabase
        .from('services')
        .insert({
          ...service,
          barbershop_id: barbershop.id
        })
      
      if (serviceError) {
        console.log(`   ⚠️  Service "${service.name}" might already exist`)
      } else {
        console.log(`   ✓ Created service: ${service.name}`)
      }
    }
    
    console.log('\n📦 Creating products...')
    
    for (const product of testData.products) {
      const { error: productError } = await supabase
        .from('products')
        .insert({
          ...product,
          barbershop_id: barbershop.id
        })
      
      if (productError) {
        console.log(`   ⚠️  Product "${product.name}" might already exist`)
      } else {
        console.log(`   ✓ Created product: ${product.name}`)
      }
    }
    
    console.log('\n👥 Linking barbers to barbershop...')
    
    const barberIds = ['BARBER'].map(role => createdUsers[role]).filter(Boolean)
    
    for (const barberId of Object.entries(createdUsers)) {
      const [role, userId] = barberId
      if (role === 'BARBER' && userId) {
        const { error: staffError } = await supabase
          .from('barbershop_staff')
          .insert({
            barbershop_id: barbershop.id,
            user_id: userId,
            role: 'BARBER'
          })
        
        if (staffError) {
          console.log(`   ⚠️  Barber might already be linked`)
        } else {
          console.log(`   ✓ Linked barber to barbershop`)
        }
        
        const { error: customError } = await supabase
          .from('barber_customizations')
          .insert({
            user_id: userId,
            barbershop_id: barbershop.id,
            custom_url: testData.users.find(u => u.role === 'BARBER')?.full_name.toLowerCase().replace(' ', '-'),
            bio: "Professional barber with years of experience in classic and modern cuts.",
            years_experience: Math.floor(Math.random() * 10) + 2
          })
        
        if (!customError) {
          console.log(`   ✓ Created barber customization`)
        }
      }
    }
    
    console.log('\n💰 Creating financial arrangements...')
    
    for (const barberId of barberIds) {
      if (barberId) {
        const { error: arrangementError } = await supabase
          .from('financial_arrangements')
          .insert({
            barbershop_id: barbershop.id,
            barber_id: barberId,
            type: 'commission',
            commission_percentage: 60,
            product_commission_percentage: 15,
            payment_method: 'direct_deposit',
            payment_frequency: 'weekly'
          })
        
        if (arrangementError) {
          console.log(`   ⚠️  Financial arrangement might already exist`)
        } else {
          console.log(`   ✓ Created financial arrangement (60% commission)`)
        }
      }
    }
    
    console.log('\n👤 Creating sample customers...')
    
    const sampleCustomers = [
      { first_name: "Alice", last_name: "Brown", email: "alice@example.com", phone: "(555) 300-0001" },
      { first_name: "Bob", last_name: "Davis", email: "bob@example.com", phone: "(555) 300-0002" },
      { first_name: "Carol", last_name: "Wilson", email: "carol@example.com", phone: "(555) 300-0003" }
    ]
    
    for (const customer of sampleCustomers) {
      const { error: customerError } = await supabase
        .from('customers')
        .insert({
          ...customer,
          barbershop_id: barbershop.id,
          first_visit: new Date().toISOString().split('T')[0]
        })
      
      if (customerError) {
        console.log(`   ⚠️  Customer "${customer.first_name}" might already exist`)
      } else {
        console.log(`   ✓ Created customer: ${customer.first_name} ${customer.last_name}`)
      }
    }
    
    console.log('\n✅ Database seeding complete!')
    console.log('\n📝 Summary:')
    console.log('   - Barbershop: Premium Cuts Barbershop')
    console.log('   - Services: 5 services created')
    console.log('   - Products: 5 products in inventory')
    console.log('   - Users: Shop owner and 3 barbers')
    console.log('   - Customers: 3 sample customers')
    console.log('\n🔑 Test Credentials:')
    console.log('   Shop Owner: owner@premiumcuts.com / TestPassword123!')
    console.log('   Barber: john@premiumcuts.com / TestPassword123!')
    console.log('   Client: testclient@example.com / TestPassword123!')
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error)
    process.exit(1)
  }
}

seedDatabase().catch(console.error)