// Test the PUT endpoint to make sure it's working
const testPutEndpoint = async () => {
  console.log('Testing PUT endpoint for calendar appointments...')
  
  try {
    const response = await fetch('http://localhost:9999/api/calendar/appointments?id=test-id', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notes: 'Test update',
        status: 'blocked'
      })
    })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', response.headers)
    
    const text = await response.text()
    console.log('Response body:', text)
    
    if (text) {
      try {
        const data = JSON.parse(text)
        console.log('Parsed JSON:', data)
      } catch (e) {
        console.log('Could not parse as JSON')
      }
    }
  } catch (error) {
    console.error('Error testing PUT endpoint:', error)
  }
}

testPutEndpoint()