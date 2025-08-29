'use client'

export default function TestSimpleAuth() {
  return (
    <div style={{ padding: '50px', fontFamily: 'system-ui' }}>
      <h1>Super Simple Auth Test</h1>
      
      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <h2>Environment Check:</h2>
        <p>✅ Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL || '❌ Missing'}</p>
        <p>✅ Supabase Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set (hidden)' : '❌ Missing'}</p>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h2>Manual Test Instructions:</h2>
        <ol>
          <li>Open your browser's developer console (F12)</li>
          <li>Check for any red errors</li>
          <li>Try clicking the button below</li>
        </ol>
      </div>
      
      <button 
        onClick={() => {
          console.log('Button clicked!');
          alert('If you see this, JavaScript is working!');
        }}
        style={{
          marginTop: '20px',
          padding: '15px 30px',
          fontSize: '18px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        Test JavaScript Execution
      </button>
      
      <div style={{ marginTop: '40px' }}>
        <h3>Quick Links:</h3>
        <a href="/" style={{ marginRight: '20px' }}>Go Home</a>
        <a href="/dashboard" style={{ marginRight: '20px' }}>Try Dashboard</a>
        <a href="/login">Try Login</a>
      </div>
    </div>
  );
}