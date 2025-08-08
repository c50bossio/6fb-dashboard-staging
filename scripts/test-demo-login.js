#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODcwMTAsImV4cCI6MjA2OTY2MzAxMH0.TUYnEBzpB2LQaGLIXg5wtvJHyyhFD2QAOMdY_B-V1fI'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testDemoLogin() {
  console.log('🧪 Testing demo login...')
  console.log('URL:', supabaseUrl)
  console.log('Email: demo@barbershop.com')
  console.log('Password: demo123')
  console.log('----------------------------\n')
  
  try {
    // Test connection first
    console.log('1️⃣ Testing Supabase connection...')
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Connection error:', sessionError)
    } else {
      console.log('✅ Connected to Supabase')
      console.log('Current session:', sessionData.session ? 'Active' : 'None')
    }
    
    // Try to login
    console.log('\n2️⃣ Attempting login...')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'demo@barbershop.com',
      password: 'demo123'
    })
    
    if (error) {
      console.error('❌ Login failed:', error.message)
      
      if (error.message.includes('Invalid login credentials')) {
        console.log('\n⚠️ The demo user does not exist in this Supabase project.')
        console.log('You need to create it first. Options:')
        console.log('1. Use Supabase Dashboard to create user')
        console.log('2. Use the /register page to create account')
        console.log('3. Create via Supabase SQL Editor')
      }
    } else {
      console.log('✅ Login successful!')
      console.log('User ID:', data.user?.id)
      console.log('Email:', data.user?.email)
      console.log('Session:', data.session ? 'Created' : 'None')
      
      // Sign out after test
      await supabase.auth.signOut()
      console.log('✅ Signed out successfully')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testDemoLogin()