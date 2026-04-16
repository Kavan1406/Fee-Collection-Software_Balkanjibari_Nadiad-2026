'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, AlertCircle, Calendar, Loader2, CreditCard, RefreshCw, CheckCircle, Download, FileText, Trash2 } from 'lucide-react'
import { paymentsApi, enrollmentsApi, Payment, CreatePaymentData } from '@/lib/api'
import { API_BASE_URL } from '@/lib/api/client'

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
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [showReconciliation, setShowReconciliation] = useState(false)
  const [reconLoading, setReconLoading] = useState(false)
  const [reconResult, setReconResult] = useState<any>(null)
  const [reconStartDate, setReconStartDate] = useState('')
  const [reconEndDate, setReconEndDate] = useState('')
  const [deletePaymentId, setDeletePaymentId] = useState<number | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const canAdd = userRole === 'admin' || (userRole === 'staff' && canEdit) || userRole === 'accountant'

  // Delete handler
  const handleDeletePayment = async () => {
    if (!deletePaymentId) return
    
    try {
      setIsDeleting(true)
      await paymentsApi.delete(deletePaymentId)
      setPayments(payments.filter(p => p.id !== deletePaymentId))
      setShowDeleteDialog(false)
      setDeletePaymentId(null)
    } catch (err: any) {
      console.error('Delete failed:', err)
      alert(err.message || 'Failed to delete payment')
    } finally {
      setIsDeleting(false)
    }
  }

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

  // Fetch payments - Optimized for speed
  const fetchPayments = async () => {
    try {
      setLoading(true)
      setError('')
      // Parallel fetch without expensive outstanding calculation
      const [res, statsRes] = await Promise.all([
        paymentsApi.getAll({
          page: currentPage,
          page_size: 20,  // Reduced for faster initial load
          search: searchTerm || undefined,
          payment_mode: paymentModeFilter || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }),
        paymentsApi.getStats()
      ])

      let paymentsList = Array.isArray(res?.results) ? res.results : []
      
      // Sort by ID descending (latest first)
      paymentsList.sort((a, b) => {
        const aId = parseInt(a.id?.toString() || '0')
        const bId = parseInt(b.id?.toString() || '0')
        return bId - aId
      })

      setPayments(paymentsList)
      setTotalPages(Number(res?.total_pages || 1))
      setTotalCount(Number(res?.count || 0))

      const stats = (statsRes as any)?.data || statsRes
      setPaymentStats({
        total_paid: Number(stats?.total_paid || 0),
        total_pending: Number(stats?.total_pending || 0),  // Use stats directly instead of fetching all enrollments
      })
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
      const response = await paymentsApi.confirmPayment(id)
      const enrollmentId = Number((response as any)?.data?.enrollment_id)
      const paymentId = Number((response as any)?.data?.payment_id || id)

      await Promise.all([
        paymentsApi.openReceiptInNewTab(paymentId),
        enrollmentId ? enrollmentsApi.openIdCardInNewTab(enrollmentId) : Promise.resolve(),
      ])

      fetchPayments()

      // Sync with Enrollments page: Set flag for auto-refresh
      localStorage.setItem('paymentConfirmed', 'true')
      // Also dispatch custom event for same-window updates
      window.dispatchEvent(new CustomEvent('paymentConfirmed'))
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to confirm payment')
    } finally {
      setLoading(false)
    }
  }

  // Sync payments from Razorpay
  const handleSyncPayments = async () => {
    if (!confirm('Sync pending payments from Razorpay? This will auto-confirm any completed payments.')) return

    setIsSyncing(true)
    setError('')
    setSyncResult(null)

    try {
      const response = await paymentsApi.syncRazorpayPayments({ limit: 100, auto_confirm: true })

      if (!response.success) {
        throw new Error(response.data?.message || 'Failed to sync payments')
      }

      setSyncResult({
        success: true,
        message: response.data?.message || 'Sync completed successfully',
        summary: response.data?.summary,
        errors: response.data?.errors
      })

      // Refresh payments list after sync
      fetchPayments()
    } catch (err: any) {
      setError(err.message || 'Failed to sync payments from Razorpay')
      setSyncResult({
        success: false,
        message: err.message
      })
    } finally {
      setIsSyncing(false)
    }
  }

  // Generate reconciliation report
  const handleGenerateReport = async () => {
    setReconLoading(true)
    setError('')
    setReconResult(null)

    try {
      const response = await paymentsApi.getRazorpayReconciliationReport({
        start_date: reconStartDate || undefined,
        end_date: reconEndDate || undefined,
      })

      if (!response.success) {
        throw new Error(response.data?.error || 'Failed to generate report')
      }

      setReconResult(response.data)
    } catch (err: any) {
      setError(err.message || 'Failed to generate reconciliation report')
      setReconResult({
        success: false,
        error: err.message
      })
    } finally {
      setReconLoading(false)
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

  const getPaymentModeBadge = (mode: string) => {
    switch (mode) {
      case 'ONLINE':
        return <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-widest">💳 Online</span>
      case 'CASH':
        return <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-widest">💵 Cash</span>
      default:
        return <span className="px-2 py-1 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest">{mode}</span>
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
        <div className="flex gap-2 w-full sm:w-auto">
          {(userRole === 'admin' || userRole === 'staff') && (
            <button
              onClick={handleSyncPayments}
              disabled={isSyncing}
              className="h-11 px-4 sm:px-6 rounded-xl font-medium font-poppins flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-xs uppercase tracking-widest bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none"
              title="Sync pending payments from Razorpay"
            >
              {isSyncing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  <span>Sync Payments</span>
                </>
              )}
            </button>
          )}
          {canAdd && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="h-11 px-4 sm:px-6 rounded-xl font-medium font-poppins flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-xs uppercase tracking-widest bg-blue-600 text-white shadow-lg shadow-blue-500/20 flex-1 sm:flex-none"
            >
              <Plus size={18} />
              <span>Record Payment</span>
            </button>
          )}
        </div>
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

      {/* Payment Mode Summary Stats */}
      {!loading && payments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 px-1 sm:px-0">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-2xl p-4 border border-blue-200 dark:border-blue-800 shadow-lg shadow-blue-500/10">
            <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Online Payments</p>
            <p className="text-lg sm:text-xl font-bold text-blue-900 dark:text-blue-100">
              {payments.filter(p => p.payment_mode === 'ONLINE').length}
            </p>
            <p className="text-[8px] text-blue-700 dark:text-blue-300 mt-1">
              {formatCurrency(
                payments
                  .filter(p => p.payment_mode === 'ONLINE')
                  .reduce((sum, p) => sum + Number(p.amount), 0)
              )}
            </p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800 shadow-lg shadow-emerald-500/10">
            <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">Cash Payments</p>
            <p className="text-lg sm:text-xl font-bold text-emerald-900 dark:text-emerald-100">
              {payments.filter(p => p.payment_mode === 'CASH').length}
            </p>
            <p className="text-[8px] text-emerald-700 dark:text-emerald-300 mt-1">
              {formatCurrency(
                payments
                  .filter(p => p.payment_mode === 'CASH')
                  .reduce((sum, p) => sum + Number(p.amount), 0)
              )}
            </p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-2xl p-4 border border-orange-200 dark:border-orange-800 shadow-lg shadow-orange-500/10">
            <p className="text-[9px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-2">Pending Confirmation</p>
            <p className="text-lg sm:text-xl font-bold text-orange-900 dark:text-orange-100">
              {payments.filter(p => p.status === 'PENDING_CONFIRMATION').length}
            </p>
            <p className="text-[8px] text-orange-700 dark:text-orange-300 mt-1">
              {formatCurrency(
                payments
                  .filter(p => p.status === 'PENDING_CONFIRMATION')
                  .reduce((sum, p) => sum + Number(p.amount), 0)
              )}
            </p>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-500/10">
            <p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">Success Rate</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
              {payments.length > 0 
                ? Math.round((payments.filter(p => p.status === 'SUCCESS').length / payments.length) * 100) 
                : 0}%
            </p>
            <p className="text-[8px] text-slate-700 dark:text-slate-300 mt-1">Confirmed</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="text-red-600" size={20} />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Sync Result Message */}
      {syncResult && (
        <div className={`rounded-lg p-4 border ${syncResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'}`}>
          <h3 className={`font-bold mb-2 ${syncResult.success ? 'text-emerald-900' : 'text-orange-900'}`}>
            {syncResult.success ? '✓ Sync Completed' : '⚠ Sync Failed'}
          </h3>
          <p className={`text-sm ${syncResult.success ? 'text-emerald-800' : 'text-orange-800'}`}>{syncResult.message}</p>
          {syncResult.summary && (
            <div className={`mt-3 grid grid-cols-4 gap-2 text-xs ${syncResult.success ? 'text-emerald-700' : 'text-orange-700'}`}>
              <div>
                <p className="font-semibold">Fetched</p>
                <p className="text-lg font-bold">{syncResult.summary.total_fetched}</p>
              </div>
              <div>
                <p className="font-semibold">Matched</p>
                <p className="text-lg font-bold">{syncResult.summary.matched}</p>
              </div>
              <div>
                <p className="font-semibold">Confirmed</p>
                <p className="text-lg font-bold">{syncResult.summary.confirmed}</p>
              </div>
              <div>
                <p className="font-semibold">Failed</p>
                <p className="text-lg font-bold">{syncResult.summary.failed}</p>
              </div>
            </div>
          )}
          {syncResult.errors && syncResult.errors.length > 0 && (
            <div className="mt-3 bg-white/50 rounded p-2">
              <p className="text-[10px] font-semibold mb-1">Errors:</p>
              <ul className="text-[10px] space-y-1">
                {syncResult.errors.map((err: string, i: number) => (
                  <li key={i} className="text-red-700">• {err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Reconciliation Report Section */}
      {(userRole === 'admin' || userRole === 'staff') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Payment Reconciliation Report</h3>
            <button
              onClick={() => setShowReconciliation(!showReconciliation)}
              className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              {showReconciliation ? '▼' : '▶'}
            </button>
          </div>

          {showReconciliation && (
            <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Compare Razorpay account payments with your local database to identify discrepancies and orphaned transactions.
              </p>

              {/* Date Range Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={reconStartDate}
                    onChange={(e) => setReconStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={reconEndDate}
                    onChange={(e) => setReconEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateReport}
                disabled={reconLoading}
                className="w-full px-4 py-2 rounded-lg font-medium font-poppins flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-xs uppercase tracking-widest bg-blue-600 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reconLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Calendar size={16} />
                    <span>Generate Report</span>
                  </>
                )}
              </button>

              {/* Report Results */}
              {reconResult && (
                <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-4">
                  {reconResult.success ? (
                    <>
                      {/* Summary Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                          <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-widest">
                            Razorpay
                          </p>
                          <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                            {reconResult.summary.total_razorpay_payments}
                          </p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                          <p className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-widest">
                            Local DB
                          </p>
                          <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                            {reconResult.summary.total_local_payments}
                          </p>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-950 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
                          <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-widest">
                            Matched
                          </p>
                          <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                            {reconResult.summary.matched_and_confirmed}
                          </p>
                        </div>
                        <div className={`rounded-lg p-3 border ${
                          reconResult.health_check?.critical_issues > 0
                            ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                            : 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                        }`}>
                          <p className={`text-[10px] font-semibold uppercase tracking-widest ${
                            reconResult.health_check?.critical_issues > 0
                              ? 'text-red-700 dark:text-red-300'
                              : 'text-green-700 dark:text-green-300'
                          }`}>
                            Issues
                          </p>
                          <p className={`text-lg font-bold ${
                            reconResult.health_check?.critical_issues > 0
                              ? 'text-red-900 dark:text-red-100'
                              : 'text-green-900 dark:text-green-100'
                          }`}>
                            {reconResult.health_check?.critical_issues || 0}
                          </p>
                        </div>
                      </div>

                      {/* Amount Summary */}
                      <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                          <p className="text-slate-600 dark:text-slate-400 font-semibold mb-1">Verified</p>
                          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{reconResult.summary.amount_verified?.toLocaleString('en-IN') || '0'}
                          </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                          <p className="text-slate-600 dark:text-slate-400 font-semibold mb-1">Pending</p>
                          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                            ₹{reconResult.summary.amount_pending?.toLocaleString('en-IN') || '0'}
                          </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                          <p className="text-slate-600 dark:text-slate-400 font-semibold mb-1">Orphaned</p>
                          <p className="text-lg font-bold text-red-600 dark:text-red-400">
                            ₹{reconResult.summary.amount_orphaned?.toLocaleString('en-IN') || '0'}
                          </p>
                        </div>
                      </div>

                      {/* Discrepancies Section */}
                      {reconResult.discrepancies?.orphaned_razorpay?.length > 0 && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                          <h4 className="text-xs font-bold text-red-900 dark:text-red-100 mb-2 uppercase tracking-widest">
                            ⚠️ Orphaned Razorpay Payments ({reconResult.discrepancies.orphaned_razorpay.length})
                          </h4>
                          <div className="space-y-2">
                            {reconResult.discrepancies.orphaned_razorpay.slice(0, 5).map((p: any, i: number) => (
                              <div key={i} className="text-xs bg-white dark:bg-slate-900 p-2 rounded">
                                <p className="text-red-700 dark:text-red-400">
                                  <strong>{p.razorpay_payment_id}</strong> • ₹{p.amount} • {p.status}
                                </p>
                                <p className="text-slate-500 dark:text-slate-400 text-[10px]">
                                  Order: {p.order_id}
                                </p>
                              </div>
                            ))}
                            {reconResult.discrepancies.orphaned_razorpay.length > 5 && (
                              <p className="text-[10px] text-red-600 dark:text-red-400">
                                +{reconResult.discrepancies.orphaned_razorpay.length - 5} more
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {reconResult.discrepancies?.amount_mismatches?.length > 0 && (
                        <div className="p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
                          <h4 className="text-xs font-bold text-orange-900 dark:text-orange-100 mb-2 uppercase tracking-widest">
                            🔍 Amount Mismatches ({reconResult.discrepancies.amount_mismatches.length})
                          </h4>
                          <div className="space-y-2">
                            {reconResult.discrepancies.amount_mismatches.slice(0, 3).map((m: any, i: number) => (
                              <div key={i} className="text-xs bg-white dark:bg-slate-900 p-2 rounded">
                                <p className="text-orange-700 dark:text-orange-400">
                                  <strong>{m.order_id}</strong>
                                </p>
                                <p className="text-slate-600 dark:text-slate-400">
                                  Razorpay: ₹{m.razorpay_amount} | Local: ₹{m.local_amount} | Diff: ₹{m.difference.toFixed(2)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {reconResult.health_check?.status === 'healthy' && (
                        <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                          <p className="text-xs text-green-900 dark:text-green-100 font-semibold">
                            ✓ All payments are reconciled! No discrepancies found.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-xs text-red-900 dark:text-red-100">
                        <strong>Error:</strong> {reconResult.error}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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
        {/* Page Info Header */}
        {!loading && payments.length > 0 && totalPages > 1 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-widest">
              📄 Page {currentPage} of {totalPages} • Showing {((currentPage - 1) * 20) + 1}-{Math.min(currentPage * 20, totalCount)} of {totalCount} payments
            </p>
          </div>
        )}
        
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
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Mode</th>
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
                          {getPaymentModeBadge(payment.payment_mode)}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(payment.status)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end items-center">
                            {payment.status === 'PENDING_CONFIRMATION' && (canAdd) && (
                              <button 
                                onClick={() => handleConfirm(payment.id)} 
                                title="Mark as Paid - Opens Receipt & ID Card"
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium font-poppins rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                              >
                                <CheckCircle size={14} />
                                Pending → Paid
                              </button>
                            )}
                            {payment.status === 'SUCCESS' && (
                                <button 
                                  onClick={() => paymentsApi.downloadReceipt(payment.id)} 
                                  title="Download Receipt"
                                  className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all h-9 w-9 flex items-center justify-center shadow-sm"
                                >
                                  <FileText size={18} />
                                </button>
                            )}
                            {canAdd && (
                              <button
                                onClick={() => {
                                  setDeletePaymentId(payment.id)
                                  setShowDeleteDialog(true)
                                }}
                                title="Delete Payment"
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl transition-all h-9 w-9 flex items-center justify-center shadow-sm"
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

                  <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl mb-5 border border-slate-100 dark:border-slate-700">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mode</p>
                      {getPaymentModeBadge(payment.payment_mode)}
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reference</p>
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate uppercase tracking-tight">{payment.transaction_id || 'OFFLINE'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date</p>
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 tracking-tight">{new Date(payment.payment_date).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {payment.status === 'PENDING_CONFIRMATION' && (canAdd) && (
                      <button
                        onClick={() => handleConfirm(payment.id)}
                        title="Mark as Paid - Opens Receipt & ID Card"
                        className="flex-1 h-12 rounded-xl text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 uppercase font-bold tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                      >
                        <CheckCircle size={16} />
                        Pending → Paid
                      </button>
                    )}
                     {payment.status === 'SUCCESS' && (
                      <button
                        onClick={() => paymentsApi.downloadReceipt(payment.id)}
                        title="Download Receipt"
                        className="flex-1 h-12 rounded-xl text-[11px] bg-slate-900 dark:bg-indigo-600 text-white shadow-lg shadow-slate-900/10 dark:shadow-indigo-500/10 font-bold uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                      >
                        <FileText size={16} /> Receipt
                      </button>
                    )}
                    {canAdd && (
                      <button
                        onClick={() => {
                          setDeletePaymentId(payment.id)
                          setShowDeleteDialog(true)
                        }}
                        title="Delete Payment"
                        className="h-12 rounded-xl text-[11px] bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20 uppercase font-bold tracking-widest px-4 flex items-center justify-center gap-2 active:scale-95 transition-all"
                      >
                        <Trash2 size={16} /> Delete
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
                    Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalCount)} of {totalCount} payments
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

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && deletePaymentId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Payment?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
              </div>
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
              Are you sure you want to delete this payment record? The payment will be permanently removed from the system.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteDialog(false)
                  setDeletePaymentId(null)
                }}
                disabled={isDeleting}
                className="flex-1 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-medium text-sm uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePayment}
                disabled={isDeleting}
                className="flex-1 h-10 rounded-lg bg-red-600 text-white font-medium text-sm uppercase tracking-widest hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
