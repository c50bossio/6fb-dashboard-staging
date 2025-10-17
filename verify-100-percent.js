const { createClient } = require('@supabase/supabase-js')

async function verify100Percent() {
  const supabase = createClient(
    'https://dfhqjdoydihajmjxniee.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  )
  
  // 1. Check database schema
  
  const { data: schemaCheck } = await supabase.rpc('exec_sql', {
    query: `
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'services' 
      AND column_name IN ('image_url', 'is_featured', 'online_booking_enabled', 'requires_consultation')
      ORDER BY column_name
    `
  }).catch(() => ({ data: null }))
  
  if (schemaCheck && schemaCheck.length === 4) {
    
    schemaCheck.forEach(col => {
      `)
    })
  } else {
    
  }
  
  // 2. Test full CRUD cycle
  
  const testService = {
    barbershop_id: '1ca6138d-eae8-46ed-abff-5d6e52fbd21b',
    name: 'Verification Test Service ' + Date.now(),
    description: 'Testing all features work',
    category: 'haircut',
    price: 50,
    duration_minutes: 30,
    is_active: true,
    image_url: 'https://example.com/test.jpg',
    is_featured: true,
    online_booking_enabled: false,
    requires_consultation: true
  }
  
  // CREATE
  const { data: created, error: createErr } = await supabase
    .from('services')
    .insert([testService])
    .select()
    .single()
  
  if (created) {

    // READ
    const { data: read } = await supabase
      .from('services')
      .select('*')
      .eq('id', created.id)
      .single()

    // UPDATE
    const { error: updateErr } = await supabase
      .from('services')
      .update({ 
        is_featured: false,
        online_booking_enabled: true 
      })
      .eq('id', created.id)
    
    if (!updateErr) {
      
    }
    
    // DELETE
    const { error: deleteErr } = await supabase
      .from('services')
      .delete()
      .eq('id', created.id)
    
    if (!deleteErr) {
      
    }
  } else {
    
  }
  
  // 3. Check UI code compatibility
  
  const fs = require('fs')
  const pageContent = fs.readFileSync('app/(protected)/shop/services/page.js', 'utf8')
  
  const checks = [
    { feature: 'is_featured state', pattern: /is_featured.*formData\.is_featured/ },
    { feature: 'online_booking state', pattern: /online_booking_enabled.*formData\.online_booking_enabled/ },
    { feature: 'consultation state', pattern: /requires_consultation.*formData\.requires_consultation/ },
    { feature: 'No preview tags', pattern: /\(preview\)/ }
  ]
  
  checks.forEach(check => {
    if (check.feature === 'No preview tags') {
      // This should NOT be found
      const found = check.pattern.test(pageContent)
      
    } else {
      const found = check.pattern.test(pageContent)
      
    }
  })
  
  )

}

verify100Percent().catch(console.error)