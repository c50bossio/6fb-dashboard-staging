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

    const concurrencyLevels = [10, 25, 50, 100];
    const testEndpoint = 'http://localhost:9999/api/health';
    
    for (const level of concurrencyLevels) {

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
        
         * 100)}%)`);
        }ms`);
        )}`);
        }ms`);
        
        if (failed > 0) {
          this.results.overall.score -= failed * 2;
          
        }
        
        if (avgResponseTime > 1000) {
          this.results.overall.score -= 10;
          }ms`);
        }
        
      } catch (error) {
        
        this.results.overall.score -= 20;
      }
      
      await this.sleep(2000);
    }
  }

  async runEnduranceTest() {

    const testDuration = 60000; // 1 minute
    const requestsPerSecond = 5;
    const testEndpoint = 'http://localhost:9999/api/health';

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

     * 100)}%)`);
    
    }ms`);
    )}`);
    
    if (errorCount > 0) {
      this.results.overall.score -= errorCount * 2;
      
    }
    
    if (avgResponseTime > 500) {
      this.results.overall.score -= 10;
      
    }
  }

  async runSpikeTest() {

    const baselineRequests = 5;
    const spikeRequests = 50;
    const testEndpoint = 'http://localhost:9999/api/health';

    const baselineResults = await this.runRequestBatch(testEndpoint, baselineRequests);
    
    await this.sleep(1000);

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
    
    }ms`);
    }ms`);
    }%`);
     / baselineAvgTime) * 100)}%`);
    
    if (spikeResults.failedRequests > 0) {
      this.results.overall.score -= spikeResults.failedRequests * 3;
      
    }
    
    if (performanceImpact > 2) {
      this.results.overall.score -= 15;
      
    } else if (performanceImpact > 1.5) {
      this.results.overall.score -= 10;
      
    }
  }

  async runMemoryPressureTest() {

    const testEndpoint = 'http://localhost:9999/api/health';
    
    const initialMemory = await this.getMemoryUsage();

    const intensiveRequests = 100;

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

    }%`);
    }%`);
    
    if (memoryPressure > 90) {
      this.results.overall.score -= 20;
      }%)`);
    } else if (memoryPressure > 80) {
      this.results.overall.score -= 10;
      }%)`);
    }
    
    if (results.successRate < 95) {
      this.results.overall.score -= 10;
      
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

    const overallScore = Math.max(0, this.results.overall.score);

    let stressResistance = 'EXCELLENT';
    if (overallScore < 60) stressResistance = 'POOR';
    else if (overallScore < 70) stressResistance = 'FAIR';
    else if (overallScore < 85) stressResistance = 'GOOD';

    Object.entries(this.results.concurrency).forEach(([level, result]) => {
      
    });

    if (this.results.endurance.requestCount) {
      }s`);

    }

    if (this.results.spike.performanceImpact) {

    }

    if (this.results.memory.memoryPressure) {

    }

    if (overallScore < 70) {

    } else if (overallScore < 85) {

    } else {

    }
    
    if (overallScore >= 85) {
      
    } else if (overallScore >= 70) {
      
    } else {
      
    }

  }
}

const stressTest = new StressTestSuite();
stressTest.runCompleteStressTest()
  .then((results) => {
    const fs = require('fs');
    fs.writeFileSync('stress-test-results.json', JSON.stringify(results, null, 2));
    
  })
  .catch((error) => {
    console.error('❌ Stress testing failed:', error);
    process.exit(1);
  });