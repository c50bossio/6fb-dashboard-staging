import { NextResponse } from 'next/server'

export class InputValidator {
  static sanitizeText(text, maxLength = 1000) {
    if (!text) return ''
    
    if (text.length > maxLength) {
      throw new Error(`Input too long (max ${maxLength} characters)`)
    }
    
    // Remove potentially dangerous patterns
    const dangerous = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^>]*>/gi,
      /<object\b[^>]*>/gi,
      /<embed\b[^>]*>/gi,
      /data:text\/html/gi
    ]
    
    let cleaned = text
    for (const pattern of dangerous) {
      cleaned = cleaned.replace(pattern, '')
    }
    
    return cleaned.trim()
  }
  
  static validateEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return emailRegex.test(email)
  }
  
  static validateJSON(data) {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid JSON data')
    }
    
    // Check for dangerous keys
    const dangerousKeys = ['__proto__', 'prototype', 'constructor']
    
    const checkObject = (obj) => {
      for (const key in obj) {
        if (dangerousKeys.includes(key)) {
          throw new Error('Dangerous key detected')
        }
        
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          checkObject(obj[key])
        }
        
        if (typeof obj[key] === 'string') {
          obj[key] = this.sanitizeText(obj[key])
        }
      }
    }
    
    checkObject(data)
    return data
  }
}

export function withInputValidation(handler) {
  return async (request) => {
    try {
      if (request.method === 'POST' || request.method === 'PUT') {
        const contentType = request.headers.get('content-type')
        
        if (contentType?.includes('application/json')) {
          const rawBody = await request.text()
          
          // Size limit (10MB)
          if (rawBody.length > 10 * 1024 * 1024) {
            return NextResponse.json(
              { error: 'Request body too large' },
              { status: 413 }
            )
          }
          
          try {
            const body = JSON.parse(rawBody)
            const validatedBody = InputValidator.validateJSON(body)
            
            // Create new request with validated body
            const newRequest = new Request(request.url, {
              method: request.method,
              headers: request.headers,
              body: JSON.stringify(validatedBody)
            })
            
            return handler(newRequest)
          } catch (parseError) {
            return NextResponse.json(
              { error: 'Invalid JSON format' },
              { status: 400 }
            )
          }
        }
      }
      
      return handler(request)
    } catch (error) {
      console.error('Input validation error:', error)
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      )
    }
  }
}
