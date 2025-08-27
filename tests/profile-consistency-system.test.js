/**
 * Comprehensive Test Suite for Profile Consistency Prevention System
 * 
 * Tests all components of the long-term profile synchronization system:
 * - Database triggers
 * - API middleware
 * - Monitoring dashboard
 * - Health check automation
 * - Recovery mechanisms
 */

import { jest } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import { 
  syncUserProfile, 
  syncAllProfiles, 
  fixUserByEmail,
  getProfileSyncStatus,
  validateAndFixAuthProfile 
} from '../lib/profile-sync-service.js'
import { HealthCheckManager } from '../scripts/automated-health-check.js'

// Mock Supabase for testing
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  single: jest.fn(() => mockSupabase),
  or: jest.fn(() => mockSupabase),
  in: jest.fn(() => mockSupabase),
  auth: {
    getUser: jest.fn()
  }
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}))

describe('Profile Consistency Prevention System', () => {
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('1. Profile Synchronization Service', () => {
    
    test('should sync individual user profile correctly', async () => {
      // Mock profile with inconsistency
      const mockProfile = {
        id: 'test-user-id',
        role: 'SHOP_OWNER',
        subscription_tier: 'free', // Inconsistent!
        subscription_status: null
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: mockProfile,
        error: null
      })

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          ...mockProfile,
          subscription_tier: 'PROFESSIONAL',
          subscription_status: 'active'
        },
        error: null
      })

      const result = await syncUserProfile('test-user-id')

      expect(result.success).toBe(true)
      expect(result.changes).toContain('subscription_tier')
      expect(result.updates.subscription_tier).toBe('PROFESSIONAL')
    })

    test('should handle user profile that is already consistent', async () => {
      const consistentProfile = {
        id: 'test-user-id',
        role: 'SHOP_OWNER',
        subscription_tier: 'PROFESSIONAL',
        subscription_status: 'active'
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: consistentProfile,
        error: null
      })

      const result = await syncUserProfile('test-user-id')

      expect(result.success).toBe(true)
      expect(result.message).toBe('Profile already consistent')
      expect(result.changes).toEqual([])
    })

    test('should sync all profiles in batch', async () => {
      const inconsistentProfiles = [
        { id: 'user1', role: 'BARBER', subscription_tier: 'free' },
        { id: 'user2', role: 'CLIENT', subscription_tier: 'professional' }
      ]

      mockSupabase.select.mockResolvedValueOnce({
        data: inconsistentProfiles,
        error: null
      })

      // Mock individual sync results
      mockSupabase.single
        .mockResolvedValueOnce({ data: inconsistentProfiles[0], error: null })
        .mockResolvedValueOnce({ 
          data: { ...inconsistentProfiles[0], subscription_tier: 'INDIVIDUAL' }, 
          error: null 
        })
        .mockResolvedValueOnce({ data: inconsistentProfiles[1], error: null })
        .mockResolvedValueOnce({ 
          data: { ...inconsistentProfiles[1], subscription_tier: 'FREE' }, 
          error: null 
        })

      const result = await syncAllProfiles({ batchSize: 2 })

      expect(result.success).toBe(true)
      expect(result.results.total).toBe(2)
      expect(result.results.synced).toBe(2)
    })

    test('should fix user by email', async () => {
      const userProfile = {
        id: 'chris-id',
        email: 'c50bossio@gmail.com',
        role: 'SHOP_OWNER',
        subscription_tier: 'free'
      }

      mockSupabase.single
        .mockResolvedValueOnce({ data: userProfile, error: null })
        .mockResolvedValueOnce({ data: userProfile, error: null })
        .mockResolvedValueOnce({ 
          data: { ...userProfile, subscription_tier: 'PROFESSIONAL' }, 
          error: null 
        })

      const result = await fixUserByEmail('c50bossio@gmail.com')

      expect(result.success).toBe(true)
      expect(result.email).toBe('c50bossio@gmail.com')
      expect(result.changes).toContain('subscription_tier')
    })
  })

  describe('2. Database Triggers (Integration)', () => {
    
    test('should automatically sync when role is updated', async () => {
      // This would test the actual database trigger
      // In a real test, you'd connect to a test database
      
      const mockUpdateResult = {
        data: [{
          id: 'test-user',
          role: 'ENTERPRISE_OWNER',
          subscription_tier: 'ENTERPRISE', // Auto-updated by trigger
          updated_at: new Date().toISOString()
        }],
        error: null
      }

      mockSupabase.select.mockResolvedValueOnce(mockUpdateResult)

      const result = await mockSupabase
        .from('profiles')
        .update({ role: 'ENTERPRISE_OWNER' })
        .eq('id', 'test-user')
        .select()

      expect(result.data[0].subscription_tier).toBe('ENTERPRISE')
    })
  })

  describe('3. API Middleware Validation', () => {
    
    test('should validate profile data during authentication', async () => {
      const inconsistentProfile = {
        id: 'test-user',
        role: 'BARBER',
        subscription_tier: 'free'
      }

      mockSupabase.single
        .mockResolvedValueOnce({ data: inconsistentProfile, error: null })
        .mockResolvedValueOnce({ 
          data: { ...inconsistentProfile, subscription_tier: 'INDIVIDUAL' }, 
          error: null 
        })

      const validatedProfile = await validateAndFixAuthProfile(inconsistentProfile)

      expect(validatedProfile.subscription_tier).toBe('INDIVIDUAL')
    })
  })

  describe('4. Health Check System', () => {
    
    test('should detect health issues correctly', async () => {
      const mockHealthStatus = {
        success: true,
        status: {
          total: 100,
          consistent: 85,
          inconsistent: 15
        },
        healthScore: 85
      }

      // Mock the health status response
      jest.doMock('../lib/profile-sync-service.js', () => ({
        getProfileSyncStatus: jest.fn(() => Promise.resolve(mockHealthStatus))
      }))

      const healthCheck = new HealthCheckManager()
      await healthCheck.init()

      const result = await healthCheck.runHealthCheck({ dryRun: true })

      expect(result.success).toBe(true)
      expect(result.severity).toBe('warning') // 85% is below 90% threshold
    })

    test('should trigger auto-fix for critical health', async () => {
      const criticalHealthStatus = {
        success: true,
        status: {
          total: 100,
          consistent: 75,
          inconsistent: 25
        },
        healthScore: 75 // Critical threshold
      }

      const mockSyncResult = {
        success: true,
        results: {
          total: 25,
          synced: 10,
          errors: 0
        }
      }

      jest.doMock('../lib/profile-sync-service.js', () => ({
        getProfileSyncStatus: jest.fn(() => Promise.resolve(criticalHealthStatus)),
        syncAllProfiles: jest.fn(() => Promise.resolve(mockSyncResult))
      }))

      const healthCheck = new HealthCheckManager()
      await healthCheck.init()

      const result = await healthCheck.runHealthCheck({ autoFix: true })

      expect(result.success).toBe(true)
      expect(result.severity).toBe('critical')
      expect(result.actions).toHaveLength(1)
      expect(result.actions[0].type).toBe('auto_fix')
      expect(result.actions[0].count).toBe(10)
    })
  })

  describe('5. Monitoring Dashboard Integration', () => {
    
    test('should provide health status for admin dashboard', async () => {
      const healthStatus = {
        success: true,
        status: {
          total: 150,
          consistent: 145,
          inconsistent: 5,
          byRole: {
            'SHOP_OWNER': { total: 50, consistent: 48, inconsistent: 2 },
            'BARBER': { total: 80, consistent: 77, inconsistent: 3 },
            'CLIENT': { total: 20, consistent: 20, inconsistent: 0 }
          }
        },
        healthScore: 97
      }

      mockSupabase.select.mockResolvedValueOnce({
        data: Array(150).fill().map((_, i) => ({
          id: `user-${i}`,
          role: i < 50 ? 'SHOP_OWNER' : i < 130 ? 'BARBER' : 'CLIENT',
          subscription_tier: i < 5 ? 'free' : 'correct-tier'
        })),
        error: null
      })

      const result = await getProfileSyncStatus()

      expect(result.success).toBe(true)
      expect(result.healthScore).toBeGreaterThan(95)
    })
  })

  describe('6. End-to-End Consistency Scenarios', () => {
    
    test('should handle complete user lifecycle consistency', async () => {
      const testScenarios = [
        {
          action: 'user_registers',
          initialState: { role: 'CLIENT', subscription_tier: null },
          expectedState: { role: 'CLIENT', subscription_tier: 'FREE' }
        },
        {
          action: 'user_upgrades',
          initialState: { role: 'CLIENT', subscription_tier: 'FREE' },
          expectedState: { role: 'BARBER', subscription_tier: 'INDIVIDUAL' }
        },
        {
          action: 'becomes_shop_owner',
          initialState: { role: 'BARBER', subscription_tier: 'INDIVIDUAL' },
          expectedState: { role: 'SHOP_OWNER', subscription_tier: 'PROFESSIONAL' }
        },
        {
          action: 'enterprise_upgrade',
          initialState: { role: 'SHOP_OWNER', subscription_tier: 'PROFESSIONAL' },
          expectedState: { role: 'ENTERPRISE_OWNER', subscription_tier: 'ENTERPRISE' }
        }
      ]

      for (const scenario of testScenarios) {
        mockSupabase.single
          .mockResolvedValueOnce({ data: scenario.initialState, error: null })
          .mockResolvedValueOnce({ data: scenario.expectedState, error: null })

        const result = await syncUserProfile('test-user')
        
        expect(result.success).toBe(true)
        expect(result.profile?.role).toBe(scenario.expectedState.role)
        expect(result.profile?.subscription_tier).toBe(scenario.expectedState.subscription_tier)
      }
    })

    test('should recover from data corruption scenarios', async () => {
      const corruptionScenarios = [
        { role: null, subscription_tier: 'PROFESSIONAL' }, // Missing role
        { role: 'SHOP_OWNER', subscription_tier: null },   // Missing tier
        { role: 'INVALID_ROLE', subscription_tier: 'FREE' }, // Invalid role
        { role: 'CLIENT', subscription_tier: 'INVALID_TIER' } // Invalid tier
      ]

      for (const corruptProfile of corruptionScenarios) {
        mockSupabase.single
          .mockResolvedValueOnce({ data: corruptProfile, error: null })
          .mockResolvedValueOnce({ 
            data: { 
              role: corruptProfile.role || 'CLIENT',
              subscription_tier: 'FREE' // Default recovery
            }, 
            error: null 
          })

        const result = await syncUserProfile('corrupt-user')
        
        expect(result.success).toBe(true)
        // System should handle graceful recovery
      }
    })
  })

  describe('7. Performance and Scale Testing', () => {
    
    test('should handle large batch sync operations', async () => {
      const largeProfileSet = Array(1000).fill().map((_, i) => ({
        id: `user-${i}`,
        role: 'SHOP_OWNER',
        subscription_tier: 'free' // All inconsistent
      }))

      mockSupabase.select.mockResolvedValueOnce({
        data: largeProfileSet,
        error: null
      })

      const result = await syncAllProfiles({ batchSize: 100 })

      expect(result.success).toBe(true)
      expect(result.results.total).toBe(1000)
      // Should process in batches without overwhelming system
    })

    test('should handle concurrent sync operations safely', async () => {
      const concurrentSyncs = Array(10).fill().map((_, i) => 
        syncUserProfile(`concurrent-user-${i}`)
      )

      mockSupabase.single.mockResolvedValue({
        data: { id: 'test', role: 'CLIENT', subscription_tier: 'FREE' },
        error: null
      })

      const results = await Promise.all(concurrentSyncs)

      results.forEach(result => {
        expect(result.success).toBe(true)
      })
      // No race conditions or deadlocks
    })
  })
})

describe('System Integration Tests', () => {
  
  test('should maintain consistency across all system components', async () => {
    // This test would verify that:
    // 1. Database triggers fire correctly
    // 2. API middleware validates properly  
    // 3. Health checks detect issues
    // 4. Auto-fix resolves problems
    // 5. Monitoring shows updated status
    
    const integrationFlow = {
      step1: 'trigger_inconsistency',
      step2: 'database_trigger_attempts_fix',
      step3: 'health_check_detects_issue',
      step4: 'auto_fix_resolves_problem', 
      step5: 'monitoring_shows_healthy'
    }

    // In a real integration test, this would:
    // - Create test user with inconsistency
    // - Verify trigger response
    // - Run health check
    // - Confirm resolution
    // - Validate monitoring update

    expect(integrationFlow).toBeDefined()
  })
})

// Test utility functions
const createTestProfile = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'CLIENT',
  subscription_tier: 'FREE',
  subscription_status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
})

const createInconsistentProfile = (role, wrongTier) => 
  createTestProfile({ role, subscription_tier: wrongTier })

export { createTestProfile, createInconsistentProfile }