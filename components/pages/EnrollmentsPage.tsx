'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, Users, Download, CreditCard, Trash2, CheckCircle, Loader2, Search, X, FileText } from 'lucide-react'
import { enrollmentsApi, subjectsApi, paymentsApi } from '@/lib/api'
import { toast } from 'sonner'

interface Enrollment {
  id: number
  enrollment_id: string
  student: {
    id: number
    student_id: string
    name: string
  }
  subject: {
    id: number
    name: string
  }
  enrollment_date: string
  created_at?: string
  status: 'ACTIVE' | 'COMPLETED' | 'DROPPED'
  total_fee: string
  paid_amount: string
  pending_amount: string
  payment_status: string
  payment_mode?: string
}

interface EnrollmentsPageProps {
  userRole: 'admin' | 'staff' | 'student' | 'accountant'
  canEdit?: boolean
}

export default function EnrollmentsPage({ userRole, canEdit }: EnrollmentsPageProps) {
  const [allEnrollments, setAllEnrollments] = useState<Enrollment[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [filteredEnrollments, setFilteredEnrollments] = useState<Enrollment[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [selectedSubject, setSelectedSubject] = useState<number>(0)
  const [activityType] = useState<'SUMMER_CAMP' | 'YEAR_ROUND' | 'ALL'>('SUMMER_CAMP')
  const [paymentModeFilter, setPaymentModeFilter] = useState<'ONLINE' | 'OFFLINE' | 'ALL'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [refundConfirm, setRefundConfirm] = useState<{ show: boolean; enrollment: Enrollment | null }>({ show: false, enrollment: null })
  const [processing, setProcessing] = useState(false)

  const getRecentEnrollmentCount = () => {
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), 15)
    return allEnrollments.filter((enrollment) => {
      const date = new Date(enrollment.enrollment_date || '')
      return date >= startDate && date <= now
    }).length
  }

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Fetch ALL enrollments for search (no pagination)
  const fetchAllEnrollments = async () => {
    try {
      const enrollmentParams = {
        ...(activityType !== 'ALL' && { activity_type: activityType }),
        page_size: 10000  // Fetch all enrollments at once for search functionality
      }

      const enrollmentsRes = await enrollmentsApi.getAll(enrollmentParams)
      const enrollmentsData = enrollmentsRes?.results || enrollmentsRes?.data || (Array.isArray(enrollmentsRes) ? enrollmentsRes : [])
      
      // Sort by enrollment_date descending (latest first)
      const sortedEnrollments = [...enrollmentsData].sort((a, b) => {
        const aDate = new Date(a.enrollment_date || 0).getTime()
        const bDate = new Date(b.enrollment_date || 0).getTime()
        return bDate - aDate
      })

      setAllEnrollments(sortedEnrollments)
      return sortedEnrollments
    } catch (err: any) {
      console.error('Fetch All Enrollments Error:', err)
      setError(err.message || 'Failed to load enrollments for search')
      return []
    }
  }

  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')

      const enrollmentParams = {
        ...(activityType !== 'ALL' && { activity_type: activityType }),
        page: currentPage,
        page_size: 25  // Page size for pagination display
      }
      const subjectParams = activityType === 'ALL' ? {} : { activity_type: activityType }

      const [enrollmentsRes, subjectsRes] = await Promise.all([
        enrollmentsApi.getAll(enrollmentParams),
        subjectsApi.getAll(subjectParams)
      ])

      console.log('Enrollments Response:', enrollmentsRes);
      console.log('Subjects Response:', subjectsRes);

      const enrollmentsData = enrollmentsRes?.results || enrollmentsRes?.data || (Array.isArray(enrollmentsRes) ? enrollmentsRes : []);
      
      // Sort by enrollment_date descending (latest first)
      const sortedEnrollments = [...enrollmentsData].sort((a, b) => {
        const aDate = new Date(a.enrollment_date || 0).getTime()
        const bDate = new Date(b.enrollment_date || 0).getTime()
        return bDate - aDate
      })

      setEnrollments(sortedEnrollments)
      setFilteredEnrollments(sortedEnrollments)
      
      // Set pagination info
      setTotalPages(enrollmentsRes?.total_pages || Math.ceil(enrollmentsData.length / 25) || 1)
      setTotalCount(enrollmentsRes?.count || enrollmentsData.length || 0)
      
      const subjectsData = subjectsRes?.data || (Array.isArray(subjectsRes) ? subjectsRes : []);
      setSubjects(subjectsData)
    } catch (err: any) {
      console.error('Fetch Data Error:', err);
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Fetch all enrollments ONCE for search (only when activity type changes, not on page change)
    fetchAllEnrollments()
  }, [activityType])

  useEffect(() => {
    // Fetch paginated data for normal browsing
    fetchData()
  }, [activityType, currentPage])

  // Filter enrollments by subject and search term (using ALL enrollments for search)
  useEffect(() => {
    // ALWAYS use allEnrollments for search when available, for complete search across all 648 records
    let filtered = allEnrollments && allEnrollments.length > 0 ? allEnrollments : enrollments;
    
    // Filter by payment mode
    if (paymentModeFilter !== 'ALL') {
      filtered = filtered.filter(enrollment => {
        const pMode = enrollment.payment_mode || 'NOT RECORDED'
        return pMode === paymentModeFilter
      })
    }
    
    // Filter by subject
    if (selectedSubject !== 0) {
      filtered = filtered.filter(enrollment => enrollment.subject.id === selectedSubject)
    }
    
    // Filter by search term (student name, student ID, enrollment ID, subject name)
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(enrollment => 
        enrollment.student?.name?.toLowerCase().includes(search) ||
        enrollment.student?.student_id?.toLowerCase().includes(search) ||
        enrollment.enrollment_id?.toLowerCase().includes(search) ||
        enrollment.subject?.name?.toLowerCase().includes(search)
      )
    }
    
    setFilteredEnrollments(filtered)
  }, [selectedSubject, allEnrollments, enrollments, searchTerm, paymentModeFilter])

  // Sync with Payments page: Auto-refresh when a payment is marked as paid
  useEffect(() => {
    const handleStorageChange = () => {
      const paymentConfirmed = localStorage.getItem('paymentConfirmed')
      if (paymentConfirmed) {
        // Refetch enrollments to show updated payment status
        fetchData()
        // Clear the flag
        localStorage.removeItem('paymentConfirmed')
        toast.success('Enrollment updated: Payment marked as paid')
      }
    }

    // Listen for storage changes (when another tab/window updates localStorage)
    window.addEventListener('storage', handleStorageChange)
    
    // Also listen for a custom event in case of same-window changes
    const handlePaymentConfirmed = () => {
      fetchData()
      toast.success('Enrollment updated: Payment marked as paid')
    }
    window.addEventListener('paymentConfirmed', handlePaymentConfirmed)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('paymentConfirmed', handlePaymentConfirmed)
    }
  }, [])

  // Handle refund confirmation
  const handleRefundClick = (enrollment: Enrollment) => {
    setRefundConfirm({ show: true, enrollment })
  }

  // Process refund
  const handleProcessRefund = async () => {
    if (!refundConfirm.enrollment) return

    try {
      setProcessing(true)
      setError('')
      setSuccessMessage('')

      const response = await enrollmentsApi.processRefund(refundConfirm.enrollment.id)

      if (response.success) {
        setSuccessMessage(response.message)
        setRefundConfirm({ show: false, enrollment: null })
        fetchData() // Refresh list
      } else {
        setError(response.error?.message || 'Failed to process refund')
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to process refund')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-gray-500 font-medium animate-pulse uppercase tracking-widest text-xs font-inter">Loading Enrollments...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 font-poppins uppercase tracking-tight">Active Enrollments: Summer Camp 2026</h1>
          <p className="text-slate-500 text-[10px] sm:text-sm mt-1 font-medium font-inter uppercase tracking-widest">
            Total Students Enrolled: {allEnrollments.length > 0 ? getRecentEnrollmentCount() : enrollments.length}
          </p>
        </div>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
          {/* Search Bar */}
          <div className="flex-1 min-w-0">
            <label className="text-[10px] sm:text-xs font-medium text-slate-400 uppercase tracking-widest font-inter block mb-1">
              Global Search
            </label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search name, ID, subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 pl-10 pr-8 input-standard text-xs sm:text-sm font-medium uppercase tracking-wider font-inter"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Clear search"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <p className="text-[9px] text-slate-400 mt-1 font-inter uppercase tracking-tighter">
              {searchTerm ? `${filteredEnrollments.length} matching of ${allEnrollments.length || enrollments.length} total` : `Searching across all ${allEnrollments.length || enrollments.length} records`}
            </p>
          </div>

          {/* Subject Filter */}
          <div className="w-full xl:w-[260px] min-w-0">
            <label className="text-[10px] sm:text-xs font-medium text-slate-400 uppercase tracking-widest font-inter block mb-1">
              Select Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(parseInt(e.target.value))}
              className="w-full h-11 input-standard text-xs sm:text-sm font-medium uppercase tracking-wider font-inter"
            >
              <option value={0}>All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Mode Filter */}
          <div className="w-full xl:w-[260px] min-w-0">
            <label className="text-[10px] sm:text-xs font-medium text-slate-400 uppercase tracking-widest font-inter block mb-1">
              Payment Mode
            </label>
            <select
              value={paymentModeFilter}
              onChange={(e) => setPaymentModeFilter(e.target.value as 'ONLINE' | 'OFFLINE' | 'ALL')}
              className="w-full h-11 input-standard text-xs sm:text-sm font-medium uppercase tracking-wider font-inter font-bold"
            >
              <option value="ALL">ONLINE + OFFLINE</option>
              <option value="ONLINE">ONLINE ONLY</option>
              <option value="OFFLINE">OFFLINE ONLY</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Enrollments List Container */}
      <div className="space-y-4">
        {/* Page Info Header - Only show when NOT searching */}
        {!loading && enrollments.length > 0 && totalPages > 1 && !searchTerm && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-xs font-semibold text-blue-900 uppercase tracking-widest">
              📋 Page {currentPage} of {totalPages} • Showing {((currentPage - 1) * 20) + 1}-{Math.min(currentPage * 20, totalCount)} of {totalCount} enrollments
            </p>
          </div>
        )}

        {/* Search Results Info - Show when searching */}
        {searchTerm && !loading && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
            <p className="text-xs font-semibold text-purple-900 uppercase tracking-widest">
              🔍 Search Results: {filteredEnrollments.length} of {allEnrollments.length} total enrollments match "{searchTerm}"
            </p>
          </div>
        )}
        
        {filteredEnrollments.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="text-gray-300" size={32} />
            </div>
            <p className="text-gray-500 font-bold">No enrollments found</p>
            <p className="text-gray-400 text-sm mt-1">
              {selectedSubject !== 0
                ? 'No students enrolled in the selected subject.'
                : 'No enrollment records found.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (Hidden below LG) */}
            <div className="hidden lg:block bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden text-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100/50 border-b border-gray-100 font-poppins">
                    <tr>
                      <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Enrollment ID</th>
                      <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Student & Subject</th>
                      <th className="px-5 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Fees</th>
                      <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                      <th className="px-5 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredEnrollments.map((enrollment) => (
                      <tr key={enrollment.id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-blue-600 font-inter">{enrollment.enrollment_id}</p>
                        </td>
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-semibold text-gray-900 leading-tight uppercase tracking-tight font-inter">{enrollment.student?.name}</p>
                            <p className="text-[10px] font-medium text-gray-400 mt-0.5 uppercase tracking-widest font-inter">{enrollment.subject?.name}</p>
                            <p className="text-[9px] font-medium text-gray-500 mt-1 font-inter">
                              {new Date(enrollment.enrollment_date).toLocaleDateString('en-IN')} • {new Date(enrollment.created_at || enrollment.enrollment_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex flex-col items-end">
                            <p className="font-semibold text-gray-900 font-inter">₹{Number(enrollment.total_fee || 0).toLocaleString()}</p>
                            <p className="text-[10px] font-medium text-green-600 uppercase font-inter">Paid: ₹{Number(enrollment.paid_amount || 0).toLocaleString()}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-2">
                            {enrollment.payment_status !== 'PAID' && (
                              <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest font-inter w-fit ${
                                enrollment.payment_status === 'PARTIAL'
                                  ? 'bg-blue-50 text-blue-600'
                                  : 'bg-rose-50 text-rose-600'
                                }`}>
                                {enrollment.payment_status}
                              </span>
                            )}
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest font-inter w-fit ${enrollment.payment_mode === 'OFFLINE'
                              ? 'bg-purple-50 text-purple-600'
                              : enrollment.payment_mode === 'ONLINE'
                                ? 'bg-cyan-50 text-cyan-600'
                                : 'bg-slate-50 text-slate-600'
                              }`}>
                              {enrollment.payment_mode || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {enrollment.payment_status !== 'PAID' && parseFloat(enrollment.pending_amount || '0') > 0 && (
                              <button
                                onClick={async () => {
                                  try {
                                    await enrollmentsApi.update(enrollment.id, { payment_status: 'PAID' })
                                    toast.success(`Payment marked as paid for ${enrollment.student?.name}`)
                                    fetchData()
                                  } catch (err: any) {
                                    toast.error(err?.response?.data?.error || 'Failed to mark as paid')
                                  }
                                }}
                                className="px-3 py-1.5 text-xs font-bold bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all active:scale-95"
                                title="Mark Payment as Paid"
                              >
                                Mark Paid
                              </button>
                            )}
                            {(enrollment.payment_status === 'PAID' || enrollment.payment_mode === 'OFFLINE') && (
                              <>
                                <button
                                  onClick={() => enrollmentsApi.downloadReceipt(enrollment.id)}
                                  className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl transition-all active:scale-90"
                                  title="Download Receipt"
                                >
                                  <Download size={18} />
                                </button>
                                <button
                                  onClick={() => enrollmentsApi.downloadIdCard(enrollment.id)}
                                  className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-xl transition-all active:scale-90"
                                  title="Download ID Card"
                                >
                                  <CreditCard size={18} />
                                </button>
                              </>
                            )}
                            {userRole === 'admin' && (
                              <button
                                onClick={() => handleRefundClick(enrollment)}
                                className="p-2 hover:bg-red-50 text-red-600 rounded-xl transition-all active:scale-90"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="lg:hidden grid grid-cols-1 gap-4 px-1 sm:px-0">
              {filteredEnrollments.map((enrollment) => (
                <div key={enrollment.id} className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-xl shadow-slate-200/10 group transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="min-w-0 pr-2">
                      <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1 leading-none font-poppins">
                        ID: {enrollment.enrollment_id}
                      </p>
                      <p className="font-bold text-lg text-slate-900 truncate tracking-tight uppercase font-poppins leading-tight">
                        {enrollment.student?.name}
                      </p>
                      <p className="text-[11px] font-medium text-slate-400 truncate tracking-tight uppercase mt-0.5 font-inter">
                        {enrollment.subject?.name}
                      </p>
                      <p className="text-[9px] font-medium text-slate-500 mt-1 font-inter">
                        {new Date(enrollment.enrollment_date).toLocaleDateString('en-IN')} • {new Date(enrollment.created_at || enrollment.enrollment_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end shrink-0 gap-2">
                      {enrollment.payment_status !== 'PAID' && (
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-widest shadow-sm ${
                          enrollment.payment_status === 'PARTIAL'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-rose-50 text-rose-600'
                          }`}>
                          {enrollment.payment_status}
                        </span>
                      )}
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-widest shadow-sm ${enrollment.payment_mode === 'OFFLINE'
                        ? 'bg-purple-50 text-purple-600'
                        : enrollment.payment_mode === 'ONLINE'
                          ? 'bg-cyan-50 text-cyan-600'
                          : 'bg-slate-50 text-slate-600'
                        }`}>
                        {enrollment.payment_mode || 'Unknown'}
                      </span>
                      <p className="text-base font-semibold text-slate-900 mt-2 leading-none font-poppins">₹{Number(enrollment.total_fee || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl mb-5 border border-slate-100">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-inter">Paid</p>
                      <p className="text-[11px] font-semibold text-emerald-600 font-inter">₹{Number(enrollment.paid_amount || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-inter">Balance</p>
                      <p className="text-[11px] font-semibold text-rose-500 font-inter">₹{Number(enrollment.pending_amount || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {enrollment.payment_status !== 'PAID' && parseFloat(enrollment.pending_amount || '0') > 0 && (
                      <button
                        onClick={async () => {
                          try {
                            await enrollmentsApi.update(enrollment.id, { payment_status: 'PAID' })
                            toast.success(`Payment marked as paid for ${enrollment.student?.name}`)
                            fetchData()
                          } catch (err: any) {
                            toast.error(err?.response?.data?.error || 'Failed to mark as paid')
                          }
                        }}
                        className="w-full h-12 rounded-xl text-[11px] bg-green-500 hover:bg-green-600 text-white font-bold uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                      >
                        <CheckCircle size={16} /> Mark Paid
                      </button>
                    )}
                    {(enrollment.payment_status === 'PAID' || enrollment.payment_mode === 'OFFLINE') && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => enrollmentsApi.downloadReceipt(enrollment.id)}
                          className="flex-1 h-12 rounded-xl text-[11px] bg-slate-900 text-white font-bold uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                          <Download size={16} /> Receipt
                        </button>
                        <button
                          onClick={() => enrollmentsApi.downloadIdCard(enrollment.id)}
                          className="flex-1 h-12 rounded-xl text-[11px] bg-indigo-600 text-white font-medium font-poppins uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                          <CreditCard size={16} /> ID Card
                        </button>
                      </div>
                    )}
                    {userRole === 'admin' && (
                      <button
                        onClick={() => handleRefundClick(enrollment)}
                        className="w-full h-11 bg-rose-50 text-rose-600 border border-rose-100 font-medium font-poppins uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 active:scale-95 transition-all"
                      >
                        <Trash2 size={16} /> Delete Enrollment
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Enhanced Pagination Controls - Hidden when searching */}
            {totalPages > 1 && !searchTerm && (
              <div className="space-y-4 bg-white rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                      📊 Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalCount)} of {totalCount} enrollments
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Page {currentPage} of {totalPages}
                    </p>
                  </div>
                </div>

                {/* Navigation Controls */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-center sm:justify-between">
                  {/* Previous Button */}
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs uppercase tracking-widest active:scale-95 shadow-sm"
                    title="Go to previous page"
                  >
                    ⬅️ Previous
                  </button>

                  {/* Page Numbers - Show up to 7 pages */}
                  <div className="flex gap-1 flex-wrap justify-center">
                    {(() => {
                      const visiblePages: number[] = [];
                      const maxVisible = Math.min(7, totalPages);
                      
                      if (totalPages <= 7) {
                        // Show all pages if 7 or less
                        for (let i = 1; i <= totalPages; i++) visiblePages.push(i);
                      } else {
                        // Always show first page
                        visiblePages.push(1);
                        
                        // Calculate window around current page
                        const windowStart = Math.max(2, currentPage - 2);
                        const windowEnd = Math.min(totalPages - 1, currentPage + 2);
                        
                        if (windowStart > 2) visiblePages.push(-1); // Ellipsis
                        for (let i = windowStart; i <= windowEnd; i++) visiblePages.push(i);
                        if (windowEnd < totalPages - 1) visiblePages.push(-1); // Ellipsis
                        
                        // Always show last page
                        visiblePages.push(totalPages);
                      }
                      
                      return visiblePages.map((pageNum, idx) => {
                        if (pageNum === -1) {
                          return <span key={`ellipsis-${idx}`} className="px-1 text-gray-400">...</span>;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-10 h-10 rounded-lg font-bold text-xs transition-all active:scale-95 ${
                              currentPage === pageNum
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            title={`Go to page ${pageNum}`}
                          >
                            {pageNum}
                          </button>
                        );
                      });
                    })()}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs uppercase tracking-widest active:scale-95"
                    title="Go to next page"
                  >
                    Next ➡️
                  </button>
                </div>

                {/* Quick Jump Input */}
                <div className="flex items-center justify-center gap-2 border-t border-gray-100 pt-4">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Jump to page:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const pageNum = parseInt(e.target.value);
                      if (pageNum >= 1 && pageNum <= totalPages) {
                        setCurrentPage(pageNum);
                      }
                    }}
                    className="w-16 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 font-bold text-center text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    of {totalPages}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Refund Confirmation Dialog */}
      {refundConfirm.show && refundConfirm.enrollment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-premium rounded-3xl shadow-2xl max-w-md w-full p-6 border border-white/20">
            <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-tight">Confirm Deletion</h3>
            <div className="space-y-3 mb-6">
              <p className="text-[11px] font-bold text-gray-500 uppercase leading-relaxed">
                You are about to permanently remove this enrollment and trigger a refund process if applicable.
              </p>
              <div className="bg-white/40 rounded-2xl p-4 space-y-2.5 border border-white/20">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Student</span>
                  <span className="text-[11px] font-bold text-gray-900 uppercase">{refundConfirm.enrollment.student.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Subject</span>
                  <span className="text-[11px] font-bold text-gray-900 uppercase">{refundConfirm.enrollment.subject.name}</span>
                </div>
                <div className="flex justify-between items-center border-t border-white/10 pt-2.5">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Refund Amount</span>
                  <span className="text-lg font-bold text-emerald-600">₹{Number(refundConfirm.enrollment.paid_amount).toLocaleString()}</span>
                </div>
              </div>
              <p className="text-[9px] text-rose-500 font-bold uppercase tracking-tighter bg-rose-500/10 p-2 rounded-lg text-center">
                ⚠️ Critical: This operations is non-reversible.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setRefundConfirm({ show: false, enrollment: null })}
                disabled={processing}
                className="flex-1 btn-standard h-11 bg-white/40 text-gray-500 border border-white/20 text-[10px] font-bold uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessRefund}
                disabled={processing}
                className="flex-1 btn-standard h-11 bg-rose-600 text-white shadow-lg shadow-rose-500/20 text-[10px] font-bold uppercase"
              >
                {processing ? <Loader2 className="animate-spin" size={16} /> : 'Delete & Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
