'use client'

import { useState, useEffect, lazy, Suspense } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Sidebar from './Sidebar'
import TopNavbar from './TopNavbar'
import { SkeletonTable } from '@/components/Skeleton'
import { setupPagePrefetching } from '@/lib/pagePreloader'

// Lazy load page components for better performance
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const StudentsPage = lazy(() => import('./pages/StudentsPage'))
const SubjectsPage = lazy(() => import('./pages/SubjectsPage'))
const EnrollmentsPage = lazy(() => import('./pages/EnrollmentsPage'))
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const RequestAcceptancePage = lazy(() => import('./pages/RequestAcceptancePage'))
const UserRolesPage = lazy(() => import('./pages/UserRolesPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'))
const StudentProfile = lazy(() => import('./pages/StudentProfile'))
const StudentSubjectsAndFees = lazy(() => import('./pages/StudentSubjectsAndFees'))
const StudentPayments = lazy(() => import('./pages/StudentPayments'))
const AccountantDashboard = lazy(() => import('./pages/AccountantDashboard'))

interface DashboardLayoutProps {
  currentPage: string
  setCurrentPage: (page: string) => void
  userRole: 'admin' | 'staff' | 'student' | 'accountant'
}

export default function DashboardLayout({
  currentPage,
  setCurrentPage: originalSetCurrentPage,
  userRole,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)
  const { logout, user } = useAuth()

  // Wrapped setCurrentPage to handle transitions
  const setCurrentPage = (page: string) => {
    if (page === currentPage) return
    setIsSwitching(true)
    originalSetCurrentPage(page)
    // Small timeout to allow the new component to mount and show its own skeletons/loading states
    setTimeout(() => setIsSwitching(false), 300)
  }

  // Initialize sidebar state on mount - only on client
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setSidebarOpen(true)
    }
    
    // Prefetch pages in background when idle for faster navigation
    setupPagePrefetching(user?.id)
  }, [user?.id])

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        if (userRole === 'student') return <StudentDashboard setCurrentPage={setCurrentPage} />
        if (userRole === 'accountant') return <AccountantDashboard setCurrentPage={setCurrentPage} />
        if (userRole === 'staff' && !user?.can_view_dashboard) return <div className="p-8 text-center font-bold text-slate-400">Access Denied</div>
        return <DashboardPage setCurrentPage={setCurrentPage} userRole={userRole} />
      case 'profile':
        if (userRole === 'student') return <StudentProfile />
        return <DashboardPage setCurrentPage={setCurrentPage} userRole={userRole} />
      case 'subjects-fees':
        if (userRole === 'student') return <StudentSubjectsAndFees />
        return <DashboardPage setCurrentPage={setCurrentPage} userRole={userRole} />
      case 'student-payments':
        if (userRole === 'student') return <StudentPayments />
        return <DashboardPage setCurrentPage={setCurrentPage} userRole={userRole} />

      case 'students':
        if (userRole === 'student') return <StudentDashboard setCurrentPage={setCurrentPage} />
        if (userRole === 'staff' && !user?.can_view_students) return <div className="p-8 text-center font-bold text-slate-400">Access Denied</div>
        return <StudentsPage userRole={userRole} canEdit={user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT' || user?.can_view_students} />
      case 'subjects':
        if (userRole === 'student') return <StudentDashboard setCurrentPage={setCurrentPage} />
        if (userRole === 'staff' && !user?.can_view_subjects) return <div className="p-8 text-center font-bold text-slate-400">Access Denied</div>
        return <SubjectsPage userRole={userRole} canEdit={user?.role === 'ADMIN' || user?.can_view_subjects} />
      case 'enrollments':
        if (userRole === 'student') return <StudentDashboard setCurrentPage={setCurrentPage} />
        if (userRole === 'staff' && !user?.can_view_enrollments) return <div className="p-8 text-center font-bold text-slate-400">Access Denied</div>
        return <EnrollmentsPage userRole={userRole} canEdit={user?.role === 'ADMIN' || user?.can_view_enrollments} />
      case 'payments':
        if (userRole === 'student') return <StudentDashboard setCurrentPage={setCurrentPage} />
        if (userRole === 'staff' && !user?.can_view_payments) return <div className="p-8 text-center font-bold text-slate-400">Access Denied</div>
        return <PaymentsPage userRole={userRole} canEdit={user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT' || user?.can_view_payments} />
      case 'ledger':
        return <DashboardPage setCurrentPage={setCurrentPage} userRole={userRole} />
      case 'analytics':
        if (userRole === 'student') return <StudentDashboard setCurrentPage={setCurrentPage} />
        if (userRole === 'staff' && !user?.can_view_analytics) return <div className="p-8 text-center font-bold text-slate-400">Access Denied</div>
        return <AnalyticsPage />
      case 'reports':
        if (userRole === 'student') return <StudentDashboard setCurrentPage={setCurrentPage} />
        if (userRole === 'staff' && !user?.can_view_reports) return <div className="p-8 text-center font-bold text-slate-400">Access Denied</div>
        return <ReportsPage userRole={userRole} />
      case 'request-acceptance':
        if (userRole === 'student') return <StudentDashboard setCurrentPage={setCurrentPage} />
        if (userRole === 'staff' && !user?.can_view_registration_requests) return <div className="p-8 text-center font-bold text-slate-400">Access Denied</div>
        return <RequestAcceptancePage userRole={userRole} />
      case 'users':
        if (userRole !== 'admin') {
          if (userRole === 'staff' && user?.can_view_users) return <UserRolesPage />
          return userRole === 'student' ? <StudentDashboard setCurrentPage={setCurrentPage} /> : <DashboardPage setCurrentPage={setCurrentPage} userRole={userRole} />
        }
        return <UserRolesPage />
      case 'settings':
        if (userRole === 'student') return <StudentDashboard setCurrentPage={setCurrentPage} />
        if (userRole === 'staff' && !user?.can_view_settings) return <div className="p-8 text-center font-bold text-slate-400">Access Denied</div>
        return <SettingsPage userRole={userRole} canEdit={user?.role === 'ADMIN' || user?.can_view_settings} />
      default:
        return userRole === 'student' ? <StudentDashboard setCurrentPage={setCurrentPage} /> : <DashboardPage setCurrentPage={setCurrentPage} userRole={userRole} />
    }
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden relative">
      <Sidebar
        currentPage={currentPage}
          setCurrentPage={(page) => {
            setCurrentPage(page)
            if (typeof window !== 'undefined' && window.innerWidth < 1024) setSidebarOpen(false)
          }}
        user={user}
        isOpen={sidebarOpen}
        onLogout={logout}
      />
      
      {/* Mobile/Tablet Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-slate-50">
        <TopNavbar
          onLogout={logout}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          userName={user?.full_name || user?.username}
          userRole={user?.role}
          setCurrentPage={setCurrentPage}
          currentPage={currentPage}
          isSidebarOpen={sidebarOpen}
        />
        <main className="flex-1 overflow-y-auto no-scrollbar scrolling-touch relative z-10 transition-all duration-500">
          <div className={`page-container transition-opacity duration-300 ${isSwitching ? 'opacity-0' : 'opacity-100'}`}>
            <Suspense fallback={<div className="p-8"><SkeletonTable rows={10} /></div>}>
              {isSwitching ? (
                <div className="p-8">
                   <SkeletonTable rows={10} />
                </div>
              ) : renderPage()}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
