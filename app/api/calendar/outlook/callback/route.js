import { NextResponse } from 'next/server'
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    
    if (error) {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Outlook Calendar Authentication</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #f5f5f5; }
            .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .error { color: #dc2626; }
            .icon { font-size: 48px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">❌</div>
            <h2>Connection Failed</h2>
            <p class="error">Outlook Calendar connection was cancelled or failed.</p>
            <p>You can close this window and try again.</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OUTLOOK_AUTH_ERROR',
                error: '${error}'
              }, window.location.origin);
              window.close();
            }
          </script>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    if (!code || !state) {
      return NextResponse.json(
        { success: false, error: 'Missing authorization code or state' },
        { status: 400 }
      )
    }

    const result = {
      success: false,
      error: 'Outlook Calendar integration requires backend service implementation'
    }

    if (result.success) {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Outlook Calendar Connected</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #f5f5f5; }
            .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .success { color: #059669; }
            .icon { font-size: 48px; margin-bottom: 20px; }
            .email { color: #6b7280; font-size: 14px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">✅</div>
            <h2>Successfully Connected!</h2>
            <p class="success">Your Outlook Calendar has been connected to 6FB.</p>
            <p class="email">${result.email}</p>
            <p>Appointments will now automatically sync with your calendar.</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OUTLOOK_AUTH_SUCCESS',
                account_id: '${result.account_id}',
                email: '${result.email}',
                name: '${result.name}'
              }, window.location.origin);
              
              setTimeout(() => {
                window.close();
              }, 2000);
            }
          </script>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      })
    } else {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Connection Error</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #f5f5f5; }
            .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .error { color: #dc2626; }
            .icon { font-size: 48px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">❌</div>
            <h2>Connection Failed</h2>
            <p class="error">${result.error}</p>
            <p>Please try connecting again.</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OUTLOOK_AUTH_ERROR',
                error: '${result.error}'
              }, window.location.origin);
              window.close();
            }
          </script>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      })
    }
    
  } catch (error) {
    console.error('Error handling Outlook callback:', error)
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connection Error</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #f5f5f5; }
          .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .error { color: #dc2626; }
          .icon { font-size: 48px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">❌</div>
          <h2>Connection Error</h2>
          <p class="error">An unexpected error occurred while connecting your calendar.</p>
          <p>Please try again later.</p>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: 'OUTLOOK_AUTH_ERROR',
              error: 'Unexpected error occurred'
            }, window.location.origin);
            window.close();
          }
        </script>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}