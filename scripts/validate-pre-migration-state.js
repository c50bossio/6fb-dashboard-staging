#!/usr/bin/env node

/**
 * Pre-Migration Validation Script
 *
 * This script validates the current database state BEFORE running the
 * shop_id to barbershop_id migration. It checks:
 *
 * 1. Current data distribution across shop_id and barbershop_id columns
 * 2. Identifies data conflicts (rows with different values in both columns)
 * 3. Validates foreign key relationships
 * 4. Checks for orphaned records
 * 5. Estimates migration scope and risk level
 *
 * Run this BEFORE executing the migration SQL script.
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(title) {
  log('\n' + '='.repeat(80), 'cyan');
  log(title, 'bright');
  log('='.repeat(80), 'cyan');
}

function section(title) {
  log('\n' + title, 'blue');
  log('-'.repeat(80), 'blue');
}

/**
 * Analyze profiles table - CRITICAL
 */
async function analyzeProfiles() {
  section('PROFILES TABLE (CRITICAL)');

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, role, shop_id, barbershop_id');

  if (error) {
    log(`ERROR: ${error.message}`, 'red');
    return { error: true };
  }

  const stats = {
    total: profiles.length,
    hasShopIdOnly: 0,
    hasBarbershopIdOnly: 0,
    hasBoth: 0,
    hasNeither: 0,
    conflicts: 0, // Different values in both columns
    shopStaff: 0,
  };

  const conflicts = [];

  profiles.forEach(profile => {
    const hasShopId = profile.shop_id !== null;
    const hasBarbershopId = profile.barbershop_id !== null;

    if (profile.role !== 'CLIENT') {
      stats.shopStaff++;
    }

    if (hasShopId && hasBarbershopId) {
      stats.hasBoth++;
      if (profile.shop_id !== profile.barbershop_id) {
        stats.conflicts++;
        conflicts.push({
          email: profile.email,
          role: profile.role,
          shop_id: profile.shop_id,
          barbershop_id: profile.barbershop_id
        });
      }
    } else if (hasShopId) {
      stats.hasShopIdOnly++;
    } else if (hasBarbershopId) {
      stats.hasBarbershopIdOnly++;
    } else {
      stats.hasNeither++;
    }
  });

  log(`Total profiles: ${stats.total}`, 'cyan');
  log(`Shop staff (BARBER/SHOP_OWNER/ENTERPRISE_OWNER): ${stats.shopStaff}`, 'cyan');
  log('');
  log(`Profiles with ONLY shop_id: ${stats.hasShopIdOnly}`, stats.hasShopIdOnly > 0 ? 'yellow' : 'green');
  log(`Profiles with ONLY barbershop_id: ${stats.hasBarbershopIdOnly}`, 'green');
  log(`Profiles with BOTH columns: ${stats.hasBoth}`, stats.hasBoth > 0 ? 'yellow' : 'green');
  log(`Profiles with NEITHER: ${stats.hasNeither}`, stats.hasNeither > 0 ? 'yellow' : 'green');
  log('');

  if (stats.conflicts > 0) {
    log(`⚠️  WARNING: ${stats.conflicts} profiles have DIFFERENT values in shop_id vs barbershop_id`, 'red');
    log('These conflicts need resolution:', 'yellow');
    conflicts.forEach(c => {
      log(`  - ${c.email} (${c.role}): shop_id=${c.shop_id}, barbershop_id=${c.barbershop_id}`, 'yellow');
    });
  } else {
    log('✅ No conflicts found (all profiles with both columns have matching values)', 'green');
  }

  return { stats, conflicts };
}

/**
 * Analyze services table
 */
async function analyzeServices() {
  section('SERVICES TABLE');

  const { data: services, error } = await supabase
    .from('services')
    .select('id, name, shop_id, barbershop_id');

  if (error) {
    log(`ERROR: ${error.message}`, 'red');
    return { error: true };
  }

  const stats = {
    total: services.length,
    hasShopIdOnly: 0,
    hasBarbershopIdOnly: 0,
    hasBoth: 0,
    hasNeither: 0,
    conflicts: 0,
  };

  const conflicts = [];

  services.forEach(service => {
    const hasShopId = service.shop_id !== null;
    const hasBarbershopId = service.barbershop_id !== null;

    if (hasShopId && hasBarbershopId) {
      stats.hasBoth++;
      if (service.shop_id !== service.barbershop_id) {
        stats.conflicts++;
        conflicts.push({
          name: service.name,
          shop_id: service.shop_id,
          barbershop_id: service.barbershop_id
        });
      }
    } else if (hasShopId) {
      stats.hasShopIdOnly++;
    } else if (hasBarbershopId) {
      stats.hasBarbershopIdOnly++;
    } else {
      stats.hasNeither++;
    }
  });

  log(`Total services: ${stats.total}`, 'cyan');
  log(`Services with ONLY shop_id: ${stats.hasShopIdOnly}`, stats.hasShopIdOnly > 0 ? 'yellow' : 'green');
  log(`Services with ONLY barbershop_id: ${stats.hasBarbershopIdOnly}`, 'green');
  log(`Services with BOTH columns: ${stats.hasBoth}`, stats.hasBoth > 0 ? 'yellow' : 'green');
  log(`Services with NEITHER: ${stats.hasNeither}`, stats.hasNeither > 0 ? 'red' : 'green');

  if (stats.conflicts > 0) {
    log(`⚠️  WARNING: ${stats.conflicts} services have conflicting IDs`, 'red');
    conflicts.forEach(c => {
      log(`  - ${c.name}: shop_id=${c.shop_id}, barbershop_id=${c.barbershop_id}`, 'yellow');
    });
  }

  if (stats.hasBarbershopIdOnly === stats.total) {
    log('✅ MIGRATION COMPLETE: All services already have barbershop_id', 'green');
  }

  return { stats, conflicts };
}

/**
 * Analyze customers table
 */
async function analyzeCustomers() {
  section('CUSTOMERS TABLE');

  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, full_name, email, shop_id, barbershop_id');

  if (error) {
    log(`ERROR: ${error.message}`, 'red');
    return { error: true, stats: { total: 0, hasShopIdOnly: 0, hasBarbershopIdOnly: 0, hasBoth: 0, hasNeither: 0, conflicts: 0 }, orphaned: [] };
  }

  const stats = {
    total: customers.length,
    hasShopIdOnly: 0,
    hasBarbershopIdOnly: 0,
    hasBoth: 0,
    hasNeither: 0,
    conflicts: 0,
  };

  const orphaned = [];

  customers.forEach(customer => {
    const hasShopId = customer.shop_id !== null;
    const hasBarbershopId = customer.barbershop_id !== null;

    if (hasShopId && hasBarbershopId) {
      stats.hasBoth++;
      if (customer.shop_id !== customer.barbershop_id) {
        stats.conflicts++;
      }
    } else if (hasShopId) {
      stats.hasShopIdOnly++;
    } else if (hasBarbershopId) {
      stats.hasBarbershopIdOnly++;
    } else {
      stats.hasNeither++;
      orphaned.push({
        name: customer.full_name || 'Unknown',
        email: customer.email,
        id: customer.id
      });
    }
  });

  log(`Total customers: ${stats.total}`, 'cyan');
  log(`Customers with ONLY shop_id: ${stats.hasShopIdOnly}`, stats.hasShopIdOnly > 0 ? 'yellow' : 'green');
  log(`Customers with ONLY barbershop_id: ${stats.hasBarbershopIdOnly}`, 'green');
  log(`Customers with BOTH columns: ${stats.hasBoth}`, stats.hasBoth > 0 ? 'yellow' : 'green');
  log(`Customers with NEITHER (orphaned): ${stats.hasNeither}`, stats.hasNeither > 0 ? 'red' : 'green');

  if (stats.hasShopIdOnly === 0 && stats.hasBarbershopIdOnly > 0) {
    log('✅ MIGRATION COMPLETE: All customers use barbershop_id (shop_id is empty)', 'green');
  }

  if (orphaned.length > 0) {
    log(`\n⚠️  ${orphaned.length} orphaned customers (no barbershop assignment):`, 'yellow');
    orphaned.slice(0, 5).forEach(c => {
      log(`  - ${c.name || 'Unknown'} (${c.email || 'no email'})`, 'yellow');
    });
    if (orphaned.length > 5) {
      log(`  ... and ${orphaned.length - 5} more`, 'yellow');
    }
  }

  return { stats, orphaned };
}

/**
 * Check for foreign key integrity issues
 */
async function checkForeignKeys() {
  section('FOREIGN KEY INTEGRITY CHECK');

  // Check if all barbershop_id values reference valid barbershops
  const { data: barbershops, error: bbError } = await supabase
    .from('barbershops')
    .select('id');

  if (bbError) {
    log(`ERROR fetching barbershops: ${bbError.message}`, 'red');
    return { error: true };
  }

  const validBarbershopIds = new Set(barbershops.map(b => b.id));
  log(`Found ${validBarbershopIds.size} valid barbershops in database`, 'cyan');

  // Check profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, barbershop_id')
    .not('barbershop_id', 'is', null);

  const invalidProfileRefs = profiles.filter(p => !validBarbershopIds.has(p.barbershop_id));

  if (invalidProfileRefs.length > 0) {
    log(`❌ ${invalidProfileRefs.length} profiles reference non-existent barbershops`, 'red');
    invalidProfileRefs.slice(0, 5).forEach(p => {
      log(`  - ${p.email}: barbershop_id=${p.barbershop_id}`, 'yellow');
    });
  } else {
    log('✅ All profiles reference valid barbershops', 'green');
  }

  // Check services
  const { data: services } = await supabase
    .from('services')
    .select('id, name, barbershop_id')
    .not('barbershop_id', 'is', null);

  const invalidServiceRefs = services.filter(s => !validBarbershopIds.has(s.barbershop_id));

  if (invalidServiceRefs.length > 0) {
    log(`❌ ${invalidServiceRefs.length} services reference non-existent barbershops`, 'red');
  } else {
    log('✅ All services reference valid barbershops', 'green');
  }

  return {
    validBarbershops: validBarbershopIds.size,
    invalidProfiles: invalidProfileRefs.length,
    invalidServices: invalidServiceRefs.length
  };
}

/**
 * Generate migration recommendation
 */
function generateRecommendation(results) {
  header('MIGRATION RECOMMENDATION');

  const { profiles, services, customers, foreignKeys } = results;

  // Handle errors in results
  if (!profiles || !services || !customers || !foreignKeys) {
    log('ERROR: Incomplete analysis results', 'red');
    return { riskLevel: 'HIGH', canProceed: false, issues: ['Analysis incomplete'], warnings: [] };
  }

  let riskLevel = 'LOW';
  let canProceed = true;
  const issues = [];
  const warnings = [];

  // Check profiles
  if (profiles.stats.hasShopIdOnly > 0) {
    warnings.push(`${profiles.stats.hasShopIdOnly} profiles need shop_id → barbershop_id migration`);
  }

  if (profiles.conflicts.length > 0) {
    issues.push(`${profiles.conflicts.length} profiles have conflicting shop_id vs barbershop_id values`);
    riskLevel = 'HIGH';
  }

  // Check services
  if (services.stats.hasNeither > 0) {
    issues.push(`${services.stats.hasNeither} services have NO barbershop assignment`);
    riskLevel = 'HIGH';
    canProceed = false;
  }

  // Check customers
  if (customers.orphaned.length > 5) {
    warnings.push(`${customers.orphaned.length} orphaned customers need barbershop assignment`);
  }

  // Check foreign keys
  if (foreignKeys.invalidProfiles > 0 || foreignKeys.invalidServices > 0) {
    issues.push(`Foreign key integrity issues detected`);
    riskLevel = 'HIGH';
    canProceed = false;
  }

  // Display risk assessment
  const riskColor = riskLevel === 'LOW' ? 'green' : riskLevel === 'MEDIUM' ? 'yellow' : 'red';
  log(`\nRISK LEVEL: ${riskLevel}`, riskColor);

  if (issues.length > 0) {
    log('\n❌ BLOCKING ISSUES:', 'red');
    issues.forEach(issue => log(`  - ${issue}`, 'red'));
  }

  if (warnings.length > 0) {
    log('\n⚠️  WARNINGS:', 'yellow');
    warnings.forEach(warning => log(`  - ${warning}`, 'yellow'));
  }

  log('\n' + '='.repeat(80), 'cyan');

  if (canProceed) {
    log('✅ SAFE TO PROCEED WITH MIGRATION', 'green');
    log('\nNext Steps:', 'bright');
    log('1. Review the migration script: /database/migrations/shop_id_to_barbershop_id_migration.sql', 'cyan');
    log('2. Run the migration in TEST MODE first (ROLLBACK enabled by default)', 'cyan');
    log('3. Verify results match expectations', 'cyan');
    log('4. Change ROLLBACK to COMMIT in the script', 'cyan');
    log('5. Run migration for real', 'cyan');
    log('6. Run post-migration validation', 'cyan');
  } else {
    log('❌ DO NOT RUN MIGRATION YET', 'red');
    log('\nRequired Actions:', 'bright');
    log('1. Fix blocking issues listed above', 'yellow');
    log('2. Re-run this validation script', 'yellow');
    log('3. Only proceed when all checks pass', 'yellow');
  }

  log('='.repeat(80) + '\n', 'cyan');

  return { riskLevel, canProceed, issues, warnings };
}

/**
 * Main execution
 */
async function main() {
  header('PRE-MIGRATION VALIDATION REPORT');
  log('Generated: ' + new Date().toISOString(), 'cyan');
  log('Database: ' + supabaseUrl, 'cyan');

  const results = {};

  // Run all analyses
  results.profiles = await analyzeProfiles();
  results.services = await analyzeServices();
  results.customers = await analyzeCustomers();
  results.foreignKeys = await checkForeignKeys();

  // Generate recommendation
  const recommendation = generateRecommendation(results);

  // Exit with appropriate code
  process.exit(recommendation.canProceed ? 0 : 1);
}

main().catch(error => {
  log(`\n❌ FATAL ERROR: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
