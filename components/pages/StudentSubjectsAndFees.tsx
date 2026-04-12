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
    subject_description?: string
    enrollment_id: string
    status: string
    paid_amount: number
    pending_amount: number
    batch_time?: string
    include_library_fee?: boolean
    total_fee: number
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight font-poppins">My Subjects & Fees</h1>
          <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 font-inter">Live Academic & Financial Records</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
           <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest font-inter">Records Synchronized</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/10 ring-1 ring-blue-400/10 dark:ring-blue-400/5 group relative overflow-hidden">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-inter">Subjects</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-poppins">{stats.subjects_count}</p>
          <div className="absolute top-4 right-4 p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
             <BookOpen size={18} />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/10 ring-1 ring-blue-400/10 dark:ring-blue-400/5 group relative overflow-hidden">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-inter">Commitment</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-poppins">{formatCurrency(stats.total_fee)}</p>
          <div className="absolute top-4 right-4 p-2 bg-slate-50 dark:bg-slate-800/30 text-slate-500 rounded-xl">
             <IndianRupee size={18} />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/10 ring-1 ring-blue-400/10 dark:ring-blue-400/5 group relative overflow-hidden">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-inter">Received</p>
          <p className="text-2xl font-black text-emerald-600 font-poppins">{formatCurrency(stats.total_paid)}</p>
          <div className="absolute top-4 right-4 p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 rounded-xl">
             <CheckCircle size={18} />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/10 ring-1 ring-blue-400/10 dark:ring-blue-400/5 group relative overflow-hidden">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-inter">Pending</p>
          <p className="text-2xl font-black text-rose-600 font-poppins">{formatCurrency(stats.total_pending)}</p>
          <div className="absolute top-4 right-4 p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-500 rounded-xl">
             <AlertCircle size={18} />
          </div>
        </div>
      </div>

      {/* Enrolled Subjects Detailed List */}
      <div className="space-y-6">
        {stats.enrolled_subjects && stats.enrolled_subjects.length > 0 ? (
          stats.enrolled_subjects.map((enr, idx) => {
            const libraryFee = enr.include_library_fee ? 10 : 0;
            const registrationFee = enr.total_fee - libraryFee;
            
            return (
              <div key={idx} className="bg-white dark:bg-slate-900 rounded-[32px] p-6 sm:p-10 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 ring-1 ring-blue-400/10 dark:ring-blue-400/5 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/5 group">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  {/* Left: Subject Info */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center border border-indigo-100 dark:border-indigo-800 shadow-sm group-hover:scale-110 transition-transform">
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight font-poppins">{enr.subject.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest font-inter">{enr.enrollment_id}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-inter">Batch: {enr.batch_time || '7-8 AM'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest font-inter">Subject Overview</p>
                        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium leading-relaxed font-inter max-w-2xl">
                            {enr.subject_description || "A comprehensive learning module designed to enhance student skills through practical engagement and expert instruction."}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-2">
                        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-inter">Status</p>
                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase font-poppins">{enr.status}</p>
                        </div>
                        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-inter">Schedule</p>
                            <p className="text-xs font-black text-slate-900 dark:text-white font-poppins uppercase">{enr.batch_time || '7-8 AM'}</p>
                        </div>
                    </div>
                  </div>

                  {/* Right: Fee Breakdown */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[28px] p-6 sm:p-8 border border-slate-100 dark:border-slate-700/50 space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-slate-900 dark:text-white">
                        <IndianRupee size={120} />
                    </div>
                    
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest font-inter">Fee Breakdown</h4>
                    
                    <div className="space-y-4 relative z-10">
                        <div className="flex justify-between items-center text-sm font-inter">
                            <span className="text-slate-500 font-bold uppercase tracking-tight text-[11px]">Registration Fee</span>
                            <span className="font-black text-slate-900 dark:text-white">{formatCurrency(registrationFee)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-inter">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500 font-bold uppercase tracking-tight text-[11px]">Library Fee</span>
                                <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-black uppercase">Added</span>
                            </div>
                            <span className="font-black text-slate-900 dark:text-white">₹{libraryFee.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <span className="text-[11px] font-black text-indigo-600 uppercase tracking-widest font-inter">Total Amount</span>
                            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-poppins">{formatCurrency(enr.total_fee)}</span>
                        </div>
                    </div>

                    <div className="pt-4 relative z-10">
                        <div className={`w-full py-3 rounded-2xl flex items-center justify-center gap-2 border shadow-sm font-inter ${
                            Number(enr.pending_amount) <= 0 
                            ? 'bg-emerald-500 text-white border-emerald-400' 
                            : 'bg-amber-500 text-white border-amber-400 outline-none'
                        }`}>
                            {Number(enr.pending_amount) <= 0 ? (
                                <CheckCircle size={14} />
                            ) : (
                                <AlertCircle size={14} />
                            )}
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {Number(enr.pending_amount) <= 0 ? 'Fully Paid' : `Pending: ${formatCurrency(enr.pending_amount)}`}
                            </span>
                        </div>
                        <p className="text-[9px] text-center text-slate-400 mt-3 uppercase tracking-widest font-bold font-inter">Official Portal Record</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[32px] border-2 border-dashed border-slate-100 dark:border-slate-800 font-inter">
            <BookOpen size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-black uppercase tracking-widest">No enrolled subjects found</p>
          </div>
        )}
      </div>
    </div>
  )
}
