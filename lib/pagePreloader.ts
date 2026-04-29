/**
 * Page Preloader Utility
 * Intelligently prefetches dashboard pages based on user navigation patterns
 */

// Map of frequently accessed pages by user role
const PAGE_PRELOAD_MAP: Record<string, string[]> = {
  'admin': ['dashboard', 'students', 'payments', 'enrollments', 'subjects'],
  'staff': ['dashboard', 'students', 'payments', 'enrollments'],
  'accountant': ['dashboard', 'payments', 'reports'],
  'student': ['profile', 'subjects-fees', 'student-payments'],
}

// Track which pages are already being preloaded
const preloadedPages = new Set<string>()

/**
 * Preload a page component using requestIdleCallback
 * Falls back to setTimeout if requestIdleCallback is not available
 */
export function preloadPage(pageName: string): void {
  if (preloadedPages.has(pageName)) {
    return // Already preloaded
  }

  const preloadFn = () => {
    // Dynamic import triggers module bundling
    // All imports use relative paths from components directory
    switch (pageName) {
      case 'dashboard':
        import('../components/pages/DashboardPage')
        break
      case 'students':
        import('../components/pages/StudentsPage')
        break
      case 'subjects':
        import('../components/pages/SubjectsPage')
        break
      case 'enrollments':
        import('../components/pages/EnrollmentsPage')
        break
      case 'payments':
        import('../components/pages/PaymentsPage')
        break
      case 'analytics':
        import('../components/pages/AnalyticsPage')
        break
      case 'reports':
        import('../components/pages/ReportsPage')
        break
      case 'request-acceptance':
        import('../components/pages/RequestAcceptancePage')
        break
      case 'users':
        import('../components/pages/UserRolesPage')
        break
      case 'settings':
        import('../components/pages/SettingsPage')
        break
      case 'profile':
        import('../components/pages/StudentProfile')
        break
      case 'subjects-fees':
        import('../components/pages/StudentSubjectsAndFees')
        break
      case 'student-payments':
        import('../components/pages/StudentPayments')
        break
    }

    preloadedPages.add(pageName)
  }

  // Use requestIdleCallback if available, otherwise defer with setTimeout
  if ('requestIdleCallback' in window) {
    requestIdleCallback(preloadFn, { timeout: 2000 })
  } else {
    setTimeout(preloadFn, 2000)
  }
}

/**
 * Preload pages recommended for the user's role
 */
export function preloadRolePages(userRole: 'admin' | 'staff' | 'student' | 'accountant'): void {
  const pages = PAGE_PRELOAD_MAP[userRole] || []
  pages.forEach(page => preloadPage(page))
}

/**
 * Preload pages on hover over navigation items
 * (Aggressive idle preloading disabled to prevent browser 'preloaded but not used' warnings)
 */
export function setupPagePrefetching(userId: string | undefined): void {
  if (!userId) return;
  
  // We no longer pre-fetch on idle by default to save bandwidth and keep logs clean.
  // The hover-based prefetching in the Sidebar provides enough snappiness.
}

/**
 * Clear preload cache (useful for low-memory scenarios)
 */
export function clearPreloadCache(): void {
  preloadedPages.clear()
}
