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
    const { payment_intent_id } = await request.json()

    // Validate required parameters
    if (!payment_intent_id) {
      return NextResponse.json({
        success: false,
        error: 'Payment intent ID is required'
      }, { status: 400 })
    }

    // Call Python payment service
    const scriptPath = path.join(process.cwd(), 'scripts', 'payment_api.py')
    
    const pythonProcess = spawn('python3', [scriptPath, 'confirm-payment'], {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    // Send request data to Python script
    const requestData = JSON.stringify({
      payment_intent_id
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
          reject(new Error(`Payment confirmation error: ${stderr}`))
          return
        }

        try {
          const response = JSON.parse(stdout.trim())
          resolve(response)
        } catch (e) {
          console.error('Failed to parse payment confirmation response:', stdout)
          reject(new Error('Invalid payment confirmation response'))
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
        payment_intent_id: result.payment_intent_id,
        amount: result.amount,
        receipt_url: result.receipt_url,
        booking_id: result.booking_id,
        payment_status: result.payment_status
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to confirm payment'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Payment confirmation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}