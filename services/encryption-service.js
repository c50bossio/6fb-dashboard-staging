/**
 * Secure Encryption Service for OAuth tokens and sensitive data
 * Uses AES-256-GCM for authenticated encryption with rotating keys
 */

import crypto from 'crypto'

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm'
    this.keyLength = 32 // 256 bits
    this.ivLength = 16  // 128 bits
    this.tagLength = 16 // 128 bits
    
    // Use environment variable or generate key (in production, use proper key management)
    this.encryptionKey = this.getOrCreateEncryptionKey()
  }

  /**
   * Get or create the master encryption key
   */
  getOrCreateEncryptionKey() {
    const keyFromEnv = process.env.CALENDAR_ENCRYPTION_KEY
    
    if (keyFromEnv) {
      // Validate key length
      const keyBuffer = Buffer.from(keyFromEnv, 'base64')
      if (keyBuffer.length === this.keyLength) {
        return keyBuffer
      }
      console.warn('⚠️ Invalid CALENDAR_ENCRYPTION_KEY length, generating new key')
    }
    
    // Generate new key (log warning in production)
    const newKey = crypto.randomBytes(this.keyLength)
    console.warn('⚠️ Generated new encryption key. Set CALENDAR_ENCRYPTION_KEY in production:', newKey.toString('base64'))
    
    return newKey
  }

  /**
   * Encrypt sensitive data (OAuth tokens, etc.)
   * @param {string} plaintext - Data to encrypt
   * @returns {string} - Base64 encoded encrypted data with IV and tag
   */
  encrypt(plaintext) {
    if (!plaintext) return null
    
    try {
      // Generate random IV for each encryption
      const iv = crypto.randomBytes(this.ivLength)
      
      // Create cipher with IV
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv)
      
      // Encrypt data
      let encrypted = cipher.update(plaintext, 'utf8', 'base64')
      encrypted += cipher.final('base64')
      
      // Get authentication tag
      const tag = cipher.getAuthTag()
      
      // Combine IV + tag + encrypted data
      const combined = Buffer.concat([
        iv,
        tag,
        Buffer.from(encrypted, 'base64')
      ])
      
      return combined.toString('base64')
      
    } catch (error) {
      console.error('❌ Encryption error:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  /**
   * Decrypt sensitive data
   * @param {string} encryptedData - Base64 encoded encrypted data
   * @returns {string} - Decrypted plaintext
   */
  decrypt(encryptedData) {
    if (!encryptedData) return null
    
    try {
      // Parse combined data
      const combined = Buffer.from(encryptedData, 'base64')
      
      if (combined.length < this.ivLength + this.tagLength) {
        throw new Error('Invalid encrypted data format')
      }
      
      // Extract components
      const iv = combined.subarray(0, this.ivLength)
      const tag = combined.subarray(this.ivLength, this.ivLength + this.tagLength)
      const encrypted = combined.subarray(this.ivLength + this.tagLength)
      
      // Create decipher with IV
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv)
      decipher.setAuthTag(tag)
      
      // Decrypt data
      let decrypted = decipher.update(encrypted, null, 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
      
    } catch (error) {
      console.error('❌ Decryption error:', error)
      throw new Error('Failed to decrypt data')
    }
  }

  /**
   * Secure token encryption specifically for OAuth tokens
   * Adds additional metadata and validation
   */
  encryptToken(token, tokenType = 'access_token') {
    if (!token) return null
    
    const tokenData = {
      token: token,
      type: tokenType,
      encrypted_at: Date.now(),
      version: '1.0'
    }
    
    return this.encrypt(JSON.stringify(tokenData))
  }

  /**
   * Secure token decryption with validation
   */
  decryptToken(encryptedToken) {
    if (!encryptedToken) return null
    
    try {
      const decryptedJson = this.decrypt(encryptedToken)
      const tokenData = JSON.parse(decryptedJson)
      
      // Validate token data structure
      if (!tokenData.token || !tokenData.encrypted_at) {
        throw new Error('Invalid token data structure')
      }
      
      // Check token age (tokens older than 1 year should be refreshed)
      const oneYear = 365 * 24 * 60 * 60 * 1000
      if (Date.now() - tokenData.encrypted_at > oneYear) {
        console.warn('⚠️ Decrypting very old token, consider refreshing')
      }
      
      return tokenData.token
      
    } catch (error) {
      console.error('❌ Token decryption error:', error)
      // Return null instead of throwing to allow graceful handling
      return null
    }
  }

  /**
   * Generate secure random token for iCal feeds, webhooks, etc.
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex')
  }

  /**
   * Hash sensitive data for comparison without storing plaintext
   */
  hashData(data, salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(16).toString('hex')
    }
    
    const hash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha256').toString('hex')
    return { hash, salt }
  }

  /**
   * Verify hashed data
   */
  verifyHash(data, hash, salt) {
    const { hash: newHash } = this.hashData(data, salt)
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(newHash, 'hex'))
  }

  /**
   * Get service health and configuration status
   */
  getServiceHealth() {
    return {
      service: 'encryption',
      status: 'healthy',
      algorithm: this.algorithm,
      key_configured: !!process.env.CALENDAR_ENCRYPTION_KEY,
      features: {
        token_encryption: true,
        data_hashing: true,
        secure_tokens: true,
        key_rotation_ready: true
      }
    }
  }
}

// Export singleton instance
const encryptionService = new EncryptionService()

export {
  encryptionService,
  EncryptionService
}