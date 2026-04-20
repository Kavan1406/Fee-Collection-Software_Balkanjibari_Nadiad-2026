'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, CreditCard, Loader2, RefreshCw, X, Trash2, ChevronLeft, Eye, EyeOff, Search } from 'lucide-react'
import { paymentsApi, enrollmentsApi, subjectsApi, studentsApi, OfflineRequestItem, Subject, Student } from '@/lib/api'
import { useNotifications } from '@/hooks/useNotifications'

interface RequestAcceptancePageProps {
  userRole: 'admin' | 'staff' | 'student' | 'accountant'
}

interface AcceptedCredential {
  student_id: string
  student_name: string
  subject: string
  username?: string
  password_hint?: string
  accepted_at: Date
  visible: boolean
}

const PENDING_STATUSES = new Set(['PENDING_CONFIRMATION', 'CREATED', 'UNPAID', 'PENDING'])
const ACCEPTED_STATUSES = new Set(['SUCCESS', 'PAID', 'COMPLETED', 'ACCEPTED'])
const REJECTED_STATUSES = new Set(['FAILED', 'REJECTED'])

type RequestFilter = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'ALL'

export default function RequestAcceptancePage({ userRole }: RequestAcceptancePageProps) {
  const { notifySuccess, notifyError, notifyInfo } = useNotifications()
  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [rows, setRows] = useState<OfflineRequestItem[]>([])
  const [requestFilter, setRequestFilter] = useState<RequestFilter>('PENDING')
  const [searchTerm, setSearchTerm] = useState('')
  const [rejectConfirm, setRejectConfirm] = useState<{ show: boolean; request: OfflineRequestItem | null; reason: string }>({
    show: false,
    request: null,
    reason: ''
  })

  const [showSlider, setShowSlider] = useState(false)
  const [acceptedCredentials, setAcceptedCredentials] = useState<AcceptedCredential[]>([])
  const [syncing, setSyncing] = useState(false)

  const canAccept = userRole === 'admin' || userRole === 'staff' || userRole === 'accountant'

  const pendingCashRows = useMemo(() => {
    return rows.filter((p) => p.payment_mode === 'CASH' && PENDING_STATUSES.has((p.status || '').toUpperCase()))
  }, [rows])

  const acceptedCashRows = useMemo(() => {
    return rows.filter((p) => p.payment_mode === 'CASH' && ACCEPTED_STATUSES.has((p.status || '').toUpperCase()))
  }, [rows])

  const rejectedCashRows = useMemo(() => {
    return rows.filter((p) => p.payment_mode === 'CASH' && REJECTED_STATUSES.has((p.status || '').toUpperCase()))
  }, [rows])

  const normalizedSubjectFeeMap = useMemo(() => {
    const normalize = (value: string) =>
      value
        .replace(/\([^)]*\)/g, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
    const map = new Map<string, number>()

    for (const subject of subjects.filter((s) => s.is_active)) {
      const fee = Number(subject.current_fee?.amount ?? subject.fee_structure?.fee_amount ?? subject.monthly_fee ?? 0)
      if (!Number.isFinite(fee)) continue
      map.set(normalize(subject.name), fee)
    }

    return {
      map,
      normalize,
    }
  }, [subjects])

  const getActualFeeForSubjectLabel = (label?: string): number | null => {
    if (!label) return null

    const normalized = normalizedSubjectFeeMap.normalize(label)
    const exact = normalizedSubjectFeeMap.map.get(normalized)
    if (typeof exact === 'number') return exact

    // If the label contains multiple subjects, sum what we can match.
    const parts = label
      .split(/\s*(?:\+|&|,|\/|\|)\s*/g)
      .map((p) => p.trim())
      .filter(Boolean)

    if (parts.length <= 1) return null

    let sum = 0
    let matched = 0
    for (const part of parts) {
      const fee = normalizedSubjectFeeMap.map.get(normalizedSubjectFeeMap.normalize(part))
      if (typeof fee === 'number') {
        sum += fee
        matched += 1
      }
    }

    return matched > 0 ? sum : null
  }

  const visibleRows = useMemo(() => {
    let filtered = rows
    
    // Filter by status
    if (requestFilter === 'ACCEPTED') filtered = filtered.filter((p) => p.payment_mode === 'CASH' && ACCEPTED_STATUSES.has((p.status || '').toUpperCase()))
    else if (requestFilter === 'REJECTED') filtered = filtered.filter((p) => p.payment_mode === 'CASH' && REJECTED_STATUSES.has((p.status || '').toUpperCase()))
    else if (requestFilter === 'ALL') filtered = filtered.filter((p) => p.payment_mode === 'CASH')
    else filtered = filtered.filter((p) => p.payment_mode === 'CASH' && PENDING_STATUSES.has((p.status || '').toUpperCase()))
    
    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(payment =>
        payment.student_name?.toLowerCase().includes(search) ||
        payment.student_id?.toLowerCase().includes(search) ||
        payment.subject?.toLowerCase().includes(search)
      )
    }
    
    return filtered
  }, [requestFilter, rows, searchTerm])

  const getStatusLabel = (status?: string) => {
    const normalized = (status || '').toUpperCase()
    if (PENDING_STATUSES.has(normalized)) return 'Pending'
    if (ACCEPTED_STATUSES.has(normalized)) return 'Accepted'
    if (REJECTED_STATUSES.has(normalized)) return 'Rejected'
    return normalized || 'Unknown'
  }

  const getStatusClassName = (status?: string) => {
    const normalized = (status || '').toUpperCase()
    if (PENDING_STATUSES.has(normalized)) return 'bg-orange-50 text-orange-600'
    if (ACCEPTED_STATUSES.has(normalized)) return 'bg-emerald-50 text-emerald-600'
    if (REJECTED_STATUSES.has(normalized)) return 'bg-rose-50 text-rose-600'
    return 'bg-slate-100 text-slate-600'
  }

  const fetchPendingCashRequests = async () => {
    setLoading(true)
    try {
      const statusesToFetch: Array<'PENDING' | 'COMPLETED' | 'REJECTED'> = ['PENDING', 'COMPLETED', 'REJECTED']
      const responses = await Promise.all(statusesToFetch.map((status) => paymentsApi.getOfflineRequests(status)))
      const collected = responses.flatMap((response: any) => response?.data || [])
      setRows(collected)
    } catch (err: any) {
      notifyError(err?.response?.data?.error?.message || 'Failed to fetch cash pending requests')
    } finally {
      setLoading(false)
    }
  }

  const fetchSubjects = async () => {
    try {
      const res = await subjectsApi.getAll()
      setSubjects(res?.data || [])
    } catch (err: any) {
      notifyError(err?.response?.data?.error?.message || 'Failed to fetch subjects')
    }
  }

  const handleSyncPayments = async () => {
    try {
      setSyncing(true)
      notifyInfo('Syncing payments from Razorpay...')
      const result = await paymentsApi.syncRazorpayPayments({
        limit: 100,
        auto_confirm: false
      })
      if (result?.data?.success) {
        const summary = result?.data?.summary
        notifySuccess(
          `Sync complete: ${summary?.matched || 0} matched, ${summary?.confirmed || 0} confirmed`
        )
      } else {
        notifyError((result?.data as any)?.message || 'Sync failed')
      }
      await fetchPendingCashRequests()
    } catch (err: any) {
      notifyError(err?.response?.data?.error?.message || 'Failed to sync payments')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    fetchPendingCashRequests()
    fetchSubjects()
  }, [])

  const handleAcceptPayment = async (payment: OfflineRequestItem) => {
    const ok = window.confirm(`Accept cash payment for ${payment.student_name}?`)
    if (!ok) return

    const receiptTab = window.open('about:blank', '_blank')
    const idCardTab = window.open('about:blank', '_blank')

    if (receiptTab) {
      receiptTab.document.title = 'Generating receipt...'
      receiptTab.document.body.innerHTML = '<p style="font-family: Arial, sans-serif; padding: 16px;">Generating receipt PDF...</p>'
    }
    if (idCardTab) {
      idCardTab.document.title = 'Generating ID card...'
      idCardTab.document.body.innerHTML = '<p style="font-family: Arial, sans-serif; padding: 16px;">Generating ID card PDF...</p>'
    }

    try {
      setProcessingId(payment.request_id)
      notifyInfo('Confirming cash payment and generating documents...')

      const confirmRes = await paymentsApi.acceptOfflineRequest(payment.request_id)
      const enrollmentId = Number((confirmRes as any)?.data?.enrollment_id || payment.enrollment_id)
      const confirmedPaymentId = Number((confirmRes as any)?.data?.payment_id || payment.payment_id)

      const docResults = await Promise.allSettled([
        paymentsApi.openReceiptInNewTab(confirmedPaymentId, receiptTab),
        enrollmentsApi.openIdCardInNewTab(enrollmentId, idCardTab),
        paymentsApi.downloadReceipt(confirmedPaymentId),
        enrollmentsApi.downloadIdCard(enrollmentId),
      ])

      const openedCount = docResults.slice(0, 2).filter((result) => result.status === 'fulfilled').length
      const downloadedCount = docResults.slice(2).filter((result) => result.status === 'fulfilled').length

      if (openedCount === 2 && downloadedCount === 2) {
        notifySuccess('Payment accepted. Receipt and ID card opened in separate tabs and downloaded successfully.')
      } else if (openedCount >= 1 || downloadedCount >= 1) {
        notifySuccess('Payment accepted. Documents were partially opened/downloaded; you can always re-download from student records.')
      } else {
        notifySuccess('Payment accepted. Documents are available in student records for manual open/download.')
      }

      if (!receiptTab || !idCardTab) {
        notifyInfo('Your browser blocked one or more tabs. Please allow pop-ups for this site to auto-open both PDFs.')
      }

      // Fetch student credentials and add to slider
      try {
        const studentId = parseInt(payment.student_id, 10)
        const studentRes = await studentsApi.getById(studentId)
        const student = (studentRes?.data || {}) as Student
        setAcceptedCredentials(prev => [{
          student_id: payment.student_id || '',
          student_name: payment.student_name || '',
          subject: payment.subject || '',
          username: student.login_username || payment.student_id,
          password_hint: student.login_password_hint || '(Ask student)',
          accepted_at: new Date(),
          visible: false
        }, ...prev.slice(0, 9)])
        setShowSlider(true)
      } catch (err) {
        console.error('Failed to fetch student credentials:', err)
      }

      await fetchPendingCashRequests()
    } catch (err: any) {
      if (receiptTab && !receiptTab.closed) {
        receiptTab.close()
      }
      if (idCardTab && !idCardTab.closed) {
        idCardTab.close()
      }
      const backendMessage = err?.response?.data?.error?.message
      const fallbackMessage = err?.message
      notifyError(backendMessage || fallbackMessage || 'Failed to accept payment')
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectPayment = async (request: OfflineRequestItem) => {
    setRejectConfirm({ show: true, request, reason: '' })
  }

  const confirmRejectPayment = async () => {
    if (!rejectConfirm.request) return

    try {
      setProcessingId(rejectConfirm.request.request_id)
      notifyInfo('Rejecting payment request...')

      const rejectRes = await paymentsApi.rejectOfflineRequest(
        rejectConfirm.request.request_id,
        rejectConfirm.reason || undefined
      )

      notifySuccess('Payment request rejected successfully. The student can resubmit.')
      setRejectConfirm({ show: false, request: null, reason: '' })
      await fetchPendingCashRequests()
    } catch (err: any) {
      const backendMessage = err?.response?.data?.error?.message
      const fallbackMessage = err?.message
      notifyError(backendMessage || fallbackMessage || 'Failed to reject payment')
    } finally {
      setProcessingId(null)
    }
  }

  const getDuplicateStudents = useMemo(() => {
    const studentMap = new Map<string, OfflineRequestItem[]>()
    for (const request of rows) {
      const studentId = request.student_id?.toLowerCase().trim() || ''
      if (!studentId) continue
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, [])
      }
      studentMap.get(studentId)!.push(request)
    }
    const duplicates = new Map<string, OfflineRequestItem[]>()
    for (const [studentId, requests] of studentMap) {
      if (requests.length > 1) {
        duplicates.set(studentId, requests)
      }
    }
    return duplicates
  }, [rows])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 font-poppins uppercase tracking-tight">Request Acceptance</h1>
          <p className="text-slate-500 text-[10px] sm:text-sm mt-1 font-medium font-inter uppercase tracking-widest">Offline cash registrations awaiting counter confirmation</p>
        </div>
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
          {/* Search Bar */}
          <div className="flex-1 sm:flex-none relative w-full sm:w-64">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, ID, subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 pl-10 pr-8 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold uppercase tracking-widest placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          </div>
          <select
            value={requestFilter}
            onChange={(e) => setRequestFilter(e.target.value as RequestFilter)}
            className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold uppercase tracking-widest"
          >
            <option value="PENDING">Pending Requests</option>
            <option value="ACCEPTED">Accepted Requests</option>
            <option value="REJECTED">Rejected Requests</option>
            <option value="ALL">All Requests</option>
          </select>
          <button
            onClick={handleSyncPayments}
            disabled={syncing || loading}
            className="h-11 px-6 rounded-xl font-medium font-poppins flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-xs uppercase tracking-widest bg-purple-600 text-white shadow-lg shadow-purple-500/20 disabled:opacity-60"
            title="Sync pending payments from Razorpay"
          >
            <Loader2 size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Payments'}
          </button>
          <button
            onClick={fetchPendingCashRequests}
            disabled={loading}
            className="w-full sm:w-auto h-11 px-6 rounded-xl font-medium font-poppins flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-xs uppercase tracking-widest bg-blue-600 text-white shadow-lg shadow-blue-500/20 disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Cash Pending</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{pendingCashRows.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Accepted</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{acceptedCashRows.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Rejected</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{rejectedCashRows.length}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Current Subject Fees ({subjects.filter((s) => s.is_active).length})</p>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">Source: Subjects → Current Fee</p>
        </div>
        <div className="p-6">
          {subjects.filter((s) => s.is_active).length === 0 ? (
            <p className="text-xs text-slate-500">Subject fee list is unavailable right now.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {subjects
                .slice()
                .filter((s) => s.is_active)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((s) => {
                  const fee = Number(s.current_fee?.amount ?? s.fee_structure?.fee_amount ?? s.monthly_fee ?? 0)
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                      <span className="text-xs font-semibold text-slate-700 truncate">{s.name}</span>
                      <span className="text-xs font-bold text-slate-900">₹{Number.isFinite(fee) ? fee.toLocaleString('en-IN') : '-'}</span>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="animate-spin mb-3" size={28} />
            <p className="text-sm font-semibold">Loading pending cash requests...</p>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-500">
            <CheckCircle2 size={30} className="text-emerald-500 mb-3" />
            <p className="text-sm font-semibold">No records found for selected status.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Student Name</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Student ID</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Subject</th>
                  <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-widest">Total Fees</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Payment Status</th>
                  <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((payment) => (
                  (() => {
                    const actualFee = getActualFeeForSubjectLabel(payment.subject)
                    const requestedAmount = Number(payment.total_fees || 0)
                    const displayAmount = actualFee ?? requestedAmount
                    const showMismatch = actualFee !== null && Math.round(actualFee) !== Math.round(requestedAmount)
                    const duplicates = getDuplicateStudents.get(payment.student_id?.toLowerCase().trim() || '')
                    const hasDuplicates = duplicates && duplicates.length > 1

                    return (
                  <tr key={payment.request_id} className={`hover:bg-slate-50/70 ${hasDuplicates ? 'bg-orange-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{payment.student_name}</p>
                          {hasDuplicates && (
                            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mt-1">
                              ⚠️ {duplicates.length} Registrations
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900 font-mono">{payment.student_id}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{payment.subject}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-semibold text-slate-900">₹{Number(displayAmount || 0).toLocaleString('en-IN')}</div>
                      {showMismatch && (
                        <div className="text-[10px] font-bold uppercase tracking-widest text-rose-600">Requested: ₹{requestedAmount.toLocaleString('en-IN')}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${getStatusClassName(payment.status || payment.payment_status)}`}>
                        {getStatusLabel(payment.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {PENDING_STATUSES.has((payment.status || payment.payment_status || '').toUpperCase()) ? (
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            disabled={!canAccept || processingId === payment.request_id}
                            onClick={() => handleAcceptPayment(payment)}
                            className="inline-flex items-center gap-1 px-3 h-9 rounded-lg bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-60"
                            title="Accept and generate documents"
                          >
                            {processingId === payment.request_id ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                            Accept
                          </button>
                          <button
                            disabled={!canAccept || processingId === payment.request_id}
                            onClick={() => handleRejectPayment(payment)}
                            className="inline-flex items-center gap-1 px-3 h-9 rounded-lg bg-rose-600 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-rose-700 disabled:opacity-60"
                            title="Reject this request"
                          >
                            {processingId === payment.request_id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                    )
                  })()
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-xs">
        <AlertCircle size={14} className="mt-0.5" />
        <p>After acceptance, payment is marked as paid in CASH mode and both student documents are generated, opened in separate tabs, and downloaded for printing.</p>
      </div>

      {/* Reject Confirmation Modal */}
      {rejectConfirm.show && rejectConfirm.request && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertCircle size={24} className="text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Reject Request?</h3>
                <p className="text-sm text-slate-600">{rejectConfirm.request.student_name}</p>
              </div>
            </div>

            <div className="bg-rose-50 rounded-xl p-4 border border-rose-200">
              <p className="text-sm text-slate-700">
                <span className="font-semibold">Subject:</span> {rejectConfirm.request.subject}
              </p>
              <p className="text-sm text-slate-700 mt-1">
                <span className="font-semibold">Amount:</span> ₹{Number(rejectConfirm.request.total_fees || 0).toLocaleString('en-IN')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Reason for Rejection (Optional)
              </label>
              <textarea
                value={rejectConfirm.reason}
                onChange={(e) => setRejectConfirm({ ...rejectConfirm, reason: e.target.value })}
                placeholder="e.g., Duplicate registration, Student withdrew, Invalid documents..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setRejectConfirm({ show: false, request: null, reason: '' })}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRejectPayment}
                disabled={processingId === rejectConfirm.request.request_id}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {processingId === rejectConfirm.request.request_id ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <X size={16} />
                    Reject Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicates Warning */}
      {getDuplicateStudents.size > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} className="text-orange-600 flex-shrink-0" />
            <h3 className="font-bold text-orange-900">⚠️ Duplicate Registrations Detected</h3>
          </div>
          <p className="text-sm text-orange-800">
            {getDuplicateStudents.size} student(s) have multiple registrations. Review the entries marked with ⚠️ above and reject or delete duplicates.
          </p>
          <div className="grid gap-2">
            {Array.from(getDuplicateStudents.entries()).map(([studentId, requests]) => (
              <div key={studentId} className="bg-white p-3 rounded-lg border border-orange-100">
                <p className="text-sm font-semibold text-slate-900">{requests[0].student_name} ({requests.length} entries)</p>
                <div className="text-xs text-slate-600 mt-1 space-y-1">
                  {requests.map((req, idx) => (
                    <div key={req.request_id} className="flex items-center justify-between">
                      <span>Entry {idx + 1}: {req.subject} - ₹{Number(req.total_fees).toLocaleString('en-IN')}</span>
                      {PENDING_STATUSES.has((req.status || req.payment_status || '').toUpperCase()) && (
                        <button
                          onClick={() => handleRejectPayment(req)}
                          className="text-rose-600 hover:text-rose-700 font-semibold text-[10px] uppercase tracking-widest"
                          title="Reject this duplicate entry"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Right-side Slider for Accepted Credentials */}
      <div className={`fixed right-0 top-0 h-screen w-80 bg-white border-l border-slate-200 shadow-lg transform transition-transform duration-300 z-40 overflow-y-auto ${showSlider ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-widest">
            Recently Accepted ({acceptedCredentials.length})
          </h3>
          <button
            onClick={() => setShowSlider(false)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        {acceptedCredentials.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            <p>No credentials to show yet.</p>
            <p className="text-xs mt-2">Accept payment requests to view student credentials here.</p>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {acceptedCredentials.map((cred, idx) => (
              <div key={idx} className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4 border border-emerald-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 text-sm truncate">{cred.student_name}</p>
                    <p className="text-xs text-slate-600 truncate">{cred.subject}</p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {cred.accepted_at.toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold shrink-0 ml-2">
                    ✓
                  </div>
                </div>

                <div className="space-y-2 bg-white rounded-lg p-3 border border-emerald-100">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Username/ID</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-mono font-semibold text-slate-900 truncate">{cred.username}</p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(cred.username || '')
                          notifySuccess('Copied to clipboard')
                        }}
                        className="text-xs text-blue-600 hover:underline shrink-0"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Password Hint</p>
                      <button
                        onClick={() => {
                          setAcceptedCredentials(prev => prev.map((c, i) => i === idx ? { ...c, visible: !c.visible } : c))
                        }}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        {cred.visible ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-mono font-semibold text-slate-900 truncate">
                        {cred.visible ? cred.password_hint : '••••••••'}
                      </p>
                      {cred.visible && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(cred.password_hint || '')
                            notifySuccess('Copied to clipboard')
                          }}
                          className="text-xs text-blue-600 hover:underline shrink-0"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slider Toggle Button */}
      {acceptedCredentials.length > 0 && !showSlider && (
        <button
          onClick={() => setShowSlider(true)}
          className="fixed right-0 top-32 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-l-lg font-bold text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 z-30"
        >
          Credentials ({acceptedCredentials.length})
        </button>
      )}

      {/* Semi-transparent Overlay when Slider is open */}
      {showSlider && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={() => setShowSlider(false)}
        />
      )}
    </div>
  )
}