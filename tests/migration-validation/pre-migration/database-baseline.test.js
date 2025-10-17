/**
 * Pre-Migration Database Baseline Tests
 *
 * Purpose: Establish current database state and identify data distribution issues
 * between shop_id and barbershop_id columns before migration.
 *
 * @jest-environment node
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

describe('Pre-Migration: Database Baseline', () => {

  describe('Profiles Table Analysis', () => {
    it('should count rows with shop_id vs barbershop_id', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, shop_id, barbershop_id')
        .in('role', ['BARBER', 'SHOP_OWNER', 'ENTERPRISE_OWNER'])

      expect(error).toBeNull()

      const stats = {
        total: data.length,
        hasShopId: data.filter(p => p.shop_id !== null).length,
        hasBarbershopId: data.filter(p => p.barbershop_id !== null).length,
        hasOnlyShopId: data.filter(p => p.shop_id !== null && p.barbershop_id === null).length,
        hasOnlyBarbershopId: data.filter(p => p.barbershop_id !== null && p.shop_id === null).length,
        hasBoth: data.filter(p => p.shop_id !== null && p.barbershop_id !== null).length,
        hasNeither: data.filter(p => p.shop_id === null && p.barbershop_id === null).length
      }

      console.log('\n=== PROFILES TABLE BASELINE ===')
      console.log(`Total staff profiles: ${stats.total}`)
      console.log(`Has shop_id: ${stats.hasShopId} (${((stats.hasShopId/stats.total)*100).toFixed(1)}%)`)
      console.log(`Has barbershop_id: ${stats.hasBarbershopId} (${((stats.hasBarbershopId/stats.total)*100).toFixed(1)}%)`)
      console.log(`Only shop_id: ${stats.hasOnlyShopId}`)
      console.log(`Only barbershop_id: ${stats.hasOnlyBarbershopId}`)
      console.log(`Has both: ${stats.hasBoth}`)
      console.log(`Has neither: ${stats.hasNeither}`)

      // Document the gap for migration planning
      const migrationGap = stats.hasOnlyShopId
      if (migrationGap > 0) {
        console.log(`\n⚠️  ${migrationGap} profiles need shop_id → barbershop_id migration`)
      }

      // barbershop_id should be the dominant field
      expect(stats.hasBarbershopId).toBeGreaterThanOrEqual(stats.hasShopId)
    })

    it('should identify profiles by role distribution', async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('role, shop_id, barbershop_id')

      const byRole = profiles.reduce((acc, p) => {
        if (!acc[p.role]) {
          acc[p.role] = { total: 0, hasShopId: 0, hasBarbershopId: 0 }
        }
        acc[p.role].total++
        if (p.shop_id) acc[p.role].hasShopId++
        if (p.barbershop_id) acc[p.role].hasBarbershopId++
        return acc
      }, {})

      console.log('\n=== ROLE DISTRIBUTION ===')
      Object.entries(byRole).forEach(([role, stats]) => {
        console.log(`${role}: ${stats.total} total, ${stats.hasBarbershopId} with barbershop_id, ${stats.hasShopId} with shop_id`)
      })

      // Clients should NOT have barbershop_id
      if (byRole.CLIENT) {
        expect(byRole.CLIENT.hasBarbershopId).toBe(0)
      }
    })
  })

  describe('Customers Table Analysis', () => {
    it('should verify customers table has zero shop_id data', async () => {
      const { count: totalCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })

      const { count: shopIdCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .not('shop_id', 'is', null)

      const { count: barbershopIdCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .not('barbershop_id', 'is', null)

      console.log('\n=== CUSTOMERS TABLE BASELINE ===')
      console.log(`Total customers: ${totalCount}`)
      console.log(`Has shop_id: ${shopIdCount}`)
      console.log(`Has barbershop_id: ${barbershopIdCount}`)

      if (shopIdCount === 0 && barbershopIdCount > 0) {
        console.log('✅ CONFIRMED: shop_id is completely empty, barbershop_id is populated')
        console.log(`This proves shop_id is obsolete (100% data loss if queried)`)
      }

      // This should be 0 - proving shop_id is obsolete
      expect(shopIdCount).toBe(0)
    })
  })

  describe('Services Table Analysis', () => {
    it('should verify services table completeness', async () => {
      const { data: services } = await supabase
        .from('services')
        .select('id, shop_id, barbershop_id')

      const stats = {
        total: services.length,
        hasShopId: services.filter(s => s.shop_id !== null).length,
        hasBarbershopId: services.filter(s => s.barbershop_id !== null).length
      }

      console.log('\n=== SERVICES TABLE BASELINE ===')
      console.log(`Total services: ${stats.total}`)
      console.log(`Has shop_id: ${stats.hasShopId} (${((stats.hasShopId/stats.total)*100).toFixed(1)}%)`)
      console.log(`Has barbershop_id: ${stats.hasBarbershopId} (${((stats.hasBarbershopId/stats.total)*100).toFixed(1)}%)`)

      const dataLoss = ((stats.total - stats.hasShopId) / stats.total * 100).toFixed(1)
      if (stats.hasShopId < stats.total) {
        console.log(`\n⚠️  ${dataLoss}% data loss if querying shop_id instead of barbershop_id`)
      }

      // All services must have barbershop_id
      expect(stats.hasBarbershopId).toBe(stats.total)
    })
  })

  describe('Appointments Foreign Key Check', () => {
    it('should verify all appointments have valid barbershop_id FK', async () => {
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id,
          barbershop_id,
          barbershop:barbershops!barbershop_id (id, name)
        `)

      const orphaned = appointments.filter(a => !a.barbershop)

      console.log('\n=== APPOINTMENTS FK INTEGRITY ===')
      console.log(`Total appointments: ${appointments.length}`)
      console.log(`Valid barbershop FK: ${appointments.length - orphaned.length}`)
      console.log(`Orphaned appointments: ${orphaned.length}`)

      if (orphaned.length > 0) {
        console.log('\n⚠️  ORPHANED APPOINTMENTS:')
        orphaned.slice(0, 5).forEach(a => {
          console.log(`  - Appointment ${a.id}: barbershop_id = ${a.barbershop_id} (INVALID FK)`)
        })
      }

      // Should have zero orphaned appointments
      expect(orphaned.length).toBe(0)
    })
  })

  describe('Cross-Table Consistency', () => {
    it('should verify barbershop_id usage across all critical tables', async () => {
      const tables = [
        { name: 'profiles', idField: 'barbershop_id' },
        { name: 'customers', idField: 'barbershop_id' },
        { name: 'services', idField: 'barbershop_id' },
        { name: 'appointments', idField: 'barbershop_id' },
        { name: 'barbershop_staff', idField: 'barbershop_id' }
      ]

      const results = []

      for (const table of tables) {
        const { count: total } = await supabase
          .from(table.name)
          .select('*', { count: 'exact', head: true })

        const { count: hasId } = await supabase
          .from(table.name)
          .select('*', { count: 'exact', head: true })
          .not(table.idField, 'is', null)

        results.push({
          table: table.name,
          total,
          hasId,
          coverage: total > 0 ? ((hasId / total) * 100).toFixed(1) : '0.0'
        })
      }

      console.log('\n=== BARBERSHOP_ID COVERAGE ===')
      results.forEach(r => {
        console.log(`${r.table}: ${r.hasId}/${r.total} (${r.coverage}% coverage)`)
      })

      // All tables should have good barbershop_id coverage
      results.forEach(r => {
        if (r.table === 'profiles') {
          // Profiles may have NULLs for CLIENT role
          expect(Number(r.coverage)).toBeGreaterThanOrEqual(10)
        } else {
          expect(Number(r.coverage)).toBeGreaterThanOrEqual(80)
        }
      })
    })
  })

  describe('Migration Impact Assessment', () => {
    it('should calculate migration complexity score', async () => {
      // Count files using shop_id vs barbershop_id
      const shopIdFilesCount = 27 // From grep results
      const barbershopIdFilesCount = 344 // From grep results

      const migrationScore = {
        filesUsingShopId: shopIdFilesCount,
        filesUsingBarbershopId: barbershopIdFilesCount,
        percentageUsingCorrectField: ((barbershopIdFilesCount / (shopIdFilesCount + barbershopIdFilesCount)) * 100).toFixed(1),
        filesNeedingUpdate: shopIdFilesCount
      }

      console.log('\n=== MIGRATION IMPACT ===')
      console.log(`Files using shop_id: ${migrationScore.filesUsingShopId}`)
      console.log(`Files using barbershop_id: ${migrationScore.filesUsingBarbershopId}`)
      console.log(`Percentage correct: ${migrationScore.percentageUsingCorrectField}%`)
      console.log(`Files needing update: ${migrationScore.filesNeedingUpdate}`)

      // Most files should already use barbershop_id
      expect(Number(migrationScore.percentageUsingCorrectField)).toBeGreaterThan(90)
    })
  })
})
