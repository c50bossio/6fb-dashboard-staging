import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  
  console.log('🔧 Creating server-side Supabase client')
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          const allCookies = cookieStore.getAll()
          const supabaseCookies = allCookies.filter(cookie => cookie.name.startsWith('sb-'))
          console.log(`📦 Retrieved ${supabaseCookies.length} Supabase cookies`)
          return allCookies
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Ensure proper cookie options for production
              const cookieOptions = {
                name,
                value,
                ...options,
                // Ensure cookies work in production
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                httpOnly: true,
                path: '/'
              }
              cookieStore.set(cookieOptions)
              console.log(`🍪 Set cookie: ${name}`)
            })
          } catch (error) {
            // This is expected in the App Router
            console.log('Cookie operations handled by Next.js App Router')
          }
        },
      },
    }
  )
}