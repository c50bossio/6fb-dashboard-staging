/**
 * Test script for barber identification system
 * Tests the complete flow: Staff API → Barber Selection → POS Transaction → Commission Calculation
 */

const fetch = require('node-fetch')

// Configuration
const BASE_URL = 'http://localhost:9999'
const TEST_API_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function testBarberIdentificationSystem() {
  
  )

  try {
    // Test 1: Staff API endpoint
    
    const staffResponse = await fetch(`${BASE_URL}/api/staff`, {
      headers: {
        'Content-Type': 'application/json',
        // Note: In real app, this would use session auth
      }
    })

    if (staffResponse.ok) {
      const staffData = await staffResponse.json()

      if (staffData.staff && staffData.staff.length > 0) {
        const testBarber = staffData.staff[0]
        `)

        // Test 2: POS Sale with barber identification
        
        const posData = {
          items: [
            {
              product_id: 'test-product-id',
              quantity: 1,
              sale_price: 35.00
            }
          ],
          appointment_id: null,
          payment_total: 35.00,
          payment_method: 'cash',
          barber_id: testBarber.user_id
        }

        const posResponse = await fetch(`${BASE_URL}/api/inventory/pos-sale`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(posData)
        })

        if (posResponse.ok) {
          const posResult = await posResponse.json()

        } else {
          const error = await posResponse.json()

          // This might be expected if test product doesn't exist
          if (error.error.includes('Product not found')) {
            
            ')
          }
        }
      } else {
        
      }
    } else {
      const error = await staffResponse.json()

      if (error.error.includes('Unauthorized')) {

      }
    }

    // Test 3: Commission calculation logic (direct function test)

    ')
    ')  
    ')

    // Test 4: UI Integration check

    ')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
if (require.main === module) {
  testBarberIdentificationSystem()
}

module.exports = { testBarberIdentificationSystem }