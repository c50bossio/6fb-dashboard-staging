import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'
  
  console.log('🧪 Testing OAuth callback simulation...')
  console.log('🔄 Simulating session creation and redirect to:', next)

  // Simulate what Supabase would do - create session cookies
  const response = NextResponse.redirect(new URL(next, requestUrl.origin))

  // Mock session cookies that would be created by Supabase
  const sessionCookies = {
    'sb-dfhqjdoydihajmjxniee-auth-token.0': 'eyJhbGciOiJIUzI1NiIsImtpZCI6IkdZZEd5aDJ6Q1NpckRydXoiLCJ0eXAiOiJKV1QifQ.eyJleHAiOjE3NTY1MDA5NDcsInNpdGVfdXJsIjoiaHR0cHM6Ly9ib29rZWRiYXJiZXIuY29tIiwiaWQiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJmdW5jdGlvbl9ob29rcyI6bnVsbCwicHJvdmlkZXIiOiJnb29nbGUiLCJyZWZlcnJlciI6Imh0dHA6Ly9sb2NhbGhvc3Q6OTk5OS9hcGkvYXV0aC9jYWxsYmFjayIsImZsb3dfc3RhdGVfaWQiOiJlNWM4ZWQ3Yy1iNWQ1LTQ3YWYtYjFlNS02ZTMxMDcyMTQxNzMifQ.6ve393JD_OgxoAvsf7rpbqckfEnI2dJACGuJ3Fj3jyI',
    'sb-dfhqjdoydihajmjxniee-auth-token.1': 'additional-session-data-chunk-here'
  }

  Object.entries(sessionCookies).forEach(([name, value]) => {
    console.log('🍪 Setting mock session cookie:', name)
    response.cookies.set({ 
      name, 
      value, 
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: 34560000
    })
  })

  console.log('✅ Mock session created, using HTML redirect approach')

  // Use the same approach as the real OAuth callback - HTML response with client-side redirect
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Redirecting...</title>
        <meta http-equiv="refresh" content="1;url=${next}">
        <style>
          body { 
            font-family: system-ui, sans-serif; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            min-height: 100vh; 
            margin: 0; 
            background: #f5f5f5; 
          }
          .container { text-align: center; }
          .spinner { 
            width: 40px; 
            height: 40px; 
            border: 4px solid #f3f3f3; 
            border-top: 4px solid #333; 
            border-radius: 50%; 
            animation: spin 1s linear infinite; 
            margin: 0 auto 20px; 
          }
          @keyframes spin { 
            0% { transform: rotate(0deg); } 
            100% { transform: rotate(360deg); } 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="spinner"></div>
          <p><strong>Test OAuth Simulation</strong></p>
          <p>Mock session created. Redirecting to dashboard...</p>
        </div>
        <script>
          console.log('🔄 Client-side redirect starting...');
          console.log('🍪 Cookies before redirect:', document.cookie);
          
          // Check for session cookies specifically
          const sessionCookies = document.cookie.split(';').filter(c => 
            c.trim().includes('sb-dfhqjdoydihajmjxniee-auth-token')
          );
          console.log('🍪 Session cookies found:', sessionCookies.length);
          sessionCookies.forEach((cookie, i) => {
            console.log('🍪 Session cookie ' + i + ':', cookie.trim());
          });
          
          setTimeout(() => {
            console.log('🔄 Redirecting to dashboard now...');
            console.log('🍪 Final cookies before redirect:', document.cookie);
            // Comment out redirect for testing
            // window.location.href = '${next}';
            console.log('🚫 Redirect disabled for testing - staying on this page');
          }, 2000); // Longer delay to see logs
        </script>
      </body>
    </html>
  `

  // Create HTML response and set cookies directly
  const htmlResponse = new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  })

  // Set cookies directly on the HTML response
  Object.entries(sessionCookies).forEach(([name, value]) => {
    console.log('🔄 Setting cookie on HTML response:', name)
    htmlResponse.cookies.set(name, value, { 
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: 34560000
    })
  })

  return htmlResponse
}