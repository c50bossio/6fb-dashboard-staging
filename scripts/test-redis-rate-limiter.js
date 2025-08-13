#!/usr/bin/env node

/**
 * Redis Rate Limiter Test Script
 * Tests the Redis-based rate limiting functionality
 */

import rateLimiter from '../lib/redis-rate-limiter.js'

async function testRateLimiter() {
  console.log('🔬 Testing Redis Rate Limiter')
  console.log('=============================\n')

  // Test basic rate limiting
  console.log('1. Testing basic rate limiting...')
  
  const testKey = 'test:user:123'
  const limit = 5
  const windowMs = 10000 // 10 seconds

  console.log(`   Key: ${testKey}`)
  console.log(`   Limit: ${limit} requests per ${windowMs/1000} seconds\n`)

  // Make requests up to the limit
  for (let i = 1; i <= limit + 2; i++) {
    const result = await rateLimiter.isRateLimited(testKey, limit, windowMs)
    
    const status = result.isLimited ? '🚫 BLOCKED' : '✅ ALLOWED'
    console.log(`   Request ${i}: ${status} (${result.count}/${result.limit}) [${result.source}]`)
    
    if (result.isLimited) {
      const resetIn = Math.ceil((result.resetTime - Date.now()) / 1000)
      console.log(`     Rate limited! Reset in ${resetIn} seconds`)
    }
  }

  console.log('\n2. Testing rate limit status...')
  const status = await rateLimiter.getRateLimitStatus(testKey, limit, windowMs)
  console.log(`   Current count: ${status.count}/${status.limit}`)
  console.log(`   Remaining: ${status.remaining}`)
  console.log(`   Source: ${status.source}`)
  console.log(`   Reset time: ${new Date(status.resetTime).toLocaleTimeString()}`)

  console.log('\n3. Testing rate limit clearing...')
  const clearResult = await rateLimiter.clearRateLimit(testKey)
  console.log(`   Clear result: ${clearResult ? '✅ Success' : '❌ Failed'}`)

  // Test after clearing
  const afterClear = await rateLimiter.isRateLimited(testKey, limit, windowMs)
  console.log(`   After clear: ${afterClear.count}/${afterClear.limit} [${afterClear.source}]`)

  console.log('\n4. Testing different endpoints...')
  
  const endpoints = ['auth', 'api', 'webhooks']
  const testIp = '192.168.1.100'
  
  for (const endpoint of endpoints) {
    const endpointKey = `${testIp}:${endpoint}`
    const result = await rateLimiter.isRateLimited(endpointKey, 10, 60000)
    console.log(`   ${endpoint}: ${result.count}/10 [${result.source}]`)
  }

  console.log('\n5. Testing rate limiter status...')
  const rateLimiterStatus = rateLimiter.getStatus()
  console.log(`   Redis available: ${rateLimiterStatus.redisAvailable ? '✅ Yes' : '❌ No'}`)
  console.log(`   Connection attempts: ${rateLimiterStatus.connectionAttempts}`)
  console.log(`   Memory entries: ${rateLimiterStatus.memoryEntries}`)
  console.log(`   Current source: ${rateLimiterStatus.source}`)

  console.log('\n6. Testing concurrent requests...')
  
  const concurrentKey = 'test:concurrent'
  const concurrentLimit = 3
  
  // Make 5 concurrent requests
  const promises = []
  for (let i = 0; i < 5; i++) {
    promises.push(rateLimiter.isRateLimited(concurrentKey, concurrentLimit, windowMs))
  }
  
  const results = await Promise.all(promises)
  
  console.log('   Concurrent request results:')
  results.forEach((result, index) => {
    const status = result.isLimited ? '🚫 BLOCKED' : '✅ ALLOWED'
    console.log(`     Request ${index + 1}: ${status} (${result.count}/${result.limit})`)
  })

  console.log('\n7. Performance test...')
  
  const perfKey = 'test:performance'
  const startTime = Date.now()
  const iterations = 100
  
  for (let i = 0; i < iterations; i++) {
    await rateLimiter.isRateLimited(perfKey, 1000, windowMs)
  }
  
  const endTime = Date.now()
  const duration = endTime - startTime
  const rps = Math.round((iterations / duration) * 1000)
  
  console.log(`   ${iterations} requests in ${duration}ms`)
  console.log(`   Performance: ~${rps} requests/second`)

  console.log('\n✅ Rate limiter testing completed!')
  
  // Clean up test data
  await rateLimiter.clearRateLimit(testKey)
  await rateLimiter.clearRateLimit(concurrentKey)
  await rateLimiter.clearRateLimit(perfKey)
  
  endpoints.forEach(async (endpoint) => {
    await rateLimiter.clearRateLimit(`${testIp}:${endpoint}`)
  })
  
  console.log('🧹 Test data cleaned up')
}

async function testRedisConnection() {
  console.log('\n🔗 Testing Redis connection...')
  
  // Test if Redis is configured
  if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
    console.log('   ⚠️  Redis not configured - will use in-memory fallback')
    return
  }
  
  console.log('   ✅ Redis configuration found')
  
  if (process.env.REDIS_URL) {
    console.log(`   📍 Redis URL: ${process.env.REDIS_URL.replace(/\/\/.*@/, '//***@')}`)
  } else {
    console.log(`   📍 Redis Host: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`)
    console.log(`   🔐 Redis Auth: ${process.env.REDIS_PASSWORD ? 'Yes' : 'No'}`)
  }
  
  // Give Redis time to connect
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  const status = rateLimiter.getStatus()
  console.log(`   🔌 Connection status: ${status.redisAvailable ? '✅ Connected' : '❌ Failed'}`)
}

// Main execution
async function main() {
  try {
    await testRedisConnection()
    await testRateLimiter()
    
    // Close Redis connection
    await rateLimiter.close()
    
    console.log('\n🎉 All tests completed successfully!')
    process.exit(0)
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error.stack)
    
    try {
      await rateLimiter.close()
    } catch (closeError) {
      console.error('Failed to close rate limiter:', closeError.message)
    }
    
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏹️  Shutting down gracefully...')
  try {
    await rateLimiter.close()
  } catch (error) {
    console.error('Error during shutdown:', error.message)
  }
  process.exit(0)
})

main()