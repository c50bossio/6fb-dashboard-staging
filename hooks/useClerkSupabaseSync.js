import { useUser } from '@clerk/nextjs'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useClerkSupabaseSync() {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    async function syncUser() {
      if (!isLoaded || !user) return

      try {
        // Check if user exists in Supabase
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('email', user.primaryEmailAddress?.emailAddress)
          .single()

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('Error fetching user:', fetchError)
          return
        }

        // User doesn't exist, create them
        if (!existingUser) {
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              email: user.primaryEmailAddress?.emailAddress,
              full_name: user.fullName || `${user.firstName} ${user.lastName}`.trim(),
              clerk_id: user.id,
              is_active: true,
              created_at: new Date().toISOString(),
            })

          if (insertError) {
            console.error('Error creating user:', insertError)
          } else {
            console.log('User synced to Supabase')
          }
        } else {
          // Update user if needed
          const updates = {}
          
          if (existingUser.full_name !== user.fullName) {
            updates.full_name = user.fullName || `${user.firstName} ${user.lastName}`.trim()
          }
          
          if (!existingUser.clerk_id) {
            updates.clerk_id = user.id
          }

          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
              .from('users')
              .update(updates)
              .eq('id', existingUser.id)

            if (updateError) {
              console.error('Error updating user:', updateError)
            }
          }
        }
      } catch (error) {
        console.error('Error syncing user:', error)
      }
    }

    syncUser()
  }, [user, isLoaded])

  return { user, isLoaded }
}