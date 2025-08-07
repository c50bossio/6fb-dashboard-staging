import { createHash, randomBytes } from 'crypto'

import jwt from 'jsonwebtoken'

// Token blacklist (in production, use Redis)
const tokenBlacklist = new Set()

export class SecureAuthUtils {
  static generateSecureToken(length = 32) {
    return randomBytes(length).toString('hex')
  }
  
  static hashPassword(password, salt = null) {
    if (!salt) {
      salt = randomBytes(16).toString('hex')
    }
    const hash = createHash('sha256')
    hash.update(password + salt)
    return { hash: hash.digest('hex'), salt }
  }
  
  static verifyPassword(password, hash, salt) {
    const { hash: computedHash } = this.hashPassword(password, salt)
    return computedHash === hash
  }
  
  static createJWT(payload, expiresIn = '15m') {
    const secret = process.env.JWT_SECRET_KEY
    if (!secret) {
      throw new Error('JWT_SECRET_KEY environment variable is required')
    }
    
    const jti = this.generateSecureToken(16) // Token ID for revocation
    
    return jwt.sign(
      { ...payload, jti },
      secret,
      { 
        expiresIn,
        issuer: '6fb-ai-agent-system',
        audience: '6fb-ai-agent-users'
      }
    )
  }
  
  static verifyJWT(token) {
    const secret = process.env.JWT_SECRET_KEY
    if (!secret) {
      throw new Error('JWT_SECRET_KEY environment variable is required')
    }
    
    try {
      const decoded = jwt.verify(token, secret, {
        issuer: '6fb-ai-agent-system',
        audience: '6fb-ai-agent-users'
      })
      
      // Check if token is blacklisted
      if (tokenBlacklist.has(decoded.jti)) {
        throw new Error('Token has been revoked')
      }
      
      return decoded
    } catch (error) {
      throw new Error('Invalid or expired token')
    }
  }
  
  static revokeToken(jti) {
    tokenBlacklist.add(jti)
    // In production, also add to Redis with expiration
  }
  
  static validateInput(input, type = 'text', maxLength = 1000) {
    if (!input) return null
    
    // Length validation
    if (input.length > maxLength) {
      throw new Error(`Input too long (max ${maxLength} characters)`)
    }
    
    // Type-specific validation
    switch (type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(input)) {
          throw new Error('Invalid email format')
        }
        break
        
      case 'text':
        // Remove potentially dangerous characters
        const sanitized = input
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
        
        if (sanitized !== input) {
          throw new Error('Invalid characters detected')
        }
        break
    }
    
    return input.trim()
  }
}
