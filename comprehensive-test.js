/**
 * Comprehensive Marketing Campaign System Test
 * Tests the complete agent-driven marketing workflow
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

const API_BASE = 'http://localhost:9999/api/marketing';

async function performanceTest() {
    console.log('⚡ Performance Testing - API Response Times\n');
    
    const tests = [
        {
            name: 'GET Campaigns List',
            method: 'GET',
            url: `${API_BASE}/campaigns?shop_id=shop-001&account_type=shop_owner`,
            expectedMaxTime: 1000 // 1 second
        },
        {
            name: 'Small Email Campaign (1 recipient)',
            method: 'POST', 
            url: `${API_BASE}/campaigns/send`,
            data: {
                type: 'email',
                campaign: {
                    id: 'perf-test-email-small',
                    name: 'Performance Test Email Small',
                    subject: 'Test Email',
                    message: 'Performance test email'
                },
                shop: {
                    id: 'shop-001',
                    name: 'Performance Test Shop',
                    email: 'test@example.com',
                    account_type: 'shop'
                },
                recipients: [
                    { email: 'test1@example.com', name: 'Test User 1' }
                ]
            },
            expectedMaxTime: 2000 // 2 seconds
        }
    ];
    
    const results = [];
    
    for (const test of tests) {
        try {
            console.log(`🔬 Testing: ${test.name}`);
            
            const startTime = performance.now();
            
            const response = await axios({
                method: test.method,
                url: test.url,
                data: test.data,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);
            
            const passed = responseTime <= test.expectedMaxTime;
            const status = passed ? '✅ PASS' : '❌ FAIL';
            
            console.log(`   ${status} - ${responseTime}ms (max: ${test.expectedMaxTime}ms)`);
            console.log(`   Response: ${response.status} ${response.statusText}`);
            
            results.push({
                test: test.name,
                responseTime,
                expectedMaxTime: test.expectedMaxTime,
                passed,
                status: response.status
            });
            
        } catch (error) {
            console.log(`   ❌ ERROR - ${error.message}`);
            results.push({
                test: test.name,
                error: error.message,
                passed: false
            });
        }
        console.log('');
    }
    
    return results;
}

async function bulkRecipientTest() {
    console.log('📊 Bulk Recipient Handling Test\n');
    
    // Generate test recipients for bulk testing
    const generateRecipients = (count, type = 'email') => {
        const recipients = [];
        for (let i = 1; i <= count; i++) {
            if (type === 'email') {
                recipients.push({
                    email: `bulk.test${i}@example.com`,
                    name: `Bulk Test User ${i}`,
                    id: `bulk-customer-${i.toString().padStart(3, '0')}`
                });
            } else {
                recipients.push({
                    phone: `+1-555-${(9000 + i).toString()}`,
                    name: `Bulk SMS User ${i}`,
                    id: `bulk-sms-customer-${i.toString().padStart(3, '0')}`
                });
            }
        }
        return recipients;
    };
    
    const bulkTests = [
        {
            name: 'Email Campaign - 10 Recipients',
            type: 'email',
            recipientCount: 10
        },
        {
            name: 'SMS Campaign - 5 Recipients',
            type: 'sms',
            recipientCount: 5
        }
    ];
    
    const results = [];
    
    for (const test of bulkTests) {
        try {
            console.log(`📈 Testing: ${test.name}`);
            
            const recipients = generateRecipients(test.recipientCount, test.type);
            
            const campaignData = {
                type: test.type,
                campaign: {
                    id: `bulk-test-${test.type}-${test.recipientCount}`,
                    name: `Bulk Test ${test.type.toUpperCase()} - ${test.recipientCount} Recipients`,
                    subject: test.type === 'email' ? 'Bulk Email Test' : 'Bulk SMS Test',
                    message: `This is a bulk ${test.type} test with ${test.recipientCount} recipients.`
                },
                shop: {
                    id: 'bulk-test-shop',
                    name: 'Bulk Test Elite Cuts',
                    email: 'bulk@elitecuts.com',
                    phone: '+1-555-BULK-TEST',
                    account_type: 'shop'
                },
                recipients: recipients
            };
            
            const startTime = performance.now();
            
            const response = await axios.post(`${API_BASE}/campaigns/send`, campaignData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);
            
            console.log(`   ✅ SUCCESS - ${responseTime}ms`);
            console.log(`   Recipients: ${response.data.recipients_count}`);
            console.log(`   Campaign ID: ${response.data.campaign_id}`);
            console.log(`   Message ID: ${response.data.message_id}`);
            
            if (response.data.billing) {
                console.log(`   Billing: $${response.data.billing.totalCharge} (${response.data.billing.profitMargin}% margin)`);
            }
            
            results.push({
                test: test.name,
                recipientCount: test.recipientCount,
                responseTime,
                passed: true,
                campaignId: response.data.campaign_id,
                billing: response.data.billing
            });
            
        } catch (error) {
            console.log(`   ❌ ERROR - ${error.message}`);
            results.push({
                test: test.name,
                recipientCount: test.recipientCount,
                error: error.message,
                passed: false
            });
        }
        console.log('');
    }
    
    return results;
}

async function runComprehensiveTest() {
    console.log('🚀 COMPREHENSIVE MARKETING CAMPAIGN SYSTEM TEST\n');
    console.log('=' .repeat(70));
    console.log('Testing complete agent-driven marketing workflow\n');
    
    const testResults = {
        timestamp: new Date().toISOString(),
        performance: null,
        bulkRecipients: null,
        summary: {
            totalTests: 0,
            passed: 0,
            failed: 0
        }
    };
    
    try {
        // Performance Testing
        testResults.performance = await performanceTest();
        
        // Bulk Recipient Testing
        testResults.bulkRecipients = await bulkRecipientTest();
        
        // Calculate summary
        const allTests = [
            ...testResults.performance,
            ...testResults.bulkRecipients
        ];
        
        testResults.summary.totalTests = allTests.length;
        testResults.summary.passed = allTests.filter(t => t.passed).length;
        testResults.summary.failed = allTests.filter(t => !t.passed).length;
        
        console.log('📊 FINAL TEST SUMMARY');
        console.log('=' .repeat(50));
        console.log(`✅ Passed: ${testResults.summary.passed}`);
        console.log(`❌ Failed: ${testResults.summary.failed}`);
        console.log(`📈 Success Rate: ${((testResults.summary.passed / testResults.summary.totalTests) * 100).toFixed(1)}%`);
        console.log(`🕒 Completed: ${testResults.timestamp}`);
        
        if (testResults.summary.failed === 0) {
            console.log('\n🎉 ALL TESTS PASSED! Marketing system is production ready.');
        } else {
            console.log('\n⚠️  Some tests failed. Review results above.');
        }
        
        return testResults;
        
    } catch (error) {
        console.error('💥 Test suite failed:', error);
        throw error;
    }
}

// Run the comprehensive test
if (require.main === module) {
    runComprehensiveTest()
        .then(results => {
            console.log('\n✅ Test suite completed successfully!');
            process.exit(results.summary.failed === 0 ? 0 : 1);
        })
        .catch(error => {
            console.error('\n💥 Test suite failed:', error);
            process.exit(1);
        });
}

module.exports = { 
    runComprehensiveTest,
    performanceTest,
    bulkRecipientTest
};