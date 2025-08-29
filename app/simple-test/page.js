export default function SimpleTest() {
  return (
    <div style={{ padding: '50px', fontFamily: 'monospace' }}>
      <h1>Super Simple Test Page</h1>
      <p>If you can see this, Next.js is working!</p>
      <p>Current time: {new Date().toLocaleString()}</p>
      <hr />
      <h2>Environment Variables:</h2>
      <ul>
        <li>NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</li>
        <li>NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</li>
      </ul>
      <hr />
      <h2>Quick Actions:</h2>
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button 
          onClick={() => alert('Button works!')}
          style={{ padding: '10px 20px', cursor: 'pointer' }}
        >
          Test JavaScript
        </button>
        <button 
          onClick={() => window.location.href = '/'}
          style={{ padding: '10px 20px', cursor: 'pointer' }}
        >
          Go to Home
        </button>
        <button 
          onClick={() => window.location.href = '/login'}
          style={{ padding: '10px 20px', cursor: 'pointer' }}
        >
          Go to Login
        </button>
      </div>
    </div>
  )
}