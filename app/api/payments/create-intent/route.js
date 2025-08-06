'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { spawn } from 'child_process'
import path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { booking_id, customer_id, barber_id, service_id, payment_type } = await request.json()

    // Validate required parameters
    if (!booking_id || !customer_id || !barber_id || !service_id) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 })
    }

    // Call Python payment service
    const scriptPath = path.join(process.cwd(), 'scripts', 'payment_api.py')
    
    const pythonProcess = spawn('python3', [scriptPath, 'create-intent'], {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    // Send request data to Python script
    const requestData = JSON.stringify({
      booking_id,
      customer_id,
      barber_id,
      service_id,
      payment_type: payment_type || 'full_payment'
    })

    pythonProcess.stdin.write(requestData)
    pythonProcess.stdin.end()

    // Collect response from Python script
    let stdout = ''
    let stderr = ''

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    // Wait for Python process to complete
    const result = await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python script error:', stderr)
          reject(new Error(`Payment service error: ${stderr}`))
          return
        }

        try {
          const response = JSON.parse(stdout.trim())
          resolve(response)
        } catch (e) {
          console.error('Failed to parse payment service response:', stdout)
          reject(new Error('Invalid payment service response'))
        }
      })

      pythonProcess.on('error', (error) => {
        console.error('Python process error:', error)
        reject(error)
      })
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        client_secret: result.client_secret,
        amount: result.amount,
        payment_intent_id: result.payment_intent_id,
        service_info: result.service_info
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to create payment intent'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Payment intent creation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}