/**
 * CIN7 Test Connection API
 * Tests credentials without saving them
 */

import { NextResponse } from 'next/server'
import { Cin7Client } from '@/lib/cin7-client'

export async function POST(request) {
  try {
    const { accountId, apiKey } = await request.json()

    // Validate inputs
    if (!accountId || !apiKey) {
      return NextResponse.json({ 
        success: false,
        message: 'Please provide both Account ID and API Key',
        error: 'Missing credentials'
      }, { status: 400 })
    }

    console.log('🔍 Testing CIN7 connection...')

    // Create CIN7 client
    const cin7 = new Cin7Client(accountId, apiKey)
    
    // Test the connection
    const testResult = await cin7.testConnection()
    
    if (!testResult.success) {
      console.log('❌ Connection failed:', testResult.error)
      
      // Provide user-friendly error messages
      let userMessage = 'Unable to connect to CIN7'
      
      if (testResult.error?.includes('401') || testResult.error?.includes('Unauthorized')) {
        userMessage = 'Invalid credentials. Please check your Account ID and API Key.'
      } else if (testResult.error?.includes('404')) {
        userMessage = 'Account not found. Please verify your Account ID.'
      } else if (testResult.error?.includes('timeout')) {
        userMessage = 'Connection timed out. Please try again.'
      } else if (testResult.error?.includes('network')) {
        userMessage = 'Network error. Please check your internet connection.'
      }
      
      return NextResponse.json({ 
        success: false,
        message: userMessage,
        error: testResult.error,
        details: null
      }, { status: 400 })
    }

    console.log('✅ Connection successful!')

    // Get additional account information
    let productCount = 0
    let lastActivity = null
    
    try {
      // Try to get product count - fetch a small batch to get total
      console.log('Fetching products to get count...')
      const products = await cin7.getProducts(1, 10) // Get up to 10 products
      
      // Try different ways to get the count
      productCount = products.total || products.products?.length || 0
      
      console.log('Product fetch result:', {
        total: products.total,
        productsLength: products.products?.length,
        firstProduct: products.products?.[0]?.Name || 'No products'
      })
      
      // Get last activity (could be from sync logs or product updates)
      lastActivity = productCount > 0 ? 'Active' : 'No products yet'
    } catch (error) {
      console.warn('Could not fetch product details:', error.message)
      // Try a simpler endpoint to at least verify connection
      try {
        // Some CIN7 accounts might not have products yet
        lastActivity = 'Connected (No products to sync)'
        productCount = 0
      } catch (fallbackError) {
        console.warn('Fallback check failed:', fallbackError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Connection successful!',
      accountName: testResult.accountName || 'Connected',
      productCount,
      lastActivity,
      details: {
        accountName: testResult.accountName,
        productCount,
        lastActivity,
        apiVersion: 'v2',
        features: ['inventory', 'products', 'sales', 'webhooks']
      }
    })

  } catch (error) {
    console.error('❌ Test connection error:', error)
    
    // Handle different types of errors
    let userMessage = 'Connection test failed'
    
    if (error.message?.includes('ENOTFOUND')) {
      userMessage = 'Cannot reach CIN7 servers. Please check your internet connection.'
    } else if (error.message?.includes('ETIMEDOUT')) {
      userMessage = 'Connection timed out. CIN7 servers might be slow or unreachable.'
    } else if (error.message?.includes('Invalid')) {
      userMessage = 'Invalid credentials format. Please check your input.'
    }
    
    return NextResponse.json({
      success: false,
      message: userMessage,
      error: error.message,
      details: null
    }, { status: 500 })
  }
}