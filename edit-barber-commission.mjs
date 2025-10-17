import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔧 Barber Settings Editor - Demo User\n')
console.log('=' .repeat(60))

async function editBarberSettings() {
  try {
    // Get demo user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', 'demo@barbershop.com')
      .single()

    console.log(`\n📋 Editing barber settings for: ${profile.full_name}`)
    console.log(`Email: ${profile.email}`)
    console.log(`User ID: ${profile.id}\n`)

    // Get all staff records
    const { data: staffRecords } = await supabase
      .from('barbershop_staff')
      .select(`
        id,
        barbershop_id,
        role,
        commission_rate,
        is_active,
        barbershops (
          name,
          city,
          state
        )
      `)
      .eq('user_id', profile.id)

    console.log(`Found ${staffRecords.length} location assignments:\n`)

    // Display current settings
    staffRecords.forEach((staff, index) => {
      const shop = staff.barbershops
      console.log(`${index + 1}. ${shop.name} (${shop.city}, ${shop.state})`)
      console.log(`   Staff ID: ${staff.id}`)
      console.log(`   Current Commission: ${staff.commission_rate}%`)
      console.log(`   Active: ${staff.is_active}`)
      console.log('')
    })

    console.log('=' .repeat(60))
    console.log('📝 HOW TO EDIT SETTINGS:\n')

    console.log('Option 1 - Via UI:')
    console.log('   1. Navigate to http://localhost:9999/shop/barbers')
    console.log('   2. Click on "Demo User" staff card')
    console.log('   3. Click "Edit" button in modal')
    console.log('   4. Modify commission rate or financial arrangement')
    console.log('   5. Click "Save Changes"\n')

    console.log('Option 2 - Via API (example):')
    console.log('   Update commission rate to 80% at Tomb45 Channelside:\n')
    console.log('   const { data } = await supabase')
    console.log('     .from("barbershop_staff")')
    console.log(`     .update({ commission_rate: 80 })`)
    console.log(`     .eq('id', '${staffRecords[0].id}')\n`)

    console.log('Option 3 - Edit all locations at once:')
    console.log('   Change commission to 80% at ALL locations:\n')
    console.log('   const { data } = await supabase')
    console.log('     .from("barbershop_staff")')
    console.log('     .update({ commission_rate: 80 })')
    console.log(`     .eq('user_id', '${profile.id}')\n`)

    console.log('=' .repeat(60))
    console.log('\n💡 EXAMPLE: Update to 80% commission at all locations?\n')
    console.log('Uncomment lines below to test:\n')
    console.log('// const { data: updated, error } = await supabase')
    console.log('//   .from("barbershop_staff")')
    console.log('//   .update({ commission_rate: 80 })')
    console.log(`//   .eq('user_id', '${profile.id}')`)
    console.log('//   .select()\n')
    console.log('// if (!error) {')
    console.log('//   console.log("✅ Updated commission to 80% at all locations")')
    console.log('//   console.log(updated)')
    console.log('// }')

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

editBarberSettings()
