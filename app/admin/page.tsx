'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import LoginPage from '@/components/LoginPage'
import DashboardLayout from '@/components/DashboardLayout'

export default function AdminPage() {
  const { isAuthenticated, user, isLoading } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')
  const router = typeof window !== 'undefined' ? require('next/navigation').useRouter() : null

  if (!isLoading && !isAuthenticated) {
    return <LoginPage />
  }

  // Security: If Student, redirect to student dashboard
  if (!isLoading && user?.role === 'STUDENT' && router) {
    router.replace('/dashboard')
    return null
  }

  return (
    <DashboardLayout
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      userRole={user?.role?.toLowerCase() as 'admin' | 'staff' | 'student' | 'accountant' || 'staff'}
    />
  )
}
