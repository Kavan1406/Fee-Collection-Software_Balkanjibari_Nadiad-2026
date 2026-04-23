'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import LoginPage from '@/components/LoginPage'
import DashboardLayout from '@/components/DashboardLayout'
import { useRouter } from 'next/navigation'

export default function StudentDashboardPage() {
  const { isAuthenticated, user, isLoading } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')
  const router = useRouter()

  if (!isLoading && !isAuthenticated) {
    return <LoginPage />
  }

  // Security: If not a student, send back to admin
  if (!isLoading && user?.role !== 'STUDENT') {
    router.replace('/admin')
    return null
  }

  return (
    <DashboardLayout
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      userRole="student"
    />
  )
}
