'use client'

import { useState, useEffect, useCallback } from 'react'
import { registrationRequestsApi, RegistrationRequest, enrollmentsApi, paymentsApi } from '@/lib/api'
import {
    CheckCircle, XCircle, Clock, AlertCircle, Loader2, Download, Printer,
    User, Phone, Mail, MapPin, Calendar, CreditCard, BookOpen,
    ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react'
import { API_BASE_URL, getMediaUrl } from '@/lib/api/client'

type StatusFilter = 'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED'

export default function RegistrationRequestsPage() {
    const [requests, setRequests] = useState<RegistrationRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<StatusFilter>('ALL')
    const [expandedId, setExpandedId] = useState<number | null>(null)
    const [actionLoading, setActionLoading] = useState<number | null>(null)
    const [rejectModal, setRejectModal] = useState<{ id: number; name: string } | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
    const [lastAccepted, setLastAccepted] = useState<{
        student_id: string;
        name: string;
        login_username: string;
        login_password_hint: string;
        payment_status: string;
        enrollment_id?: number | null;
        payment_id?: number | null;
    } | null>(null)
    const [showSuccessModal, setShowSuccessModal] = useState(false)

    // Auto-open logic for CASH payments
    useEffect(() => {
        if (showSuccessModal && lastAccepted?.payment_status === 'PAID') {
            const timer = setTimeout(async () => {
                // Open Receipt (authenticated)
                if (lastAccepted.enrollment_id) {
                    try {
                        await enrollmentsApi.openReceiptInNewTab(lastAccepted.enrollment_id);
                    } catch (err) {
                        console.error('Auto-receipt open failed:', err);
                    }
                }

                // Open ID Card (authenticated)
                if (lastAccepted.enrollment_id) {
                    try {
                        await enrollmentsApi.openIdCardInNewTab(lastAccepted.enrollment_id);
                    } catch (err) {
                        console.error('Auto-id-card open failed:', err);
                    }
                }
            }, 1500)

            return () => clearTimeout(timer)
        }
    }, [showSuccessModal, lastAccepted])

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message })
        setTimeout(() => setToast(null), 4000)
    }

    const fetchRequests = useCallback(async () => {
        setLoading(true)
        try {
            const res = await registrationRequestsApi.list(filter === 'ALL' ? undefined : filter)
            const data = res.results || res.data || []
            setRequests(Array.isArray(data) ? data : [])
        } catch {
            showToast('error', 'Failed to load registration requests.')
        } finally {
            setLoading(false)
        }
    }, [filter])

    useEffect(() => { fetchRequests() }, [fetchRequests])

    const handleAccept = async (req: RegistrationRequest) => {
        setActionLoading(req.id)
        try {
            const res = await registrationRequestsApi.accept(req.id)
            if (res.success) {
                showToast('success', `Application Accepted Successfully. Status: ${res.payment_status}`)
                setLastAccepted({
                    student_id: res.student_id || '',
                    name: req.name, // Keep the name from the request
                    login_username: res.login_username || '',
                    login_password_hint: res.login_password_hint || '',
                    payment_status: res.payment_status || 'PENDING',
                    enrollment_id: res.enrollment_id,
                    payment_id: res.payment_id
                })
                setShowSuccessModal(true) // Show the success modal
                fetchRequests()
            } else {
                const errMsg = typeof res.error === 'object' ? JSON.stringify(res.error) : (res.error || res.message || 'Accept failed.')
                showToast('error', errMsg)
            }
        } catch {
            showToast('error', 'Network error. Please try again.')
        } finally {
            setActionLoading(null)
        }
    }

    const handleReject = async () => {
        if (!rejectModal) return
        setActionLoading(rejectModal.id)
        try {
            const res = await registrationRequestsApi.reject(rejectModal.id, rejectReason)
            if (res.success) {
                showToast('success', 'Application Rejected, contact admin section.')
                setRejectModal(null)
                setRejectReason('')
                fetchRequests()
            } else {
                showToast('error', res.message || 'Reject failed.')
            }
        } catch {
            showToast('error', 'Network error. Please try again.')
        } finally {
            setActionLoading(null)
        }
    }

    const counts = {
        ALL: requests.length,
        PENDING: requests.filter(r => r.status === 'PENDING').length,
        ACCEPTED: requests.filter(r => r.status === 'ACCEPTED').length,
        REJECTED: requests.filter(r => r.status === 'REJECTED').length,
    }

    const filtered = filter === 'ALL' ? requests : requests.filter(r => r.status === filter)

    const formatDate = (val: string) => {
        if (!val) return ''
        // Handle ISO format (e.g., 2026-04-03T...)
        if (val.includes('T')) {
            val = val.split('T')[0]
        }
        const parts = val.split('-')
        if (parts.length === 3) {
            const [y, m, d] = parts
            return `${d}-${m}-${y}`
        }
        return val
    }

    return (
        <div className="space-y-4 max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-6 no-scrollbar overflow-y-auto h-full">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-xl shadow-xl flex items-start gap-3 animate-in slide-in-from-top-2 ${toast.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                    {toast.type === 'success' ? <CheckCircle size={18} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />}
                    <p className="text-sm font-medium">{toast.message}</p>
                </div>
            )}

            <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-xl sm:text-3xl font-bold text-slate-900 font-poppins uppercase tracking-tight">Registration Terminal</h1>
                    <p className="text-slate-500 text-[10px] sm:text-sm mt-1 font-medium font-inter">Review and process institutional applications</p>
                </div>
                <button
                    onClick={fetchRequests}
                    className="h-10 sm:h-11 px-4 sm:px-6 rounded-xl font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-[10px] uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100/50 font-poppins"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    <span className="hidden sm:inline">Synch Data</span>
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {(['ALL', 'PENDING', 'ACCEPTED', 'REJECTED'] as StatusFilter[]).map(s => (
                    <button
                        key={s}
                        onClick={() => setFilter(s)}
                        className={`h-11 px-6 rounded-xl font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-[12px] uppercase tracking-widest font-poppins ${filter === s
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100'}`}
                    >
                        {s}
                        <span className={`ml-2 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-medium font-inter ${filter === s ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                            {counts[s]}
                        </span>
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center items-center h-48">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <User size={28} className="text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium font-inter">No {filter !== 'ALL' ? filter.toLowerCase() : ''} requests found.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map(req => {
                        const isLogo = req.photo && (req.photo.includes('logo.jpeg') || req.photo.includes('avatar'));
                        const photoUrl = !isLogo ? getMediaUrl(req.photo) : null;

                        return (
                            <div key={req.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] overflow-hidden transition-all hover:shadow-xl shadow-lg shadow-slate-200/20 group">
                                <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-5">
                                    <div className="flex items-center gap-5 flex-1 min-w-0">
                                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] overflow-hidden bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold text-2xl shadow-sm border border-sky-100/50 group relative shrink-0">
                                            <span className="opacity-80 translate-y-[1px]">{req.name?.[0]?.toUpperCase() || 'A'}</span>
                                            {photoUrl && (
                                                <img
                                                    src={photoUrl}
                                                    alt={req.name}
                                                    className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-110"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                            <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate font-poppins uppercase tracking-tight">
                                                {req.name}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                                <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] shrink-0 font-inter">
                                                    {formatDate(req.enrollment_date || req.created_at)}
                                                </span>
                                                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-widest font-inter ${req.status === 'PENDING' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600' : req.status === 'ACCEPTED' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600'}`}>
                                                    {req.status}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest mt-1.5 font-inter">
                                                <span className="flex items-center gap-1.5"><Phone size={12} className="text-indigo-400" />{req.phone}</span>
                                                <span className="flex items-center gap-1.5"><CreditCard size={12} className="text-indigo-400" />{req.payment_method}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-50 dark:border-slate-800">
                                        {req.status === 'PENDING' && (
                                            <div className="flex gap-2 flex-1 sm:flex-none">
                                                <button
                                                    onClick={() => handleAccept(req)}
                                                    disabled={actionLoading === req.id}
                                                    className="flex-1 sm:flex-none h-11 sm:h-12 px-5 sm:px-8 rounded-xl font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-[10px] sm:text-[11px] uppercase tracking-widest bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 font-poppins"
                                                >
                                                    {actionLoading === req.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                                    <span>Accept</span>
                                                </button>
                                                <button
                                                    onClick={() => setRejectModal({ id: req.id, name: req.name })}
                                                    disabled={actionLoading === req.id}
                                                    className="flex-1 sm:flex-none h-11 sm:h-12 px-5 rounded-xl font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-[10px] sm:text-[11px] uppercase tracking-widest bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 font-poppins"
                                                >
                                                    <XCircle size={16} />
                                                    <span className="sm:hidden">Reject</span>
                                                </button>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                                            className="p-3 sm:p-3.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent"
                                        >
                                            {expandedId === req.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </button>
                                    </div>
                                </div>

                                {expandedId === req.id && (
                                    <div className="border-t border-gray-100 p-5 bg-gray-50">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm font-inter">
                                            {[
                                                { label: 'Age', value: req.age },
                                                { label: 'Gender', value: req.gender },
                                                { label: 'Date of Birth', value: formatDate(req.date_of_birth || '') },
                                                { label: 'Blood Group', value: req.blood_group },
                                                { label: 'Parent / Guardian', value: req.parent_name },
                                                { label: 'Area', value: req.area },
                                                { label: 'Enrollment Date', value: formatDate(req.enrollment_date || '') },
                                                { label: 'Payment Method', value: req.payment_method },
                                            ].map(({ label, value }) => value ? (
                                                <div key={label}>
                                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-0.5 font-inter font-inter">{label}</p>
                                                    <p className="text-gray-800 font-medium text-[15px] font-inter">{value}</p>
                                                </div>
                                            ) : null)}

                                            {req.address && (
                                                <div className="sm:col-span-2">
                                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-0.5 flex items-center gap-1 font-inter font-inter"><MapPin size={11} /> Address</p>
                                                    <p className="text-gray-800 font-medium text-[14px] font-inter">{req.address}</p>
                                                </div>
                                            )}
                                        </div>

                                        {req.subjects_data && req.subjects_data.length > 0 && (
                                            <div className="mt-4">
                                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-1 font-inter"><BookOpen size={11} /> Subjects Requested</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {req.subjects_data.map((s, i) => (
                                                        <div key={i} className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-[13px] font-medium font-inter">
                                                            <span className="font-semibold text-indigo-800">{s.subject_name || `Subject #${s.subject_id}`}</span>
                                                            <span className="text-indigo-500 ml-2 font-inter">{s.batch_time}</span>
                                                            {s.include_library_fee && <span className="ml-2 text-xs text-indigo-400 font-bold font-inter">+ Library</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {req.status === 'REJECTED' && req.rejection_reason && (
                                            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100">
                                                <p className="text-xs text-red-400 font-bold uppercase tracking-widest mb-1 font-inter">Rejection Reason</p>
                                                <p className="text-red-700 font-medium font-inter text-[14px]">{req.rejection_reason}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Reject Modal */}
            {rejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold text-gray-900 mb-1 font-poppins">Reject Application</h3>
                        <p className="text-gray-500 text-sm mb-4 font-inter">Rejecting <strong>{rejectModal.name}</strong>'s registration request.</p>
                        <textarea
                            className="w-full px-4 py-4 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[14px] font-inter resize-none"
                            rows={3}
                            placeholder="Reason for rejection (optional)"
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                        />
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => { setRejectModal(null); setRejectReason('') }} className="flex-1 h-11 rounded-xl font-medium bg-gray-100 text-gray-600 font-poppins text-xs uppercase tracking-widest">Cancel</button>
                            <button onClick={handleReject} disabled={actionLoading === rejectModal.id} className="flex-1 h-11 rounded-xl font-medium bg-red-600 text-white shadow-lg shadow-red-500/20 font-poppins text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                                {actionLoading === rejectModal.id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Accepted Modal */}
            {showSuccessModal && lastAccepted && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 py-8">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-indigo-100 max-h-full overflow-y-auto no-scrollbar">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                            <CheckCircle size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 text-center mb-1 font-poppins">Application Accepted!</h2>
                        <p className="text-gray-500 text-center mb-8 font-inter">Student <strong>{lastAccepted.name}</strong> is now registered.</p>

                        <div className="space-y-4 mb-8">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 font-inter">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px] font-inter">Student ID</span>
                                    <span className="font-bold text-indigo-600 text-lg uppercase font-poppins">{lastAccepted.student_id}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px] font-inter">Payment Status</span>
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest font-inter ${lastAccepted.payment_status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                        {lastAccepted.payment_status}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20 space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 text-center font-inter">Login Credentials</p>
                                <div className="flex justify-between items-center bg-white/10 p-2.5 rounded-xl font-inter">
                                    <span className="text-xs opacity-90 font-medium font-inter">Username</span>
                                    <span className="font-bold font-poppins">{lastAccepted.login_username}</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/10 p-2.5 rounded-xl font-inter">
                                    <span className="text-xs opacity-90 font-medium font-inter">Password</span>
                                    <span className="font-bold font-poppins">{lastAccepted.login_password_hint}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {lastAccepted.payment_status === 'PAID' ? (
                                <>
                                    <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest mb-1 font-inter">Generate Documents</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={async () => {
                                                if (lastAccepted.enrollment_id) {
                                                    await enrollmentsApi.openReceiptInNewTab(lastAccepted.enrollment_id);
                                                }
                                            }}
                                            className="h-12 rounded-xl bg-slate-900 text-white font-medium flex items-center justify-center gap-2 hover:bg-black transition-all font-poppins text-xs uppercase tracking-widest"
                                        >
                                            <Printer size={16} /> Receipt
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (lastAccepted.enrollment_id) {
                                                    await enrollmentsApi.openIdCardInNewTab(lastAccepted.enrollment_id);
                                                }
                                            }}
                                            className="h-12 rounded-xl bg-indigo-600 text-white font-medium flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all font-poppins text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20"
                                        >
                                            <Download size={16} /> ID Card
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl mb-8 flex items-start gap-4">
                                    <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold uppercase text-amber-600 tracking-widest font-inter">Payment Pending</p>
                                        <p className="text-xs text-amber-700 font-medium leading-relaxed font-inter">Full documents will be available once the student completes the online payment. You can print the Provisional ID Pass below.</p>
                                        <button
                                            onClick={async () => {
                                                if (lastAccepted.enrollment_id) {
                                                    await enrollmentsApi.openIdCardInNewTab(lastAccepted.enrollment_id);
                                                }
                                            }}
                                            className="mt-2 bg-amber-600 text-white px-4 py-2 rounded-xl text-[10px] font-medium uppercase tracking-widest flex items-center gap-2 hover:bg-amber-700 transition-all font-poppins"
                                        >
                                            <Download size={14} /> Download ID Pass
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button onClick={() => { setLastAccepted(null); setShowSuccessModal(false) }} className="mt-4 h-12 w-full rounded-xl border border-slate-200 font-medium text-slate-500 hover:bg-slate-50 transition-all font-poppins text-xs uppercase tracking-widest">
                                Close Terminal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
