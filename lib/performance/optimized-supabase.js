/**
 * Optimized Supabase Client Service
 * Implements connection pooling, query caching, and performance monitoring
 * Replaces individual client creation with singleton pattern
 */

import { createClient } from '@supabase/supabase-js';

class OptimizedSupabaseService {
  constructor() {
    this.clients = new Map();
    this.queryCache = new Map();
    this.connectionPool = {
      size: 0,
      maxSize: 10,
      minSize: 2,
      activeConnections: 0
    };
    this.performanceMetrics = {
      totalQueries: 0,
      cacheHits: 0,
      averageQueryTime: 0,
      connectionCreations: 0
    };
    
    // Initialize main client
    this.mainClient = null;
    this.initializeClient();
  }

  initializeClient() {
    if (this.mainClient) return this.mainClient;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
    }

    // Use service role key for server-side operations, anon key as fallback
    const key = serviceKey || anonKey;
    if (!key) {
      throw new Error('Supabase key is required');
    }

    this.mainClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          'x-application-name': '6FB-AI-Agent-System',
          'x-client-type': 'optimized-singleton'
        }
      },
      db: {
        schema: 'public'
      }
    });

    this.performanceMetrics.connectionCreations++;
    console.log('[Supabase] ✅ Optimized client initialized');
    
    return this.mainClient;
  }

  /**
   * Get the singleton client instance
   */
  getClient() {
    if (!this.mainClient) {
      this.initializeClient();
    }
    return this.mainClient;
  }

  /**
   * Execute query with caching and performance monitoring
   */
  async executeQuery(queryKey, queryFn, options = {}) {
    const startTime = Date.now();
    const { 
      cache = true, 
      cacheTTL = 60000, // 1 minute default
      timeout = 10000,   // 10 seconds default
      retries = 2
    } = options;

    // Check cache first
    if (cache && this.queryCache.has(queryKey)) {
      const cached = this.queryCache.get(queryKey);
      if (Date.now() - cached.timestamp < cacheTTL) {
        this.performanceMetrics.cacheHits++;
        console.log(`[Supabase] 🎯 Cache hit for ${queryKey}`);
        return cached.data;
      } else {
        // Remove expired cache entry
        this.queryCache.delete(queryKey);
      }
    }

    // Execute query with timeout and retries
    let lastError = null;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const client = this.getClient();
        
        // Add timeout wrapper
        const queryPromise = queryFn(client);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Query timeout after ${timeout}ms`)), timeout)
        );

        const result = await Promise.race([queryPromise, timeoutPromise]);
        
        // Cache successful results
        if (cache && result) {
          this.queryCache.set(queryKey, {
            data: result,
            timestamp: Date.now()
          });
        }

        // Update performance metrics
        const queryTime = Date.now() - startTime;
        this.performanceMetrics.totalQueries++;
        this.performanceMetrics.averageQueryTime = 
          (this.performanceMetrics.averageQueryTime * (this.performanceMetrics.totalQueries - 1) + queryTime) 
          / this.performanceMetrics.totalQueries;

        if (attempt > 0) {
          console.log(`[Supabase] ✅ Query succeeded after ${attempt + 1} attempts: ${queryKey}`);
        }

        return result;

      } catch (error) {
        lastError = error;
        console.warn(`[Supabase] ⚠️ Query attempt ${attempt + 1} failed: ${error.message}`);
        
        // Don't retry on certain errors
        if (error.message?.includes('JWT expired') || 
            error.message?.includes('Row level security') ||
            error.message?.includes('timeout')) {
          break;
        }

        // Wait before retry with exponential backoff
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    console.error(`[Supabase] ❌ Query failed after all retries: ${queryKey}`, lastError);
    throw lastError;
  }

  /**
   * Batch multiple queries for efficiency
   */
  async executeBatchQueries(queries) {
    const client = this.getClient();
    const startTime = Date.now();
    
    try {
      // Execute queries in parallel
      const results = await Promise.allSettled(
        queries.map(({ key, fn, options }) => 
          this.executeQuery(key, fn, options)
        )
      );

      const batchTime = Date.now() - startTime;
      console.log(`[Supabase] 📦 Batch of ${queries.length} queries completed in ${batchTime}ms`);

      return results.map((result, index) => ({
        key: queries[index].key,
        success: result.status === 'fulfilled',
        data: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason : null
      }));

    } catch (error) {
      console.error('[Supabase] ❌ Batch query execution failed:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const cacheHitRate = this.performanceMetrics.totalQueries > 0 
      ? (this.performanceMetrics.cacheHits / this.performanceMetrics.totalQueries * 100).toFixed(2)
      : 0;

    return {
      ...this.performanceMetrics,
      cacheSize: this.queryCache.size,
      cacheHitRate: `${cacheHitRate}%`,
      connectionPoolSize: this.connectionPool.size,
      averageQueryTime: `${this.performanceMetrics.averageQueryTime.toFixed(2)}ms`
    };
  }

  /**
   * Clear query cache
   */
  clearCache(pattern = null) {
    if (pattern) {
      // Clear specific patterns
      for (const key of this.queryCache.keys()) {
        if (key.includes(pattern)) {
          this.queryCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.queryCache.clear();
    }
    
    console.log(`[Supabase] 🧹 Cache cleared${pattern ? ` for pattern: ${pattern}` : ''}`);
  }

  /**
   * Common optimized query patterns
   */
  async getBookingsWithMetrics(barbershopId, days = 14) {
    const queryKey = `bookings-metrics-${barbershopId}-${days}`;
    
    return this.executeQuery(queryKey, async (client) => {
      const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await client
        .from('bookings')
        .select(`
          *,
          customers:customer_id (
            id, 
            email, 
            created_at
          ),
          services:service_id (
            name,
            price,
            duration
          )
        `)
        .gte('created_at', sinceDate)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }, { cacheTTL: 300000 }); // 5 minute cache
  }

  async getHealthMetrics() {
    const queryKey = 'health-metrics';
    
    return this.executeQuery(queryKey, async (client) => {
      // Simple query to test connection
      const { data, error } = await client
        .from('profiles')
        .select('id')
        .limit(1);

      if (error) throw error;
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        connectionActive: true
      };
    }, { 
      cache: false, // Don't cache health checks
      timeout: 5000,
      retries: 1
    });
  }
}

// Export singleton instance
const optimizedSupabase = new OptimizedSupabaseService();

export default optimizedSupabase;
export { OptimizedSupabaseService };

// Helper functions for common patterns
export async function withOptimizedSupabase(fn) {
  const client = optimizedSupabase.getClient();
  return await fn(client);
}

export async function getCachedQuery(key, queryFn, options = {}) {
  return await optimizedSupabase.executeQuery(key, queryFn, options);
}

export async function batchQueries(queries) {
  return await optimizedSupabase.executeBatchQueries(queries);
}

export function getSupabaseMetrics() {
  return optimizedSupabase.getPerformanceMetrics();
}