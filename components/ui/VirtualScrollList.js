'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'

/**
 * VirtualScrollList - High-performance virtual scrolling component
 * Renders only visible items to handle large datasets efficiently
 */
export default function VirtualScrollList({
  items = [],
  itemHeight = 80,
  bufferSize = 5,
  containerHeight = 600,
  renderItem,
  onLoadMore,
  hasMore = false,
  loading = false,
  emptyMessage = "No items to display",
  className = "",
  itemClassName = "",
  scrollThreshold = 0.8
}) {
  const [scrollTop, setScrollTop] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const containerRef = useRef(null)
  const scrollTimeoutRef = useRef(null)
  const lastLoadRef = useRef(Date.now())

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + bufferSize
    )
    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, bufferSize, items.length])

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1)
  }, [items, visibleRange])

  // Total height for scrollbar
  const totalHeight = items.length * itemHeight

  // Handle scroll with debouncing
  const handleScroll = useCallback((e) => {
    const newScrollTop = e.target.scrollTop
    
    // Debounce scroll updates for performance
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      setScrollTop(newScrollTop)
      
      // Check if we need to load more items
      if (hasMore && !isLoadingMore && onLoadMore) {
        const scrollPercentage = (newScrollTop + containerHeight) / totalHeight
        
        // Load more when scrolled past threshold
        if (scrollPercentage > scrollThreshold) {
          const now = Date.now()
          // Prevent rapid fire loads (min 500ms between loads)
          if (now - lastLoadRef.current > 500) {
            lastLoadRef.current = now
            handleLoadMore()
          }
        }
      }
    }, 10)
  }, [containerHeight, totalHeight, hasMore, isLoadingMore, onLoadMore, scrollThreshold])

  // Load more items
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !onLoadMore) return
    
    setIsLoadingMore(true)
    try {
      await onLoadMore()
    } catch (error) {
      console.error('Error loading more items:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, onLoadMore])

  // Scroll to item by index
  const scrollToItem = useCallback((index) => {
    if (containerRef.current) {
      const scrollPosition = index * itemHeight
      containerRef.current.scrollTop = scrollPosition
      setScrollTop(scrollPosition)
    }
  }, [itemHeight])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  // Handle empty state
  if (!loading && items.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 text-gray-500 ${className}`}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* Scrollable container */}
      <div
        ref={containerRef}
        className="overflow-auto"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        {/* Virtual height maintainer */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Rendered items */}
          {visibleItems.map((item, index) => {
            const actualIndex = visibleRange.startIndex + index
            const top = actualIndex * itemHeight
            
            return (
              <div
                key={item.id || actualIndex}
                className={`absolute w-full ${itemClassName}`}
                style={{
                  top,
                  height: itemHeight,
                }}
              >
                {renderItem(item, actualIndex)}
              </div>
            )
          })}
          
          {/* Loading indicator at bottom */}
          {(loading || isLoadingMore) && (
            <div
              className="absolute w-full flex items-center justify-center py-4"
              style={{
                top: items.length * itemHeight,
                height: itemHeight
              }}
            >
              <div className="flex items-center space-x-2">
                <div className="animate-spin h-5 w-5 border-2 border-olive-600 border-t-transparent rounded-full" />
                <span className="text-sm text-gray-600">Loading more...</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Scroll position indicator */}
      <div className="absolute right-2 top-2 bg-gray-900 bg-opacity-50 text-white text-xs px-2 py-1 rounded">
        {visibleRange.startIndex + 1}-{Math.min(visibleRange.endIndex + 1, items.length)} of {items.length}
      </div>
    </div>
  )
}

/**
 * Hook for managing virtual scroll data
 */
export function useVirtualScroll({
  fetchData,
  pageSize = 50,
  dependencies = []
}) {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Reset when dependencies change
  useEffect(() => {
    setItems([])
    setPage(1)
    setHasMore(true)
    loadInitialData()
  }, dependencies)

  // Load initial data
  const loadInitialData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchData(1, pageSize)
      setItems(data.items || [])
      setHasMore(data.hasMore ?? data.items?.length === pageSize)
      setPage(1)
    } catch (err) {
      setError(err.message)
      console.error('Failed to load initial data:', err)
    } finally {
      setLoading(false)
    }
  }, [fetchData, pageSize])

  // Load more data
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    
    const nextPage = page + 1
    setLoading(true)
    
    try {
      const data = await fetchData(nextPage, pageSize)
      setItems(prev => [...prev, ...(data.items || [])])
      setHasMore(data.hasMore ?? data.items?.length === pageSize)
      setPage(nextPage)
    } catch (err) {
      setError(err.message)
      console.error('Failed to load more data:', err)
    } finally {
      setLoading(false)
    }
  }, [fetchData, page, pageSize, hasMore, loading])

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    refresh: loadInitialData
  }
}