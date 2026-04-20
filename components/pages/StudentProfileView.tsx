'use client'

import { useState, useEffect } from 'react'
import { BookOpen, CreditCard, AlertCircle, Loader2, Download, IdCard, ArrowLeft, Receipt, ExternalLink, TrendingUp } from 'lucide-react'
import { studentsApi, paymentsApi, enrollmentsApi, Student } from '@/lib/api'
import { API_BASE_URL, getMediaUrl } from '@/lib/api/client'
import { useNotifications } from '@/hooks/useNotifications'

interface StudentProfileViewProps {
  studentId: number
  onBack: () => void
}

export default function StudentProfileView({ studentId, onBack }: StudentProfileViewProps) {
  const { notifySuccess, notifyError, notifyInfo } = useNotifications()
  const [imgError, setImgError] = useState(false)
  const [student, setStudent] = useState<Student | null>(null)
  const [activityType, setActivityType] = useState<'ALL' | 'SUMMER_CAMP' | 'YEAR_ROUND'>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true)
        const response = await studentsApi.getById(studentId)
        if (response.success && response.data) {
          setStudent(response.data)
        } else {
          setError('Failed to fetch student profile data')
        }
      } catch (err: any) {
        console.error(err)
        setError('Failed to connect to the server')
      } finally {
        setLoading(false)
      }
    }

    fetchStudentData()
  }, [studentId])

  const formatCurrency = (val: any) => {
    const num = Number(val)
    return isNaN(num) ? '₹0' : `₹${num.toLocaleString('en-IN')}`
  }

  const handleDownloadReceipt = async (enrollmentId: number, subjectName: string) => {
    if (!student) return
    try {
      notifyInfo(`Searching for payments for ${subjectName}...`)
      const response = await paymentsApi.getAll({ student_id: student.id })
      // Filter payments that belong to this specific enrollment
      const enrollmentPayments = response.results.filter((p: any) => p.enrollment === enrollmentId)
      
      if (enrollmentPayments.length > 0) {
        for (const payment of enrollmentPayments) {
          await paymentsApi.downloadReceipt(payment.id)
        }
        notifySuccess(`Receipt(s) for ${subjectName} downloaded`)
      } else {
        notifyError(`No payments found for ${subjectName}`)
      }
    } catch (err) {
      notifyError('Failed to download receipts')
    }
  }

  const handleDownloadICard = async (enrollmentId: number, subjectName: string) => {
    if (!student) return
    try {
      notifyInfo(`Generating ID Card for ${subjectName}...`)
      await enrollmentsApi.downloadIdCard(enrollmentId)
      notifySuccess(`ID Card for ${subjectName} downloaded`)
    } catch (err) {
      notifyError('Failed to generate ID Card')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] font-inter">Loading Profile Experience...</p>
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 p-6 rounded-2xl flex items-center gap-4 text-red-700 font-inter">
          <AlertCircle size={24} />
          <div>
            <p className="font-bold text-lg">{error || 'Student not found'}</p>
            <button onClick={onBack} className="text-sm underline mt-1 font-poppins">Back to list</button>
          </div>
        </div>
      </div>
    )
  }

  const filteredEnrollments = (student.enrollments || []).filter((enr: any) => {
    if (activityType === 'ALL') return true
    // Activity type logic might need backend support if not present in enrollment object
    // For now we'll assume ALL matches or simple filter if field exists
    return true 
  })

  const totalFee = Number(student.total_fees) || 0
  const totalPaid = Number(student.total_paid) || 0
  const totalPending = Number(student.total_pending) || 0
  const paidPercentage = totalFee > 0 ? (totalPaid / totalFee) * 100 : 0

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Action Bar */}
      <div className="flex justify-between items-center bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold transition-all text-sm group font-poppins"
        >
          <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
            <ArrowLeft size={18} />
          </div>
          Back to Students
        </button>
        <div className="flex items-center gap-2">
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border font-inter ${
                student.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
            }`}>
                {student.status}
            </span>
        </div>
      </div>

      {/* Premium Identity Card Section */}
      <div className="relative">
        <div className="h-40 sm:h-56 bg-indigo-600 rounded-b-[40px] sm:rounded-b-[64px] shadow-2xl shadow-indigo-100/50 relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-indigo-700"></div>
           <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
           <div className="absolute left-1/4 -bottom-20 w-96 h-96 bg-white/5 rounded-full blur-2xl"></div>
        </div>
        
        <div className="px-4 sm:px-10 -mt-20 sm:-mt-24 relative z-10 flex flex-col items-center">
          <div className="bg-white w-full max-w-2xl p-6 sm:p-10 rounded-[32px] sm:rounded-[48px] shadow-2xl shadow-slate-200/50 border border-slate-50 relative group overflow-hidden transition-all duration-500">
            
            <div className="flex flex-col items-center relative z-10 text-center">
              {/* Overlapping Square Avatar */}
              <div className="relative -mt-20 sm:-mt-24 mb-6">
                <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-[28px] sm:rounded-[36px] border-[6px] sm:border-[8px] border-white shadow-2xl overflow-hidden bg-slate-50 flex items-center justify-center text-slate-300 font-bold text-3xl sm:text-5xl font-poppins transition-transform duration-500 group-hover:scale-105">
                  {student.photo && !imgError ? (
                    <img 
                      src={getMediaUrl(student.photo) || ''} 
                      alt={student.name} 
                      className="w-full h-full object-cover" 
                      onError={() => {
                        console.warn(`[StudentProfileView] Failed to load photo: ${getMediaUrl(student.photo)}`);
                        setImgError(true);
                      }}
                    />
                  ) : (
                    <span className="opacity-80">{student.name?.[0]?.toUpperCase() || 'S'}</span>
                  )}
                </div>
                {/* Status Dot */}
                <div className={`absolute bottom-1 right-1 h-8 w-8 rounded-full border-4 border-white shadow-lg ${
                    student.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'
                }`}></div>
              </div>
              
              <div className="space-y-3">
                <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-slate-900 text-white shadow-md mb-4 font-inter">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em]">Verified Student Account</span>
                </div>
                
                <div className="space-y-1">
                    <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight font-poppins uppercase">{student.name}</h1>
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-2">
                        <div className="flex items-center justify-center md:justify-start gap-3 bg-slate-100 px-4 py-2 rounded-2xl border border-slate-300 shadow-sm mb-4 max-w-fit">
                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-950 uppercase tracking-[0.2em] font-inter">Student Records</span>
                            <span className="text-[14px] sm:text-[18px] font-bold text-black uppercase tracking-tighter font-poppins">Personal Profile</span>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 flex-shrink-0"></div>
                        <span className="text-[10px] sm:text-[11px] font-bold text-blue-950 uppercase tracking-widest font-inter">{student.email || 'No Email Record'}</span>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Filter Sub-Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
        <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
            {[
            { id: 'ALL', label: 'All Activities' },
            { id: 'SUMMER_CAMP', label: 'Summer Camp' },
            { id: 'YEAR_ROUND', label: 'Year-Round Activities' }
            ].map((tab) => (
            <button
                key={tab.id}
                onClick={() => setActivityType(tab.id as any)}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition-all font-poppins ${activityType === tab.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-900 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
                {tab.label}
            </button>
            ))}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 px-2">
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-xl shadow-slate-200/20 relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
            <BookOpen size={120} />
          </div>
          <p className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] mb-2 relative z-10 font-inter">Total Commitment</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 relative z-10 tracking-tight font-poppins">{formatCurrency(totalFee)}</h2>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 absolute right-6 bottom-6 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
            <BookOpen size={18} />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-xl shadow-slate-200/20 relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
            <CreditCard size={120} />
          </div>
          <p className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] mb-2 relative z-10 font-inter">Total Collected</p>
          <div className="flex items-baseline gap-2 relative z-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-emerald-600 tracking-tight font-poppins">{formatCurrency(totalPaid)}</h2>
            <span className="text-[10px] font-bold text-emerald-500/70 bg-emerald-50 px-2 py-0.5 rounded-full font-inter">{paidPercentage.toFixed(0)}%</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 absolute right-6 bottom-6 shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500">
            <CreditCard size={18} />
          </div>
        </div>
 
        <div className="bg-white p-6 rounded-[28px] border border-rose-100 shadow-xl shadow-rose-200/20 relative overflow-hidden group col-span-2 lg:col-span-1">
          <div className="absolute right-[-20px] top-[-20px] opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
            <AlertCircle size={120} />
          </div>
          <p className="text-[10px] font-bold text-rose-900 uppercase tracking-[0.2em] mb-2 relative z-10 font-inter">Current Dues</p>
          <h2 className={`text-2xl sm:text-3xl font-bold relative z-10 tracking-tight font-poppins ${totalPending > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {formatCurrency(totalPending)}
          </h2>
          <div className={`w-10 h-10 rounded-2xl absolute right-6 bottom-6 flex items-center justify-center shadow-sm transition-all duration-500 ${totalPending > 0 ? 'bg-rose-50 text-rose-600 group-hover:bg-rose-600' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600'} group-hover:text-white`}>
            <AlertCircle size={18} />
          </div>
        </div>
      </div>
 
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-2">
        {/* Enrolled Subjects Section */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-10 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/20">
          <div className="flex items-center justify-between mb-8 sm:mb-12">
            <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight uppercase font-poppins">Academic Portfolio</h2>
                <p className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.25em] mt-1 font-inter">Detailed Enrollment Breakdown</p>
            </div>
            <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <BookOpen size={20} />
            </div>
          </div>
          
          <div className="space-y-4">
            {filteredEnrollments.length === 0 ? (
              <div className="text-center py-20 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200 transition-all font-inter">
                <BookOpen className="mx-auto text-slate-300 mb-4 opacity-50" size={56} />
                <p className="text-slate-800 font-bold uppercase tracking-widest text-[10px]">No active modules found</p>
              </div>
            ) : (
              filteredEnrollments.map((enr: any, idx: number) => (
                <div key={idx} className="group p-5 bg-slate-50/30 hover:bg-white border border-slate-100/50 hover:border-indigo-100 rounded-[28px] transition-all duration-500 hover:shadow-xl hover:shadow-indigo-500/5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                          #{enr.enrollment_id?.split('-').pop()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-indigo-800 uppercase tracking-[0.2em] mb-1 font-inter">
                                  {enr.batch_time || 'General Batch'}
                              </span>
                              <h3 className="font-bold text-slate-800 text-lg tracking-tight uppercase truncate font-poppins">{enr.subject_name}</h3>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                        <div className="bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm font-inter">
                          <p className="text-[8px] font-bold text-slate-900 uppercase tracking-widest mb-0.5">Outstanding</p>
                          <p className={`text-sm sm:text-base font-bold tracking-tight font-poppins ${Number(enr.pending_amount) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {formatCurrency(enr.pending_amount)}
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDownloadReceipt(enr.id, enr.subject_name)}
                            className="h-11 w-11 sm:h-12 sm:w-auto sm:px-6 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border border-indigo-100/50 font-poppins"
                            title="Receipt"
                          >
                            <Receipt size={18} />
                            <span className="hidden sm:inline">Receipt</span>
                          </button>
                          <button
                            onClick={() => handleDownloadICard(enr.id, enr.subject_name)}
                            className="h-11 w-11 sm:h-12 sm:w-auto sm:px-6 rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border border-emerald-100/50 font-poppins"
                            title="ID Card"
                          >
                            <IdCard size={18} />
                            <span className="hidden sm:inline">ID Card</span>
                          </button>
                        </div>
                      </div>
                    </div>
                </div>
              ))
            )}
          </div>
        </div>
 
        {/* Payment Summary Section */}
        <div className="bg-white p-6 sm:p-10 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/20 flex flex-col">
          <div className="flex items-center gap-3 mb-10 border-b border-slate-50 pb-6">
            <div className="w-12 h-12 rounded-[18px] bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <CreditCard size={20} />
            </div>
            <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight uppercase font-poppins">Collection</h2>
                <p className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] mt-0.5 font-inter">Financial Progress</p>
            </div>
          </div>
          
          <div className="space-y-10 flex-1">
            <div className="p-6 rounded-[28px] bg-slate-50 border border-slate-100 shadow-inner">
              <div className="flex justify-between items-end mb-4">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest font-inter">Enrollment Coverage</p>
                    <p className="text-base font-bold text-indigo-600 uppercase tracking-tight font-poppins">{paidPercentage.toFixed(1)}%</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-50">
                    <TrendingUp size={16} className="text-emerald-500" />
                </div>
              </div>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden p-0.5 shadow-inner">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${
                      paidPercentage === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${paidPercentage}%` }}
                ></div>
              </div>
              <div className="mt-6 flex justify-between">
                  <div className="text-center">
                    <p className="text-[8px] font-bold text-slate-900 uppercase tracking-widest mb-1 font-inter">Paid</p>
                    <p className="text-xs font-bold text-emerald-600 font-poppins">{formatCurrency(totalPaid)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] font-bold text-slate-900 uppercase tracking-widest mb-1 font-inter">Goal</p>
                    <p className="text-xs font-bold text-slate-900 font-poppins">{formatCurrency(totalFee)}</p>
                  </div>
              </div>
            </div>
 
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors group">
                <span className="font-bold text-slate-900 uppercase tracking-widest text-[9px] group-hover:text-indigo-500 transition-colors font-inter">Total Commitment</span>
                <span className="font-bold text-slate-900 tracking-tight font-poppins">{formatCurrency(totalFee)}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <span className="font-bold text-emerald-600 uppercase tracking-widest text-[9px] font-inter">Received Funds</span>
                <span className="font-bold text-emerald-600 tracking-tight font-poppins">{formatCurrency(totalPaid)}</span>
              </div>
 
              <div className="flex justify-between items-center p-5 rounded-2xl bg-rose-50/50 border border-rose-100 mt-6 shadow-sm">
                <div className="space-y-1 font-inter">
                  <span className="font-bold text-rose-600 uppercase tracking-widest text-[9px]">Remaining Balance</span>
                  <p className="text-[8px] font-bold text-rose-900 uppercase tracking-widest leading-none">Immediate Dues</p>
                </div>
                <span className="font-bold text-rose-600 text-2xl tracking-tighter shadow-rose-200 font-poppins">{formatCurrency(totalPending)}</span>
              </div>
            </div>
            
            <div className="p-5 rounded-2xl bg-indigo-50/30 border border-indigo-100/30 flex items-start gap-4">
                 <AlertCircle className="text-indigo-400 mt-1 shrink-0" size={16} />
                 <p className="text-[9px] text-indigo-500 font-bold leading-relaxed uppercase tracking-wider font-inter">
                    Metrics are calculated based on aggregate enrollment data and ledger transactions.
                 </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
