// ❌ CURRENT: axios adds ~45KB to bundle
import axios from 'axios'

const fetchData = async () => {
  const response = await axios.get('/api/data', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  return response.data
}

// ✅ OPTIMIZED: Native fetch wrapper (0KB bundle impact)
class ApiClient {
  constructor(baseURL = '') {
    this.baseURL = baseURL
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const config = {
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options
    }

    const response = await fetch(url, config)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  }

  get(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'GET', headers })
  }

  post(endpoint, data, headers = {}) {
    return this.request(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    })
  }
}

// Usage
const api = new ApiClient('/api')
const data = await api.get('/data')

// Result: -45KB from bundle, same functionality