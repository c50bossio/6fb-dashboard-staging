#!/usr/bin/env node

/**
 * Transaction Data Verification Script
 *
 * Verifies that transaction seeding was successful and data integrity is maintained.
 * Runs comprehensive checks on transaction records and financial calculations.
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Format currency
 */
function formatCurrency(amount) {
  return `$${parseFloat(amount || 0).toFixed(2)}`;
}

/**
 * Run verification checks
 */
async function verifyTransactionData() {
  console.log('🔍 TRANSACTION DATA VERIFICATION\n');
  console.log('=' .repeat(70));

  const checks = {
    passed: 0,
    failed: 0,
    warnings: 0
  };

  try {
    // Check 1: Count total transactions
    console.log('\n✓ CHECK 1: Total Transaction Count');
    const { data: allTx, error: txError } = await supabase
      .from('transactions')
      .select('*');

    if (txError) {
      console.error('  ❌ FAILED:', txError.message);
      checks.failed++;
    } else {
      console.log(`  ✅ PASSED: Found ${allTx.length} total transactions`);
      checks.passed++;
    }

    // Check 2: Verify all completed appointments have transactions
    console.log('\n✓ CHECK 2: Completed Appointments Coverage');
    const { data: completedAppts } = await supabase
      .from('appointments')
      .select('id')
      .eq('status', 'COMPLETED');

    const { data: txWithAppts } = await supabase
      .from('transactions')
      .select('appointment_id');

    const txAppointmentIds = new Set(txWithAppts.map(tx => tx.appointment_id));
    const missingTxCount = completedAppts.filter(
      appt => !txAppointmentIds.has(appt.id)
    ).length;

    if (missingTxCount === 0) {
      console.log(`  ✅ PASSED: All ${completedAppts.length} completed appointments have transactions`);
      checks.passed++;
    } else {
      console.log(`  ⚠️  WARNING: ${missingTxCount} completed appointments missing transactions`);
      checks.warnings++;
    }

    // Check 3: Verify no duplicate transactions
    console.log('\n✓ CHECK 3: No Duplicate Transactions');
    const appointmentIdCounts = {};
    txWithAppts.forEach(tx => {
      appointmentIdCounts[tx.appointment_id] = (appointmentIdCounts[tx.appointment_id] || 0) + 1;
    });

    const duplicates = Object.entries(appointmentIdCounts)
      .filter(([_, count]) => count > 1);

    if (duplicates.length === 0) {
      console.log('  ✅ PASSED: No duplicate transactions found');
      checks.passed++;
    } else {
      console.log(`  ❌ FAILED: Found ${duplicates.length} appointments with multiple transactions`);
      checks.failed++;
    }

    // Check 4: Validate metadata structure
    console.log('\n✓ CHECK 4: Transaction Metadata Integrity');
    let validMetadata = 0;
    let invalidMetadata = 0;

    allTx.forEach(tx => {
      try {
        const metadata = JSON.parse(tx.description || '{}');
        if (
          typeof metadata.commission_rate === 'number' &&
          typeof metadata.commission_amount === 'number' &&
          typeof metadata.tip_amount === 'number' &&
          metadata.barbershop_id &&
          metadata.barber_id
        ) {
          validMetadata++;
        } else {
          invalidMetadata++;
        }
      } catch (e) {
        invalidMetadata++;
      }
    });

    if (invalidMetadata === 0) {
      console.log(`  ✅ PASSED: All ${validMetadata} transactions have valid metadata`);
      checks.passed++;
    } else {
      console.log(`  ⚠️  WARNING: ${invalidMetadata} transactions have invalid metadata`);
      console.log(`     Valid: ${validMetadata}, Invalid: ${invalidMetadata}`);
      checks.warnings++;
    }

    // Check 5: Payment method distribution
    console.log('\n✓ CHECK 5: Payment Method Distribution');
    const paymentMethods = {
      CARD: 0,
      DIGITAL_WALLET: 0,
      CASH: 0,
      OTHER: 0
    };

    allTx.forEach(tx => {
      const method = tx.payment_method?.toUpperCase();
      if (paymentMethods[method] !== undefined) {
        paymentMethods[method]++;
      } else {
        paymentMethods.OTHER++;
      }
    });

    const hasAllMethods = paymentMethods.CARD > 0 &&
                          paymentMethods.DIGITAL_WALLET > 0 &&
                          paymentMethods.CASH > 0;

    if (hasAllMethods && paymentMethods.OTHER === 0) {
      console.log('  ✅ PASSED: Valid payment method distribution');
      console.log(`     CARD: ${paymentMethods.CARD} (${((paymentMethods.CARD / allTx.length) * 100).toFixed(1)}%)`);
      console.log(`     DIGITAL_WALLET: ${paymentMethods.DIGITAL_WALLET} (${((paymentMethods.DIGITAL_WALLET / allTx.length) * 100).toFixed(1)}%)`);
      console.log(`     CASH: ${paymentMethods.CASH} (${((paymentMethods.CASH / allTx.length) * 100).toFixed(1)}%)`);
      checks.passed++;
    } else {
      console.log('  ⚠️  WARNING: Unexpected payment method distribution');
      console.log(`     OTHER: ${paymentMethods.OTHER}`);
      checks.warnings++;
    }

    // Check 6: Financial calculations consistency
    console.log('\n✓ CHECK 6: Financial Calculations Consistency');
    let totalRevenue = 0;
    let totalTips = 0;
    let totalCommissions = 0;
    let calculationErrors = 0;

    allTx.forEach(tx => {
      try {
        const metadata = JSON.parse(tx.description || '{}');
        const tipAmount = metadata.tip_amount || 0;
        const commissionAmount = metadata.commission_amount || 0;
        const serviceAmount = tx.amount - tipAmount;

        // Verify commission calculation
        const expectedCommission = serviceAmount * (metadata.commission_rate || 0);
        const commissionDiff = Math.abs(expectedCommission - commissionAmount);

        if (commissionDiff > 0.01) {
          calculationErrors++;
        }

        totalRevenue += serviceAmount;
        totalTips += tipAmount;
        totalCommissions += commissionAmount;
      } catch (e) {
        calculationErrors++;
      }
    });

    if (calculationErrors === 0) {
      console.log('  ✅ PASSED: All financial calculations are consistent');
      console.log(`     Total Service Revenue: ${formatCurrency(totalRevenue)}`);
      console.log(`     Total Tips: ${formatCurrency(totalTips)}`);
      console.log(`     Total Commissions: ${formatCurrency(totalCommissions)}`);
      console.log(`     Total Shop Revenue: ${formatCurrency(totalRevenue - totalCommissions)}`);
      checks.passed++;
    } else {
      console.log(`  ❌ FAILED: Found ${calculationErrors} calculation errors`);
      checks.failed++;
    }

    // Check 7: Commission rate validation
    console.log('\n✓ CHECK 7: Commission Rate Validation');
    const commissionRates = {};

    allTx.forEach(tx => {
      try {
        const metadata = JSON.parse(tx.description || '{}');
        const rate = (metadata.commission_rate * 100).toFixed(0);
        commissionRates[rate] = (commissionRates[rate] || 0) + 1;
      } catch (e) {}
    });

    const validRates = ['55', '60', '65'];
    const hasOnlyValidRates = Object.keys(commissionRates)
      .every(rate => validRates.includes(rate));

    if (hasOnlyValidRates) {
      console.log('  ✅ PASSED: All commission rates are valid');
      Object.entries(commissionRates).forEach(([rate, count]) => {
        console.log(`     ${rate}%: ${count} transactions`);
      });
      checks.passed++;
    } else {
      console.log('  ⚠️  WARNING: Found unexpected commission rates');
      Object.entries(commissionRates).forEach(([rate, count]) => {
        console.log(`     ${rate}%: ${count} transactions`);
      });
      checks.warnings++;
    }

    // Check 8: Date consistency
    console.log('\n✓ CHECK 8: Transaction Date Consistency');
    const { data: txWithDates } = await supabase
      .from('transactions')
      .select(`
        created_at,
        appointments (
          scheduled_at
        )
      `);

    let dateMatches = 0;
    let dateMismatches = 0;

    txWithDates.forEach(tx => {
      if (tx.appointments?.scheduled_at) {
        const txDate = new Date(tx.created_at).toISOString().split('T')[0];
        const apptDate = new Date(tx.appointments.scheduled_at).toISOString().split('T')[0];

        if (txDate === apptDate) {
          dateMatches++;
        } else {
          dateMismatches++;
        }
      }
    });

    if (dateMismatches === 0) {
      console.log(`  ✅ PASSED: All ${dateMatches} transaction dates match appointment dates`);
      checks.passed++;
    } else {
      console.log(`  ⚠️  WARNING: ${dateMismatches} transactions have date mismatches`);
      console.log(`     Matches: ${dateMatches}, Mismatches: ${dateMismatches}`);
      checks.warnings++;
    }

    // Summary
    console.log('\n' + '=' .repeat(70));
    console.log('\n📊 VERIFICATION SUMMARY:\n');
    console.log(`  ✅ Passed: ${checks.passed}`);
    console.log(`  ⚠️  Warnings: ${checks.warnings}`);
    console.log(`  ❌ Failed: ${checks.failed}`);

    if (checks.failed === 0 && checks.warnings === 0) {
      console.log('\n🎉 ALL CHECKS PASSED! Transaction data is fully validated.\n');
    } else if (checks.failed === 0) {
      console.log('\n✅ VERIFICATION COMPLETE with minor warnings (acceptable).\n');
    } else {
      console.log('\n❌ VERIFICATION FAILED - Please review errors above.\n');
    }

    console.log('=' .repeat(70));

  } catch (error) {
    console.error('\n❌ Verification error:', error);
    process.exit(1);
  }
}

// Run verification
verifyTransactionData()
  .then(() => {
    console.log('✅ Verification complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
