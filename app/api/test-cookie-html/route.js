import { NextResponse } from 'next/server'

export async function GET(request) {
  console.log('🧪 Testing cookie setting with HTML response (no redirect)...')
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Cookie Test</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 20px; }
          .cookie-info { background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>Cookie Setting Test</h1>
        <div class="cookie-info" id="cookie-display">
          Loading cookie information...
        </div>
        <button onclick="checkCookies()">Refresh Cookie Info</button>
        <br><br>
        <a href="/dashboard">Go to Dashboard</a>
        
        <script>
          function checkCookies() {
            const display = document.getElementById('cookie-display');
            const allCookies = document.cookie;
            
            console.log('🍪 All cookies:', allCookies);
            
            const cookieList = allCookies.split(';').map(c => c.trim()).filter(c => c);
            const sessionCookies = cookieList.filter(c => c.includes('sb-dfhqjdoydihajmjxniee-auth-token'));
            
            display.innerHTML = \`
              <strong>Total cookies:</strong> \${cookieList.length}<br>
              <strong>Session cookies:</strong> \${sessionCookies.length}<br>
              <strong>All cookies:</strong><br>
              \${cookieList.map(c => '• ' + c).join('<br>')}
            \`;
            
            console.log('🍪 Session cookies found:', sessionCookies.length);
            sessionCookies.forEach((cookie, i) => {
              console.log('🍪 Session cookie ' + i + ':', cookie);
            });
          }
          
          // Check cookies on page load
          setTimeout(checkCookies, 100);
        </script>
      </body>
    </html>
  `

  const htmlResponse = new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  })

  // Set test session cookies
  const testCookies = {
    'sb-dfhqjdoydihajmjxniee-auth-token': 'main-token-value',
    'sb-dfhqjdoydihajmjxniee-auth-token.0': 'chunk-0-value',
    'sb-dfhqjdoydihajmjxniee-auth-token.1': 'chunk-1-value',
    'test-simple-cookie': 'simple-value'
  }

  Object.entries(testCookies).forEach(([name, value]) => {
    console.log('🍪 Setting HTML cookie:', name)
    htmlResponse.cookies.set({ 
      name, 
      value, 
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: 3600
    })
  })

  console.log('✅ HTML response with cookies created')
  return htmlResponse
}