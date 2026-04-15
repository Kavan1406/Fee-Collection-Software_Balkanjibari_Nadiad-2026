'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, CreditCard, Loader2, RefreshCw } from 'lucide-react'
import { paymentsApi, enrollmentsApi, subjectsApi, OfflineRequestItem, Subject } from '@/lib/api'
import { useNotifications } from '@/hooks/useNotifications'

interface RequestAcceptancePageProps {
  userRole: 'admin' | 'staff' | 'student' | 'accountant'
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
    if (requestFilter === 'ACCEPTED') return acceptedCashRows
    if (requestFilter === 'REJECTED') return rejectedCashRows
    if (requestFilter === 'ALL') {
      return rows.filter((p) => p.payment_mode === 'CASH')
    }
    return pendingCashRows
  }, [requestFilter, acceptedCashRows, rejectedCashRows, rows, pendingCashRows])

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 font-poppins uppercase tracking-tight">Request Acceptance</h1>
          <p className="text-slate-500 text-[10px] sm:text-sm mt-1 font-medium font-inter uppercase tracking-widest">Offline cash registrations awaiting counter confirmation</p>
        </div>
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
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

                    return (
                  <tr key={payment.request_id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{payment.student_name}</td>
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
                        <button
                          disabled={!canAccept || processingId === payment.request_id}
                          onClick={() => handleAcceptPayment(payment)}
                          className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {processingId === payment.request_id ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                          Accept Payment
                        </button>
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
    </div>
  )
}