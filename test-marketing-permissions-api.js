#!/usr/bin/env node

/**
 * Comprehensive test suite for the Marketing Permissions API
 * Tests all CRUD operations, role hierarchy validation, and security controls
 */

const API_BASE = 'http://localhost:9999/api/marketing/permissions'

// Test data setup
const testUsers = {
  enterpriseOwner: {
    id: 'enterprise-owner-uuid',
    role: 'enterprise_owner',
    enterprise_id: 'test-enterprise-uuid',
    barbershop_id: null
  },
  shopOwner: {
    id: 'shop-owner-uuid', 
    role: 'shop_owner',
    enterprise_id: 'test-enterprise-uuid',
    barbershop_id: 'test-shop-uuid'
  },
  barber1: {
    id: 'barber-1-uuid',
    role: 'barber',
    enterprise_id: 'test-enterprise-uuid', 
    barbershop_id: 'test-shop-uuid'
  },
  barber2: {
    id: 'barber-2-uuid',
    role: 'barber',
    enterprise_id: null,
    barbershop_id: 'other-shop-uuid'
  }
}

const testPermissions = [
  'can_view_shop_campaigns',
  'can_manage_shop_campaigns',
  'can_use_shop_billing',
  'can_use_enterprise_billing'
]

class PermissionsAPITester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    }
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 Running: ${testName}`)
    
    try {
      await testFunction()
      this.results.passed++
      this.results.tests.push({ name: testName, status: 'PASSED' })
      console.log(`✅ ${testName} - PASSED`)
    } catch (error) {
      this.results.failed++
      this.results.tests.push({ name: testName, status: 'FAILED', error: error.message })
      console.log(`❌ ${testName} - FAILED: ${error.message}`)
    }
  }

  async makeRequest(method, url, body = null, expectedStatus = 200) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)
    const data = await response.json().catch(() => ({}))

    if (response.status !== expectedStatus) {
      throw new Error(`Expected status ${expectedStatus}, got ${response.status}: ${JSON.stringify(data)}`)
    }

    return { status: response.status, data }
  }

  // Test 1: Get permissions for enterprise owner (should see all)
  async testGetPermissionsEnterpriseOwner() {
    const url = `${API_BASE}?user_id=${testUsers.enterpriseOwner.id}`
    const response = await this.makeRequest('GET', url)
    
    if (!response.data.permissions) {
      throw new Error('No permissions array returned')
    }

    if (!response.data.valid_permissions || !Array.isArray(response.data.valid_permissions)) {
      throw new Error('Valid permissions not returned')
    }

    if (!response.data.role_hierarchy) {
      throw new Error('Role hierarchy not returned')
    }
  }

  // Test 2: Get permissions for specific user
  async testGetPermissionsForTargetUser() {
    const url = `${API_BASE}?user_id=${testUsers.shopOwner.id}&target_user_id=${testUsers.barber1.id}`
    const response = await this.makeRequest('GET', url)
    
    if (!response.data.permissions) {
      throw new Error('No permissions array returned')
    }
  }

  // Test 3: Get permissions for shop
  async testGetPermissionsForShop() {
    const url = `${API_BASE}?user_id=${testUsers.shopOwner.id}&shop_id=test-shop-uuid`
    const response = await this.makeRequest('GET', url)
    
    if (!response.data.permissions) {
      throw new Error('No permissions array returned')
    }
  }

  // Test 4: Unauthorized access (barber trying to view other shop's permissions)
  async testUnauthorizedAccess() {
    const url = `${API_BASE}?user_id=${testUsers.barber2.id}&target_user_id=${testUsers.barber1.id}`
    await this.makeRequest('GET', url, null, 403)
  }

  // Test 5: Grant permissions as shop owner
  async testGrantPermissionsShopOwner() {
    const body = {
      granter_id: testUsers.shopOwner.id,
      user_id: testUsers.barber1.id,
      permissions: ['can_view_shop_campaigns', 'can_use_shop_billing'],
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      notes: 'Granted for marketing campaign management'
    }

    const response = await this.makeRequest('POST', API_BASE, body, 201)
    
    if (!response.data.permissions) {
      throw new Error('No permissions object returned')
    }

    if (!response.data.permissions.can_view_shop_campaigns) {
      throw new Error('Permission not granted correctly')
    }
  }

  // Test 6: Grant enterprise permissions as enterprise owner
  async testGrantEnterprisePermissions() {
    const body = {
      granter_id: testUsers.enterpriseOwner.id,
      user_id: testUsers.barber1.id,
      permissions: ['can_use_enterprise_billing'],
      notes: 'Enterprise billing access granted'
    }

    const response = await this.makeRequest('POST', API_BASE, body, 200) // Update existing
    
    if (!response.data.permissions.can_use_enterprise_billing) {
      throw new Error('Enterprise permission not granted')
    }
  }

  // Test 7: Unauthorized permission grant (barber trying to grant)
  async testUnauthorizedPermissionGrant() {
    const body = {
      granter_id: testUsers.barber1.id,
      user_id: testUsers.barber2.id,
      permissions: ['can_view_shop_campaigns']
    }

    await this.makeRequest('POST', API_BASE, body, 403)
  }

  // Test 8: Invalid permission grant (shop owner trying to grant enterprise permissions)
  async testInvalidPermissionScope() {
    const body = {
      granter_id: testUsers.shopOwner.id,
      user_id: testUsers.barber1.id,
      permissions: ['can_use_enterprise_billing']
    }

    await this.makeRequest('POST', API_BASE, body, 403)
  }

  // Test 9: Cross-shop permission grant (should fail)
  async testCrossShopPermissionGrant() {
    const body = {
      granter_id: testUsers.shopOwner.id,
      user_id: testUsers.barber2.id, // Barber in different shop
      permissions: ['can_view_shop_campaigns']
    }

    await this.makeRequest('POST', API_BASE, body, 403)
  }

  // Test 10: Update permissions (add and remove)
  async testUpdatePermissions() {
    const body = {
      granter_id: testUsers.shopOwner.id,
      user_id: testUsers.barber1.id,
      permissions_to_add: ['can_manage_shop_campaigns'],
      permissions_to_remove: ['can_use_shop_billing'],
      notes: 'Updated permissions for campaign management'
    }

    const response = await this.makeRequest('PATCH', API_BASE, body)
    
    if (!response.data.permissions.can_manage_shop_campaigns) {
      throw new Error('Permission not added correctly')
    }

    if (response.data.permissions.can_use_shop_billing !== false) {
      throw new Error('Permission not removed correctly')
    }
  }

  // Test 11: Invalid permissions validation
  async testInvalidPermissions() {
    const body = {
      granter_id: testUsers.shopOwner.id,
      user_id: testUsers.barber1.id,
      permissions: ['invalid_permission', 'can_view_shop_campaigns']
    }

    await this.makeRequest('POST', API_BASE, body, 400)
  }

  // Test 12: Revoke specific permissions
  async testRevokeSpecificPermissions() {
    const url = `${API_BASE}?granter_id=${testUsers.shopOwner.id}&user_id=${testUsers.barber1.id}&permissions=can_manage_shop_campaigns,can_view_shop_campaigns`
    
    const response = await this.makeRequest('DELETE', url)
    
    if (response.data.permissions.can_manage_shop_campaigns !== false || 
        response.data.permissions.can_view_shop_campaigns !== false) {
      throw new Error('Permissions not revoked correctly')
    }
  }

  // Test 13: Revoke all permissions
  async testRevokeAllPermissions() {
    // First grant some permissions
    await this.makeRequest('POST', API_BASE, {
      granter_id: testUsers.shopOwner.id,
      user_id: testUsers.barber1.id,
      permissions: ['can_view_shop_campaigns']
    })

    // Then revoke all
    const url = `${API_BASE}?granter_id=${testUsers.shopOwner.id}&user_id=${testUsers.barber1.id}`
    
    await this.makeRequest('DELETE', url)
  }

  // Test 14: Unauthorized revocation
  async testUnauthorizedRevocation() {
    const url = `${API_BASE}?granter_id=${testUsers.barber1.id}&user_id=${testUsers.barber2.id}`
    
    await this.makeRequest('DELETE', url, null, 403)
  }

  // Test 15: Permission expiration handling
  async testPermissionExpiration() {
    // Grant permission that expires in the past
    const body = {
      granter_id: testUsers.shopOwner.id,
      user_id: testUsers.barber1.id,
      permissions: ['can_view_shop_campaigns'],
      expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
    }

    await this.makeRequest('POST', API_BASE, body, 201)

    // Get permissions (should exclude expired by default)
    const url = `${API_BASE}?user_id=${testUsers.shopOwner.id}&target_user_id=${testUsers.barber1.id}`
    const response = await this.makeRequest('GET', url)
    
    const expiredPermissions = response.data.permissions.filter(p => 
      p.user_id === testUsers.barber1.id && p.can_view_shop_campaigns === true
    )

    if (expiredPermissions.length > 0) {
      throw new Error('Expired permissions should not be returned by default')
    }

    // Get permissions including expired
    const urlWithExpired = `${url}&include_expired=true`
    const responseWithExpired = await this.makeRequest('GET', urlWithExpired)
    
    const allPermissions = responseWithExpired.data.permissions.filter(p => 
      p.user_id === testUsers.barber1.id
    )

    if (allPermissions.length === 0) {
      throw new Error('Expired permissions should be returned when requested')
    }
  }

  // Test 16: Missing required parameters
  async testMissingRequiredParameters() {
    // Missing user_id in GET
    await this.makeRequest('GET', API_BASE, null, 400)

    // Missing granter_id in POST
    const bodyMissingGranter = {
      user_id: testUsers.barber1.id,
      permissions: ['can_view_shop_campaigns']
    }
    await this.makeRequest('POST', API_BASE, bodyMissingGranter, 400)

    // Missing user_id in POST
    const bodyMissingUser = {
      granter_id: testUsers.shopOwner.id,
      permissions: ['can_view_shop_campaigns']
    }
    await this.makeRequest('POST', API_BASE, bodyMissingUser, 400)
  }

  // Test 17: Role hierarchy validation
  async testRoleHierarchyValidation() {
    // Shop owner cannot grant permissions to enterprise owner
    const body = {
      granter_id: testUsers.shopOwner.id,
      user_id: testUsers.enterpriseOwner.id,
      permissions: ['can_view_shop_campaigns']
    }

    await this.makeRequest('POST', API_BASE, body, 403)
  }

  async runAllTests() {
    console.log('🚀 Starting Marketing Permissions API Test Suite')
    console.log('=' .repeat(60))

    // GET Tests
    await this.runTest('Get permissions for enterprise owner', () => this.testGetPermissionsEnterpriseOwner())
    await this.runTest('Get permissions for target user', () => this.testGetPermissionsForTargetUser())
    await this.runTest('Get permissions for shop', () => this.testGetPermissionsForShop())
    await this.runTest('Unauthorized access', () => this.testUnauthorizedAccess())

    // POST Tests
    await this.runTest('Grant permissions as shop owner', () => this.testGrantPermissionsShopOwner())
    await this.runTest('Grant enterprise permissions', () => this.testGrantEnterprisePermissions())
    await this.runTest('Unauthorized permission grant', () => this.testUnauthorizedPermissionGrant())
    await this.runTest('Invalid permission scope', () => this.testInvalidPermissionScope())
    await this.runTest('Cross-shop permission grant', () => this.testCrossShopPermissionGrant())
    await this.runTest('Invalid permissions validation', () => this.testInvalidPermissions())

    // PATCH Tests
    await this.runTest('Update permissions', () => this.testUpdatePermissions())

    // DELETE Tests
    await this.runTest('Revoke specific permissions', () => this.testRevokeSpecificPermissions())
    await this.runTest('Revoke all permissions', () => this.testRevokeAllPermissions())
    await this.runTest('Unauthorized revocation', () => this.testUnauthorizedRevocation())

    // Advanced Tests
    await this.runTest('Permission expiration handling', () => this.testPermissionExpiration())
    await this.runTest('Missing required parameters', () => this.testMissingRequiredParameters())
    await this.runTest('Role hierarchy validation', () => this.testRoleHierarchyValidation())

    this.printSummary()
  }

  printSummary() {
    console.log('\n' + '=' .repeat(60))
    console.log('📊 TEST SUMMARY')
    console.log('=' .repeat(60))
    
    console.log(`✅ Passed: ${this.results.passed}`)
    console.log(`❌ Failed: ${this.results.failed}`)
    console.log(`📈 Total: ${this.results.passed + this.results.failed}`)
    console.log(`📊 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`)

    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:')
      this.results.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   - ${test.name}: ${test.error}`)
        })
    }

    console.log('\n🏁 Marketing Permissions API Testing Complete')
  }
}

// Run the tests
async function runTests() {
  const tester = new PermissionsAPITester()
  await tester.runAllTests()
  
  // Exit with error code if any tests failed
  process.exit(tester.results.failed > 0 ? 1 : 0)
}

// Only run if called directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 Test suite crashed:', error)
    process.exit(1)
  })
}

module.exports = PermissionsAPITester