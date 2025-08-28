import MonitoringDashboard from '@/components/monitoring/MonitoringDashboard'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AdminMonitoringPage() {
  const supabase = createServerComponentClient({ cookies })
  
  try {
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      redirect('/auth/login?redirect=/admin/monitoring')
    }

    // Check if user has admin privileges
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      redirect('/dashboard?error=profile_error')
    }

    // Only allow admin users to access monitoring
    const allowedRoles = ['admin', 'super_admin']
    const allowedEmails = ['support@bookedbarber.com', 'admin@bookedbarber.com']
    
    const hasAccess = allowedRoles.includes(profile.role) || allowedEmails.includes(profile.email)
    
    if (!hasAccess) {
      redirect('/dashboard?error=unauthorized')
    }

    return (
      <div>
        <MonitoringDashboard />
      </div>
    )
    
  } catch (error) {
    console.error('Admin monitoring page error:', error)
    redirect('/dashboard?error=server_error')
  }
}

export const metadata = {
  title: 'System Monitoring - Admin Dashboard',
  description: 'Real-time system health monitoring and performance metrics',
}