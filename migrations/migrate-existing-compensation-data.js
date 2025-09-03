/**
 * Migration Script: Hierarchical Compensation System
 * Migrates existing compensation data to the new hierarchical system
 * - Creates shop default compensation settings
 * - Migrates existing barber compensation to override structure
 * - Preserves all existing compensation arrangements
 * - Updates foreign key references
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin operations
)

class CompensationMigrator {
  constructor() {
    this.migrationLog = []
    this.errors = []
  }

  log(message) {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${message}`
    console.log(logEntry)
    this.migrationLog.push(logEntry)
  }

  error(message, error) {
    const timestamp = new Date().toISOString()
    const errorEntry = `[${timestamp}] ERROR: ${message} - ${error?.message || error}`
    console.error(errorEntry)
    this.errors.push(errorEntry)
  }

  async runMigration() {
    this.log('Starting hierarchical compensation system migration...')
    
    try {
      // Step 1: Create shop default compensation for all barbershops
      await this.createShopDefaults()
      
      // Step 2: Migrate existing barber compensation data
      await this.migrateBarberCompensation()
      
      // Step 3: Update any missing references
      await this.updateReferences()
      
      // Step 4: Verify migration integrity
      await this.verifyMigration()
      
      this.log('Migration completed successfully!')
      return {
        success: true,
        log: this.migrationLog,
        errors: this.errors
      }
      
    } catch (error) {
      this.error('Migration failed', error)
      throw error
    }
  }

  async createShopDefaults() {
    this.log('Creating shop default compensation settings...')
    
    try {
      // Get all barbershops
      const { data: barbershops, error: shopsError } = await supabase
        .from('barbershops')
        .select('id, name')
      
      if (shopsError) throw shopsError
      
      this.log(`Found ${barbershops.length} barbershops to process`)
      
      for (const shop of barbershops) {
        // Check if defaults already exist
        const { data: existing } = await supabase
          .from('shop_compensation_defaults')
          .select('id')
          .eq('barbershop_id', shop.id)
          .single()
        
        if (existing) {
          this.log(`Shop defaults already exist for ${shop.name} (${shop.id})`)
          continue
        }
        
        // Analyze existing barber compensation to determine best defaults
        const { data: existingCompensation } = await supabase
          .from('financial_arrangements')
          .select('*')
          .eq('barbershop_id', shop.id)
        
        let defaultModel = 'commission'
        let defaultCommissionRate = 0.40
        let defaultBoothRent = 1500
        
        if (existingCompensation && existingCompensation.length > 0) {
          // Determine most common compensation model
          const modelCounts = existingCompensation.reduce((acc, comp) => {
            const model = comp.arrangement_type || 'commission'
            acc[model] = (acc[model] || 0) + 1
            return acc
          }, {})
          
          defaultModel = Object.keys(modelCounts).reduce((a, b) => 
            modelCounts[a] > modelCounts[b] ? a : b
          )
          
          // Calculate average commission rate if commission model
          if (defaultModel === 'commission') {
            const commissionRates = existingCompensation
              .filter(comp => comp.commission_rate)
              .map(comp => comp.commission_rate)
            
            if (commissionRates.length > 0) {
              defaultCommissionRate = commissionRates.reduce((sum, rate) => sum + rate, 0) / commissionRates.length
            }
          }
          
          // Get average booth rent if booth rent model
          if (defaultModel === 'booth_rent') {
            const boothRents = existingCompensation
              .filter(comp => comp.weekly_booth_rent)
              .map(comp => comp.weekly_booth_rent * 4.33) // Convert weekly to monthly
            
            if (boothRents.length > 0) {
              defaultBoothRent = boothRents.reduce((sum, rent) => sum + rent, 0) / boothRents.length
            }
          }
        }
        
        // Create shop defaults
        const { error: insertError } = await supabase
          .from('shop_compensation_defaults')
          .insert({
            barbershop_id: shop.id,
            default_model_type: defaultModel,
            default_commission_rate: defaultCommissionRate,
            default_booth_rent_amount: Math.round(defaultBoothRent),
            default_booth_rent_frequency: 'monthly',
            default_hybrid_base_rent: 800,
            default_hybrid_commission_rate: 0.20,
            default_hybrid_threshold: 3000,
            default_product_commission_rate: 0.10,
            payment_methods: ['balance', 'ach', 'card'],
            billing_cycle: 'monthly',
            payment_due_day: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        if (insertError) {
          this.error(`Failed to create defaults for ${shop.name}`, insertError)
          continue
        }
        
        this.log(`Created shop defaults for ${shop.name} - Model: ${defaultModel}`)
      }
      
    } catch (error) {
      this.error('Failed to create shop defaults', error)
      throw error
    }
  }

  async migrateBarberCompensation() {
    this.log('Migrating existing barber compensation data...')
    
    try {
      // Get all existing financial arrangements
      const { data: arrangements, error: arrangementsError } = await supabase
        .from('financial_arrangements')
        .select(`
          *,
          barbershops!barbershop_id(id, name),
          profiles!barber_id(id, full_name)
        `)
      
      if (arrangementsError) throw arrangementsError
      
      this.log(`Found ${arrangements.length} existing compensation arrangements`)
      
      for (const arrangement of arrangements) {
        // Get shop defaults to compare against
        const { data: shopDefaults } = await supabase
          .from('shop_compensation_defaults')
          .select('*')
          .eq('barbershop_id', arrangement.barbershop_id)
          .single()
        
        if (!shopDefaults) {
          this.log(`No shop defaults found for arrangement ${arrangement.id}, skipping`)
          continue
        }
        
        // Determine if this arrangement differs from shop defaults
        const isDifferentFromDefaults = this.isArrangementDifferentFromDefaults(arrangement, shopDefaults)
        
        if (!isDifferentFromDefaults) {
          this.log(`Arrangement ${arrangement.id} matches shop defaults, marking as using defaults`)
          
          // Create barber record using shop defaults
          await this.createBarberCompensationRecord(arrangement, shopDefaults, true)
        } else {
          this.log(`Arrangement ${arrangement.id} differs from defaults, creating override`)
          
          // Create barber override record
          await this.createBarberCompensationRecord(arrangement, shopDefaults, false)
        }
      }
      
    } catch (error) {
      this.error('Failed to migrate barber compensation', error)
      throw error
    }
  }

  isArrangementDifferentFromDefaults(arrangement, defaults) {
    // Compare arrangement type
    if (arrangement.arrangement_type !== defaults.default_model_type) {
      return true
    }
    
    // Compare model-specific values
    switch (arrangement.arrangement_type) {
      case 'commission':
        return Math.abs(arrangement.commission_rate - defaults.default_commission_rate) > 0.01
      
      case 'booth_rent':
        const monthlyRent = arrangement.weekly_booth_rent * 4.33
        return Math.abs(monthlyRent - defaults.default_booth_rent_amount) > 50
      
      case 'hybrid':
        return (
          Math.abs((arrangement.hybrid_base_rent || 0) - defaults.default_hybrid_base_rent) > 50 ||
          Math.abs((arrangement.hybrid_commission_rate || 0) - defaults.default_hybrid_commission_rate) > 0.01
        )
      
      default:
        return false
    }
  }

  async createBarberCompensationRecord(arrangement, shopDefaults, useDefaults) {
    try {
      const compensationData = {
        barbershop_id: arrangement.barbershop_id,
        barber_id: arrangement.barber_id,
        use_shop_defaults: useDefaults,
        compensation_source: useDefaults ? 'shop_default' : 'full_override',
        model_type: arrangement.arrangement_type || shopDefaults.default_model_type,
        commission_rate: arrangement.commission_rate || shopDefaults.default_commission_rate,
        booth_rent_amount: arrangement.weekly_booth_rent ? 
          Math.round(arrangement.weekly_booth_rent * 4.33) : 
          shopDefaults.default_booth_rent_amount,
        booth_rent_frequency: 'monthly',
        hybrid_base_rent: arrangement.hybrid_base_rent || shopDefaults.default_hybrid_base_rent,
        hybrid_commission_rate: arrangement.hybrid_commission_rate || shopDefaults.default_hybrid_commission_rate,
        hybrid_threshold: arrangement.hybrid_threshold || shopDefaults.default_hybrid_threshold,
        product_commission_rate: arrangement.product_commission_rate || shopDefaults.default_product_commission_rate,
        payment_methods: shopDefaults.payment_methods,
        billing_cycle: shopDefaults.billing_cycle,
        payment_due_day: shopDefaults.payment_due_day,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      // Add override-specific fields if not using defaults
      if (!useDefaults) {
        compensationData.override_reason = `Migrated from existing ${arrangement.arrangement_type} arrangement`
        compensationData.effective_start_date = arrangement.created_at || new Date().toISOString()
        compensationData.requires_approval = false // Pre-existing arrangements are pre-approved
        compensationData.approved_at = new Date().toISOString()
        compensationData.approved_by = 'system_migration'
      }
      
      // Check if record already exists
      const { data: existing } = await supabase
        .from('barber_compensation_overrides')
        .select('id')
        .eq('barber_id', arrangement.barber_id)
        .single()
      
      if (existing) {
        this.log(`Compensation record already exists for barber ${arrangement.barber_id}`)
        return
      }
      
      const { error } = await supabase
        .from('barber_compensation_overrides')
        .insert(compensationData)
      
      if (error) {
        this.error(`Failed to create compensation record for barber ${arrangement.barber_id}`, error)
        return
      }
      
      const barberName = arrangement.profiles?.full_name || 'Unknown'
      this.log(`Created compensation record for ${barberName} - ${useDefaults ? 'using defaults' : 'custom override'}`)
      
    } catch (error) {
      this.error(`Failed to create barber compensation record`, error)
    }
  }

  async updateReferences() {
    this.log('Updating foreign key references...')
    
    try {
      // Update any existing payment records to reference the new system
      const { error: paymentsError } = await supabase.rpc('update_compensation_references')
      
      if (paymentsError && !paymentsError.message.includes('function')) {
        throw paymentsError
      }
      
      this.log('Reference updates completed')
      
    } catch (error) {
      this.error('Failed to update references', error)
      // Non-critical error, continue
    }
  }

  async verifyMigration() {
    this.log('Verifying migration integrity...')
    
    try {
      // Count original arrangements vs new compensation records
      const { count: originalCount } = await supabase
        .from('financial_arrangements')
        .select('*', { count: 'exact', head: true })
      
      const { count: newCount } = await supabase
        .from('barber_compensation_overrides')
        .select('*', { count: 'exact', head: true })
      
      const { count: shopDefaultsCount } = await supabase
        .from('shop_compensation_defaults')
        .select('*', { count: 'exact', head: true })
      
      this.log(`Migration verification:`)
      this.log(`- Original financial arrangements: ${originalCount}`)
      this.log(`- New compensation records: ${newCount}`)
      this.log(`- Shop defaults created: ${shopDefaultsCount}`)
      
      if (newCount < originalCount) {
        this.error('Migration incomplete: fewer compensation records than original arrangements')
      } else {
        this.log('Migration verification passed')
      }
      
    } catch (error) {
      this.error('Migration verification failed', error)
    }
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      success: this.errors.length === 0,
      totalLogs: this.migrationLog.length,
      totalErrors: this.errors.length,
      migrationLog: this.migrationLog,
      errors: this.errors
    }
    
    // Save report to file
    const fs = await import('fs/promises')
    const reportPath = `./compensation-migration-report-${Date.now()}.json`
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
    
    this.log(`Migration report saved to ${reportPath}`)
    return report
  }
}

// CLI execution
async function runMigration() {
  console.log('🔄 Starting Hierarchical Compensation Migration...')
  
  const migrator = new CompensationMigrator()
  
  try {
    await migrator.runMigration()
    const report = await migrator.generateReport()
    
    console.log('\n✅ Migration completed successfully!')
    console.log(`📊 Total operations: ${report.totalLogs}`)
    console.log(`❌ Errors encountered: ${report.totalErrors}`)
    
    if (report.errors.length > 0) {
      console.log('\n⚠️  Errors:')
      report.errors.forEach(error => console.log(`   ${error}`))
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    process.exit(1)
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
}

export { CompensationMigrator, runMigration }
export default CompensationMigrator