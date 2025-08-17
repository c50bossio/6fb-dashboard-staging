import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Health check endpoint for payment system
 * GET /api/payments/health
 */
export async function GET() {
  // Add CORS headers for testing
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    // Check Stripe configuration
    const stripeConfigured = !!(
      process.env.STRIPE_SECRET_KEY && 
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
      process.env.STRIPE_CONNECT_CLIENT_ID
    );

    // Check database connectivity
    const supabase = createClient();
    const { data: tables, error } = await supabase
      .from('stripe_connected_accounts')
      .select('id')
      .limit(1);

    const databaseConnected = !error;

    // Determine if using test or live keys
    const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test') || false;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        stripe: {
          configured: stripeConfigured,
          mode: isTestMode ? 'test' : 'live',
          connectReady: !!process.env.STRIPE_CONNECT_CLIENT_ID
        },
        database: {
          connected: databaseConnected,
          tablesCreated: !error
        },
        pricing: {
          cardFee: '2.9% + $0.30',
          achFee: '0.8% (capped at $5)',
          platformMarkup: '0%',
          strategy: 'zero-markup'
        }
      }
    }, { status: 200, headers });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500, headers });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}