'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import LoginPage from '@/components/LoginPage'
import DashboardLayout from '@/components/DashboardLayout'

export default function AdminPage() {
  const { isAuthenticated, user, isLoading } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return (
    <DashboardLayout
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      userRole={user?.role.toLowerCase() as 'admin' | 'staff' | 'student' | 'accountant'}
    />
  )
}
