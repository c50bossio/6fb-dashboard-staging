/**
 * Payroll Schedule API Endpoint
 * Handles automated payroll report scheduling and email delivery
 * Supports weekly, monthly, quarterly schedules with email notifications
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// Temporarily disabled services for deployment stability
const payrollExportService = { generatePayrollReport: async () => ({ error: 'Payroll export temporarily disabled for deployment' }) }
const sendGridEmailService = { sendPayrollReport: async () => ({ error: 'SendGrid temporarily disabled for deployment' }) }
import { headers } from 'next/headers'

export async function POST(request) {
  try {
    // Authentication check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check permissions
    const hasPermissions = await checkSchedulePermissions(supabase, user.id)
    if (!hasPermissions) {
      return NextResponse.json(
        { error: 'Insufficient permissions for payroll scheduling' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      name,
      description,
      frequency,
      scheduleDay = 1,
      exportOptions = {},
      emailOptions = {},
      isActive = true
    } = body

    // Validate frequency
    const validFrequencies = ['weekly', 'monthly', 'quarterly', 'yearly']
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: `Invalid frequency. Valid options: ${validFrequencies.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate email recipients
    if (!emailOptions.recipients || emailOptions.recipients.length === 0) {
      return NextResponse.json(
        { error: 'At least one email recipient is required' },
        { status: 400 }
      )
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = emailOptions.recipients.filter(email => !emailRegex.test(email))
    if (invalidEmails.length > 0) {
      return NextResponse.json(
        { error: `Invalid email addresses: ${invalidEmails.join(', ')}` },
        { status: 400 }
      )
    }

    // Get user's barbershop
    const { data: profile } = await supabase
      .from('profiles')
      .select('barbershop_id, barbershop_id')
      .eq('id', user.id)
      .single()

    const barbershopId = profile?.barbershop_id || profile?.barbershop_id
    if (!barbershopId) {
      return NextResponse.json(
        { error: 'No barbershop association found' },
        { status: 400 }
      )
    }

    // Calculate next run time
    const nextRunTime = calculateNextRunTime(frequency, scheduleDay)

    // Create scheduled export record
    const scheduleData = {
      barbershop_id: barbershopId,
      created_by: user.id,
      name: name || `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Payroll Report`,
      description: description || `Automated ${frequency} payroll export`,
      frequency,
      schedule_day: scheduleDay,
      export_options: exportOptions,
      email_options: emailOptions,
      next_run_at: nextRunTime,
      is_active: isActive,
      run_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: schedule, error } = await supabase
      .from('payroll_export_schedules')
      .insert([scheduleData])
      .select()
      .single()

    if (error) throw error

    // Log the schedule creation
    await logScheduleActivity(supabase, user.id, 'created', schedule)

    return NextResponse.json({
      success: true,
      schedule: {
        id: schedule.id,
        name: schedule.name,
        description: schedule.description,
        frequency: schedule.frequency,
        scheduleDay: schedule.schedule_day,
        nextRun: schedule.next_run_at,
        isActive: schedule.is_active,
        recipients: schedule.email_options.recipients,
        exportFormat: schedule.export_options.format || 'pdf'
      },
      message: 'Payroll export schedule created successfully'
    })

  } catch (error) {
    console.error('Error creating payroll schedule:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create schedule',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    // Authentication check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check permissions
    const hasPermissions = await checkSchedulePermissions(supabase, user.id)
    if (!hasPermissions) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get user's barbershop
    const { data: profile } = await supabase
      .from('profiles')
      .select('barbershop_id, barbershop_id')
      .eq('id', user.id)
      .single()

    const barbershopId = profile?.barbershop_id || profile?.barbershop_id
    if (!barbershopId) {
      return NextResponse.json(
        { error: 'No barbershop association found' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'list'
    const scheduleId = searchParams.get('id')

    switch (action) {
      case 'list':
        const { data: schedules } = await supabase
          .from('payroll_export_schedules')
          .select('*')
          .eq('barbershop_id', barbershopId)
          .order('created_at', { ascending: false })

        return NextResponse.json({
          success: true,
          schedules: schedules?.map(schedule => ({
            id: schedule.id,
            name: schedule.name,
            description: schedule.description,
            frequency: schedule.frequency,
            scheduleDay: schedule.schedule_day,
            nextRun: schedule.next_run_at,
            lastRun: schedule.last_run_at,
            isActive: schedule.is_active,
            runCount: schedule.run_count,
            recipients: schedule.email_options?.recipients || [],
            exportFormat: schedule.export_options?.format || 'pdf',
            createdAt: schedule.created_at
          })) || []
        })

      case 'detail':
        if (!scheduleId) {
          return NextResponse.json(
            { error: 'Schedule ID is required' },
            { status: 400 }
          )
        }

        const { data: schedule } = await supabase
          .from('payroll_export_schedules')
          .select('*')
          .eq('id', scheduleId)
          .eq('barbershop_id', barbershopId)
          .single()

        if (!schedule) {
          return NextResponse.json(
            { error: 'Schedule not found' },
            { status: 404 }
          )
        }

        // Get recent execution history
        const { data: executions } = await supabase
          .from('payroll_schedule_executions')
          .select('*')
          .eq('schedule_id', scheduleId)
          .order('executed_at', { ascending: false })
          .limit(10)

        return NextResponse.json({
          success: true,
          schedule: {
            id: schedule.id,
            name: schedule.name,
            description: schedule.description,
            frequency: schedule.frequency,
            scheduleDay: schedule.schedule_day,
            nextRun: schedule.next_run_at,
            lastRun: schedule.last_run_at,
            isActive: schedule.is_active,
            runCount: schedule.run_count,
            exportOptions: schedule.export_options,
            emailOptions: schedule.email_options,
            createdAt: schedule.created_at,
            updatedAt: schedule.updated_at
          },
          executions: executions?.map(exec => ({
            id: exec.id,
            executedAt: exec.executed_at,
            status: exec.status,
            fileName: exec.file_name,
            fileSize: exec.file_size,
            recipientCount: exec.recipient_count,
            errorMessage: exec.error_message
          })) || []
        })

      case 'upcoming':
        // Get upcoming scheduled runs
        const { data: upcomingSchedules } = await supabase
          .from('payroll_export_schedules')
          .select('id, name, next_run_at, frequency, email_options')
          .eq('barbershop_id', barbershopId)
          .eq('is_active', true)
          .gte('next_run_at', new Date().toISOString())
          .order('next_run_at', { ascending: true })
          .limit(10)

        return NextResponse.json({
          success: true,
          upcoming: upcomingSchedules?.map(schedule => ({
            id: schedule.id,
            name: schedule.name,
            nextRun: schedule.next_run_at,
            frequency: schedule.frequency,
            recipientCount: schedule.email_options?.recipients?.length || 0
          })) || []
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in payroll schedule GET:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

export async function PUT(request) {
  try {
    // Authentication check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check permissions
    const hasPermissions = await checkSchedulePermissions(supabase, user.id)
    if (!hasPermissions) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 }
      )
    }

    // Get user's barbershop
    const { data: profile } = await supabase
      .from('profiles')
      .select('barbershop_id, barbershop_id')
      .eq('id', user.id)
      .single()

    const barbershopId = profile?.barbershop_id || profile?.barbershop_id

    // Verify ownership
    const { data: existingSchedule } = await supabase
      .from('payroll_export_schedules')
      .select('*')
      .eq('id', id)
      .eq('barbershop_id', barbershopId)
      .single()

    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Schedule not found or access denied' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updatePayload = {
      ...updateData,
      updated_at: new Date().toISOString()
    }

    // Recalculate next run time if frequency or schedule day changed
    if (updateData.frequency || updateData.scheduleDay) {
      updatePayload.next_run_at = calculateNextRunTime(
        updateData.frequency || existingSchedule.frequency,
        updateData.scheduleDay || existingSchedule.schedule_day
      )
    }

    const { data: updatedSchedule, error } = await supabase
      .from('payroll_export_schedules')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Log the update
    await logScheduleActivity(supabase, user.id, 'updated', updatedSchedule)

    return NextResponse.json({
      success: true,
      schedule: {
        id: updatedSchedule.id,
        name: updatedSchedule.name,
        description: updatedSchedule.description,
        frequency: updatedSchedule.frequency,
        scheduleDay: updatedSchedule.schedule_day,
        nextRun: updatedSchedule.next_run_at,
        isActive: updatedSchedule.is_active,
        recipients: updatedSchedule.email_options?.recipients || [],
        exportFormat: updatedSchedule.export_options?.format || 'pdf'
      },
      message: 'Schedule updated successfully'
    })

  } catch (error) {
    console.error('Error updating payroll schedule:', error)
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    )
  }
}

export async function DELETE(request) {
  try {
    // Authentication check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check permissions
    const hasPermissions = await checkSchedulePermissions(supabase, user.id)
    if (!hasPermissions) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const scheduleId = searchParams.get('id')

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 }
      )
    }

    // Get user's barbershop
    const { data: profile } = await supabase
      .from('profiles')
      .select('barbershop_id, barbershop_id')
      .eq('id', user.id)
      .single()

    const barbershopId = profile?.barbershop_id || profile?.barbershop_id

    // Verify ownership and delete
    const { data: deletedSchedule, error } = await supabase
      .from('payroll_export_schedules')
      .delete()
      .eq('id', scheduleId)
      .eq('barbershop_id', barbershopId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Schedule not found' },
          { status: 404 }
        )
      }
      throw error
    }

    // Log the deletion
    await logScheduleActivity(supabase, user.id, 'deleted', deletedSchedule)

    return NextResponse.json({
      success: true,
      message: 'Schedule deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting payroll schedule:', error)
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    )
  }
}

/**
 * Execute scheduled payroll export (called by cron job)
 * This is an internal endpoint for scheduled execution
 */
export async function PATCH(request) {
  try {
    // Verify this is an internal request (check for API key or specific header)
    const authHeader = headers().get('authorization')
    const expectedToken = process.env.INTERNAL_API_TOKEN
    
    if (!authHeader || !expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized internal request' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { scheduleId, forceRun = false } = body

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get the schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('payroll_export_schedules')
      .select('*')
      .eq('id', scheduleId)
      .single()

    if (scheduleError || !schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      )
    }

    // Check if it's time to run (unless forced)
    if (!forceRun && new Date(schedule.next_run_at) > new Date()) {
      return NextResponse.json(
        { error: 'Schedule not due for execution' },
        { status: 400 }
      )
    }

    // Execute the export
    const executionResult = await executeScheduledExport(schedule)

    // Update the schedule's next run time and run count
    const nextRunTime = calculateNextRunTime(schedule.frequency, schedule.schedule_day)
    
    await supabase
      .from('payroll_export_schedules')
      .update({
        next_run_at: nextRunTime,
        last_run_at: new Date().toISOString(),
        run_count: (schedule.run_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', scheduleId)

    return NextResponse.json({
      success: true,
      execution: executionResult,
      nextRun: nextRunTime
    })

  } catch (error) {
    console.error('Error executing scheduled payroll export:', error)
    return NextResponse.json(
      { error: 'Failed to execute scheduled export' },
      { status: 500 }
    )
  }
}

/**
 * Execute a scheduled payroll export
 * @param {Object} schedule - Schedule configuration
 * @returns {Object} Execution result
 */
async function executeScheduledExport(schedule) {
  const supabase = await createClient()
  
  try {
    // Generate the payroll export
    const exportResult = await payrollExportService.generatePayrollExport(schedule.export_options)
    
    // Send email with the export attachment
    const emailResult = await sendGridService.sendPayrollReport({
      recipients: schedule.email_options.recipients,
      reportData: exportResult,
      scheduleName: schedule.name,
      barbershopId: schedule.barbershop_id,
      customMessage: schedule.email_options.customMessage
    })

    // Log the execution
    const executionRecord = {
      schedule_id: schedule.id,
      executed_at: new Date().toISOString(),
      status: 'completed',
      file_name: exportResult.fileName,
      file_size: exportResult.fileSize,
      recipient_count: schedule.email_options.recipients.length,
      email_sent: emailResult.success,
      export_metadata: exportResult.metadata
    }

    const { data: execution } = await supabase
      .from('payroll_schedule_executions')
      .insert([executionRecord])
      .select()
      .single()

    return {
      success: true,
      execution: execution,
      emailSent: emailResult.success,
      fileName: exportResult.fileName,
      recipients: schedule.email_options.recipients.length
    }

  } catch (error) {
    // Log failed execution
    const executionRecord = {
      schedule_id: schedule.id,
      executed_at: new Date().toISOString(),
      status: 'failed',
      error_message: error.message,
      recipient_count: schedule.email_options.recipients.length,
      email_sent: false
    }

    await supabase
      .from('payroll_schedule_executions')
      .insert([executionRecord])

    throw error
  }
}

/**
 * Check if user has schedule permissions
 * @param {Object} supabase - Supabase client
 * @param {string} userId - User ID
 * @returns {boolean} Has permissions
 */
async function checkSchedulePermissions(supabase, userId) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, barbershop_id, barbershop_id')
      .eq('id', userId)
      .single()

    if (!profile) return false

    // Only shop owners and managers can manage schedules
    const allowedRoles = ['SHOP_OWNER', 'MANAGER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN']
    return allowedRoles.includes(profile.role)

  } catch (error) {
    console.error('Error checking schedule permissions:', error)
    return false
  }
}

/**
 * Calculate next run time for scheduled exports
 * @param {string} frequency - Schedule frequency
 * @param {number} day - Day of frequency period
 * @returns {string} Next run time ISO string
 */
function calculateNextRunTime(frequency, day = 1) {
  const now = new Date()
  let nextRun = new Date()

  switch (frequency) {
    case 'weekly':
      // Run on specified day of week (1 = Monday, 7 = Sunday)
      const dayOfWeek = day === 7 ? 0 : day
      const daysUntilRun = (dayOfWeek - now.getDay() + 7) % 7 || 7
      nextRun.setDate(now.getDate() + daysUntilRun)
      break

    case 'monthly':
      // Run on specified day of month
      nextRun = new Date(now.getFullYear(), now.getMonth() + 1, day)
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1)
      }
      break

    case 'quarterly':
      // Run on first day of next quarter
      const currentQuarter = Math.floor(now.getMonth() / 3)
      nextRun = new Date(now.getFullYear(), (currentQuarter + 1) * 3, day)
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 3)
      }
      break

    case 'yearly':
      // Run on specified day of year
      nextRun = new Date(now.getFullYear() + 1, 0, day)
      break
  }

  // Set to 9 AM for scheduled exports
  nextRun.setHours(9, 0, 0, 0)
  return nextRun.toISOString()
}

/**
 * Log schedule activity for audit trail
 * @param {Object} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {string} action - Action performed
 * @param {Object} schedule - Schedule data
 */
async function logScheduleActivity(supabase, userId, action, schedule) {
  try {
    await supabase
      .from('activity_log')
      .insert([{
        user_id: userId,
        action: `payroll_schedule_${action}`,
        resource_type: 'payroll_schedule',
        resource_id: schedule.id,
        details: {
          scheduleName: schedule.name,
          frequency: schedule.frequency,
          isActive: schedule.is_active,
          recipientCount: schedule.email_options?.recipients?.length || 0
        },
        ip_address: headers().get('x-forwarded-for'),
        user_agent: headers().get('user-agent'),
        created_at: new Date().toISOString()
      }])
  } catch (error) {
    console.error('Failed to log schedule activity:', error)
  }
}