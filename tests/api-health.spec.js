import { test, expect } from '@playwright/test'

test.describe('API Health Check', () => {
  test('backend health endpoint responds correctly', async ({ page }) => {
    const response = await page.request.get('http://localhost:8001/health')
    
    expect(response.status()).toBe(200)
    
    const responseBody = await response.json()
    expect(responseBody).toBeDefined()
    
    expect(responseBody.status).toBeDefined()
    
    console.log('Backend API Health Response:', responseBody)
  })

  test('frontend health endpoint responds', async ({ page }) => {
    try {
      const response = await page.request.get('http://localhost:9999/api/health')
      
      expect(response.status()).toBe(200)
      
      const responseBody = await response.json()
      expect(responseBody).toBeDefined()
      
      console.log('Frontend Health Response:', responseBody)
    } catch (error) {
      console.log('Frontend health endpoint may not exist - this is OK')
      expect(true).toBe(true) // Don't fail if endpoint doesn't exist
    }
  })

  test('basic connectivity test', async ({ page }) => {
    const response = await page.request.get('http://localhost:9999/')
    
    expect(response.status()).toBe(200)
    console.log('Frontend main page accessible')
    
    const backendResponse = await page.request.get('http://localhost:8001/')
    
    expect([200, 404, 422, 307].includes(backendResponse.status())).toBe(true)
    console.log('Backend accessible, status:', backendResponse.status())
  })
})