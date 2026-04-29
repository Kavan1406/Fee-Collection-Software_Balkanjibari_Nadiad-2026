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

interface GroupedStudentRequest {
  group_key: string
  student_id: string
  student_name: string
  requests: OfflineRequestItem[]
  subjects: string[]
  total_fees: number
  duplicate_count: number
  status: string
  all_pending: boolean
  all_accepted: boolean
  all_rejected: boolean
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
  const [rejectConfirm, setRejectConfirm] = useState<{ show: boolean; request: GroupedStudentRequest | null; reason: string }>({
    show: false,
    request: null,
    reason: ''
  })

  const [showSlider, setShowSlider] = useState(false)
  const [acceptedCredentials, setAcceptedCredentials] = useState<AcceptedCredential[]>([])
  const [syncing, setSyncing] = useState(false)
  const [focusedStudentId, setFocusedStudentId] = useState('')
  const [focusedRefreshCount, setFocusedRefreshCount] = useState(0)

  const canAccept = userRole === 'admin' || userRole === 'staff' || userRole === 'accountant'

  const normalizeSubjectKey = (value?: string) => (value || '').trim().toLowerCase()

  const getRequestBucket = (status?: string) => {
    const normalized = (status || '').toUpperCase()
    if (PENDING_STATUSES.has(normalized)) return 'pending'
    if (ACCEPTED_STATUSES.has(normalized)) return 'accepted'
    if (REJECTED_STATUSES.has(normalized)) return 'rejected'
    return 'other'
  }

  const getUniqueRequestsBySubject = (requests: OfflineRequestItem[]) => {
    const bySubject = new Map<string, OfflineRequestItem>()
    for (const req of requests) {
      const key = normalizeSubjectKey(req.subject)
      const existing = bySubject.get(key)
      if (!existing) {
        bySubject.set(key, req)
        continue
      }

      const existingTs = new Date(existing.created_at || 0).getTime()
      const currentTs = new Date(req.created_at || 0).getTime()
      if (currentTs > existingTs) {
        bySubject.set(key, req)
      }
    }
    return Array.from(bySubject.values())
  }

  const buildGroupedStudentRequests = (sourceRows: OfflineRequestItem[]) => {
    const grouped = new Map<string, GroupedStudentRequest>()

    for (const request of sourceRows) {
      const studentId = request.student_id?.toLowerCase().trim() || ''
      if (!studentId) continue

      if (!grouped.has(studentId)) {
        grouped.set(studentId, {
          group_key: studentId,
          student_id: request.student_id || '',
          student_name: request.student_name || '',
          requests: [],
          subjects: [],
          total_fees: 0,
          duplicate_count: 0,
          status: 'PENDING',
          all_pending: true,
          all_accepted: true,
          all_rejected: true,
        })
      }

      const group = grouped.get(studentId)!
      group.requests.push(request)

      const requestStatus = (request.status || request.payment_status || '').toUpperCase()
      if (!PENDING_STATUSES.has(requestStatus)) group.all_pending = false
      if (!ACCEPTED_STATUSES.has(requestStatus)) group.all_accepted = false
      if (!REJECTED_STATUSES.has(requestStatus)) group.all_rejected = false
    }

    for (const group of grouped.values()) {
      const uniqueRequests = getUniqueRequestsBySubject(group.requests)
      group.requests = uniqueRequests
      group.subjects = uniqueRequests.map((r) => r.subject || '')
      group.total_fees = uniqueRequests.reduce((sum, r) => sum + Number(r.total_fees || 0), 0)
      group.duplicate_count = 0
    }

    return Array.from(grouped.values())
  }

  const pendingRequestRows = useMemo(
    () => rows.filter((r) => PENDING_STATUSES.has((r.status || r.payment_status || '').toUpperCase())),
    [rows]
  )

  const acceptedRequestRows = useMemo(
    () => rows.filter((r) => ACCEPTED_STATUSES.has((r.status || r.payment_status || '').toUpperCase())),
    [rows]
  )

  const rejectedRequestRows = useMemo(
    () => rows.filter((r) => REJECTED_STATUSES.has((r.status || r.payment_status || '').toUpperCase())),
    [rows]
  )

  const pendingCashRows = useMemo(() => buildGroupedStudentRequests(pendingRequestRows), [pendingRequestRows])
  const acceptedCashRows = useMemo(() => buildGroupedStudentRequests(acceptedRequestRows), [acceptedRequestRows])
  const rejectedCashRows = useMemo(() => buildGroupedStudentRequests(rejectedRequestRows), [rejectedRequestRows])
  const allGroupedRows = useMemo(() => buildGroupedStudentRequests(rows), [rows])

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

  const getResolvedRequestFee = (request: OfflineRequestItem): number => {
    const directFee = Number(request.total_fees || 0)
    if (Number.isFinite(directFee) && directFee > 0) return directFee
    return getActualFeeForSubjectLabel(request.subject) || 0
  }

  const visibleRows = useMemo(() => {
    let filtered = pendingCashRows
    
    // Filter by status
    if (requestFilter === 'ACCEPTED') filtered = acceptedCashRows
    else if (requestFilter === 'REJECTED') filtered = rejectedCashRows
    else if (requestFilter === 'ALL') filtered = allGroupedRows
    else filtered = pendingCashRows
    
    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(group =>
        group.student_name?.toLowerCase().includes(search) ||
        group.student_id?.toLowerCase().includes(search) ||
        group.subjects.some(s => s?.toLowerCase().includes(search))
      )
    }
    
    return filtered
  }, [requestFilter, pendingCashRows, acceptedCashRows, rejectedCashRows, allGroupedRows, searchTerm])

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
      
      // Fetch both payment requests and new student registration requests
      const [paymentResponses, regRequestResponse] = await Promise.all([
        Promise.all(statusesToFetch.map((status) => paymentsApi.getOfflineRequests(status))),
        (await import('@/lib/api/students')).registrationRequestsApi.list(requestFilter === 'ALL' ? undefined : requestFilter)
      ])

      const paymentCollected = paymentResponses.flatMap((response: any) => response?.data || [])
      
      // Normalize registration requests to match the row format
      const regRequests = (regRequestResponse.data || regRequestResponse.results || []).map((req: any) => {
        return {
          request_id: req.id,
          student_id: req.predicted_student_id || req.student_id || `REQ-${req.id}`,
          student_name: req.name,
          subject: req.subject_names || 'General',
          total_fees: Number(req.total_fees || 0),
          status: req.status,
          payment_status: req.status === 'PENDING' ? 'PENDING' : (req.status === 'ACCEPTED' ? 'SUCCESS' : 'FAILED'),
          payment_mode: req.payment_method || 'CASH',
          created_at: req.created_at,
          is_registration: true // Flag to distinguish
        };
      })

      setRows([...paymentCollected, ...regRequests])
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
    if (typeof window !== 'undefined') {
      const requestedStudentId = sessionStorage.getItem('request_acceptance_student_id') || ''
      if (requestedStudentId) {
        setFocusedStudentId(requestedStudentId)
        setSearchTerm(requestedStudentId)
        setRequestFilter('PENDING')
        sessionStorage.removeItem('request_acceptance_student_id')
      }
    }

    fetchPendingCashRequests()
    fetchSubjects()
  }, [])

  useEffect(() => {
    if (!focusedStudentId) return
    const found = pendingCashRows.some((g) => (g.student_id || '').toLowerCase() === focusedStudentId.toLowerCase())
    if (found) return
    if (focusedRefreshCount >= 3) return

    const timer = setTimeout(async () => {
      await fetchPendingCashRequests()
      setFocusedRefreshCount((prev) => prev + 1)
    }, 1200)

    return () => clearTimeout(timer)
  }, [focusedStudentId, focusedRefreshCount, pendingCashRows])

  const handleAcceptPayment = async (groupedRequest: GroupedStudentRequest) => {
    const isRegistration = groupedRequest.requests.some(r => (r as any).is_registration)
    const uniqueRequests = getUniqueRequestsBySubject(groupedRequest.requests)
    const duplicateRequests = groupedRequest.requests.filter(
      (req) => !uniqueRequests.some((u) => u.request_id === req.request_id)
    )

    const totalAmount = uniqueRequests.reduce((sum, req) => sum + getResolvedRequestFee(req), 0)
    const actionLabel = isRegistration ? 'Accept Registration' : 'Accept Payment'
    
    const ok = window.confirm(`${actionLabel} for ${groupedRequest.student_name} - Total: ₹${totalAmount.toLocaleString('en-IN')}?`)
    if (!ok) return

    // Move window.open to the very beginning to avoid pop-up blockers
    // We open tabs early and then redirect them later
    const docTabs: { receipt?: Window | null; idCard?: Window | null }[] = []
    
    // We'll open one pair of tabs for now, or multiple if we know the count
    // Since we don't know the exact count yet, we'll open at least one pair 
    // and handle the rest after the async call if needed (though browser might block those)
    const primaryReceiptTab = window.open('about:blank', '_blank')
    const primaryIdCardTab = window.open('about:blank', '_blank')

    if (primaryReceiptTab) {
      primaryReceiptTab.document.title = 'Generating receipt...'
      primaryReceiptTab.document.body.innerHTML = '<p style="font-family: Arial, sans-serif; padding: 16px;">Generating receipt PDF...</p>'
    }
    if (primaryIdCardTab) {
      primaryIdCardTab.document.title = 'Generating ID card...'
      primaryIdCardTab.document.body.innerHTML = '<p style="font-family: Arial, sans-serif; padding: 16px;">Generating ID card PDF...</p>'
    }

    try {
      setProcessingId(uniqueRequests[0]?.request_id || 0)
      notifyInfo(`Processing ${isRegistration ? 'registration' : 'payment'} and generating documents...`)

      let enrollmentIds: number[] = []
      let paymentIds: number[] = []

      if (isRegistration) {
        // Use registrationRequestsApi.accept
        const regApi = (await import('@/lib/api/students')).registrationRequestsApi;
        const result = await regApi.accept(uniqueRequests[0].request_id)
        if (result.success) {
           enrollmentIds = result.enrollment_ids || [result.enrollment_id].filter(Boolean) as number[]
           paymentIds = result.payment_ids || [result.payment_id].filter(Boolean) as number[]
        } else {
           throw new Error(result.error?.message || 'Failed to accept registration')
        }
      } else {
        // Use paymentsApi.acceptOfflineRequest
        const confirmResults = await Promise.all(
          uniqueRequests.map(req => paymentsApi.acceptOfflineRequest(req.request_id))
        )

        // Auto-reject duplicate pending requests
        if (duplicateRequests.length > 0) {
          await Promise.all(
            duplicateRequests.map((req) =>
              paymentsApi.rejectOfflineRequest(req.request_id, 'Auto-rejected duplicate subject request during deduplication')
            )
          )
        }

        for (let i = 0; i < confirmResults.length; i++) {
          const result = confirmResults[i]
          const enrollmentId = Number(result?.data?.enrollment_id || uniqueRequests[i]?.enrollment_id)
          const paymentId = Number(result?.data?.payment_id || uniqueRequests[i]?.payment_id)
          if (enrollmentId) enrollmentIds.push(enrollmentId)
          if (paymentId) paymentIds.push(paymentId)
        }
      }

      if (enrollmentIds.length === 0 && paymentIds.length === 0) {
          if (primaryReceiptTab) primaryReceiptTab.close()
          if (primaryIdCardTab) primaryIdCardTab.close()
          notifySuccess('Action completed successfully.')
          await fetchPendingCashRequests()
          return
      }

      // Fill the primary tabs
      const primaryEnrollmentId = enrollmentIds[0]
      const primaryPaymentId = paymentIds[0]

      const docResults = await Promise.allSettled([
        primaryReceiptTab && primaryPaymentId ? paymentsApi.openReceiptInNewTab(primaryPaymentId, primaryReceiptTab) : Promise.resolve(),
        primaryIdCardTab && primaryEnrollmentId ? enrollmentsApi.openIdCardInNewTab(primaryEnrollmentId, primaryIdCardTab) : Promise.resolve(),
        // Also trigger background downloads
        ...paymentIds.map(pid => paymentsApi.downloadReceipt(pid)),
        ...enrollmentIds.map(eid => enrollmentsApi.downloadIdCard(eid))
      ])

      // If there are more subjects, we try to open them too (might be blocked, but we try)
      if (enrollmentIds.length > 1) {
        for (let i = 1; i < enrollmentIds.length; i++) {
           const eid = enrollmentIds[i]
           const pid = paymentIds[i]
           if (pid) paymentsApi.downloadReceipt(pid)
           if (eid) enrollmentsApi.downloadIdCard(eid)
        }
      }

      notifySuccess(`${isRegistration ? 'Registration' : 'Payment'} accepted and documents generated.`)

      if ((primaryIdCardTab && primaryIdCardTab.closed) || !primaryIdCardTab) {
        notifyInfo('Browser blocked pop-ups. Please allow them to auto-open documents.')
      }

      // Fetch student credentials logic...
      try {
        const studentSearch = groupedRequest.student_id.startsWith('REQ-') ? groupedRequest.student_name : groupedRequest.student_id
        const studentList = await studentsApi.getAll({ search: studentSearch, page_size: 100 })
        const student = (studentList?.results || []).find(
          (item) => item.name.toLowerCase() === groupedRequest.student_name.toLowerCase()
        ) || (studentList?.results || [])[0]
        
        if (student) {
          setAcceptedCredentials(prev => {
            const newCreds = [{
              student_id: student.student_id,
              student_name: student.name,
              subject: groupedRequest.subjects.join(', '),
              username: student.login_username || student.student_id,
              password_hint: student.login_password_hint || '(Ask admin)',
              accepted_at: new Date(),
              visible: false
            }]
            return [...newCreds, ...prev.slice(0, 9)]
          })
          setShowSlider(true)
        }
      } catch (err) {
        console.error('Failed to fetch credentials:', err)
      }

      await fetchPendingCashRequests()
    } catch (err: any) {
      notifyError(err?.response?.data?.error?.message || err?.message || 'Action failed')
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectPayment = async (request: GroupedStudentRequest) => {
    setRejectConfirm({ show: true, request, reason: '' })
  }
  const confirmRejectPayment = async () => {
    if (!rejectConfirm.request) return

    const isRegistration = rejectConfirm.request.requests.some(r => (r as any).is_registration)
    const reason = rejectConfirm.reason || 'Admin rejection'

    try {
      setProcessingId(rejectConfirm.request.requests[0]?.request_id || 0)
      notifyInfo(`Rejecting ${isRegistration ? 'registration' : 'payment'}...`)

      if (isRegistration) {
        const regApi = (await import('@/lib/api/students')).registrationRequestsApi;
        await regApi.reject(rejectConfirm.request.requests[0].request_id, reason)
      } else {
        // Reject all payments for this student
        await Promise.all(
          rejectConfirm.request.requests.map(req => 
            paymentsApi.rejectOfflineRequest(req.request_id, reason)
          )
        )
      }

      notifySuccess(`${isRegistration ? 'Registration' : 'Payment'} request rejected successfully.`)
      setRejectConfirm({ show: false, request: null, reason: '' })
      await fetchPendingCashRequests()
    } catch (err: any) {
      notifyError(err?.response?.data?.error?.message || err?.message || 'Failed to reject request')
    } finally {
      setProcessingId(null)
    }
  }


  const rejectRequestId = rejectConfirm.request?.requests?.[0]?.request_id

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
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Subjects</th>
                  <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-widest">Total Fees</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Payment Status</th>
                  <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((group) => (
                  <tr key={group.group_key} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-900">{group.student_name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900 font-mono">{group.student_id}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      <div className="flex flex-col gap-1">
                        {group.requests.map((request) => {
                          const fee = getResolvedRequestFee(request)
                          return (
                            <span key={request.request_id} className="text-xs bg-slate-100 px-2 py-1 rounded inline-block w-fit">
                              {request.subject || 'Subject'}{fee > 0 ? ` - ₹${fee.toLocaleString('en-IN')}` : ''}
                            </span>
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-semibold text-slate-900">
                        ₹{group.requests.reduce((sum, req) => sum + getResolvedRequestFee(req), 0).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">
                        {group.subjects.length} subject{group.subjects.length > 1 ? 's' : ''} selected
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${getStatusClassName(group.requests[0]?.status || group.requests[0]?.payment_status)}`}>
                        {group.all_pending ? 'Pending' : group.all_accepted ? 'Accepted' : group.all_rejected ? 'Rejected' : 'Mixed'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {group.all_pending ? (
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            disabled={!canAccept || processingId === group.requests[0]?.request_id}
                            onClick={() => handleAcceptPayment(group)}
                            className="inline-flex items-center gap-1 px-3 h-9 rounded-lg bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-60"
                            title="Accept all payments for this student"
                          >
                            {processingId === group.requests[0]?.request_id ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                            Accept All
                          </button>
                          <button
                            disabled={!canAccept || processingId === group.requests[0]?.request_id}
                            onClick={() => handleRejectPayment(group)}
                            className="inline-flex items-center gap-1 px-3 h-9 rounded-lg bg-rose-600 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-rose-700 disabled:opacity-60"
                            title="Reject all payments for this student"
                          >
                            {processingId === group.requests[0]?.request_id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                            Reject All
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
                <span className="font-semibold">Subjects:</span> {rejectConfirm.request.subjects.join(', ')}
              </p>
              <p className="text-sm text-slate-700 mt-1">
                <span className="font-semibold">Amount:</span> ₹{Number(rejectConfirm.request.total_fees || 0).toLocaleString('en-IN')} (${rejectConfirm.request.subjects.length} payment{rejectConfirm.request.subjects.length > 1 ? 's' : ''})
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
                disabled={processingId === rejectRequestId}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {processingId === rejectRequestId ? (
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