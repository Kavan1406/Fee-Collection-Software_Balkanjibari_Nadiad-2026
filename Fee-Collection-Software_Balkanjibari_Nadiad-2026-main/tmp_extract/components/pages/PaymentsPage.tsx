'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, AlertCircle, Calendar, Loader2, CreditCard } from 'lucide-react'
import { paymentsApi, enrollmentsApi, Payment, CreatePaymentData } from '@/lib/api'

interface PaymentsPageProps {
  userRole: 'admin' | 'staff' | 'student' | 'accountant'
  canEdit?: boolean
}

export default function PaymentsPage({ userRole, canEdit }: PaymentsPageProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const canAdd = userRole === 'admin' || (userRole === 'staff' && canEdit) || userRole === 'accountant'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentModeFilter, setPaymentModeFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Form state
  const [formData, setFormData] = useState<CreatePaymentData>({
    enrollment_id: 0,
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'CASH',
    transaction_id: '',
    notes: '',
  })
  const [formLoading, setFormLoading] = useState(false)
  const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null)

  const [paymentStats, setPaymentStats] = useState<{ total_paid: number; total_pending: number } | null>(null)

  // Fetch payments
  const fetchPayments = async () => {
    try {
      setLoading(true)
      setError('')
      const [res, statsRes] = await Promise.all([
        paymentsApi.getAll({
          page: currentPage,
          page_size: 20,
          search: searchTerm || undefined,
          payment_mode: paymentModeFilter || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }),
        paymentsApi.getStats()
      ])

      setPayments(res.results)
      setTotalPages(res.total_pages)
      setTotalCount(res.count)
      // @ts-ignore
      setPaymentStats(statsRes.data || statsRes)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch payments')
    } finally {
      setLoading(false)
    }
  }

  // Fetch enrollments for the form
  const fetchEnrollments = async () => {
    try {
      const response = await enrollmentsApi.getAll({ page_size: 100 })
      setEnrollments(response.results || [])
    } catch (err: any) {
      console.error('Failed to fetch enrollments:', err)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [currentPage, searchTerm, paymentModeFilter, startDate, endDate])

  useEffect(() => {
    if (showForm) {
      fetchEnrollments()
    }
  }, [showForm])

  // Handle enrollment selection
  const handleEnrollmentChange = (enrollmentId: number) => {
    const enrollment = enrollments.find((e) => e.id === enrollmentId)
    setSelectedEnrollment(enrollment)
    setFormData({ ...formData, enrollment_id: enrollmentId })
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError('')

    try {
      await paymentsApi.create(formData)
      setShowForm(false)
      resetForm()
      fetchPayments()
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to record payment')
    } finally {
      setFormLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      enrollment_id: 0,
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: 'CASH',
      transaction_id: '',
      notes: '',
    })
    setSelectedEnrollment(null)
  }

  const formatCurrency = (amount: string | number) => {
    return `₹${parseFloat(amount.toString()).toLocaleString('en-IN')}`
  }

  // Handle confirm payment
  const handleConfirm = async (id: number) => {
    if (!confirm('Are you sure you want to confirm this payment? This will update the enrollment balance and generate a receipt.')) return

    try {
      setLoading(true)
      await paymentsApi.confirmPayment(id)
      fetchPayments()
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to confirm payment')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'SUCCESS':
        return <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-widest">SUCCESS</span>
      case 'PENDING_CONFIRMATION':
        return <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-bold uppercase tracking-widest animate-pulse">PENDING</span>
      case 'FAILED':
        return <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-bold uppercase tracking-widest">FAILED</span>
      default:
        return <span className="px-2 py-1 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest">{status || 'CREATED'}</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 font-poppins uppercase tracking-tight">Payments Management</h1>
          <p className="text-slate-500 text-[10px] sm:text-sm mt-1 font-medium font-inter uppercase tracking-widest">Track and manage institution fee collections</p>
        </div>
        {canAdd && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full sm:w-auto h-11 px-6 rounded-xl font-medium font-poppins flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-xs uppercase tracking-widest bg-blue-600 text-white shadow-lg shadow-blue-500/20"
          >
            <Plus size={18} />
            <span>Record Payment</span>
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 px-1 sm:px-0">
        <div className="bg-white dark:bg-slate-900 rounded-[20px] sm:rounded-[28px] p-4 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/20 group relative overflow-hidden border-l-4 border-l-emerald-500">
          <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-inter">Collections</p>
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white font-poppins">{formatCurrency(Number(paymentStats?.total_paid || 0))}</h2>
          <p className="text-[8px] font-bold text-emerald-600 mt-1 uppercase tracking-tighter sm:tracking-tight font-inter">Confirmed</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[20px] sm:rounded-[28px] p-4 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/20 group relative overflow-hidden border-l-4 border-l-rose-500">
          <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-inter">Outstanding</p>
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white font-poppins">{formatCurrency(Number(paymentStats?.total_pending || 0))}</h2>
          <p className="text-[8px] font-bold text-rose-500 mt-1 uppercase tracking-tighter sm:tracking-tight font-inter">Pending Dues</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[20px] sm:rounded-[28px] p-4 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/20 group relative overflow-hidden border-l-4 border-l-blue-500 col-span-2 lg:col-span-1">
          <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-inter">Transactions</p>
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white font-poppins">{totalCount}</h2>
          <p className="text-[8px] font-bold text-blue-600 mt-1 uppercase tracking-tighter sm:tracking-tight font-inter">Total entries</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="text-red-600" size={20} />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        {/* Search Bar - Full Width */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by student, receipt..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full input-standard pl-11 rounded-lg text-sm font-medium font-inter"
            />
          </div>
        </div>

        {/* Other Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <div>
            <label className="block text-[10px] font-medium text-gray-400 uppercase mb-1 ml-1 font-inter">Payment Mode</label>
            <select
              value={paymentModeFilter}
              onChange={(e) => {
                setPaymentModeFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full input-standard h-11 text-[11px] font-medium uppercase tracking-wider font-inter"
            >
              <option value="">All Modes</option>
              <option value="CASH">Cash</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:col-span-1 lg:col-span-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full input-standard h-11 text-[11px] font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full input-standard h-11 text-[11px] font-bold"
              />
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('')
                setPaymentModeFilter('')
                setStartDate('')
                setEndDate('')
                setCurrentPage(1)
              }}
              className="w-full h-11 rounded-xl bg-slate-50 text-slate-500 border border-slate-100 font-medium font-poppins text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Record Payment Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Record Payment</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Enrollment *
                </label>
                <select
                  value={formData.enrollment_id}
                  onChange={(e) => handleEnrollmentChange(parseInt(e.target.value))}
                  required
                  className="w-full input-standard"
                >
                  <option value={0}>-- Select Student & Subject --</option>
                  {enrollments.map((enrollment) => (
                    <option key={enrollment.id} value={enrollment.id}>
                      {enrollment.student.name} - {enrollment.subject.name}
                      {enrollment.subject.activity_type === 'YEAR_ROUND' && ' [Year-Round]'}
                      {' '}(Pending: {formatCurrency(enrollment.pending_amount)})
                    </option>
                  ))}
                </select>
              </div>

              {selectedEnrollment && (
                <div className={`md:col-span-2 border rounded-xl overflow-hidden ${selectedEnrollment.subject.activity_type === 'YEAR_ROUND'
                  ? 'bg-purple-50 border-purple-100 dark:bg-purple-900/10 dark:border-purple-800'
                  : 'bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-800'
                  }`}>
                  <div className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${selectedEnrollment.subject.activity_type === 'YEAR_ROUND' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
                    }`}>
                    Fee Preview {selectedEnrollment.subject.activity_type === 'YEAR_ROUND' && '• Year-Round Installments Allowed'}
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Total</p>
                        <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(selectedEnrollment.total_fee)}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Paid</p>
                        <p className="text-xs sm:text-sm font-bold text-green-600">{formatCurrency(selectedEnrollment.paid_amount)}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700 shadow-inner">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Due</p>
                        <p className="text-xs sm:text-sm font-bold text-red-500">{formatCurrency(selectedEnrollment.pending_amount)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  value={formData.amount || ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setFormData({ ...formData, amount: isNaN(val) ? 0 : val });
                  }}
                  className="w-full input-standard"
                  min="1"
                  step="0.01"
                  required
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  required
                  className="w-full input-standard"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Mode *
                </label>
                <select
                  value={formData.payment_mode}
                  onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value as any })}
                  required
                  className="w-full input-standard"
                >
                  <option value="CASH">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Transaction ID (Optional)
                </label>
                <input
                  type="text"
                  value={formData.transaction_id}
                  onChange={(e) => {
                    setFormData({ ...formData, transaction_id: e.target.value })
                  }}
                  placeholder="Transaction reference (optional)"
                  className="w-full input-standard"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="Additional notes..."
                  className="w-full px-4 py-4 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button
                type="submit"
                disabled={formLoading || !formData.enrollment_id}
                className="btn-standard flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
              >
                {formLoading ? 'Recording...' : 'Record Payment'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                className="btn-standard bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payments List Container */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
            <p className="text-gray-500 font-bold animate-pulse uppercase tracking-widest text-xs">Fetching Payments...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="text-gray-300" size={32} />
            </div>
            <p className="text-gray-500 font-bold">No payments found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or search term</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (Hidden below LG) */}
            <div className="hidden lg:block bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 font-poppins">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Receipt</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Student & Subject</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="font-semibold text-blue-600 dark:text-blue-400 font-inter">{payment.receipt_number || '-'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white leading-tight font-inter">{payment.student_name}</p>
                            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mt-0.5 font-inter">{payment.subject_name}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-sm font-semibold text-green-600 dark:text-green-400 font-inter">{formatCurrency(Number(payment.amount))}</p>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(payment.status)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end items-center">
                            {payment.status === 'PENDING_CONFIRMATION' && (canAdd) && (
                              <button onClick={() => handleConfirm(payment.id)} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium font-poppins rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-500/20">
                                Confirm
                              </button>
                            )}
                            {payment.status === 'SUCCESS' && (
                                <button onClick={() => paymentsApi.downloadReceipt(payment.id)} className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all h-9 w-9 flex items-center justify-center shadow-sm" title="Download Receipt">
                                  <Calendar size={18} />
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

            {/* Mobile/Tablet Card View (Visible below LG) */}
            <div className="lg:hidden grid grid-cols-1 gap-4 px-1 sm:px-0">
              {payments.map((payment) => (
                <div key={payment.id} className="bg-white dark:bg-slate-900 rounded-[28px] p-6 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/10 group transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="min-w-0 pr-2">
                      <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1 leading-none font-poppins">
                        {payment.receipt_number || 'RCPT_PENDING'}
                      </p>
                      <p className="font-bold text-lg text-slate-900 dark:text-white truncate tracking-tight uppercase font-poppins leading-tight">
                        {payment.student_name}
                      </p>
                      <p className="text-[11px] font-bold text-slate-400 truncate tracking-tight uppercase mt-0.5">
                        {payment.subject_name}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end shrink-0">
                      <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 leading-none">{formatCurrency(Number(payment.amount))}</p>
                      <div className="mt-2">
                        {getStatusBadge(payment.status)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl mb-5 border border-slate-100 dark:border-slate-700">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mode</p>
                      <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 tracking-tight uppercase">{payment.payment_mode}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reference</p>
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate uppercase tracking-tight">{payment.transaction_id || 'OFFLINE'}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {payment.status === 'PENDING_CONFIRMATION' && (canAdd) && (
                      <button
                        onClick={() => handleConfirm(payment.id)}
                        className="flex-1 h-12 rounded-xl text-[11px] bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 uppercase font-bold tracking-widest active:scale-95 transition-all"
                      >
                        Confirm Receipt
                      </button>
                    )}
                     {payment.status === 'SUCCESS' && (
                      <button
                        onClick={() => paymentsApi.downloadReceipt(payment.id)}
                        className="flex-1 h-12 rounded-xl text-[11px] bg-slate-900 dark:bg-indigo-600 text-white shadow-lg shadow-slate-900/10 dark:shadow-indigo-500/10 font-bold uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                      >
                        <Calendar size={16} /> Receipt
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Page {currentPage} / {totalPages}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 text-gray-700 dark:text-gray-300 rounded-2xl transition-all disabled:opacity-30 disabled:grayscale active:scale-90"
                  >
                    <Loader2 size={20} className={currentPage === 1 ? '' : 'rotate-180'} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20 active:scale-90 transition-all disabled:opacity-30"
                  >
                    <Plus size={24} className="rotate-45" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
