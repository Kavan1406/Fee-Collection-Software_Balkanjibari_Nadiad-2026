'use client'

import { useState, useEffect } from 'react'
import { BookOpen, CreditCard, AlertCircle, Loader2, Download, IdCard, LayoutDashboard, Settings, LogOut, Users, BookOpen as BookIcon, LogIn, BarChart3, FileText, Lock, CheckCircle } from 'lucide-react'
import { analyticsApi, paymentsApi, enrollmentsApi } from '@/lib/api'
import { API_BASE_URL, getMediaUrl } from '@/lib/api/client'
import { useNotifications } from '@/hooks/useNotifications'

interface StudentStats {
  student_name: string
  student_id: string
  photo?: string
  gender: string
  phone: string
  email: string
  area: string
  address: string
  enrollment_date: string
  subjects_count: number
  total_fee: number
  total_paid: number
  total_pending: number
  enrolled_subjects: Array<{
    name: string
    duration: string
    total_fee: number
    paid_amount: number
    pending_amount: number
    status: string
    enrollment_id: string
    id: number
    activity_type?: string
  }>
}

interface StudentDashboardProps {
  setCurrentPage?: (page: string) => void
}

export default function StudentDashboard({ setCurrentPage }: StudentDashboardProps) {
  const { notifySuccess, notifyError } = useNotifications()
  const [imgError, setImgError] = useState(false)
  const [stats, setStats] = useState<StudentStats | null>(null)
  const [activityType, setActivityType] = useState<'ALL' | 'SUMMER_CAMP' | 'YEAR_ROUND'>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    const fetchStats = async () => {
      try {
        setLoading(true)
        setError('')
        
        // Add a timeout for the fetch request
        const fetchPromise = analyticsApi.getStudentStats()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timed out. Please check your internet or retry.')), 15000)
        )

        const response = await Promise.race([fetchPromise, timeoutPromise]) as any
        
        if (mounted) {
          if (response.success && response.data) {
            setStats(response.data)
          } else {
            setError(response.error?.message || 'Failed to fetch dashboard data. Please reload.')
          }
        }
      } catch (err: any) {
        console.error('Dashboard fetch error:', err)
        if (mounted) {
          setError(err.message || 'Failed to connect to the server. Please try again later.')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchStats()
    return () => { mounted = false }
  }, [])

  const formatCurrency = (val: any) => {
    const num = Number(val)
    return isNaN(num) ? '₹0' : `₹${num.toLocaleString('en-IN')}`
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
          <AlertCircle size={20} />
          {error || 'No data found'}
        </div>
      </div>
    )
  }

  const filteredSubjects = (stats?.enrolled_subjects || []).filter((subject: any) => {
    if (activityType === 'ALL') return true
    return subject.activity_type === activityType
  })

  const totalFee = activityType === 'ALL' ? Number(stats.total_fee) || 0 : filteredSubjects.reduce((sum, s) => sum + Number(s.total_fee || 0), 0)
  const totalPaid = activityType === 'ALL' ? Number(stats.total_paid) || 0 : filteredSubjects.reduce((sum, s) => sum + Number(s.paid_amount || 0), 0)
  const totalPending = activityType === 'ALL' ? Number(stats.total_pending) || 0 : filteredSubjects.reduce((sum, s) => sum + Number(s.pending_amount || 0), 0)

  const paidPercentage = totalFee > 0 ? (totalPaid / totalFee) * 100 : 0
  
  const handleDownloadReceipt = async (id: number) => {
    try {
      notifySuccess(`Downloading Receipt...`)
      await enrollmentsApi.downloadReceipt(id)
    } catch (err) {
      notifyError('Failed to download receipt')
    }
  }

  const handleDownloadIDCard = async (id: number) => {
    try {
      notifySuccess(`Downloading ID Card...`)
      await enrollmentsApi.downloadIdCard(id)
    } catch (err) {
      notifyError('Failed to download ID card')
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 no-scrollbar">
      {/* Profile Header Section */}
      <div className="relative pt-2">
        <div className="mx-0 relative z-10">
          <div className="bg-white dark:bg-slate-800 p-6 sm:p-10 rounded-[32px] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 ring-1 ring-blue-400/10 dark:ring-blue-400/5 flex flex-col md:flex-row items-center md:items-center gap-6 sm:gap-12 group transition-all duration-500">
            <div className="relative group/photo shrink-0">
                <div className="h-24 w-24 xs:h-32 xs:w-32 sm:h-40 sm:w-40 rounded-[32px] border-[6px] border-slate-50 dark:border-slate-700 shadow-xl overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-300 dark:text-slate-600 font-bold text-3xl sm:text-5xl font-poppins transition-transform duration-500 group-hover:scale-105">
                {stats.photo && !imgError ? (
                    <img 
                      src={getMediaUrl(stats.photo) || ''} 
                      alt={stats.student_name} 
                      className="w-full h-full object-cover" 
                      onError={() => {
                        console.warn(`[StudentDashboard] Failed to load photo: ${getMediaUrl(stats.photo)}`);
                        setImgError(true);
                      }}
                    />
                ) : (
                    <span className="opacity-80">{stats.student_name?.[0]?.toUpperCase() || 'S'}</span>
                )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 border-4 border-white dark:border-slate-800 h-9 w-9 rounded-full shadow-lg ring-4 ring-emerald-500/20"></div>
            </div>
            
            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 justify-center md:justify-start">
                  <h1 className="text-3xl xs:text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight font-poppins capitalize">{stats.student_name}</h1>
                  <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 w-fit mx-auto sm:mx-0 font-inter">
                    <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em]">Active Student</span>
                  </div>
              </div>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 sm:gap-8 pt-2">
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 font-inter">
                    <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Student ID:</span>
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{stats.student_id}</span>
                </div>
                
                <div className="flex items-center gap-3 group/stat cursor-help">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <BookIcon size={16} />
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em] leading-none font-inter">Total Enrollments</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white mt-1 font-poppins">{stats.subjects_count} Active Modules</p>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Navigation */}
      <div className="px-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
        <div className="space-y-1 w-full sm:w-auto">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] font-inter">Operational Overview</h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <h3 className="text-sm sm:text-lg font-bold text-slate-500 uppercase tracking-widest font-poppins">View Analytics For:</h3>
                <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm shadow-slate-100/50 overflow-x-auto no-scrollbar max-w-[calc(100vw-2rem)]">
                    {[
                    { id: 'ALL', label: 'All' },
                    { id: 'SUMMER_CAMP', label: 'Summer' },
                    { id: 'YEAR_ROUND', label: 'Year-Round' }
                    ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActivityType(tab.id as any)}
                        className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-widest transition-all duration-300 whitespace-nowrap font-poppins ${activityType === tab.id
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                    >
                        {tab.label}
                    </button>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* Unified Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
        <div className="card-standard p-6 sm:p-8 bg-white dark:bg-slate-800 group hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-500 relative overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 ring-1 ring-blue-400/10 dark:ring-blue-400/5">
          <p className="text-[11px] sm:text-[12px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-3 font-inter">Total Subjects Fee</p>
          <div className="flex items-end gap-2">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight font-poppins">{formatCurrency(totalFee)}</h2>
            <span className="text-[10px] sm:text-[11px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full mb-1 font-inter">Locked</span>
          </div>
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-50 dark:bg-slate-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 absolute right-4 bottom-4 sm:right-8 sm:bottom-8 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 rounded-2xl">
            <BookIcon size={20} className="sm:w-6 sm:h-6" />
          </div>
        </div>
        
        <div className="card-standard p-6 sm:p-8 bg-white dark:bg-slate-800 group hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-500 relative overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 ring-1 ring-blue-400/10 dark:ring-blue-400/5">
          <p className="text-[11px] sm:text-[12px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-3 font-inter">Total Fees Paid</p>
          <div className="flex items-end gap-3">
            <h2 className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-poppins">{formatCurrency(totalPaid)}</h2>
            <span className="text-xs sm:text-sm font-black text-emerald-500/80 mb-1.5 font-inter bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-lg">{paidPercentage.toFixed(1)}% Clear</span>
          </div>
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-50 dark:bg-slate-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 absolute right-4 bottom-4 sm:right-8 sm:bottom-8 shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 rounded-2xl">
            <CreditCard size={20} className="sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="card-standard p-6 sm:p-8 bg-white dark:bg-slate-800 group hover:border-rose-200 dark:hover:border-rose-800 transition-all duration-500 relative overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 ring-1 ring-blue-400/10 dark:ring-blue-400/5">
          <p className="text-[11px] sm:text-[12px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-3 font-inter">Pending Dues</p>
          <div className="flex items-end gap-2">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight font-poppins text-rose-600 dark:text-rose-400 uppercase">
                {formatCurrency(totalPending)}
            </h2>
          </div>
          <div className="w-12 h-12 sm:w-14 sm:h-14 absolute right-4 bottom-4 sm:right-8 sm:bottom-8 flex items-center justify-center shadow-sm transition-all duration-500 rounded-2xl bg-rose-50 dark:bg-slate-900 text-rose-600 dark:text-rose-400 group-hover:bg-rose-600 group-hover:text-white">
            <AlertCircle size={20} className="sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Enrolled Subjects List Section */}
        {/* Enrolled Subjects List Section */}
        <div className="lg:col-span-2 card-standard p-6 sm:p-10 bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/40 ring-1 ring-blue-400/10 dark:ring-blue-400/5 border border-slate-100 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-10 pb-4 border-b border-slate-50">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-poppins">Your Enrolled Subjects</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 font-inter">Live Status Overview</p>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 font-inter">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Active Server Link</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {filteredSubjects.length === 0 ? (
              <div className="text-center py-20 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200 font-inter">
                <BookIcon className="mx-auto text-slate-300 mb-4 opacity-50" size={56} />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No active enrollments found</p>
                <p className="text-[10px] text-slate-400 mt-2">Try adjusting your filters above</p>
              </div>
            ) : (
              filteredSubjects.map((subject, idx) => (
                <div key={idx} className="group p-4 sm:p-5 bg-slate-50/30 hover:bg-white border border-slate-100 hover:border-indigo-100 rounded-3xl transition-all duration-500 hover:shadow-xl hover:shadow-indigo-500/5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 flex-1">
                      <div className="px-3 py-1 bg-indigo-50 rounded-lg text-[10px] font-bold text-indigo-600 border border-indigo-100 uppercase tracking-widest shrink-0 w-fit font-inter">
                        {subject.enrollment_id}
                      </div>
                      
                      <h3 className="font-bold text-slate-900 text-lg tracking-tight font-poppins capitalize">{subject.name}</h3>
                      
                      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-4 sm:gap-8">
                        <div>
                          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">Duration</p>
                          <p className="text-xs sm:text-sm font-bold text-slate-700 uppercase font-poppins">{subject.duration}</p>
                        </div>
                        
                        <div>
                          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">Total Fee</p>
                          <p className="text-xs sm:text-sm font-bold text-slate-700 font-poppins">{formatCurrency(subject.total_fee)}</p>
                        </div>
                        
                        <div className="col-span-2 sm:col-span-1">
                          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">Pending</p>
                          <p className={`text-xs sm:text-sm font-bold font-poppins ${Number(subject.pending_amount) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {formatCurrency(subject.pending_amount)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        <span className={`px-3 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-widest border w-fit font-inter ${
                            subject.status === 'PAID' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                            {subject.status}
                        </span>
                        
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleDownloadReceipt(subject.id)}
                                className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all duration-300 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 border border-indigo-100/50 font-poppins"
                            >
                                <Download size={14} />
                                <span className="hidden sm:inline">Receipt</span>
                                <span className="sm:hidden">Rec</span>
                            </button>
                            <button
                                onClick={() => handleDownloadIDCard(subject.id)}
                                className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all duration-300 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 border border-emerald-100/50 font-poppins"
                            >
                                <IdCard size={14} />
                                <span className="hidden sm:inline">ID Card</span>
                                <span className="sm:hidden">ID</span>
                            </button>
                        </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Financial Progress Section */}
        <div className="card-standard p-6 sm:p-10 bg-white dark:bg-slate-800 flex flex-col group/fin shadow-lg shadow-slate-200/40 ring-1 ring-blue-400/10 dark:ring-blue-400/5 border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-6 sm:mb-10 pb-4 border-b border-slate-50">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[15px] sm:rounded-[18px] bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover/fin:scale-110 transition-transform duration-500">
                <CreditCard size={20} />
            </div>
            <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-poppins">Payment Summary</h2>
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5 font-inter">Payment Progress</p>
            </div>
          </div>
          
          <div className="space-y-8 flex-1">
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-inter">Paid</span>
                  <span className="text-xs font-bold text-slate-900 font-poppins">{paidPercentage.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                    style={{ width: `${paidPercentage}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-inter">Pending</span>
                  <span className="text-xs font-bold text-slate-900 font-poppins">{(100 - paidPercentage).toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-slate-200 rounded-full transition-all duration-1000"
                    style={{ width: `${100 - paidPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-50 space-y-4">
              <div className="flex justify-between items-center font-inter">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Fee:</span>
                <span className="text-sm font-bold text-slate-900 font-poppins">{formatCurrency(totalFee)}</span>
              </div>
              
              <div className="flex justify-between items-center font-inter">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Paid:</span>
                <span className="text-sm font-bold text-emerald-600 font-poppins">{formatCurrency(totalPaid)}</span>
              </div>
              
              <div className="flex justify-between items-center font-inter">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-rose-600">Pending:</span>
                <span className="text-sm font-bold text-rose-600 font-poppins">{formatCurrency(totalPending)}</span>
              </div>
            </div>
          </div>
      </div>
    </div>
  </div>
  )
}
