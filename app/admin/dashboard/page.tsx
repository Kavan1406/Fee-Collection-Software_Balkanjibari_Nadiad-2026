'use client'

import React, { useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, CreditCard, BookOpen, TrendingUp } from 'lucide-react'
import { useOptimizedDashboardData } from '@/lib/hooks/useOptimizedDataLoading'

export default function DashboardPage() {
  const { dashboardData, loading, error, loadDashboardData, refresh } = useOptimizedDashboardData()
  const loadedRef = useRef(false)

  useEffect(() => {
    // Load data only once on mount
    if (!loadedRef.current) {
      loadedRef.current = true
      loadDashboardData()
    }
  }, []) // Empty dependency array - load only once

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          <p>Error loading dashboard: {error}</p>
          <button
            onClick={() => refresh()}
            className="mt-2 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return <div className="p-8">No data available</div>
  }

  const {
    students = {},
    fees = {},
    enrollments = {},
    subjects = [],
    recent_enrollments = [],
  } = dashboardData

  return (
    <div className="space-y-6 p-6 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={() => refresh()}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Key Metrics - Simple Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Students */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.total || 0}</div>
            <p className="text-xs text-gray-600 mt-2">
              Online: {students.online || 0} | Offline: {students.offline || 0}
            </p>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(fees.total_collected || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Collection Rate: {fees.collection_rate_percentage || 0}%
            </p>
          </CardContent>
        </Card>

        {/* Pending Fees */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Fees</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(fees.total_pending || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Receivable: ₹{(fees.total_receivable || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>

        {/* Total Enrollments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
            <BookOpen className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enrollments.total || 0}</div>
            <p className="text-xs text-gray-600 mt-2">
              Active: {enrollments.active || 0} | Completed: {enrollments.completed || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subject-wise Breakdown Table */}
      {subjects && subjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Subject-wise Breakdown</CardTitle>
            <CardDescription>Revenue and enrollment by subject</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Subject Name</th>
                    <th className="text-right py-3 px-4 font-semibold">Enrolled</th>
                    <th className="text-right py-3 px-4 font-semibold">Total Revenue</th>
                    <th className="text-right py-3 px-4 font-semibold">Pending Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.slice(0, 15).map((subject) => (
                    <tr key={subject.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{subject.name}</td>
                      <td className="text-right py-3 px-4 font-medium">{subject.enrolled_count}</td>
                      <td className="text-right py-3 px-4 text-green-600">
                        ₹{subject.total_revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="text-right py-3 px-4 text-red-600">
                        ₹{subject.pending_revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Enrollments Table */}
      {recent_enrollments && recent_enrollments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Enrollments</CardTitle>
            <CardDescription>Latest student enrollments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Student Name</th>
                    <th className="text-left py-3 px-4 font-semibold">Subject</th>
                    <th className="text-left py-3 px-4 font-semibold">Batch</th>
                    <th className="text-right py-3 px-4 font-semibold">Total Fee</th>
                    <th className="text-right py-3 px-4 font-semibold">Paid</th>
                    <th className="text-right py-3 px-4 font-semibold">Pending</th>
                    <th className="text-center py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_enrollments.slice(0, 10).map((enrollment, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{enrollment.student_name}</td>
                      <td className="py-3 px-4">{enrollment.subject}</td>
                      <td className="py-3 px-4">{enrollment.batch_time}</td>
                      <td className="text-right py-3 px-4">
                        ₹{enrollment.total_fee.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="text-right py-3 px-4 text-green-600 font-medium">
                        ₹{enrollment.paid_amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="text-right py-3 px-4 text-red-600 font-medium">
                        ₹{enrollment.pending_amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="text-center py-3 px-4">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            enrollment.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : enrollment.status === 'COMPLETED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {enrollment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
