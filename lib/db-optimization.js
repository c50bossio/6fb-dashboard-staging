/**
 * Database query optimization utilities
 */

import { createClient } from '@supabase/supabase-js'
import cacheManager from './cache-manager'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const queryCache = new Map()
const CACHE_TTL = 60000 // 1 minute default

/**
 * Optimized database query with caching and pagination
 */
export async function optimizedQuery(table, options = {}) {
  const {
    select = '*',
    filter = {},
    orderBy = null,
    limit = 50,
    offset = 0,
    cacheTTL = CACHE_TTL,
    forceRefresh = false
  } = options
  
  const cacheKey = JSON.stringify({ table, select, filter, orderBy, limit, offset })
  
  if (!forceRefresh) {
    const cached = cacheManager.getMemoryCache(cacheKey)
    if (cached) {
      return cached
    }
  }
  
  let query = supabase.from(table).select(select, { count: 'exact' })
  
  Object.entries(filter).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      query = query.in(key, value)
    } else if (typeof value === 'object' && value !== null) {
      Object.entries(value).forEach(([operator, val]) => {
        query = query[operator](key, val)
      })
    } else {
      query = query.eq(key, value)
    }
  })
  
  if (orderBy) {
    const { column, ascending = true } = orderBy
    query = query.order(column, { ascending })
  }
  
  query = query.range(offset, offset + limit - 1)
  
  const { data, error, count } = await query
  
  if (error) {
    throw error
  }
  
  const result = {
    data,
    count,
    hasMore: count > offset + limit,
    nextOffset: offset + limit
  }
  
  cacheManager.setMemoryCache(cacheKey, result, cacheTTL)
  
  return result
}

/**
 * Batch query optimization - fetch multiple related records efficiently
 */
export async function batchQuery(queries) {
  const results = await Promise.all(
    queries.map(({ table, ...options }) => 
      optimizedQuery(table, options).catch(err => ({
        error: err.message,
        table
      }))
    )
  )
  
  return results.reduce((acc, result, index) => {
    acc[queries[index].table] = result
    return acc
  }, {})
}

/**
 * Optimized relationship loading with N+1 query prevention
 */
export async function loadWithRelations(table, options = {}) {
  const {
    relations = [],
    ...queryOptions
  } = options
  
  const mainResult = await optimizedQuery(table, queryOptions)
  
  if (!mainResult.data || mainResult.data.length === 0) {
    return mainResult
  }
  
  const relationPromises = relations.map(async relation => {
    const {
      table: relTable,
      foreignKey,
      localKey = 'id',
      select = '*'
    } = relation
    
    const ids = [...new Set(mainResult.data.map(item => item[localKey]))]
    
    const { data } = await supabase
      .from(relTable)
      .select(select)
      .in(foreignKey, ids)
    
    return { relTable, foreignKey, localKey, data }
  })
  
  const relationResults = await Promise.all(relationPromises)
  
  mainResult.data = mainResult.data.map(item => {
    const enriched = { ...item }
    
    relationResults.forEach(({ relTable, foreignKey, localKey, data }) => {
      enriched[relTable] = data.filter(
        relItem => relItem[foreignKey] === item[localKey]
      )
    })
    
    return enriched
  })
  
  return mainResult
}

/**
 * Connection pooling simulation for better performance
 */
class ConnectionPool {
  constructor(maxConnections = 10) {
    this.pool = []
    this.activeConnections = 0
    this.maxConnections = maxConnections
    this.waitingQueue = []
  }
  
  async acquire() {
    if (this.activeConnections < this.maxConnections) {
      this.activeConnections++
      return this.createConnection()
    }
    
    return new Promise(resolve => {
      this.waitingQueue.push(resolve)
    })
  }
  
  release(connection) {
    if (this.waitingQueue.length > 0) {
      const resolve = this.waitingQueue.shift()
      resolve(connection)
    } else {
      this.activeConnections--
    }
  }
  
  createConnection() {
    return {
      query: async (fn) => {
        try {
          return await fn(supabase)
        } finally {
          this.release(this)
        }
      }
    }
  }
}

const connectionPool = new ConnectionPool()

/**
 * Execute query with connection pooling
 */
export async function pooledQuery(queryFn) {
  const connection = await connectionPool.acquire()
  return connection.query(queryFn)
}

/**
 * Query result streaming for large datasets
 */
export async function* streamQuery(table, options = {}) {
  const { batchSize = 100, ...queryOptions } = options
  let offset = 0
  let hasMore = true
  
  while (hasMore) {
    const result = await optimizedQuery(table, {
      ...queryOptions,
      limit: batchSize,
      offset
    })
    
    if (result.data && result.data.length > 0) {
      yield result.data
      offset += batchSize
      hasMore = result.hasMore
    } else {
      hasMore = false
    }
  }
}

/**
 * Aggregation query optimization
 */
export async function aggregateQuery(table, options = {}) {
  const {
    groupBy = [],
    aggregations = [],
    filter = {},
    having = {}
  } = options
  
  let selectFields = groupBy.join(', ')
  
  aggregations.forEach(({ field, operation, alias }) => {
    if (selectFields) selectFields += ', '
    selectFields += `${operation}(${field}) as ${alias || `${operation}_${field}`}`
  })
  
  let query = supabase.from(table).select(selectFields)
  
  Object.entries(filter).forEach(([key, value]) => {
    query = query.eq(key, value)
  })
  
  const { data, error } = await query
  
  if (error) throw error
  
  if (Object.keys(having).length > 0) {
    return data.filter(row => {
      return Object.entries(having).every(([key, condition]) => {
        const value = row[key]
        if (typeof condition === 'object') {
          if ('gt' in condition) return value > condition.gt
          if ('lt' in condition) return value < condition.lt
          if ('gte' in condition) return value >= condition.gte
          if ('lte' in condition) return value <= condition.lte
        }
        return value === condition
      })
    })
  }
  
  return data
}

/**
 * Intelligent query prefetching
 */
export class QueryPrefetcher {
  constructor() {
    this.prefetchQueue = []
    this.prefetchInterval = null
  }
  
  start(interval = 5000) {
    if (this.prefetchInterval) return
    
    this.prefetchInterval = setInterval(() => {
      this.processPrefetchQueue()
    }, interval)
  }
  
  stop() {
    if (this.prefetchInterval) {
      clearInterval(this.prefetchInterval)
      this.prefetchInterval = null
    }
  }
  
  addPrefetch(table, options) {
    this.prefetchQueue.push({ table, options, priority: options.priority || 0 })
    this.prefetchQueue.sort((a, b) => b.priority - a.priority)
  }
  
  async processPrefetchQueue() {
    if (this.prefetchQueue.length === 0) return
    
    const batch = this.prefetchQueue.splice(0, 3)
    
    await Promise.all(
      batch.map(({ table, options }) => 
        optimizedQuery(table, { ...options, cacheTTL: 300000 }) // 5 min cache
          .catch(err => console.warn('Prefetch failed:', err))
      )
    )
  }
}

const prefetcher = new QueryPrefetcher()

export function useOptimizedQuery(table, options = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    let cancelled = false
    
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await optimizedQuery(table, options)
        if (!cancelled) {
          setData(result)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err)
          setData(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    
    fetchData()
    
    return () => {
      cancelled = true
    }
  }, [table, JSON.stringify(options)])
  
  return { data, loading, error }
}

export function useInfiniteQuery(table, options = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState(null)
  const offsetRef = useRef(0)
  
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    
    setLoading(true)
    try {
      const result = await optimizedQuery(table, {
        ...options,
        offset: offsetRef.current
      })
      
      setData(prev => [...prev, ...result.data])
      setHasMore(result.hasMore)
      offsetRef.current = result.nextOffset
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [table, options, loading, hasMore])
  
  useEffect(() => {
    loadMore()
  }, []) // Only run on mount
  
  return { data, loading, hasMore, error, loadMore }
}

import { useState, useEffect, useCallback, useRef } from 'react'

if (typeof window !== 'undefined') {
  prefetcher.start()
}

export default {
  optimizedQuery,
  batchQuery,
  loadWithRelations,
  pooledQuery,
  streamQuery,
  aggregateQuery,
  QueryPrefetcher,
  prefetcher,
  useOptimizedQuery,
  useInfiniteQuery
}