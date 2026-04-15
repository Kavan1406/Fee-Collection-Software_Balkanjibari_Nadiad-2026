'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, Users, Download, CreditCard, Trash2, CheckCircle, Loader2 } from 'lucide-react'
import { enrollmentsApi, subjectsApi } from '@/lib/api'

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
  status: 'ACTIVE' | 'COMPLETED' | 'DROPPED'
  total_fee: string
  paid_amount: string
  pending_amount: string
  payment_status: string
}

interface EnrollmentsPageProps {
  userRole: 'admin' | 'staff' | 'student' | 'accountant'
  canEdit?: boolean
}

export default function EnrollmentsPage({ userRole, canEdit }: EnrollmentsPageProps) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [filteredEnrollments, setFilteredEnrollments] = useState<Enrollment[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [selectedSubject, setSelectedSubject] = useState<number>(0)
  const [activityType, setActivityType] = useState<'SUMMER_CAMP' | 'YEAR_ROUND' | 'ALL'>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [refundConfirm, setRefundConfirm] = useState<{ show: boolean; enrollment: Enrollment | null }>({ show: false, enrollment: null })
  const [processing, setProcessing] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')

      const enrollmentParams = {
        ...(activityType !== 'ALL' && { activity_type: activityType }),
        page: currentPage,
        page_size: 20
      }
      const subjectParams = activityType === 'ALL' ? {} : { activity_type: activityType }

      const [enrollmentsRes, subjectsRes] = await Promise.all([
        enrollmentsApi.getAll(enrollmentParams),
        subjectsApi.getAll(subjectParams)
      ])

      console.log('Enrollments Response:', enrollmentsRes);
      console.log('Subjects Response:', subjectsRes);

      const enrollmentsData = enrollmentsRes?.results || enrollmentsRes?.data || (Array.isArray(enrollmentsRes) ? enrollmentsRes : []);
      setEnrollments(enrollmentsData)
      setFilteredEnrollments(enrollmentsData)
      
      // Set pagination info
      setTotalPages(enrollmentsRes?.total_pages || Math.ceil(enrollmentsData.length / 20) || 1)
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
    fetchData()
  }, [activityType, currentPage])

  // Filter enrollments by subject
  useEffect(() => {
    if (selectedSubject === 0) {
      setFilteredEnrollments(enrollments)
    } else {
      setFilteredEnrollments(
        enrollments.filter(enrollment => enrollment.subject.id === selectedSubject)
      )
    }
  }, [selectedSubject, enrollments])

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
      {/* Activity Type Filter */}
      {/* Activity Type Filter */}
      <div className="card-standard p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest font-inter">Activity Filter:</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ALL', label: 'All Activities' },
              { id: 'SUMMER_CAMP', label: 'Summer Camp' },
              { id: 'YEAR_ROUND', label: 'Year-Round' },
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setActivityType(type.id as any)}
                className={`h-11 px-6 rounded-xl font-medium font-poppins flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-xs uppercase tracking-widest ${activityType === type.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100'
                  }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 font-poppins uppercase tracking-tight">Active Enrollments</h1>
          <p className="text-slate-500 text-[10px] sm:text-sm mt-1 font-medium font-inter uppercase tracking-widest">Record Count: {filteredEnrollments.length}</p>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto">
          <label className="text-[10px] sm:text-xs font-medium text-slate-400 uppercase tracking-widest shrink-0 font-inter">
            Subject:
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(parseInt(e.target.value))}
            className="flex-1 sm:w-64 h-11 input-standard text-xs sm:text-sm font-medium uppercase tracking-wider font-inter"
          >
            <option value={0}>Show All Subjects</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Enrollments List Container */}
      <div className="space-y-4">
        {/* Page Info Header */}
        {!loading && enrollments.length > 0 && totalPages > 1 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-widest">
              📋 Page {currentPage} of {totalPages} • Showing {((currentPage - 1) * 20) + 1}-{Math.min(currentPage * 20, totalCount)} of {totalCount} enrollments
            </p>
          </div>
        )}
        
        {filteredEnrollments.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
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
            <div className="hidden lg:block bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden text-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100/50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 font-poppins">
                    <tr>
                      <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Enrollment ID</th>
                      <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Student & Subject</th>
                      <th className="px-5 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Fees</th>
                      <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                      <th className="px-5 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredEnrollments.map((enrollment) => (
                      <tr key={enrollment.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-blue-600 dark:text-blue-400 font-inter">{enrollment.enrollment_id}</p>
                        </td>
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white leading-tight uppercase tracking-tight font-inter">{enrollment.student?.name}</p>
                            <p className="text-[10px] font-medium text-gray-400 mt-0.5 uppercase tracking-widest font-inter">{enrollment.subject?.name}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex flex-col items-end">
                            <p className="font-semibold text-gray-900 dark:text-white font-inter">₹{Number(enrollment.total_fee || 0).toLocaleString()}</p>
                            <p className="text-[10px] font-medium text-green-600 uppercase font-inter">Paid: ₹{Number(enrollment.paid_amount || 0).toLocaleString()}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest font-inter ${enrollment.payment_status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-600'
                            : enrollment.payment_status === 'PARTIAL'
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-rose-50 text-rose-600'
                            }`}>
                            {enrollment.payment_status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {enrollment.payment_status === 'PAID' && (
                              <>
                                <button
                                  onClick={() => enrollmentsApi.downloadReceipt(enrollment.id)}
                                  className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl transition-all active:scale-90"
                                  title="Receipt"
                                >
                                  <Download size={18} />
                                </button>
                                <button
                                  onClick={() => enrollmentsApi.downloadIdCard(enrollment.id)}
                                  className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl transition-all active:scale-90"
                                  title="ID Card"
                                >
                                  <CreditCard size={18} />
                                </button>
                              </>
                            )}
                            {userRole === 'admin' && (
                              <button
                                onClick={() => handleRefundClick(enrollment)}
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl transition-all active:scale-90"
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
                <div key={enrollment.id} className="bg-white dark:bg-slate-900 rounded-[28px] p-6 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/10 group transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="min-w-0 pr-2">
                      <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1 leading-none font-poppins">
                        ID: {enrollment.enrollment_id}
                      </p>
                      <p className="font-bold text-lg text-slate-900 dark:text-white truncate tracking-tight uppercase font-poppins leading-tight">
                        {enrollment.student?.name}
                      </p>
                      <p className="text-[11px] font-medium text-slate-400 truncate tracking-tight uppercase mt-0.5 font-inter">
                        {enrollment.subject?.name}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end shrink-0">
                       <span className={`px-2.5 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-widest shadow-sm ${enrollment.payment_status === 'PAID'
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600'
                        : enrollment.payment_status === 'PARTIAL'
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'
                          : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600'
                        }`}>
                        {enrollment.payment_status}
                      </span>
                      <p className="text-base font-semibold text-slate-900 dark:text-white mt-2 leading-none font-poppins">₹{Number(enrollment.total_fee || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl mb-5 border border-slate-100 dark:border-slate-700">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-inter">Paid</p>
                      <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 font-inter">₹{Number(enrollment.paid_amount || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-inter">Balance</p>
                      <p className="text-[11px] font-semibold text-rose-500 font-inter">₹{Number(enrollment.pending_amount || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {enrollment.payment_status === 'PAID' && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => enrollmentsApi.downloadReceipt(enrollment.id)}
                          className="flex-1 h-12 rounded-xl text-[11px] bg-slate-900 dark:bg-slate-800 text-white font-bold uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
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
                        className="w-full h-11 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 font-medium font-poppins uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 active:scale-95 transition-all"
                      >
                        <Trash2 size={16} /> Delete Enrollment
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                    Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalCount)} of {totalCount} enrollments
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Page {currentPage} of {totalPages}
                  </p>
                </div>
                
                <div className="flex gap-2 items-center">
                  {/* Previous Button */}
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed font-medium text-sm uppercase tracking-widest active:scale-95"
                    title="Previous page"
                  >
                    ← Prev
                  </button>

                  {/* Page Numbers - Show 3 pages max */}
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage <= 2) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 1) {
                        pageNum = totalPages - 2 + i;
                      } else {
                        pageNum = currentPage - 1 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 rounded-lg font-bold text-sm transition-all active:scale-95 ${
                            currentPage === pageNum
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          title={`Go to page ${pageNum}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed font-medium text-sm uppercase tracking-widest active:scale-95"
                    title="Next page"
                  >
                    Next →
                  </button>
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
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-tight">Confirm Deletion</h3>
            <div className="space-y-3 mb-6">
              <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase leading-relaxed">
                You are about to permanently remove this enrollment and trigger a refund process if applicable.
              </p>
              <div className="bg-white/40 dark:bg-black/10 rounded-2xl p-4 space-y-2.5 border border-white/20">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Student</span>
                  <span className="text-[11px] font-bold text-gray-900 dark:text-white uppercase">{refundConfirm.enrollment.student.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Subject</span>
                  <span className="text-[11px] font-bold text-gray-900 dark:text-white uppercase">{refundConfirm.enrollment.subject.name}</span>
                </div>
                <div className="flex justify-between items-center border-t border-white/10 pt-2.5">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Refund Amount</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">₹{Number(refundConfirm.enrollment.paid_amount).toLocaleString()}</span>
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
                className="flex-1 btn-standard h-11 bg-white/40 dark:bg-black/10 text-gray-500 border border-white/20 text-[10px] font-bold uppercase"
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
