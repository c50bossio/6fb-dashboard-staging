'use client'

import { useState } from 'react'

export default function SimpleAuth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [user, setUser] = useState(null)

  const testSignup = async () => {
    setStatus('Testing signup...')
    
    try {
      // Import Supabase inside the function to avoid build issues
      const { createBrowserClient } = await import('@supabase/ssr')
      
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )

      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password
      })

      if (error) {
        setStatus(`❌ Error: ${error.message}`)
        console.error('Signup error:', error)
      } else if (data?.user) {
        setStatus(`✅ Success! User created: ${data.user.email}`)
        setUser(data.user)
      }
    } catch (err) {
      setStatus(`❌ Exception: ${err.message}`)
      console.error('Exception:', err)
    }
  }

  const testSignin = async () => {
    setStatus('Testing signin...')
    
    try {
      const { createBrowserClient } = await import('@supabase/ssr')
      
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      })

      if (error) {
        setStatus(`❌ Signin Error: ${error.message}`)
      } else if (data?.session) {
        setStatus(`✅ Signin Success! Welcome ${data.session.user.email}`)
        setUser(data.session.user)
        
        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 2000)
      }
    } catch (err) {
      setStatus(`❌ Exception: ${err.message}`)
    }
  }

  return (
    <div style={{ padding: '40px', maxWidth: '500px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1 style={{ color: '#333', marginBottom: '30px' }}>🔐 Simple Auth Test</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f8ff', borderRadius: '8px' }}>
        <strong>Database Fixed!</strong> Try creating an account:
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="test@bookedbarber.com"
          style={{ 
            width: '100%', 
            padding: '10px', 
            border: '1px solid #ddd', 
            borderRadius: '4px',
            fontSize: '16px'
          }}
        />
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="testpass123"
          style={{ 
            width: '100%', 
            padding: '10px', 
            border: '1px solid #ddd', 
            borderRadius: '4px',
            fontSize: '16px'
          }}
        />
      </div>
      
      <div style={{ marginBottom: '30px', display: 'flex', gap: '10px' }}>
        <button
          onClick={testSignup}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: '#007cba',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Sign Up
        </button>
        <button
          onClick={testSignin}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Sign In
        </button>
      </div>
      
      {status && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: status.includes('❌') ? '#ffebee' : '#e8f5e8',
          border: status.includes('❌') ? '1px solid #f44336' : '1px solid #4caf50',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {status}
        </div>
      )}
      
      {user && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f0f8ff',
          border: '1px solid #007cba',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <strong>User Info:</strong><br/>
          Email: {user.email}<br/>
          ID: {user.id}<br/>
          Created: {new Date(user.created_at).toLocaleString()}
        </div>
      )}
      
      <div style={{ fontSize: '14px', color: '#666', marginTop: '30px' }}>
        <strong>Quick Test:</strong><br/>
        1. Enter email: test@bookedbarber.com<br/>
        2. Enter password: testpass123<br/>
        3. Click "Sign Up" to create account<br/>
        4. Then try "Sign In" to test login<br/>
        5. Success = redirects to dashboard!
      </div>
    </div>
  )
}