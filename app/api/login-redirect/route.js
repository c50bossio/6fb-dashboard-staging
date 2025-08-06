import { NextResponse } from 'next/server'

export async function GET() {
  // Simple HTML login form that posts directly to API
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>6FB Login</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f3f4f6;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 400px;
        }
        .logo {
            width: 48px;
            height: 48px;
            background: #3b82f6;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 18px;
            margin: 0 auto 1rem;
        }
        h1 {
            text-align: center;
            margin-bottom: 2rem;
            font-size: 24px;
            color: #111827;
        }
        .form-group {
            margin-bottom: 1rem;
        }
        label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: #374151;
        }
        input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 16px;
        }
        input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        button {
            width: 100%;
            padding: 0.75rem;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: 500;
            font-size: 16px;
            cursor: pointer;
            margin-top: 1rem;
        }
        button:hover {
            background: #2563eb;
        }
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .message {
            margin-top: 1rem;
            padding: 0.75rem;
            border-radius: 6px;
            text-align: center;
        }
        .error {
            background: #fee;
            color: #dc2626;
            border: 1px solid #fecaca;
        }
        .success {
            background: #f0fdf4;
            color: #16a34a;
            border: 1px solid #bbf7d0;
        }
        .help {
            text-align: center;
            margin-top: 1.5rem;
            font-size: 14px;
            color: #6b7280;
        }
        .help a {
            color: #3b82f6;
            text-decoration: none;
        }
        .help a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">6FB</div>
        <h1>Sign In</h1>
        
        <form id="loginForm" onsubmit="handleLogin(event)">
            <div class="form-group">
                <label for="email">Email</label>
                <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    required 
                    placeholder="demo@barbershop.com"
                    value="demo@barbershop.com"
                />
            </div>
            
            <div class="form-group">
                <label for="password">Password</label>
                <input 
                    type="password" 
                    id="password" 
                    name="password" 
                    required 
                    placeholder="Enter your password"
                    value="demo123"
                />
            </div>
            
            <button type="submit" id="submitBtn">Sign In</button>
        </form>
        
        <div id="message"></div>
        
        <div class="help">
            <p>Demo credentials provided</p>
            <p style="margin-top: 8px;">
                <a href="/">Back to home</a>
            </p>
        </div>
    </div>
    
    <script>
        async function handleLogin(event) {
            event.preventDefault();
            
            const submitBtn = document.getElementById('submitBtn');
            const messageDiv = document.getElementById('message');
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing in...';
            messageDiv.className = '';
            messageDiv.textContent = '';
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    messageDiv.className = 'message success';
                    messageDiv.textContent = 'Login successful! Redirecting...';
                    setTimeout(() => {
                        window.location.href = '/dashboard-simple';
                    }, 1000);
                } else {
                    throw new Error(data.error || 'Login failed');
                }
            } catch (error) {
                messageDiv.className = 'message error';
                messageDiv.textContent = error.message;
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign In';
            }
        }
        
        // Check if JavaScript is working
        console.log('Login page loaded successfully');
    </script>
</body>
</html>
  `;
  
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}