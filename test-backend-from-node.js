// Test if Node.js can reach the FastAPI backend
const testBackendConnection = async () => {
  try {
    console.log('Testing connection to FastAPI backend...')
    const response = await fetch('http://localhost:8001/api/v1/agents/health')
    const data = await response.json()
    console.log('✅ Backend reachable:', data)
  } catch (error) {
    console.error('❌ Backend not reachable:', error.message)
  }
}

testBackendConnection()
