/**
 * CIN7 Connection Test Endpoint
 * 
 * Tests CIN7 API credentials before saving them
 * Returns account information if successful
 */

import { NextResponse } from 'next/server'
import { Cin7Client } from '@/lib/cin7-client.js'

export async function POST(request) {
  try {
    // Get credentials from request
    const { accountId, apiKey } = await request.json()
    
    // Validate inputs
    if (!accountId || !apiKey) {
      return NextResponse.json({
        success: false,
        message: 'Account ID and API Key are required'
      }, { status: 400 })
    }
    
    // Initialize CIN7 client
    const cin7 = new Cin7Client(accountId, apiKey)
    
    // Test the connection
    const result = await cin7.testConnection()
    
    if (result.success) {
      
      return NextResponse.json({
        success: true,
        accountName: result.accountName,
        message: result.message
      })
    } else {
      
      return NextResponse.json({
        success: false,
        message: result.message,
        error: result.error
      }, { status: 401 })
    }
    
  } catch (error) {
    console.error('Connection test error:', error)
    
    // Check for specific error types
    if (error.message.includes('401') || error.message.includes('403')) {
      return NextResponse.json({
        success: false,
        message: 'Invalid API credentials. Please check your Account ID and API Key.',
        error: error.message
      }, { status: 401 })
    }
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      return NextResponse.json({
        success: false,
        message: 'Unable to connect to CIN7 API. Please check your internet connection.',
        error: error.message
      }, { status: 503 })
    }
    
    return NextResponse.json({
      success: false,
      message: 'Failed to test CIN7 connection',
      error: error.message
    }, { status: 500 })
  }
}