import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  console.log('🧪 Testing session creation...')

  const cookieStore = cookies()
  const response = NextResponse.json({ message: 'Testing session' })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          console.log('🍪 Getting cookie:', name)
          return cookieStore.get(name)?.value
        },
        set(name, value, options) {
          console.log('🍪 Setting cookie:', name, 'with options:', options)
          response.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          console.log('🗑️ Removing cookie:', name)
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  try {
    // Check current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('📊 Current session:', session ? 'exists' : 'none')
    if (sessionError) {
      console.error('❌ Session error:', sessionError.message)
    }

    return NextResponse.json({ 
      session: session ? 'exists' : 'none',
      sessionError: sessionError?.message || null,
      cookies: Array.from(cookieStore.getAll()).map(c => c.name)
    })
  } catch (error) {
    console.error('❌ Test session error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}