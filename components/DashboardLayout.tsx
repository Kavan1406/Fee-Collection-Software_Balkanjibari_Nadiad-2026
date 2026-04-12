'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Sidebar from './Sidebar'
import TopNavbar from './TopNavbar'
import DashboardPage from './pages/DashboardPage'
import StudentsPage from './pages/StudentsPage'
import SubjectsPage from './pages/SubjectsPage'
import EnrollmentsPage from './pages/EnrollmentsPage'
import PaymentsPage from './pages/PaymentsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ReportsPage from './pages/ReportsPage'
import UserRolesPage from './pages/UserRolesPage'
import SettingsPage from './pages/SettingsPage'
import StudentDashboard from './pages/StudentDashboard'
import StudentProfile from './pages/StudentProfile'
import StudentSubjectsAndFees from './pages/StudentSubjectsAndFees'
import StudentPayments from './pages/StudentPayments'
import AccountantDashboard from '@/components/pages/AccountantDashboard'
import StudentLedgerPage from '@/components/pages/StudentLedgerPage'
import RequestAcceptancePage from '@/components/pages/RequestAcceptancePage'

interface DashboardLayoutProps {
  currentPage: string
  setCurrentPage: (page: string) => void
  userRole: 'admin' | 'staff' | 'student' | 'accountant'
}

export default function DashboardLayout({
  currentPage,
  setCurrentPage,
  userRole,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { logout, user } = useAuth()

  // Initialize sidebar state on mount - only on client
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setSidebarOpen(true)
    }
  }, [])

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
      case 'requests':
        if (userRole === 'student') return <StudentDashboard setCurrentPage={setCurrentPage} />
        return <RequestAcceptancePage />
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
        if (userRole === 'student') return <StudentDashboard setCurrentPage={setCurrentPage} />
        return <StudentLedgerPage userRole={userRole} />
      case 'analytics':
        if (userRole === 'student') return <StudentDashboard setCurrentPage={setCurrentPage} />
        if (userRole === 'staff' && !user?.can_view_analytics) return <div className="p-8 text-center font-bold text-slate-400">Access Denied</div>
        return <AnalyticsPage />
      case 'reports':
        if (userRole === 'student') return <StudentDashboard setCurrentPage={setCurrentPage} />
        if (userRole === 'staff' && !user?.can_view_reports) return <div className="p-8 text-center font-bold text-slate-400">Access Denied</div>
        return <ReportsPage userRole={userRole} />
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
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden relative">
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

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-slate-50 dark:bg-slate-900">
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
          <div className="page-container">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  )
}
