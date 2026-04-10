'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Loader2, AlertCircle, IndianRupee, CheckCircle } from 'lucide-react'
import { analyticsApi } from '@/lib/api'

interface Subject {
  id: number | string
  name: string
  activity_type: 'YEAR_ROUND' | 'SUMMER_CAMP'
  registration_fee: string | number
  monthly_fee?: string | number
  total_fee?: string | number
  duration_months?: number
  timing_schedule?: string
}

interface StudentStats {
  student_name: string
  student_id: string
  subjects_count: number
  total_fee: number
  total_paid: number
  total_pending: number
  enrolled_subjects: Array<{
    subject: Subject
    enrollment_id: string
    status: string
    paid_amount: number
    pending_amount: number
  }>
}

interface StudentSubjectsAndFeesProps {
  setCurrentPage?: (page: string) => void
}

export default function StudentSubjectsAndFees({ setCurrentPage }: StudentSubjectsAndFeesProps) {
  const [stats, setStats] = useState<StudentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      
      const fetchPromise = analyticsApi.getStudentStats()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timed out. Please reload the page.')), 15000)
      )

      const response = await Promise.race([fetchPromise, timeoutPromise]) as any
      
      if (response.success && response.data) {
        setStats(response.data)
      } else {
        setError(response.error?.message || 'Failed to fetch subjects data')
      }
    } catch (err: any) {
      console.error('Subjects fetch error:', err)
      setError(err.message || 'Failed to connect to the server')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const formatCurrency = (val: any) => {
    const num = Number(val)
    return isNaN(num) ? '₹0' : `₹${num.toLocaleString('en-IN')}`
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 font-inter">
          <AlertCircle size={20} />
          {error || 'No data found'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Premium Banner Section */}
      <div className="relative">
        <div className="h-28 sm:h-44 bg-indigo-600 rounded-[24px] sm:rounded-[32px] shadow-2xl shadow-indigo-200/50 overflow-hidden relative">
           <div className="absolute inset-0 flex items-center px-6 sm:px-10">
              <div className="flex items-center gap-4 sm:gap-8">
                <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-xl sm:rounded-[24px] bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-2xl shrink-0">
                    <BookOpen size={24} className="sm:w-10 sm:h-10 opacity-90" />
                </div>
                <div className="text-white">
                    <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.3em] mb-0.5 sm:mb-1 font-inter" style={{ color: 'white' }}>Academic Portfolio</p>
                    <h2 className="text-xl sm:text-4xl font-bold font-poppins tracking-tight lowercase first-letter:uppercase" style={{ color: 'white' }}>{stats.subjects_count} <span className="text-sm sm:text-xl font-medium font-poppins" style={{ color: 'white' }}>Enrolled Subjects</span></h2>
                </div>
              </div>
           </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 px-1 sm:px-0">
        <div className="bg-white dark:bg-slate-900 rounded-[20px] sm:rounded-[28px] p-4 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/20 group relative overflow-hidden">
          <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10 font-inter">Subjects</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white relative z-10 font-poppins">{stats.subjects_count}</p>
          <div className="absolute top-3 right-3 sm:top-6 sm:right-6 p-1.5 sm:p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg sm:rounded-xl">
             <BookOpen size={14} className="sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[20px] sm:rounded-[28px] p-4 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/20 group relative overflow-hidden">
          <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10 font-inter">Total Commitment</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white relative z-10 font-poppins">{formatCurrency(stats.total_fee)}</p>
          <div className="absolute top-3 right-3 sm:top-6 sm:right-6 p-1.5 sm:p-2 bg-slate-50 dark:bg-slate-800/50 text-slate-500 rounded-lg sm:rounded-xl">
             <IndianRupee size={14} className="sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[20px] sm:rounded-[28px] p-4 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/20 group relative overflow-hidden">
          <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10 font-inter">Received</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-600 relative z-10 font-poppins">{formatCurrency(stats.total_paid)}</p>
          <div className="absolute top-3 right-3 sm:top-6 sm:right-6 p-1.5 sm:p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 rounded-lg sm:rounded-xl">
             <CheckCircle size={14} className="sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[20px] sm:rounded-[28px] p-4 sm:p-6 border border-rose-100 dark:border-rose-900 shadow-lg shadow-rose-200/20 group relative overflow-hidden">
          <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10 font-inter">Outstanding</p>
          <p className="text-xl sm:text-2xl font-bold text-rose-600 relative z-10 font-poppins">{formatCurrency(stats.total_pending)}</p>
          <div className="absolute top-3 right-3 sm:top-6 sm:right-6 p-1.5 sm:p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-500 rounded-lg sm:rounded-xl">
             <AlertCircle size={14} className="sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* Course Information */}
      <div className="px-1 sm:px-0">
        <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 rounded-[24px] sm:rounded-[2.5rem] p-8 sm:p-12 relative overflow-hidden shadow-2xl shadow-indigo-500/30">
          <div className="flex flex-col md:flex-row gap-6 sm:gap-8 relative z-10 items-center md:items-start text-center md:text-left">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/10 backdrop-blur-md shadow-xl">
               <BookOpen className="text-white w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="space-y-4 sm:space-y-6">
              <h3 className="font-bold text-lg sm:text-2xl uppercase tracking-tight text-white font-poppins">Enrollment Support</h3>
              <p className="text-[10px] sm:text-sm font-bold leading-relaxed uppercase tracking-widest max-w-2xl text-white/90 font-inter">
                For curriculum clarification, please engage with the academic office or primary instructors via the portal.
              </p>
            </div>
          </div>
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl"></div>
        </div>
      </div>
    </div>
  )
}
