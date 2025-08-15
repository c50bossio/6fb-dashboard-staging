'use client'

import { useState, useEffect } from 'react'

/**
 * Shared hook for API data fetching with consistent loading/error patterns
 * Standardizes data loading across all dashboard pages
 */
export function useApiData(endpoint, options = {}) {
  const {
    dependencies = [],
    enabled = true,
    timeout = 5000,
    retries = 1,
    transform = (data) => data
  } = options

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(null)
  const [lastFetch, setLastFetch] = useState(null)

  const fetchData = async (attempt = 0) => {
    if (!enabled || !endpoint) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(endpoint, {
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      const transformedData = transform(result)
      
      setData(transformedData)
      setLastFetch(new Date())
      setError(null)
    } catch (error) {
      console.error(`API fetch error for ${endpoint}:`, error)
      
      if (attempt < retries && error.name !== 'AbortError') {
        console.log(`Retrying ${endpoint} (attempt ${attempt + 1}/${retries})`)
        setTimeout(() => fetchData(attempt + 1), 1000 * (attempt + 1))
        return
      }

      setError({
        message: error.message || 'Failed to load data',
        code: error.name || 'FETCH_ERROR',
        timestamp: new Date()
      })
    } finally {
      setLoading(false)
    }
  }

  const refetch = () => {
    fetchData()
  }

  useEffect(() => {
    fetchData()
  }, [endpoint, enabled, ...dependencies])

  return {
    data,
    loading,
    error,
    refetch,
    lastFetch
  }
}

/**
 * Hook for authentication-aware API data fetching
 * Waits for auth to complete before making requests
 */
export function useAuthenticatedApiData(endpoint, user, options = {}) {
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    setAuthReady(!!user?.id || options.allowUnauthenticated)
  }, [user?.id, options.allowUnauthenticated])

  return useApiData(endpoint, {
    ...options,
    enabled: authReady && (options.enabled !== false),
    dependencies: [user?.id, ...(options.dependencies || [])]
  })
}

/**
 * Hook for paginated API data
 */
export function usePaginatedApiData(endpoint, options = {}) {
  const [page, setPage] = useState(1)
  const [allData, setAllData] = useState([])
  const [hasMore, setHasMore] = useState(true)

  const paginatedEndpoint = endpoint ? `${endpoint}?page=${page}&limit=${options.limit || 20}` : null

  const { data, loading, error, refetch } = useApiData(paginatedEndpoint, {
    ...options,
    dependencies: [page, ...(options.dependencies || [])],
    transform: (result) => {
      const items = result.items || result.data || []
      const total = result.total || result.count || 0
      const currentPage = result.page || page
      const limit = result.limit || options.limit || 20
      
      return {
        items,
        total,
        page: currentPage,
        hasMore: (currentPage * limit) < total
      }
    }
  })

  useEffect(() => {
    if (data?.items) {
      if (page === 1) {
        setAllData(data.items)
      } else {
        setAllData(prev => [...prev, ...data.items])
      }
      setHasMore(data.hasMore)
    }
  }, [data, page])

  const loadMore = () => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1)
    }
  }

  const refresh = () => {
    setPage(1)
    setAllData([])
    setHasMore(true)
    refetch()
  }

  return {
    data: allData,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    totalCount: data?.total || 0
  }
}