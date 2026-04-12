'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Users, CreditCard, AlertCircle, Plus, IndianRupee, Download, Loader2 } from 'lucide-react'
import { analyticsApi, DashboardStats, PaymentTrend, SubjectDistribution } from '@/lib/api/analytics'
import { enrollmentsApi, paymentsApi, subjectsApi } from '@/lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts'

interface DashboardPageProps {
  setCurrentPage: (page: string) => void
  userRole?: 'admin' | 'staff' | 'student' | 'accountant'
}

export default function DashboardPage({ setCurrentPage, userRole = 'staff' }: DashboardPageProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [trends, setTrends] = useState<PaymentTrend[]>([])
  const [distribution, setDistribution] = useState<SubjectDistribution[]>([])
  const [pendingStudents, setPendingStudents] = useState<any[]>([])
  const [recentOnlinePayments, setRecentOnlinePayments] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [updatingSubjectId, setUpdatingSubjectId] = useState<number | null>(null)

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      
      const [statsRes, enrollmentsRes, paymentsRes, trendsRes, distributionRes, subjectsRes] = await Promise.all([
        analyticsApi.getDashboardStats(),
        enrollmentsApi.getAll({ page_size: 100 }),
        paymentsApi.getAll({ page_size: 10 }),
        analyticsApi.getPaymentTrends(),
        analyticsApi.getSubjectDistribution(),
        subjectsApi.getAll()
      ])

      if (statsRes.success) setStats(statsRes.data || null)
      // @ts-ignore
      if (trendsRes.success) setTrends(trendsRes.data || trendsRes)
      // @ts-ignore
      if (distributionRes.success) setDistribution(distributionRes.data || distributionRes)
      
      if (subjectsRes.success) setSubjects(subjectsRes.data || [])

      if (enrollmentsRes.results) {
        const pending = enrollmentsRes.results
          .filter((e: any) => parseFloat(e.pending_amount) > 0)
          .sort((a: any, b: any) => parseFloat(b.pending_amount) - parseFloat(a.pending_amount))
          .slice(0, 10)
        setPendingStudents(pending)
      }

      if (paymentsRes.results) {
        const successful = paymentsRes.results
          .filter((p: any) => p.status === 'SUCCESS')
          .slice(0, 10)
        setRecentOnlinePayments(successful)
      }
    } catch (err: any) {
      setError('Failed to load dashboard data')
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const summaryCards = [
    {
      title: 'Total Students',
      value: stats ? Number(stats.total_students).toLocaleString() : '0',
      icon: Users,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Total Revenue',
      value: stats ? `₹${Number(stats.total_revenue).toLocaleString()}` : '₹0',
      icon: IndianRupee,
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Pending Fees',
      value: stats ? `₹${Number(stats.total_pending).toLocaleString()}` : '₹0',
      icon: AlertCircle,
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
    },
  ]
  const handleDownloadBulkIDs = async (subject: any) => {
    try {
      setRefreshing(true)
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
      const response = await fetch(`${baseUrl}/subjects/${subject.id}/download-bulk-id-cards/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      if (!response.ok) throw new Error('Failed to download bulk ID cards')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Bulk_ID_Cards_${subject.name.replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      alert(err.message || 'Error downloading bulk ID cards')
    } finally {
      setRefreshing(false)
    }
  }

  const handleExtendLimit = async (subjectId: number) => {
    try {
      setUpdatingSubjectId(subjectId);
      const subject = subjects.find(s => s.id === subjectId);
      const newMax = subject.max_seats + 10;
      await subjectsApi.update(subjectId, { max_seats: newMax });
      await fetchData(true);
    } catch (err) {
      console.error('Failed to extend limit', err);
    } finally {
      setUpdatingSubjectId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const handleDownloadReceipt = async (paymentId: number) => {
    try {
      await paymentsApi.downloadReceipt(paymentId)
    } catch (err: any) {
      console.error('Failed to download receipt', err)
    }
  }

  const handleDownloadIDCard = async (enrollmentId: number) => {
    try {
      await enrollmentsApi.downloadIdCard(enrollmentId)
    } catch (err: any) {
      console.error('Failed to download ID card', err)
    }
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-8 no-scrollbar overflow-y-auto h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div>
          <h1 className="h1 uppercase font-poppins">Institution Dashboard</h1>
          <p className="text-slate-400 dark:text-slate-400 mt-1 text-sm font-medium font-inter uppercase tracking-widest">Real-time institution metrics and student activity</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-xs uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-[0.98] shadow-sm disabled:opacity-50 font-poppins"
          >
            <TrendingUp size={14} className={refreshing ? 'animate-spin text-indigo-600' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Batch Capacity Management Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-xl text-indigo-600 dark:text-indigo-400">
                 <Users size={20} />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight font-poppins">Batch Capacity & Limits</h2>
           </div>
           {userRole === 'admin' && (
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-inter">Admin Control Active</span>
           )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => {
            const enrolledPercent = Math.min(100, (subject.enrolled_count / subject.max_seats) * 100);
            const isFull = subject.enrolled_count >= subject.max_seats;
            
            return (
              <div key={subject.id} className="bg-white dark:bg-slate-900 rounded-[28px] p-5 border border-slate-100 dark:border-slate-800 shadow-sm ring-1 ring-blue-500/5 hover:ring-blue-500/10 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase truncate font-poppins">{subject.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 font-inter">ID: {subject.id}</p>
                  </div>
                  {isFull ? (
                    <span className="bg-rose-50 text-rose-600 text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-rose-100">FULL</span>
                  ) : (
                    <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-emerald-100">ACTIVE</span>
                  )}
                </div>

                <div className="space-y-3">
                   <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-inter">Students</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white font-poppins">{subject.enrolled_count} <span className="text-xs text-slate-400 font-medium">/ {subject.max_seats}</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-inter">Utilization</p>
                        <p className={`text-sm font-black font-poppins ${enrolledPercent > 90 ? 'text-rose-500' : 'text-indigo-600'}`}>{Math.round(enrolledPercent)}%</p>
                      </div>
                   </div>

                   <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${enrolledPercent > 90 ? 'bg-rose-500' : 'bg-indigo-600'}`}
                        style={{ width: `${enrolledPercent}%` }}
                      />
                   </div>

                   {/* Extended Actions */}
                   <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                     <button
                       onClick={() => handleDownloadBulkIDs(subject)}
                       className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                     >
                       <Download className="w-3 h-3" />
                       Bulk ID Cards
                     </button>
                     
                     {userRole === 'admin' && (
                       <button
                         onClick={() => handleExtendLimit(subject.id)}
                         disabled={updatingSubjectId === subject.id}
                         className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50"
                       >
                         {updatingSubjectId === subject.id ? (
                           <Loader2 className="w-3 h-3 animate-spin" />
                         ) : (
                           <Plus className="w-3 h-3" />
                         )}
                         Extend (+10)
                       </button>
                     )}
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Section - Recent Payments */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-standard p-6">
            <h3 className="h3 mb-6 flex items-center gap-2">
              <CreditCard size={18} className="text-indigo-600" />
              Recent Successful Payments
            </h3>
            
            {/* Desktop Table View (Hidden below LG) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 font-inter">
                    <th className="pb-3 px-4">Student</th>
                    <th className="pb-3 px-4">Subject</th>
                    <th className="pb-3 px-4">Mode</th>
                    <th className="pb-3 px-4">Amount</th>
                    <th className="pb-3 px-4 text-center">Receipt</th>
                    <th className="pb-3 px-4 text-center">ID Card</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {recentOnlinePayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">No recent payments found</td>
                    </tr>
                  ) : (
                    recentOnlinePayments.map((payment: any) => (
                      <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="py-4 px-4">
                          <p className="font-medium text-slate-900 dark:text-white text-[14px] font-inter">{payment.student_name}</p>
                          <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider font-inter">ID: {payment.student_id}</p>
                        </td>
                        <td className="py-4 px-4 text-[13.5px] font-medium text-slate-600 dark:text-slate-400 font-inter">
                          {payment.subject_name}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider font-inter ${payment.payment_mode === 'ONLINE' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            }`}>
                            {payment.payment_mode}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white font-inter">
                          ₹{parseFloat(payment.amount).toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => handleDownloadReceipt(payment.id)}
                            className="w-10 h-10 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100/50"
                            title="Download Receipt"
                          >
                            <Download size={16} />
                          </button>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => handleDownloadIDCard(payment.enrollment)}
                            className="w-10 h-10 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all border border-emerald-100/50"
                            title="Download ID Card"
                          >
                            <Download size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet Card View (Visible below LG) */}
            <div className="lg:hidden grid grid-cols-1 gap-4">
              {recentOnlinePayments.length === 0 ? (
                <p className="py-8 text-center text-slate-500 text-sm italic">No recent payments found</p>
              ) : (
                recentOnlinePayments.map((payment: any) => (
                  <div key={payment.id} className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white text-sm truncate uppercase tracking-tight font-poppins">{payment.student_name}</p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest truncate mt-0.5 font-inter">{payment.subject_name}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase shrink-0 shadow-sm border ${
                        payment.payment_mode === 'ONLINE' 
                          ? 'bg-blue-50 text-blue-600 border-blue-100' 
                          : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>
                        {payment.payment_mode}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between py-3 px-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Amount</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white">₹{parseFloat(payment.amount).toLocaleString()}</span>
                    </div>
 
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleDownloadReceipt(payment.id)}
                        className="h-10 rounded-xl bg-slate-900 dark:bg-blue-600 text-white shadow-lg shadow-slate-900/10 dark:shadow-blue-500/10 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:scale-[1.02] transition-all active:scale-[0.98]"
                      >
                        <Download size={14} />
                        Receipt
                      </button>
                      <button
                        onClick={() => handleDownloadIDCard(payment.enrollment)}
                        className="h-10 rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:scale-[1.02] transition-all active:scale-[0.98]"
                      >
                        <Download size={14} />
                        ID Card
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-6 pt-4 border-t border-slate-50 flex justify-center">
              <button 
                onClick={() => setCurrentPage('payments')} 
                className="text-indigo-600 font-bold text-xs uppercase tracking-widest hover:text-indigo-700 transition-colors"
              >
                View all transactions
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Actions & Stats */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="h3 mb-6">Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => setCurrentPage('students')}
                className="w-full btn-standard btn-font bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
              >
                <Plus size={18} />
                <span>Add New Student</span>
              </button>
              <button
                onClick={() => setCurrentPage('payments')}
                className="w-full h-11 px-6 rounded-xl font-poppins font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-sm bg-emerald-500 text-white shadow-md hover:bg-emerald-600 shadow-emerald-500/10 uppercase tracking-widest"
              >
                <IndianRupee size={18} />
                <span>Record Payment</span>
              </button>
            </div>
          </div>

          {/* Pending Fees Widget */}
          <div className="glass-premium rounded-2xl p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm sm:text-base font-bold font-poppins flex items-center gap-2 text-gray-900 dark:text-white uppercase tracking-tight">
                <IndianRupee size={18} className="text-orange-600" />
                Pending Fees
              </h3>
              {pendingStudents.length > 0 && stats && (
                <span className="text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-1 rounded-full font-bold">
                  ₹{Number(stats.total_pending).toLocaleString()}
                </span>
              )}
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar">
              {pendingStudents.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 text-xs py-4 italic">No pending fees</p>
              ) : (
                pendingStudents.map((enrollment: any) => (
                  <div
                    key={enrollment.id}
                    className="p-3 bg-orange-50/50 dark:bg-orange-900/10 border border-orange-200/50 dark:border-orange-800/30 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors cursor-pointer"
                    onClick={() => setCurrentPage('payments')}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white text-xs truncate">
                          {enrollment.student.name}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                          {enrollment.subject.name}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-orange-600 dark:text-orange-400 shrink-0">
                        ₹{parseFloat(enrollment.pending_amount).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-[10px]">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">
                        Progress
                      </span>
                      <div className="w-20 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500"
                          style={{ width: `${(parseFloat(enrollment.paid_amount) / parseFloat(enrollment.total_fee)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 text-center">
              <button onClick={() => setCurrentPage('reports')} className="btn-standard h-9 px-4 text-[10px] font-bold uppercase tracking-widest text-orange-600 hover:bg-orange-50 border border-orange-100 dark:border-orange-900/30">
                View detailed report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
