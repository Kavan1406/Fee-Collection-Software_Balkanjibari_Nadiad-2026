/**
 * usePagePrefetch Hook
 * Provides prefetching capabilities for navigation items
 */

import { useCallback } from 'react'
import { preloadPage } from '@/lib/pagePreloader'

export function usePagePrefetch() {
  const prefetchOnHover = useCallback((pageName: string) => {
    // Prefetch page on hover for better perceived performance
    preloadPage(pageName)
  }, [])

  return { prefetchOnHover }
}
