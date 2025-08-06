#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODcwMTAsImV4cCI6MjA2OTY2MzAxMH0.TUYnEBzpB2LQaGLIXg5wtvJHyyhFD2QAOMdY_B-V1fI'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugAuthFlow() {
  console.log('🔍 Debug Auth Flow')
  console.log('=================\n')
  
  try {
    // Step 1: Check current session
    console.log('1️⃣ Checking current session...')
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError)
    } else {
      console.log('📋 Current session:', sessionData.session ? 'Active' : 'None')
      if (sessionData.session) {
        console.log('   User:', sessionData.session.user.email)
        console.log('   Expires:', new Date(sessionData.session.expires_at * 1000).toLocaleString())
      }
    }
    
    // Step 2: Set up auth state listener
    console.log('\n2️⃣ Setting up auth state listener...')
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`\n🔔 Auth State Change: ${event}`)
      console.log('   Session:', session ? 'Active' : 'None')
      if (session) {
        console.log('   User:', session.user.email)
      }
    })
    
    // Step 3: Attempt login
    console.log('\n3️⃣ Attempting login...')
    console.log('   Email: demo@barbershop.com')
    console.log('   Password: demo123')
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'demo@barbershop.com',
      password: 'demo123'
    })
    
    if (error) {
      console.error('❌ Login failed:', error.message)
      console.error('   Full error:', error)
    } else {
      console.log('✅ Login successful!')
      console.log('   User ID:', data.user?.id)
      console.log('   Email:', data.user?.email)
      console.log('   Session:', data.session ? 'Created' : 'None')
      console.log('   Access Token:', data.session?.access_token?.substring(0, 20) + '...')
    }
    
    // Step 4: Check session after login
    console.log('\n4️⃣ Checking session after login...')
    await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
    
    const { data: newSession, error: newSessionError } = await supabase.auth.getSession()
    if (newSessionError) {
      console.error('❌ New session error:', newSessionError)
    } else {
      console.log('📋 New session:', newSession.session ? 'Active' : 'None')
      if (newSession.session) {
        console.log('   User:', newSession.session.user.email)
      }
    }
    
    // Step 5: Test profile fetch
    if (data?.user) {
      console.log('\n5️⃣ Testing profile fetch...')
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()
      
      if (profileError) {
        console.error('❌ Profile error:', profileError.message)
        console.error('   Code:', profileError.code)
        console.error('   Details:', profileError.details)
      } else {
        console.log('✅ Profile found:', profileData)
      }
    }
    
    // Cleanup
    console.log('\n6️⃣ Cleaning up...')
    subscription.unsubscribe()
    await supabase.auth.signOut()
    console.log('✅ Signed out')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

debugAuthFlow()