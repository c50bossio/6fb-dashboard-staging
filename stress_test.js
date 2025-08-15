/**
 * Stress Testing Suite for 6FB AI Agent System
 * Tests system behavior under high load conditions
 */

const http = require('http');
const { performance } = require('perf_hooks');

class StressTestSuite {
  constructor() {
    this.results = {
      concurrency: {},
      endurance: {},
      spike: {},
      memory: {},
      overall: {
        score: 100,
        issues: [],
        recommendations: []
      }
    };
  }

  async runCompleteStressTest() {
    console.log('🔥 Starting Comprehensive Stress Testing');
    console.log('========================================');

    try {
      // 1. Concurrency Test - Multiple simultaneous requests
      await this.runConcurrencyTest();
      
      // 2. Endurance Test - Sustained load over time
      await this.runEnduranceTest();
      
      // 3. Spike Test - Sudden load spikes
      await this.runSpikeTest();
      
      // 4. Memory Pressure Test
      await this.runMemoryPressureTest();
      
      // 5. Generate final assessment
      this.generateStressTestReport();
      
      return this.results;
      
    } catch (error) {
      console.error('❌ Stress testing failed:', error.message);
      throw error;
    }
  }

  async runConcurrencyTest() {
    console.log('\n🚀 Running Concurrency Test...');
    console.log('===============================');
    
    const concurrencyLevels = [10, 25, 50, 100];
    const testEndpoint = 'http://localhost:9999/api/health';
    
    for (const level of concurrencyLevels) {
      console.log(`\n📊 Testing ${level} concurrent requests...`);
      
      const startTime = performance.now();
      const promises = [];
      
      for (let i = 0; i < level; i++) {
        promises.push(this.makeTimedRequest(testEndpoint, 10000));
      }
      
      try {
        const results = await Promise.allSettled(promises);
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failed = level - successful;
        const avgResponseTime = results
          .filter(r => r.status === 'fulfilled')
          .reduce((sum, r) => sum + r.value.responseTime, 0) / successful;
        
        this.results.concurrency[`${level}_concurrent`] = {
          level,
          successful,
          failed,
          totalTime: Math.round(totalTime),
          avgResponseTime: Math.round(avgResponseTime),
          requestsPerSecond: Math.round(level / (totalTime / 1000)),
          successRate: Math.round((successful / level) * 100)
        };
        
        console.log(`   ✅ Success: ${successful}/${level} (${Math.round((successful / level) * 100)}%)`);
        console.log(`   ⏱️ Total time: ${Math.round(totalTime)}ms`);
        console.log(`   📈 Requests/sec: ${Math.round(level / (totalTime / 1000))}`);
        console.log(`   ⚡ Avg response: ${Math.round(avgResponseTime)}ms`);
        
        if (failed > 0) {
          this.results.overall.score -= failed * 2;
          console.log(`   ⚠️ ${failed} requests failed under concurrent load`);
        }
        
        if (avgResponseTime > 1000) {
          this.results.overall.score -= 10;
          console.log(`   ⚠️ Response time degraded to ${Math.round(avgResponseTime)}ms`);
        }
        
      } catch (error) {
        console.log(`   ❌ Concurrency test failed at level ${level}: ${error.message}`);
        this.results.overall.score -= 20;
      }
      
      await this.sleep(2000);
    }
  }

  async runEnduranceTest() {
    console.log('\n⏰ Running Endurance Test...');
    console.log('=============================');
    
    const testDuration = 60000; // 1 minute
    const requestsPerSecond = 5;
    const testEndpoint = 'http://localhost:9999/api/health';
    
    console.log(`📊 Sustained load: ${requestsPerSecond} req/sec for ${testDuration / 1000} seconds`);
    
    const startTime = performance.now();
    let requestCount = 0;
    let successCount = 0;
    let errorCount = 0;
    const responseTimes = [];
    
    const interval = setInterval(async () => {
      requestCount++;
      
      try {
        const result = await this.makeTimedRequest(testEndpoint, 5000);
        if (result.success) {
          successCount++;
          responseTimes.push(result.responseTime);
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
      }
    }, 1000 / requestsPerSecond);
    
    await this.sleep(testDuration);
    clearInterval(interval);
    
    const endTime = performance.now();
    const actualDuration = endTime - startTime;
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    
    this.results.endurance = {
      duration: Math.round(actualDuration),
      requestCount,
      successCount,
      errorCount,
      successRate: Math.round((successCount / requestCount) * 100),
      avgResponseTime: Math.round(avgResponseTime || 0),
      actualRequestsPerSecond: Math.round(requestCount / (actualDuration / 1000))
    };
    
    console.log(`   📊 Total requests: ${requestCount}`);
    console.log(`   ✅ Successful: ${successCount} (${Math.round((successCount / requestCount) * 100)}%)`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   ⚡ Avg response time: ${Math.round(avgResponseTime || 0)}ms`);
    console.log(`   📈 Actual req/sec: ${Math.round(requestCount / (actualDuration / 1000))}`);
    
    if (errorCount > 0) {
      this.results.overall.score -= errorCount * 2;
      console.log(`   ⚠️ ${errorCount} errors occurred during sustained load`);
    }
    
    if (avgResponseTime > 500) {
      this.results.overall.score -= 10;
      console.log(`   ⚠️ Response time degraded during sustained load`);
    }
  }

  async runSpikeTest() {
    console.log('\n📈 Running Spike Test...');
    console.log('=========================');
    
    const baselineRequests = 5;
    const spikeRequests = 50;
    const testEndpoint = 'http://localhost:9999/api/health';
    
    console.log(`📊 Baseline: ${baselineRequests} requests, then spike to: ${spikeRequests} requests`);
    
    console.log('   Measuring baseline performance...');
    const baselineResults = await this.runRequestBatch(testEndpoint, baselineRequests);
    
    await this.sleep(1000);
    
    console.log('   Executing spike test...');
    const spikeResults = await this.runRequestBatch(testEndpoint, spikeRequests);
    
    const baselineAvgTime = baselineResults.avgResponseTime;
    const spikeAvgTime = spikeResults.avgResponseTime;
    const performanceImpact = spikeAvgTime / baselineAvgTime;
    
    this.results.spike = {
      baseline: baselineResults,
      spike: spikeResults,
      performanceImpact: Math.round(performanceImpact * 100) / 100,
      degradationPercent: Math.round(((spikeAvgTime - baselineAvgTime) / baselineAvgTime) * 100)
    };
    
    console.log(`   📊 Baseline avg response: ${Math.round(baselineAvgTime)}ms`);
    console.log(`   📊 Spike avg response: ${Math.round(spikeAvgTime)}ms`);
    console.log(`   📈 Performance impact: ${Math.round(performanceImpact * 100)}%`);
    console.log(`   📉 Response time degradation: ${Math.round(((spikeAvgTime - baselineAvgTime) / baselineAvgTime) * 100)}%`);
    
    if (spikeResults.failedRequests > 0) {
      this.results.overall.score -= spikeResults.failedRequests * 3;
      console.log(`   ❌ ${spikeResults.failedRequests} requests failed during spike`);
    }
    
    if (performanceImpact > 2) {
      this.results.overall.score -= 15;
      console.log(`   ⚠️ Significant performance degradation during spike`);
    } else if (performanceImpact > 1.5) {
      this.results.overall.score -= 10;
      console.log(`   ⚠️ Moderate performance degradation during spike`);
    }
  }

  async runMemoryPressureTest() {
    console.log('\n🧠 Running Memory Pressure Test...');
    console.log('===================================');
    
    const testEndpoint = 'http://localhost:9999/api/health';
    
    const initialMemory = await this.getMemoryUsage();
    console.log(`   📊 Initial memory usage: ${initialMemory.used}MB / ${initialMemory.total}MB`);
    
    const intensiveRequests = 100;
    console.log(`   🔥 Running ${intensiveRequests} intensive requests...`);
    
    const results = await this.runRequestBatch(testEndpoint, intensiveRequests);
    
    await this.sleep(2000); // Allow memory to settle
    const finalMemory = await this.getMemoryUsage();
    
    const memoryIncrease = finalMemory.used - initialMemory.used;
    const memoryPressure = (finalMemory.used / finalMemory.total) * 100;
    
    this.results.memory = {
      initialMemory,
      finalMemory,
      memoryIncrease,
      memoryPressure: Math.round(memoryPressure),
      intensiveRequests,
      successRate: Math.round(results.successRate)
    };
    
    console.log(`   📊 Final memory usage: ${finalMemory.used}MB / ${finalMemory.total}MB`);
    console.log(`   📈 Memory increase: ${memoryIncrease}MB`);
    console.log(`   🧠 Memory pressure: ${Math.round(memoryPressure)}%`);
    console.log(`   ✅ Success rate during pressure: ${Math.round(results.successRate)}%`);
    
    if (memoryPressure > 90) {
      this.results.overall.score -= 20;
      console.log(`   ❌ Critical memory pressure (${Math.round(memoryPressure)}%)`);
    } else if (memoryPressure > 80) {
      this.results.overall.score -= 10;
      console.log(`   ⚠️ High memory pressure (${Math.round(memoryPressure)}%)`);
    }
    
    if (results.successRate < 95) {
      this.results.overall.score -= 10;
      console.log(`   ⚠️ Requests failing under memory pressure`);
    }
  }

  async runRequestBatch(endpoint, count) {
    const startTime = performance.now();
    const promises = [];
    
    for (let i = 0; i < count; i++) {
      promises.push(this.makeTimedRequest(endpoint, 10000));
    }
    
    const results = await Promise.allSettled(promises);
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = count - successful;
    const avgResponseTime = results
      .filter(r => r.status === 'fulfilled' && r.value.success)
      .reduce((sum, r) => sum + r.value.responseTime, 0) / successful;
    
    return {
      totalRequests: count,
      successfulRequests: successful,
      failedRequests: failed,
      successRate: (successful / count) * 100,
      totalTime: Math.round(totalTime),
      avgResponseTime: Math.round(avgResponseTime || 0),
      requestsPerSecond: Math.round(count / (totalTime / 1000))
    };
  }

  async makeTimedRequest(endpoint, timeout = 5000) {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const parsedUrl = new URL(endpoint);
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        method: 'GET',
        timeout: timeout
      };
      
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          const endTime = performance.now();
          resolve({
            success: res.statusCode < 400,
            responseTime: endTime - startTime,
            statusCode: res.statusCode,
            dataLength: data.length
          });
        });
      });
      
      req.on('error', () => {
        resolve({
          success: false,
          responseTime: timeout,
          error: 'Request failed'
        });
      });
      
      req.on('timeout', () => {
        resolve({
          success: false,
          responseTime: timeout,
          error: 'Request timeout'
        });
        req.destroy();
      });
      
      req.end();
    });
  }

  async getMemoryUsage() {
    try {
      const healthResponse = await this.makeTimedRequest('http://localhost:9999/api/health');
      if (healthResponse.success) {
        const response = await fetch('http://localhost:9999/api/health');
        const data = await response.json();
        return data.system?.memory || { used: 0, total: 0 };
      }
    } catch (error) {
    }
    
    const used = Math.round(process.memoryUsage().rss / 1024 / 1024);
    return { used, total: used * 2 }; // Estimate total as 2x used
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateStressTestReport() {
    console.log('\n📊 STRESS TESTING RESULTS');
    console.log('==========================');
    
    const overallScore = Math.max(0, this.results.overall.score);
    
    console.log(`\n🎯 Overall Stress Test Score: ${overallScore}/100`);
    
    let stressResistance = 'EXCELLENT';
    if (overallScore < 60) stressResistance = 'POOR';
    else if (overallScore < 70) stressResistance = 'FAIR';
    else if (overallScore < 85) stressResistance = 'GOOD';
    
    console.log(`🏋️ Stress Resistance: ${stressResistance}`);
    
    console.log('\n📈 Concurrency Test Results:');
    Object.entries(this.results.concurrency).forEach(([level, result]) => {
      console.log(`   ${result.level} concurrent: ${result.successRate}% success, ${result.avgResponseTime}ms avg`);
    });
    
    console.log('\n⏰ Endurance Test Results:');
    if (this.results.endurance.requestCount) {
      console.log(`   ${this.results.endurance.requestCount} requests over ${Math.round(this.results.endurance.duration / 1000)}s`);
      console.log(`   Success rate: ${this.results.endurance.successRate}%`);
      console.log(`   Avg response time: ${this.results.endurance.avgResponseTime}ms`);
    }
    
    console.log('\n📈 Spike Test Results:');
    if (this.results.spike.performanceImpact) {
      console.log(`   Performance impact: ${this.results.spike.performanceImpact}x`);
      console.log(`   Response degradation: ${this.results.spike.degradationPercent}%`);
    }
    
    console.log('\n🧠 Memory Pressure Results:');
    if (this.results.memory.memoryPressure) {
      console.log(`   Memory pressure: ${this.results.memory.memoryPressure}%`);
      console.log(`   Success under pressure: ${this.results.memory.successRate}%`);
    }
    
    console.log('\n🎯 Stress Testing Recommendations:');
    
    if (overallScore < 70) {
      console.log('   1. [HIGH] Implement load balancing and horizontal scaling');
      console.log('   2. [HIGH] Optimize database query performance');
      console.log('   3. [MEDIUM] Add request queuing and rate limiting');
    } else if (overallScore < 85) {
      console.log('   1. [MEDIUM] Consider implementing caching layers');
      console.log('   2. [MEDIUM] Monitor memory usage in production');
      console.log('   3. [LOW] Set up auto-scaling policies');
    } else {
      console.log('   1. [LOW] Monitor production performance metrics');
      console.log('   2. [LOW] Consider capacity planning for future growth');
    }
    
    if (overallScore >= 85) {
      console.log('\n✅ EXCELLENT: System demonstrates strong stress resistance');
    } else if (overallScore >= 70) {
      console.log('\n⚠️ ACCEPTABLE: System handles stress reasonably well with some degradation');
    } else {
      console.log('\n❌ CONCERNING: System shows significant stress-related issues');
    }
    
    console.log('\n✅ Stress testing completed');
  }
}

const stressTest = new StressTestSuite();
stressTest.runCompleteStressTest()
  .then((results) => {
    const fs = require('fs');
    fs.writeFileSync('stress-test-results.json', JSON.stringify(results, null, 2));
    console.log('\n📁 Stress test results saved to: stress-test-results.json');
  })
  .catch((error) => {
    console.error('❌ Stress testing failed:', error);
    process.exit(1);
  });