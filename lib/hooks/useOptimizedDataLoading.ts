/**
 * Optimized Data Loading Hooks
 * Session 14 - April 16, 2026
 * 
 * Performance optimizations for:
 * - Dashboard page (prefetch with caching)
 * - Enrollments list (pagination + prefetch)
 * - Users/Students list (pagination + indexed search)
 */

import { useCallback, useEffect, useState, useRef } from 'react'
import apiClient from '@/lib/api/client'

interface PaginationParams {
  page: number
  pageSize: number
  search?: string
  ordering?: string
}

interface PaginatedResponse<T> {
  success: boolean
  data: {
    count: number
    next: string | null
    previous: string | null
    results: T[]
  }
}

/**
 * Hook for optimized paginated data loading with client-side caching
 */
export function useOptimizedPaginatedData<T>(
  endpoint: string,
  pageSize: number = 20
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  const cacheRef = useRef<Map<string, any>>(new Map())
  const abortControllerRef = useRef<AbortController | null>(null)

  const loadPage = useCallback(
    async (page: number, searchTerm?: string, ordering?: string) => {
      // Check cache first
      const cacheKey = `${page}-${searchTerm}-${ordering}`
      if (cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey)
        setData(cached.results)
        setTotalCount(cached.count)
        return
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      setLoading(true)
      setError(null)

      try {
        const params: any = {
          page,
          page_size: pageSize,
        }
        if (searchTerm) params.search = searchTerm
        if (ordering) params.ordering = ordering

        const response = await apiClient.get<PaginatedResponse<T>>(
          endpoint,
          { 
            params,
            signal: abortControllerRef.current.signal
          }
        )

        const results = response.data.data.results
        const count = response.data.data.count

        // Cache the result
        cacheRef.current.set(cacheKey, { results, count })

        // Limit cache size to 10 pages
        if (cacheRef.current.size > 10) {
          const firstKey = cacheRef.current.keys().next().value
          cacheRef.current.delete(firstKey)
        }

        setData(results)
        setTotalCount(count)
        setCurrentPage(page)
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to load data')
        }
      } finally {
        setLoading(false)
      }
    },
    [endpoint, pageSize]
  )

  const totalPages = Math.ceil(totalCount / pageSize)

  return {
    data,
    loading,
    error,
    currentPage,
    totalPages,
    totalCount,
    loadPage,
    goToPage: (page: number) => loadPage(page),
    nextPage: () => loadPage(currentPage + 1),
    prevPage: () => loadPage(Math.max(1, currentPage - 1)),
    search: (term: string) => loadPage(1, term),
    clearCache: () => cacheRef.current.clear(),
  }
}

/**
 * Hook for optimized dashboard data loading with 5-minute caching
 */
export function useOptimizedDashboardData() {
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const cacheTimeRef = useRef<number>(0)
  const cacheDataRef = useRef<any>(null)
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  const loadDashboardData = useCallback(async (forceRefresh = false) => {
    const now = Date.now()

    // Check if we have valid cached data
    if (
      !forceRefresh &&
      cacheDataRef.current &&
      now - cacheTimeRef.current < CACHE_DURATION
    ) {
      setDashboardData(cacheDataRef.current)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await apiClient.get('/api/v1/analytics/admin_dashboard_comprehensive/')
      
      if (response.data.success) {
        cacheDataRef.current = response.data.data
        cacheTimeRef.current = now
        setDashboardData(response.data.data)
      } else {
        throw new Error('Failed to load dashboard data')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    dashboardData,
    loading,
    error,
    loadDashboardData,
    refresh: () => loadDashboardData(true),
  }
}

/**
 * Hook for search with debouncing to reduce API calls
 */
export function useDebouncedSearch(
  onSearch: (term: string) => void,
  delay: number = 300
) {
  const [searchTerm, setSearchTerm] = useState('')
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleSearch = useCallback(
    (term: string) => {
      setSearchTerm(term)

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      debounceTimerRef.current = setTimeout(() => {
        onSearch(term)
      }, delay)
    },
    [onSearch, delay]
  )

  return {
    searchTerm,
    setSearchTerm: handleSearch,
  }
}

/**
 * Hook for intersection observer (lazy loading)
 */
export function useIntersectionObserver(
  callback: () => void,
  options: IntersectionObserverInit = {}
) {
  const elementRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!elementRef.current) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true)
        callback()
      }
    }, {
      threshold: 0.1,
      ...options,
    })

    observer.observe(elementRef.current)

    return () => observer.disconnect()
  }, [callback, options])

  return { elementRef, isVisible }
}

/**
 * Hook for prefetching data
 */
export function usePrefetchData(
  endpoint: string,
  params?: Record<string, any>
) {
  const prefetch = useCallback(async () => {
    try {
      await apiClient.get(endpoint, { params })
    } catch (err) {
      console.error('Prefetch error:', err)
    }
  }, [endpoint, params])

  return { prefetch }
}
