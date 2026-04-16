'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ArrowUp, Users, CreditCard, TrendingUp } from 'lucide-react'
import { analyticsApi } from '@/lib/api/analytics'
import { useOptimizedDashboardData } from '@/lib/hooks/useOptimizedDataLoading'

export default function DashboardPage() {
  const { dashboardData, loading, error, loadDashboardData, refresh } = useOptimizedDashboardData()

  useEffect(() => {
    loadDashboardData()
  }, [])

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
    payments = {},
    enrollments = {},
    subjects = [],
    trends = [],
    recent_enrollments = [],
  } = dashboardData

  // Colors for charts
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

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

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Students */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {students.online || 0} Online • {students.offline || 0} Offline
            </p>
            <p className="text-xs text-green-600 mt-1">
              +{students.new_this_month || 0} new this month
            </p>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(fees.total_collected || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Collection Rate: {fees.collection_rate_percentage || 0}%
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Online: ₹{(fees.online_collected || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>

        {/* Pending Fees */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Fees</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(fees.total_pending || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Total Receivable: ₹{(fees.total_receivable || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>

        {/* Enrollments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
            <ArrowUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enrollments.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active: {enrollments.active || 0} • Completed: {enrollments.completed || 0}
            </p>
            <p className="text-xs text-green-600 mt-1">
              +{enrollments.new_this_month || 0} new this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Payment Trends */}
        {trends && trends.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Trends (Last 6 Months)</CardTitle>
              <CardDescription>Monthly payment collection</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#3b82f6"
                    name="Collection Amount"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Subject Distribution */}
        {subjects && subjects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Subjects</CardTitle>
              <CardDescription>Enrollment distribution by subject</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={subjects.slice(0, 5)}
                    dataKey="enrolled_count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                  >
                    {subjects.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Subject-wise Breakdown */}
      {subjects && subjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Subject-wise Performance</CardTitle>
            <CardDescription>Revenue and enrollment by subject</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2">Subject</th>
                    <th className="text-right py-2">Enrolled</th>
                    <th className="text-right py-2">Revenue</th>
                    <th className="text-right py-2">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.slice(0, 10).map((subject) => (
                    <tr key={subject.id} className="border-b hover:bg-gray-50">
                      <td className="py-2">{subject.name}</td>
                      <td className="text-right">{subject.enrolled_count}</td>
                      <td className="text-right">
                        ₹{subject.total_revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="text-right text-red-600">
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

      {/* Recent Enrollments */}
      {recent_enrollments && recent_enrollments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Enrollments</CardTitle>
            <CardDescription>Latest 10 student enrollments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2">Student Name</th>
                    <th className="text-left py-2">Subject</th>
                    <th className="text-left py-2">Batch</th>
                    <th className="text-right py-2">Fee</th>
                    <th className="text-right py-2">Paid</th>
                    <th className="text-right py-2">Pending</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_enrollments.map((enrollment, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-2">{enrollment.student_name}</td>
                      <td className="py-2">{enrollment.subject}</td>
                      <td className="py-2">{enrollment.batch_time}</td>
                      <td className="text-right py-2">
                        ₹{enrollment.total_fee.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="text-right py-2 text-green-600">
                        ₹{enrollment.paid_amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="text-right py-2 text-red-600">
                        ₹{enrollment.pending_amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
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
