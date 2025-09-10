#!/usr/bin/env node

/**
 * Performance Validation Script
 * Analyzes React Query cache settings, performance optimizations, and identifies potential issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function validatePerformance() {
  console.log('🚀 Validating React Query Performance Configuration...\n');

  const results = {
    queryClientConfig: { score: 0, issues: [], recommendations: [] },
    hookImplementations: { score: 0, issues: [], recommendations: [] },
    cacheStrategy: { score: 0, issues: [], recommendations: [] },
    realtimeOptimizations: { score: 0, issues: [], recommendations: [] }
  };

  try {
    // 1. Validate QueryClient Configuration
    console.log('⚙️  Analyzing QueryClient Configuration...');
    const queryClientPath = path.join(__dirname, 'lib', 'query-client.js');
    const queryClientContent = fs.readFileSync(queryClientPath, 'utf8');

    // Check staleTime (should be reasonable - not too short, not too long)
    const staleTimeMatch = queryClientContent.match(/staleTime:\s*(\d+)/);
    if (staleTimeMatch) {
      const staleTime = parseInt(staleTimeMatch[1]);
      const staleTimeMinutes = staleTime / (1000 * 60);
      
      if (staleTimeMinutes >= 5 && staleTimeMinutes <= 15) {
        results.queryClientConfig.score += 25;
        console.log(`✅ Optimal staleTime: ${staleTimeMinutes} minutes`);
      } else if (staleTimeMinutes < 1) {
        results.queryClientConfig.issues.push('StaleTime too short - may cause excessive API calls');
        results.queryClientConfig.recommendations.push('Increase staleTime to at least 5 minutes for dashboard data');
      } else if (staleTimeMinutes > 30) {
        results.queryClientConfig.issues.push('StaleTime too long - data may become stale');
        results.queryClientConfig.recommendations.push('Reduce staleTime to 10-15 minutes for better UX');
      } else {
        results.queryClientConfig.score += 15;
        console.log(`⚠️  StaleTime acceptable but could be optimized: ${staleTimeMinutes} minutes`);
      }
    }

    // Check cacheTime
    const cacheTimeMatch = queryClientContent.match(/cacheTime:\s*(\d+)/);
    if (cacheTimeMatch) {
      const cacheTime = parseInt(cacheTimeMatch[1]);
      const cacheTimeMinutes = cacheTime / (1000 * 60);
      
      if (cacheTimeMinutes >= 5 && cacheTimeMinutes <= 30) {
        results.queryClientConfig.score += 25;
        console.log(`✅ Good cacheTime: ${cacheTimeMinutes} minutes`);
      } else {
        results.queryClientConfig.issues.push(`CacheTime may need adjustment: ${cacheTimeMinutes} minutes`);
      }
    }

    // Check retry configuration
    if (queryClientContent.includes('retry: 1')) {
      results.queryClientConfig.score += 25;
      console.log('✅ Conservative retry strategy configured');
    } else if (queryClientContent.includes('retry: false')) {
      results.queryClientConfig.issues.push('No retry configured - may cause poor UX on network issues');
    }

    // Check refetch settings
    if (queryClientContent.includes('refetchOnWindowFocus: false')) {
      results.queryClientConfig.score += 25;
      console.log('✅ Window focus refetch disabled - reduces unnecessary requests');
    }

    // 2. Analyze Hook Implementations
    console.log('\n🔧 Analyzing Hook Implementations...');
    const hookFiles = ['useAppointments.js', 'useStaffQuery.js', 'useServicesQuery.js', 'useCustomersQuery.js'];
    
    for (const hookFile of hookFiles) {
      const hookPath = path.join(__dirname, 'hooks', hookFile);
      if (fs.existsSync(hookPath)) {
        const hookContent = fs.readFileSync(hookPath, 'utf8');
        
        // Check for proper query key structure
        if (hookContent.includes('queryKey:') || hookContent.includes('queryKey =')) {
          results.hookImplementations.score += 5;
        } else {
          results.hookImplementations.issues.push(`${hookFile}: Missing structured query keys`);
        }

        // Check for enabled/disabled logic
        if (hookContent.includes('enabled:')) {
          results.hookImplementations.score += 5;
          console.log(`✅ ${hookFile}: Smart query enabling logic found`);
        }

        // Check for proper error handling
        if (hookContent.includes('onError') || hookContent.includes('error')) {
          results.hookImplementations.score += 5;
        } else {
          results.hookImplementations.issues.push(`${hookFile}: Missing error handling`);
        }

        // Check for optimistic updates
        if (hookContent.includes('onMutate') || hookContent.includes('optimistic')) {
          results.hookImplementations.score += 5;
          console.log(`✅ ${hookFile}: Optimistic updates implemented`);
        }
      }
    }

    // 3. Cache Strategy Analysis
    console.log('\n💾 Analyzing Cache Strategy...');
    
    // Check for cache invalidation helpers
    if (queryClientContent.includes('invalidateQueries')) {
      results.cacheStrategy.score += 25;
      console.log('✅ Cache invalidation helpers available');
    }

    // Check for prefetch capabilities
    if (queryClientContent.includes('prefetchQuery')) {
      results.cacheStrategy.score += 25;
      console.log('✅ Query prefetching capabilities available');
    }

    // Check for optimistic cache updates
    if (queryClientContent.includes('setQueryData')) {
      results.cacheStrategy.score += 25;
      console.log('✅ Optimistic cache update capabilities available');
    }

    // Check for cache clearing
    if (queryClientContent.includes('clear')) {
      results.cacheStrategy.score += 25;
      console.log('✅ Cache clearing functionality available');
    }

    // 4. Realtime Optimizations
    console.log('\n⚡ Analyzing Realtime Optimizations...');
    
    const realtimeHookPath = path.join(__dirname, 'hooks', 'useRealtimeAppointments.js');
    if (fs.existsSync(realtimeHookPath)) {
      const realtimeContent = fs.readFileSync(realtimeHookPath, 'utf8');
      
      // Check for subscription management
      if (realtimeContent.includes('subscribe') && realtimeContent.includes('unsubscribe')) {
        results.realtimeOptimizations.score += 25;
        console.log('✅ Proper subscription lifecycle management');
      }

      // Check for selective updates
      if (realtimeContent.includes('setQueryData') || realtimeContent.includes('invalidateQueries')) {
        results.realtimeOptimizations.score += 25;
        console.log('✅ Intelligent cache updates on realtime events');
      }

      // Check for connection management
      if (realtimeContent.includes('useEffect') && realtimeContent.includes('cleanup')) {
        results.realtimeOptimizations.score += 25;
        console.log('✅ Proper connection cleanup implemented');
      }

      // Check for error handling in realtime
      if (realtimeContent.includes('error') || realtimeContent.includes('onError')) {
        results.realtimeOptimizations.score += 25;
        console.log('✅ Realtime error handling present');
      }
    } else {
      results.realtimeOptimizations.issues.push('Realtime hooks not found or not properly implemented');
    }

  } catch (error) {
    console.error('❌ Performance validation error:', error.message);
  }

  // Generate comprehensive report
  console.log('\n📊 Performance Validation Report');
  console.log('═'.repeat(60));

  const categories = [
    { name: 'QueryClient Config', data: results.queryClientConfig, maxScore: 100 },
    { name: 'Hook Implementations', data: results.hookImplementations, maxScore: 80 },
    { name: 'Cache Strategy', data: results.cacheStrategy, maxScore: 100 },
    { name: 'Realtime Optimizations', data: results.realtimeOptimizations, maxScore: 100 }
  ];

  let totalScore = 0;
  let maxTotalScore = 0;

  categories.forEach(category => {
    const percentage = Math.round((category.data.score / category.maxScore) * 100);
    const status = percentage >= 80 ? '🟢' : percentage >= 60 ? '🟡' : '🔴';
    
    console.log(`${status} ${category.name.padEnd(25)} ${category.data.score}/${category.maxScore} (${percentage}%)`);
    
    totalScore += category.data.score;
    maxTotalScore += category.maxScore;

    if (category.data.issues.length > 0) {
      console.log(`   Issues: ${category.data.issues.join(', ')}`);
    }
  });

  const overallPercentage = Math.round((totalScore / maxTotalScore) * 100);
  const overallGrade = overallPercentage >= 90 ? 'A' : overallPercentage >= 80 ? 'B' : overallPercentage >= 70 ? 'C' : overallPercentage >= 60 ? 'D' : 'F';

  console.log('═'.repeat(60));
  console.log(`🎯 Overall Performance Score: ${totalScore}/${maxTotalScore} (${overallPercentage}%) - Grade ${overallGrade}`);

  // Performance recommendations
  console.log('\n💡 Performance Recommendations:');
  categories.forEach(category => {
    if (category.data.recommendations.length > 0) {
      console.log(`\n${category.name}:`);
      category.data.recommendations.forEach(rec => console.log(`  • ${rec}`));
    }
  });

  // General performance best practices check
  console.log('\n🏆 Performance Best Practices:');
  const practices = [
    { name: 'Background refetch disabled', met: queryClientContent.includes('refetchOnWindowFocus: false') },
    { name: 'Conservative retry strategy', met: queryClientContent.includes('retry: 1') },
    { name: 'Reasonable stale time', met: staleTimeMatch && parseInt(staleTimeMatch[1]) >= 300000 },
    { name: 'Cache invalidation available', met: queryClientContent.includes('invalidateQueries') },
    { name: 'Prefetch capability', met: queryClientContent.includes('prefetchQuery') }
  ];

  practices.forEach(practice => {
    console.log(`${practice.met ? '✅' : '❌'} ${practice.name}`);
  });

  const isPerformanceReady = overallPercentage >= 75;
  console.log(`\n🏁 Performance Status: ${isPerformanceReady ? '✅ OPTIMIZED' : '⚠️  NEEDS OPTIMIZATION'}`);

  return {
    isReady: isPerformanceReady,
    score: `${totalScore}/${maxTotalScore}`,
    percentage: overallPercentage,
    grade: overallGrade,
    issues: Object.values(results).flatMap(r => r.issues),
    recommendations: Object.values(results).flatMap(r => r.recommendations)
  };
}

validatePerformance()
  .then(results => {
    process.exit(results.isReady ? 0 : 1);
  })
  .catch(error => {
    console.error('Performance validation failed:', error);
    process.exit(1);
  });

export { validatePerformance };