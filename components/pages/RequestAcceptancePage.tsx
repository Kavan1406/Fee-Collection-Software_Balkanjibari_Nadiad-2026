'use client'

import { useState, useEffect } from 'react'
import { paymentsApi, Payment } from '@/lib/api'
import { useNotifications } from '@/hooks/useNotifications'
import { CheckCircle, ClipboardCheck, Loader2, Printer, Search, User } from 'lucide-react'
import { SkeletonTable } from '@/components/Skeleton'

export default function RequestAcceptancePage() {
  const { notifySuccess, notifyError, notifyInfo } = useNotifications()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [processingId, setProcessingId] = useState<number | null>(null)

  const fetchRequests = async () => {
    try {
      setLoading(true)
      // Fetch only pending confirmation payments for CASH method
      const response = await paymentsApi.getAll({ 
        status: 'PENDING_CONFIRMATION',
        payment_method: 'CASH'
      }) as any
      setRequests(response.results || response.data || [])
    } catch (err) {
      console.error('Failed to fetch requests:', err)
      notifyError('Failed to load pending requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
    // Poll every 15 seconds
    const interval = setInterval(fetchRequests, 15000)
    return () => clearInterval(interval)
  }, [])

  const handleApprove = async (paymentId: number) => {
    try {
      setProcessingId(paymentId)
      notifyInfo('Confirming payment and generating documents...')
      
      const response = await paymentsApi.confirm(paymentId) as any
      
      if (response.success) {
        notifySuccess('Payment confirmed successfully!')
        
        // Auto-open documents if available in the new API response
        const { receipt_url, id_card_url } = response.data || {}
        
        if (receipt_url) {
          window.open(receipt_url, '_blank')
        }
        
        // Wait a small bit before opening second tab to bypass some popup blockers
        if (id_card_url) {
          setTimeout(() => {
            window.open(id_card_url, '_blank')
          }, 400)
        }

        // Refresh list
        fetchRequests()
      }
    } catch (err: any) {
      console.error('Approval failed:', err)
      notifyError(err.response?.data?.error?.message || 'Failed to confirm payment')
    } finally {
      setProcessingId(null)
    }
  }

  const filteredRequests = requests.filter(req => 
    req.enrollment?.student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.enrollment?.student?.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <h1 className="h1 uppercase tracking-tight">Request Acceptance</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Accept cash payments and generate documents</p>
          </div>
        </div>
        <button 
           onClick={fetchRequests} 
           disabled={loading}
           className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={14} /> : <Search size={14} />}
          Refresh
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="card-standard p-6 border-l-4 border-indigo-500">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending Responses</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white font-poppins">{requests.length}</p>
         </div>
         <div className="card-standard p-6 border-l-4 border-emerald-500">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ready for Print</p>
            <p className="text-2xl font-black text-emerald-600 font-poppins">{requests.length} Students</p>
         </div>
         <div className="card-standard p-6 border-l-4 border-emerald-500 bg-white dark:bg-slate-900">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-inter">Cashier Status</p>
            <div className="flex items-center gap-2 mt-1">
               <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
               <p className="text-2xl font-black text-slate-900 dark:text-emerald-400 font-poppins capitalize">Online</p>
            </div>
         </div>
      </div>

      {/* Main Table */}
      <div className="card-standard overflow-hidden border-none shadow-xl">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Filter by Student Name or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <SkeletonTable rows={5} />
          ) : filteredRequests.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <CheckCircle size={48} className="opacity-10 mb-4" />
              <p className="font-bold text-sm uppercase tracking-widest">No pending cash requests</p>
              <p className="text-xs mt-1 italic">All payments are up to date</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black tracking-widest uppercase">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Subject & Batch</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                          {req.enrollment?.student?.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{req.enrollment?.student?.name}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">{req.enrollment?.student?.student_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">{req.enrollment?.subject?.name}</p>
                        <p className="text-xs text-slate-400">{req.enrollment?.batch_time}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-black border border-emerald-100">
                        ₹{parseFloat(req.amount).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       <p className="text-xs font-medium text-slate-500">{new Date(req.payment_date).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={processingId === req.id}
                        className="h-10 px-6 rounded-xl bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 ml-auto"
                      >
                        {processingId === req.id ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <CheckCircle size={14} />
                        )}
                        Accept Cash & Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Info Alert */}
      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-4 flex gap-3">
         <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Printer size={20} />
         </div>
         <div>
            <p className="text-sm font-bold text-amber-900 dark:text-amber-400">Automatic Printing Tip</p>
            <p className="text-xs text-amber-700 dark:text-amber-500/80 mt-0.5">Upon confirmation, the fee receipt and ID card will open in separate tabs. Please ensure popups are enabled for this domain.</p>
         </div>
      </div>
    </div>
  )
}
