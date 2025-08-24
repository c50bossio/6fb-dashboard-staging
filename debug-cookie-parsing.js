#!/usr/bin/env node

/**
 * Debug Cookie Parsing
 * 
 * Test our cookie parsing logic to make sure we're correctly
 * extracting and unquoting PKCE cookies.
 */

function parseCookieHeader(cookieHeader) {
  console.log('🧪 COOKIE PARSING DEBUG')
  console.log('='.repeat(50))
  
  console.log('📍 Input cookie header:')
  console.log(`"${cookieHeader}"`)
  
  const cookieArray = cookieHeader
    ? cookieHeader.split(';').map(cookie => {
        const [name, value] = cookie.trim().split('=')
        console.log(`📍 Parsing cookie: "${cookie.trim()}"`)
        console.log(`   Name: "${name}"`)
        console.log(`   Raw Value: "${value || ''}"`)
        
        const decodedValue = decodeURIComponent(value || '')
        console.log(`   Decoded Value: "${decodedValue}"`)
        console.log(`   Has quotes: ${decodedValue.startsWith('"') && decodedValue.endsWith('"')}`)
        
        return { name, value: decodedValue }
      })
    : []
  
  console.log('\n📊 PARSED COOKIES:')
  cookieArray.forEach((cookie, i) => {
    console.log(`${i + 1}. ${cookie.name} = "${cookie.value}"`)
    if (cookie.name.includes('code-verifier')) {
      console.log(`   🎯 PKCE VERIFIER FOUND!`)
      console.log(`   Length: ${cookie.value.length}`)
      console.log(`   Has quotes: ${cookie.value.startsWith('"') && cookie.value.endsWith('"')}`)
      console.log(`   First 10 chars: "${cookie.value.substring(0, 10)}"`)
      console.log(`   Last 10 chars: "${cookie.value.substring(cookie.value.length - 10)}"`)
      
      if (cookie.value.startsWith('"') && cookie.value.endsWith('"')) {
        const unquoted = cookie.value.slice(1, -1)
        console.log(`   🔧 UNQUOTED VERSION: "${unquoted}"`)
        console.log(`   Unquoted length: ${unquoted.length}`)
      }
    }
  })
  
  return cookieArray
}

// Test with the problematic cookie from our logs
const testCookie = 'sb-dfhqjdoydihajmjxniee-auth-token-code-verifier=quoted-verifier-value-that-should-be-fixed; other-cookie=normal-value'

console.log('🧪 Testing cookie parsing with FIXED headers (should be unquoted):')
parseCookieHeader(testCookie)

console.log('\n' + '='.repeat(50))
console.log('🧪 Testing cookie parsing with ORIGINAL headers (quoted):')
const originalCookie = 'sb-dfhqjdoydihajmjxniee-auth-token-code-verifier="quoted-verifier-value-that-should-be-fixed"; other-cookie=normal-value'
parseCookieHeader(originalCookie)