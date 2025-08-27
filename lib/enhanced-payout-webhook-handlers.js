/**
 * Enhanced Payout Webhook Handlers for Real-time Status Tracking
 * Extends existing webhook handlers with comprehensive payout history tracking
 * Integrates with the new payout history database schema
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Enhanced Transfer Created Handler
 * Creates detailed status updates and metadata tracking
 */
export async function enhancedHandleTransferCreated(transfer) {
  try {
    const supabase = createClient()
    
    // Get commission transaction or payout record associated with this transfer
    const commissionTransactionId = transfer.metadata?.commission_transaction_id
    const payoutTransactionId = transfer.metadata?.payout_transaction_id
    const barbershopId = transfer.metadata?.barbershop_id
    
    if (!barbershopId) {
      console.warn('Transfer created without barbershop_id metadata:', transfer.id)
      return { success: false, reason: 'missing_barbershop_id' }
    }

    let payoutRecordId = null
    let barberDetails = null

    if (commissionTransactionId) {
      // Find associated payout record through commission transaction
      const { data: commissionTx } = await supabase
        .from('commission_transactions')
        .select(`
          *,
          payout_records:commission_payout_records!commission_transactions_payout_transaction_id_fkey(*)
        `)
        .eq('id', commissionTransactionId)
        .single()

      if (commissionTx?.payout_records?.length > 0) {
        payoutRecordId = commissionTx.payout_records[0].id
        barberDetails = {
          barber_id: commissionTx.barber_id,
          amount: commissionTx.commission_amount
        }
      }
    } else if (payoutTransactionId) {
      // Direct payout record reference
      const { data: payoutRecord } = await supabase
        .from('commission_payout_records')
        .select('id, barber_id, amount')
        .eq('id', payoutTransactionId)
        .single()

      if (payoutRecord) {
        payoutRecordId = payoutRecord.id
        barberDetails = {
          barber_id: payoutRecord.barber_id,
          amount: payoutRecord.amount
        }
      }
    }

    if (!payoutRecordId) {
      console.warn('Could not find payout record for transfer:', transfer.id)
      return { success: false, reason: 'payout_record_not_found' }
    }

    // Create comprehensive status update
    const statusUpdateId = await supabase
      .rpc('create_payout_status_update', {
        p_payout_record_id: payoutRecordId,
        p_barbershop_id: barbershopId,
        p_previous_status: 'pending',
        p_new_status: 'processing',
        p_status_reason: 'Stripe transfer created',
        p_stripe_transfer_id: transfer.id,
        p_stripe_event_id: transfer.metadata?.stripe_event_id,
        p_stripe_event_type: 'transfer.created',
        p_estimated_arrival_date: transfer.arrival_date ? new Date(transfer.arrival_date * 1000) : null,
        p_metadata: {
          stripe_transfer_data: {
            id: transfer.id,
            amount: transfer.amount,
            currency: transfer.currency,
            destination: transfer.destination,
            created: transfer.created,
            method: transfer.method,
            type: transfer.type,
            automatic: transfer.automatic
          },
          processing_details: {
            initiated_at: new Date().toISOString(),
            expected_arrival: transfer.arrival_date ? new Date(transfer.arrival_date * 1000).toISOString() : null,
            transfer_method: transfer.method === 'instant' ? 'instant' : 'standard'
          }
        }
      })

    // Update main payout record with processing status
    await supabase
      .from('commission_payout_records')
      .update({
        status: 'processing',
        stripe_transfer_id: transfer.id,
        metadata: supabase.raw(`
          COALESCE(metadata, '{}') || '${JSON.stringify({
            stripe_transfer_created_at: new Date().toISOString(),
            transfer_method: transfer.method,
            expected_arrival: transfer.arrival_date ? new Date(transfer.arrival_date * 1000).toISOString() : null
          })}'::jsonb
        `)
      })
      .eq('id', payoutRecordId)

    // Create or update transaction metadata
    await upsertPayoutTransactionMetadata(payoutRecordId, barbershopId, {
      stripe_transfer_id: transfer.id,
      processing_status: 'transfer_created',
      stripe_fee_amount: calculateEstimatedStripeFee(transfer.amount),
      metadata: {
        transfer_details: {
          method: transfer.method,
          automatic: transfer.automatic,
          destination: transfer.destination,
          estimated_arrival: transfer.arrival_date ? new Date(transfer.arrival_date * 1000).toISOString() : null
        }
      }
    }, supabase)

    console.log(`📤 Enhanced transfer created tracking: $${transfer.amount / 100} for payout ${payoutRecordId}`)

    return {
      success: true,
      payout_record_id: payoutRecordId,
      status_update_id: statusUpdateId,
      transfer_id: transfer.id
    }

  } catch (error) {
    console.error('Error in enhanced transfer created handler:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Enhanced Transfer Paid Handler
 * Updates status to completed and handles reconciliation
 */
export async function enhancedHandleTransferPaid(transfer) {
  try {
    const supabase = createClient()
    
    // Find payout record by stripe_transfer_id
    const { data: payoutRecord, error: payoutError } = await supabase
      .from('commission_payout_records')
      .select('id, barbershop_id, barber_id, amount')
      .eq('stripe_transfer_id', transfer.id)
      .single()

    if (payoutError || !payoutRecord) {
      console.error('Payout record not found for transfer paid:', transfer.id)
      return { success: false, reason: 'payout_record_not_found' }
    }

    const payoutRecordId = payoutRecord.id
    const transferAmount = transfer.amount / 100

    // Create status update for completion
    const statusUpdateId = await supabase
      .rpc('create_payout_status_update', {
        p_payout_record_id: payoutRecordId,
        p_barbershop_id: payoutRecord.barbershop_id,
        p_previous_status: 'processing',
        p_new_status: 'completed',
        p_status_reason: 'Transfer successfully paid to destination account',
        p_stripe_transfer_id: transfer.id,
        p_stripe_event_id: transfer.metadata?.stripe_event_id,
        p_stripe_event_type: 'transfer.paid',
        p_actual_arrival_date: new Date(),
        p_metadata: {
          completion_details: {
            paid_at: new Date().toISOString(),
            actual_amount: transferAmount,
            currency: transfer.currency,
            destination: transfer.destination,
            reversal_possible_until: transfer.created ? new Date((transfer.created + (7 * 24 * 60 * 60)) * 1000).toISOString() : null
          },
          performance_metrics: {
            processing_time_hours: calculateProcessingTime(payoutRecord.created_at, new Date()),
            transfer_method: transfer.method,
            automatic_transfer: transfer.automatic
          }
        }
      })

    // Update main payout record to completed
    await supabase
      .from('commission_payout_records')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: supabase.raw(`
          COALESCE(metadata, '{}') || '${JSON.stringify({
            stripe_transfer_paid_at: new Date().toISOString(),
            actual_amount_transferred: transferAmount,
            transfer_completed: true
          })}'::jsonb
        `)
      })
      .eq('id', payoutRecordId)

    // Update barber commission balance (move from pending to paid)
    await supabase
      .from('barber_commission_balances')
      .update({
        pending_amount: supabase.raw(`GREATEST(pending_amount - ${transferAmount}, 0)`),
        paid_amount: supabase.raw(`paid_amount + ${transferAmount}`),
        updated_at: new Date().toISOString()
      })
      .eq('barber_id', payoutRecord.barber_id)
      .eq('barbershop_id', payoutRecord.barbershop_id)

    // Update transaction metadata with completion details
    await upsertPayoutTransactionMetadata(payoutRecordId, payoutRecord.barbershop_id, {
      reconciliation_status: 'matched',
      reconciled_at: new Date().toISOString(),
      stripe_fee_amount: calculateActualStripeFee(transfer),
      metadata: {
        completion_details: {
          paid_at: new Date().toISOString(),
          processing_method: transfer.method,
          destination_account: transfer.destination
        }
      }
    }, supabase)

    // Trigger performance metrics calculation
    await triggerPerformanceMetricsUpdate(payoutRecord.barbershop_id, supabase)

    // Send completion notification to barber
    await sendPayoutCompletionNotification({
      barberId: payoutRecord.barber_id,
      barbershopId: payoutRecord.barbershop_id,
      amount: transferAmount,
      transferId: transfer.id,
      method: 'stripe_transfer',
      completedAt: new Date().toISOString()
    })

    console.log(`✅ Enhanced transfer completion: $${transferAmount} completed for payout ${payoutRecordId}`)

    return {
      success: true,
      payout_record_id: payoutRecordId,
      status_update_id: statusUpdateId,
      completed_amount: transferAmount
    }

  } catch (error) {
    console.error('Error in enhanced transfer paid handler:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Enhanced Transfer Failed Handler
 * Handles failure tracking and retry logic
 */
export async function enhancedHandleTransferFailed(transfer) {
  try {
    const supabase = createClient()
    
    // Find payout record by stripe_transfer_id
    const { data: payoutRecord, error: payoutError } = await supabase
      .from('commission_payout_records')
      .select('id, barbershop_id, barber_id, amount')
      .eq('stripe_transfer_id', transfer.id)
      .single()

    if (payoutError || !payoutRecord) {
      console.error('Payout record not found for transfer failed:', transfer.id)
      return { success: false, reason: 'payout_record_not_found' }
    }

    const payoutRecordId = payoutRecord.id
    const failureCode = transfer.failure_code
    const failureMessage = transfer.failure_message

    // Create status update for failure
    const statusUpdateId = await supabase
      .rpc('create_payout_status_update', {
        p_payout_record_id: payoutRecordId,
        p_barbershop_id: payoutRecord.barbershop_id,
        p_previous_status: 'processing',
        p_new_status: 'failed',
        p_status_reason: `Transfer failed: ${failureMessage || failureCode}`,
        p_stripe_transfer_id: transfer.id,
        p_stripe_event_id: transfer.metadata?.stripe_event_id,
        p_stripe_event_type: 'transfer.failed',
        p_metadata: {
          failure_details: {
            failure_code: failureCode,
            failure_message: failureMessage,
            failed_at: new Date().toISOString(),
            transfer_id: transfer.id,
            destination: transfer.destination,
            attempted_amount: transfer.amount / 100
          },
          retry_information: {
            retry_eligible: isRetryEligible(failureCode),
            suggested_action: getSuggestedAction(failureCode),
            next_retry_eligible_at: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString() // 24 hours
          }
        }
      })

    // Update main payout record to failed
    await supabase
      .from('commission_payout_records')
      .update({
        status: 'failed',
        metadata: supabase.raw(`
          COALESCE(metadata, '{}') || '${JSON.stringify({
            stripe_transfer_failed_at: new Date().toISOString(),
            failure_code: failureCode,
            failure_message: failureMessage,
            retry_eligible: isRetryEligible(failureCode)
          })}'::jsonb
        `)
      })
      .eq('id', payoutRecordId)

    // Record failed attempt for retry tracking
    await supabase
      .from('payout_failed_attempts')
      .insert({
        payout_record_id: payoutRecordId,
        barbershop_id: payoutRecord.barbershop_id,
        barber_id: payoutRecord.barber_id,
        attempt_number: 1, // This would be incremented for subsequent failures
        failure_reason: failureMessage,
        failure_code: failureCode,
        stripe_error_code: failureCode,
        stripe_error_message: failureMessage,
        attempted_amount: payoutRecord.amount,
        attempted_method: 'stripe_transfer',
        next_retry_at: isRetryEligible(failureCode) 
          ? new Date(Date.now() + (24 * 60 * 60 * 1000)) // 24 hours
          : null,
        retry_enabled: isRetryEligible(failureCode),
        metadata: {
          stripe_transfer_id: transfer.id,
          destination_account: transfer.destination,
          suggested_resolution: getSuggestedAction(failureCode)
        }
      })

    // Update transaction metadata
    await upsertPayoutTransactionMetadata(payoutRecordId, payoutRecord.barbershop_id, {
      reconciliation_status: 'discrepancy',
      metadata: {
        failure_tracking: {
          failed_at: new Date().toISOString(),
          failure_reason: failureMessage,
          failure_code: failureCode,
          retry_options: {
            eligible: isRetryEligible(failureCode),
            suggested_action: getSuggestedAction(failureCode)
          }
        }
      }
    }, supabase)

    // Send failure notification to admin and barber
    await sendPayoutFailureNotification({
      barberId: payoutRecord.barber_id,
      barbershopId: payoutRecord.barbershop_id,
      amount: payoutRecord.amount,
      transferId: transfer.id,
      failureReason: failureMessage,
      failureCode: failureCode,
      retryEligible: isRetryEligible(failureCode),
      suggestedAction: getSuggestedAction(failureCode)
    })

    console.error(`❌ Enhanced transfer failure tracking: ${failureMessage} (${failureCode}) for payout ${payoutRecordId}`)

    return {
      success: true,
      payout_record_id: payoutRecordId,
      status_update_id: statusUpdateId,
      failure_code: failureCode,
      retry_eligible: isRetryEligible(failureCode)
    }

  } catch (error) {
    console.error('Error in enhanced transfer failed handler:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Enhanced Transfer Reversed Handler
 * Handles reversal tracking and balance adjustments
 */
export async function enhancedHandleTransferReversed(transfer) {
  try {
    const supabase = createClient()
    
    // Find payout record by stripe_transfer_id
    const { data: payoutRecord, error: payoutError } = await supabase
      .from('commission_payout_records')
      .select('id, barbershop_id, barber_id, amount')
      .eq('stripe_transfer_id', transfer.id)
      .single()

    if (payoutError || !payoutRecord) {
      console.error('Payout record not found for transfer reversed:', transfer.id)
      return { success: false, reason: 'payout_record_not_found' }
    }

    const payoutRecordId = payoutRecord.id
    const reversedAmount = transfer.amount / 100

    // Create status update for reversal
    const statusUpdateId = await supabase
      .rpc('create_payout_status_update', {
        p_payout_record_id: payoutRecordId,
        p_barbershop_id: payoutRecord.barbershop_id,
        p_previous_status: 'completed',
        p_new_status: 'reversed',
        p_status_reason: 'Transfer was reversed by Stripe or bank',
        p_stripe_transfer_id: transfer.id,
        p_stripe_event_id: transfer.metadata?.stripe_event_id,
        p_stripe_event_type: 'transfer.reversed',
        p_metadata: {
          reversal_details: {
            reversed_at: new Date().toISOString(),
            reversed_amount: reversedAmount,
            reversal_reason: 'stripe_automatic_reversal',
            original_completion_date: payoutRecord.completed_at
          },
          impact_assessment: {
            balance_adjustment_required: true,
            notification_sent: true,
            requires_manual_review: true
          }
        }
      })

    // Update main payout record to reversed
    await supabase
      .from('commission_payout_records')
      .update({
        status: 'reversed',
        metadata: supabase.raw(`
          COALESCE(metadata, '{}') || '${JSON.stringify({
            stripe_transfer_reversed_at: new Date().toISOString(),
            reversal_amount: reversedAmount,
            requires_reprocessing: true
          })}'::jsonb
        `)
      })
      .eq('id', payoutRecordId)

    // Reverse barber balance adjustment (move back from paid to pending)
    await supabase
      .from('barber_commission_balances')
      .update({
        pending_amount: supabase.raw(`pending_amount + ${reversedAmount}`),
        paid_amount: supabase.raw(`GREATEST(paid_amount - ${reversedAmount}, 0)`),
        updated_at: new Date().toISOString()
      })
      .eq('barber_id', payoutRecord.barber_id)
      .eq('barbershop_id', payoutRecord.barbershop_id)

    // Update transaction metadata
    await upsertPayoutTransactionMetadata(payoutRecordId, payoutRecord.barbershop_id, {
      reconciliation_status: 'requires_attention',
      metadata: {
        reversal_tracking: {
          reversed_at: new Date().toISOString(),
          reversed_amount: reversedAmount,
          requires_reprocessing: true,
          admin_action_required: true
        }
      }
    }, supabase)

    // Send reversal notification
    await sendPayoutReversalNotification({
      barberId: payoutRecord.barber_id,
      barbershopId: payoutRecord.barbershop_id,
      amount: reversedAmount,
      transferId: transfer.id,
      reversedAt: new Date().toISOString()
    })

    console.log(`🔄 Enhanced transfer reversal tracking: $${reversedAmount} reversed for payout ${payoutRecordId}`)

    return {
      success: true,
      payout_record_id: payoutRecordId,
      status_update_id: statusUpdateId,
      reversed_amount: reversedAmount
    }

  } catch (error) {
    console.error('Error in enhanced transfer reversed handler:', error)
    return { success: false, error: error.message }
  }
}

// Helper Functions

async function upsertPayoutTransactionMetadata(payoutRecordId, barbershopId, updates, supabase) {
  try {
    const { error } = await supabase
      .from('payout_transaction_metadata')
      .upsert({
        payout_record_id: payoutRecordId,
        barbershop_id: barbershopId,
        ...updates,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'payout_record_id'
      })

    if (error) {
      console.error('Error upserting payout metadata:', error)
    }
  } catch (error) {
    console.error('Error in upsert payout metadata:', error)
  }
}

function calculateEstimatedStripeFee(transferAmount) {
  // Stripe Connect transfer fees (as of 2024)
  // Standard transfers: 0.25% (capped at $5)
  const feeRate = 0.0025
  const maxFee = 500 // $5.00 in cents
  const calculatedFee = transferAmount * feeRate
  return Math.min(calculatedFee, maxFee) / 100 // Convert to dollars
}

function calculateActualStripeFee(transfer) {
  // Extract actual fee from transfer object if available
  return transfer.fees?.amount ? transfer.fees.amount / 100 : calculateEstimatedStripeFee(transfer.amount)
}

function calculateProcessingTime(createdAt, completedAt) {
  const created = new Date(createdAt)
  const completed = new Date(completedAt)
  return Math.round((completed - created) / (1000 * 60 * 60) * 100) / 100 // Hours with 2 decimal places
}

function isRetryEligible(failureCode) {
  // Determine if the failure is retryable based on Stripe failure codes
  const retryableFailures = [
    'account_closed',
    'account_frozen',
    'could_not_process',
    'bank_account_restricted',
    'debit_not_authorized',
    'insufficient_funds'
  ]
  return retryableFailures.includes(failureCode)
}

function getSuggestedAction(failureCode) {
  const actionMap = {
    'account_closed': 'Update bank account information',
    'account_frozen': 'Contact bank to resolve account freeze',
    'could_not_process': 'Retry transfer or contact support',
    'bank_account_restricted': 'Verify bank account status',
    'debit_not_authorized': 'Ensure account allows debits',
    'insufficient_funds': 'Wait for sufficient funds or use different account',
    'invalid_account_number': 'Update bank account information',
    'no_account': 'Add valid bank account'
  }
  return actionMap[failureCode] || 'Contact support for assistance'
}

async function triggerPerformanceMetricsUpdate(barbershopId, supabase) {
  try {
    // Trigger daily performance metrics calculation
    const today = new Date().toISOString().split('T')[0]
    await supabase
      .rpc('calculate_payout_performance_metrics', {
        p_barbershop_id: barbershopId,
        p_metric_date: today,
        p_metric_period: 'daily'
      })
  } catch (error) {
    console.error('Error triggering performance metrics update:', error)
  }
}

// Notification Functions (placeholders - implement with your notification system)

async function sendPayoutCompletionNotification(data) {
  try {
    console.log(`📧 Payout completion notification: $${data.amount} to barber ${data.barberId}`)
    // Implement with your notification service (email, SMS, push notification)
  } catch (error) {
    console.error('Error sending completion notification:', error)
  }
}

async function sendPayoutFailureNotification(data) {
  try {
    console.log(`🚨 Payout failure notification: ${data.failureReason} for barber ${data.barberId}`)
    // Implement with your notification service
  } catch (error) {
    console.error('Error sending failure notification:', error)
  }
}

async function sendPayoutReversalNotification(data) {
  try {
    console.log(`⚠️ Payout reversal notification: $${data.amount} for barber ${data.barberId}`)
    // Implement with your notification service
  } catch (error) {
    console.error('Error sending reversal notification:', error)
  }
}