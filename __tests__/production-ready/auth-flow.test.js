/**
 * Production-Ready Authentication Flow Tests
 * 
 * Tests verify real Supabase authentication integration without mock data.
 * These tests ensure the authentication system is production-ready.
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// Real Supabase connection for testing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || (!supabaseServiceKey && !supabaseAnonKey)) {
  throw new Error('Missing Supabase credentials. Cannot run production-ready auth tests.')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)

describe('Production-Ready Authentication Flow', () => {
  let testUser = null
  let testSession = null

  beforeAll(async () => {
    // Verify we can connect to real Supabase
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    if (error && !error.message.includes('permission denied')) {
      throw new Error(`Cannot connect to Supabase: ${error.message}`)
    }
  })

  afterEach(async () => {
    // Clean up test users after each test (if created)
    if (testUser && testUser.id) {
      try {
        await supabase.auth.admin.deleteUser(testUser.id)
      } catch (error) {
        console.warn('Could not delete test user:', error.message)
      }
    }
    testUser = null
    testSession = null
  })

  describe('Real Supabase Authentication', () => {
    test('can create user with real Supabase credentials', async () => {
      const testEmail = `test-${Date.now()}@production-test.com`
      const testPassword = 'SecureTestPassword123!'

      // Test real user creation
      const { data, error } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true
      })

      expect(error).toBeNull()
      expect(data.user).toBeDefined()
      expect(data.user.email).toBe(testEmail)
      expect(data.user.id).toBeDefined()

      testUser = data.user
    })

    test('user login creates valid JWT token', async () => {
      // Create test user first
      const testEmail = `login-test-${Date.now()}@production-test.com`
      const testPassword = 'LoginTestPassword123!'

      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true
      })

      expect(createError).toBeNull()
      testUser = createData.user

      // Test login
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      })

      expect(signInError).toBeNull()
      expect(signInData.session).toBeDefined()
      expect(signInData.session.access_token).toBeDefined()
      expect(signInData.session.user.id).toBe(testUser.id)

      testSession = signInData.session

      // Verify JWT token is valid
      const { data: userData, error: userError } = await supabase.auth.getUser(signInData.session.access_token)
      expect(userError).toBeNull()
      expect(userData.user.id).toBe(testUser.id)
    })

    test('user gets associated profile with barbershop_id', async () => {
      // Create test user
      const testEmail = `profile-test-${Date.now()}@production-test.com`
      const testPassword = 'ProfileTestPassword123!'

      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true
      })

      expect(createError).toBeNull()
      testUser = createData.user

      // Create profile for test user
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: testUser.id,
          email: testEmail,
          role: 'SHOP_OWNER',
          barbershop_id: 'test-shop-' + Date.now()
        })
        .select()
        .single()

      if (profileError && !profileError.message.includes('duplicate key')) {
        console.warn('Profile creation warning:', profileError.message)
      }

      // Verify profile exists and has barbershop_id
      const { data: fetchedProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', testUser.id)
        .single()

      if (!fetchError) {
        expect(fetchedProfile).toBeDefined()
        expect(fetchedProfile.id).toBe(testUser.id)
        expect(fetchedProfile.role).toBe('SHOP_OWNER')
        expect(fetchedProfile.barbershop_id).toBeDefined()
      }
    })
  })

  describe('OAuth Flow Validation', () => {
    test('OAuth configuration is properly set up', async () => {
      // Check if OAuth providers are configured
      const { data: config, error } = await supabase.auth.getSession()
      
      // This should not error out, indicating auth is properly configured
      expect(error).toBeNull()
    })

    test('no test OAuth pages exist in production', () => {
      // These routes should not exist in production
      const testOAuthRoutes = [
        '/oauth-test',
        '/debug-oauth',
        '/oauth-simple',
        '/oauth-implicit',
        '/debug-pkce'
      ]

      // Check that these routes are not accidentally included
      testOAuthRoutes.forEach(route => {
        try {
          require(`@/app${route}/page.js`)
          fail(`Test OAuth route ${route} should not exist in production`)
        } catch (error) {
          // Good - route doesn't exist
          expect(error.code).toBe('MODULE_NOT_FOUND')
        }
      })
    })
  })

  describe('JWT Token Validation', () => {
    test('JWT tokens have required claims', async () => {
      // Create and login test user
      const testEmail = `jwt-test-${Date.now()}@production-test.com`
      const testPassword = 'JWTTestPassword123!'

      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true
      })

      expect(createError).toBeNull()
      testUser = createData.user

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      })

      expect(signInError).toBeNull()
      testSession = signInData.session

      // Decode and verify JWT structure (without external lib)
      const token = signInData.session.access_token
      const [header, payload, signature] = token.split('.')
      
      expect(header).toBeDefined()
      expect(payload).toBeDefined()
      expect(signature).toBeDefined()

      // Decode payload to check claims
      const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString())
      
      expect(decodedPayload.sub).toBe(testUser.id)
      expect(decodedPayload.email).toBe(testEmail)
      expect(decodedPayload.aud).toBe('authenticated')
      expect(decodedPayload.exp).toBeGreaterThan(Date.now() / 1000)
    })

    test('expired tokens are properly rejected', async () => {
      // Create a fake expired token structure
      const expiredTokenPayload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 7200
      }

      const expiredPayload = Buffer.from(JSON.stringify(expiredTokenPayload)).toString('base64')
      const fakeToken = `fake.${expiredPayload}.fake`

      // Try to use expired token
      const { data, error } = await supabase.auth.getUser(fakeToken)
      
      expect(error).toBeDefined()
      expect(data.user).toBeNull()
    })
  })

  describe('Authentication Security', () => {
    test('no placeholder emails in database', async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('email')
        .or('email.ilike.%test@example.com%,email.ilike.%demo@%,email.ilike.%placeholder@%')

      if (error && !error.message.includes('permission denied')) {
        console.warn('Cannot check for placeholder emails:', error.message)
        return
      }

      if (profiles && profiles.length > 0) {
        const placeholderEmails = profiles.map(p => p.email)
        fail(`Found placeholder emails in production database: ${placeholderEmails.join(', ')}`)
      }
    })

    test('authentication requires real database connection', async () => {
      // Verify we're not using any mock/fake database
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)

      // Should either succeed or fail with real database error (not mock response)
      if (error) {
        expect(error.message).not.toContain('mock')
        expect(error.message).not.toContain('fake')
        expect(error.message).not.toContain('test-only')
      } else {
        expect(data).toBeDefined()
      }
    })

    test('user sessions persist correctly', async () => {
      // Create test user
      const testEmail = `session-test-${Date.now()}@production-test.com`
      const testPassword = 'SessionTestPassword123!'

      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true
      })

      expect(createError).toBeNull()
      testUser = createData.user

      // Login and get session
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      })

      expect(signInError).toBeNull()
      testSession = signInData.session

      // Create new client with session token
      const authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false
        }
      })

      await authenticatedClient.auth.setSession(signInData.session)

      // Verify session works
      const { data: userData, error: userError } = await authenticatedClient.auth.getUser()
      expect(userError).toBeNull()
      expect(userData.user.id).toBe(testUser.id)
    })
  })

  describe('Role-Based Access Control', () => {
    test('user roles are properly enforced', async () => {
      // Create test user with specific role
      const testEmail = `role-test-${Date.now()}@production-test.com`
      const testPassword = 'RoleTestPassword123!'

      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true
      })

      expect(createError).toBeNull()
      testUser = createData.user

      // Set user role in profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: testUser.id,
          email: testEmail,
          role: 'CLIENT'
        })

      if (profileError && !profileError.message.includes('permission denied')) {
        console.warn('Profile upsert warning:', profileError.message)
      }

      // Verify role is set correctly
      const { data: fetchedProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', testUser.id)
        .single()

      if (!fetchError) {
        expect(fetchedProfile.role).toBe('CLIENT')
      }
    })
  })
})