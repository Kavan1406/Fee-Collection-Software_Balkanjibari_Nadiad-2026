'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { paymentsApi, enrollmentsApi, PendingFee, Payment } from '@/lib/api'
import { Loader2, AlertCircle, CheckCircle, CreditCard, Download, FileText } from 'lucide-react'

// Mocking toast notifications for simplicity as they aren't explicitly imported
const notifySuccess = (msg: string) => console.log('SUCCESS:', msg)
const notifyError = (msg: string) => console.error('ERROR:', msg)

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function StudentPayments() {
  const [pendingFees, setPendingFees] = useState<PendingFee[]>([])
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [selectedModes, setSelectedModes] = useState<Record<number, 'ONLINE' | 'CASH'>>({})
  const mountedRef = useRef(true)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      
      const fetchPromise = Promise.all([
        paymentsApi.getStudentPendingFees(),
        paymentsApi.getMyPayments()
      ])
      
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timed out. Please refresh the page.')), 15000)
      })

      const [pendingResponse, historyResponse] = await Promise.race([fetchPromise, timeout]) as any[]

      if (mountedRef.current) {
        // Handle pending fees
        const pendingData = pendingResponse?.data || pendingResponse
        setPendingFees(Array.isArray(pendingData) ? pendingData : [])

        // Initialize selected modes
        const modes: Record<number, 'ONLINE' | 'CASH'> = {}
        if (Array.isArray(pendingData)) {
          pendingData.forEach(f => {
            modes[f.id] = 'ONLINE'
          })
        }
        setSelectedModes(modes)

        // Handle payment history
        const historyData = historyResponse?.data?.results || historyResponse?.results || historyResponse?.data || historyResponse
        setPaymentHistory(Array.isArray(historyData) ? historyData : [])
      }

    } catch (err: any) {
      console.error('Payments fetch error:', err)
      if (mountedRef.current) {
        setError(err.message || 'Failed to fetch payment data. Please try again.')
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchData()
    return () => { mountedRef.current = false }
  }, [fetchData])

  const handlePayment = async (fee: PendingFee) => {
    const mode = selectedModes[fee.id] || 'ONLINE'

    try {
      setProcessingId(fee.id)
      setError('')
      setSuccessMessage('')

      if (mode === 'ONLINE') {
        const orderResponse = await paymentsApi.createRazorpayOrder({
          enrollment_id: fee.id
        })

        if (!orderResponse.success) {
          setError(orderResponse.error?.message || orderResponse.error || 'Failed to create order')
          return
        }

        // Detect if this is a test order
        const isTestOrder = 
          orderResponse.test_mode === true || 
          !orderResponse.key_id || 
          orderResponse.order_id?.startsWith('order_test_')

        if (isTestOrder) {
          // Simulate successful test payment
          await new Promise(resolve => setTimeout(resolve, 1500))
          
          const verifyResponse = await paymentsApi.verifyRazorpayPayment({
            razorpay_order_id: orderResponse.order_id,
            razorpay_payment_id: 'pay_test_' + Math.random().toString(36).substring(2, 11),
            razorpay_signature: 'simulated_signature',
            payment_id: orderResponse.payment_id
          })

          if (verifyResponse.success) {
            setSuccessMessage('Payment processed successfully!')
            
            // Auto-open Receipt ONLY (for Student)
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
            if (verifyResponse.payment_id) {
               try {
                 await enrollmentsApi.openReceiptInNewTab(fee.id);
               } catch (err) {
                 console.error('Auto-receipt open failed:', err);
               }
            }
            
            fetchData()
          } else {
            setError(verifyResponse.error?.message || 'Verification failed')
          }
        } else {
            // Live Razorpay implementation
            const options = {
              key: orderResponse.key_id,
              amount: orderResponse.amount * 100, // already in paise from backend? Wait, check backend logic.
              currency: orderResponse.currency || 'INR',
              name: 'Balkan-Ji-Bari',
              description: `Fee: ${fee.subject_name}`,
              order_id: orderResponse.order_id,
              handler: async function (response: any) {
                try {
                  setProcessingId(fee.id)
                  const verifyResponse = await paymentsApi.verifyRazorpayPayment({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    payment_id: orderResponse.payment_id
                  })

                  if (verifyResponse.success) {
                    setSuccessMessage('Payment completed successfully!')
                    // Open receipt (authenticated)
                    try {
                      await paymentsApi.downloadReceipt(verifyResponse.payment_id);
                    } catch (err) {
                      console.error('Receipt download failed:', err);
                    }
                    fetchData()
                  } else {
                    setError(verifyResponse.error?.message || 'Verification failed')
                  }
                } catch (err: any) {
                  setError('Payment confirmation failed. Please contact support.')
                } finally {
                  setProcessingId(null)
                }
              },
              prefill: {
                name: orderResponse.enrollment.student_name,
                contact: '' // Add student phone if available in profile
              },
              theme: {
                color: '#4f46e5'
              }
            }

            const rzp = new window.Razorpay(options)
            rzp.on('payment.failed', function (response: any) {
              setError(response.error.description || 'Payment failed')
              setProcessingId(null)
            })
            rzp.open()
        }
      } else {
        // Offline/Cash mode logic
        setSuccessMessage('Receipt claimed! Please visit the office to complete the payment.')
        fetchData()
      }
    } catch (err: any) {
      console.error('Payment error:', err)
      setError(err.response?.data?.error?.message || err.message || 'Payment initiation failed')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDownloadReceipt = async (paymentId: number) => {
    try {
        notifySuccess(`Downloading Receipt...`)
        await paymentsApi.downloadReceipt(paymentId)
    } catch (err) {
        notifyError('Failed to download receipt')
        setError('Failed to download receipt PDF.')
    }
  }

  const formatCurrency = (val: any) => {
    const num = Number(val)
    return isNaN(num) ? '₹0' : `₹${num.toLocaleString('en-IN')}`
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'SUCCESS':
        return <span className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-emerald-100 font-inter">SUCCESS</span>
      case 'PENDING_CONFIRMATION':
        return <span className="bg-amber-50 text-amber-600 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-amber-100 animate-pulse font-inter">PENDING</span>
      case 'FAILED':
        return <span className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-rose-100 font-inter">FAILED</span>
      default:
        return <span className="bg-slate-50 text-slate-500 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-slate-100 font-inter">{status || 'PENDING'}</span>
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight font-poppins">My Payment History</h1>
          <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 font-inter">Verified Financial Transactions</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
           <CreditCard size={14} className="text-indigo-600 dark:text-indigo-400" />
           <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest font-inter">Institutional Ledger</span>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/10 ring-1 ring-blue-400/10 dark:ring-blue-400/5 group relative overflow-hidden">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-inter">Total Commitment</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-poppins">{formatCurrency(paymentHistory.reduce((acc, p) => acc + (p.status === 'SUCCESS' ? Number(p.amount) : 0), 0) + pendingFees.reduce((acc, f) => acc + Number(f.pending_amount), 0))}</p>
          <div className="absolute top-4 right-4 p-2 bg-slate-50 dark:bg-slate-800/30 text-slate-500 rounded-xl">
             <IndianRupee size={18} />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/10 ring-1 ring-blue-400/10 dark:ring-blue-400/5 group relative overflow-hidden">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-inter">Total Paid</p>
          <p className="text-2xl font-black text-emerald-600 font-poppins">{formatCurrency(paymentHistory.reduce((acc, p) => acc + (p.status === 'SUCCESS' ? Number(p.amount) : 0), 0))}</p>
          <div className="absolute top-4 right-4 p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 rounded-xl">
             <CheckCircle size={18} />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/10 ring-1 ring-blue-400/10 dark:ring-blue-400/5 group relative overflow-hidden">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-inter">Pending Dues</p>
          <p className="text-2xl font-black text-rose-600 font-poppins">{formatCurrency(pendingFees.reduce((acc, f) => acc + Number(f.pending_amount), 0))}</p>
          <div className="absolute top-4 right-4 p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-500 rounded-xl">
             <AlertCircle size={18} />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 px-6 py-4 rounded-2xl flex items-center gap-4 shadow-sm font-inter">
          <AlertCircle size={20} className="text-rose-500" />
          <span className="font-bold text-sm uppercase tracking-tight">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-6 py-4 rounded-2xl flex items-center gap-4 shadow-sm font-inter">
          <CheckCircle size={20} className="text-emerald-500" />
          <span className="font-bold text-sm uppercase tracking-tight">{successMessage}</span>
        </div>
      )}

      {/* Pending Fees Section */}
      <section className="px-1 sm:px-0 pt-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 sm:p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 shadow-sm">
            <AlertCircle size={20} className="sm:w-[22px] sm:h-[22px]" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 uppercase tracking-tight font-poppins">Outstanding Dues</h2>
        </div>

        {pendingFees.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-[24px] sm:rounded-[32px] p-10 sm:p-16 text-center border-dashed border-2 border-slate-100 dark:border-slate-800">
            <div className="inline-flex p-4 sm:p-5 rounded-full bg-emerald-50 text-emerald-600 mb-6 shadow-xl shadow-emerald-500/10">
              <CheckCircle size={32} className="sm:w-[44px] sm:h-[44px]" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight font-poppins">All Settled</h3>
            <p className="text-slate-400 mt-2 max-w-sm mx-auto text-[10px] sm:text-xs font-bold uppercase tracking-widest leading-relaxed font-inter">No outstanding institutional dues detected.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
            {pendingFees.map((fee) => (
              <div key={fee.id} className="bg-white dark:bg-slate-900 rounded-[32px] p-6 sm:p-10 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 ring-1 ring-blue-400/10 dark:ring-blue-400/5 group">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                  <div className="space-y-2">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight font-poppins">{fee.subject_name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-inter">ID: {fee.id}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest font-inter">Action Required</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-inter mb-1">Due Amount</p>
                    <p className="text-3xl font-black text-rose-600 font-poppins">{formatCurrency(fee.pending_amount)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 font-inter">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fee Breakdown</p>
                    <p className="text-xs font-black text-slate-900 dark:text-white">{formatCurrency(fee.total_fee)} (Total)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                    <p className="text-xs font-black text-amber-600 dark:text-amber-400">UNPAID</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Payment History Section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 shadow-sm">
            <Download size={22} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight font-poppins">Payment History</h2>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="hidden lg:block overflow-hidden rounded-[24px] sm:rounded-3xl border border-slate-100 shadow-sm bg-white">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-left">
                  <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-widest text-slate-500 font-inter">Timestamp</th>
                  <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-widest text-slate-500 font-inter">Subject</th>
                  <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-widest text-slate-500 font-inter">Amount</th>
                  <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-widest text-slate-500 font-inter">Mode</th>
                  <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-widest text-slate-500 font-inter">Status</th>
                  <th className="px-6 py-5 text-right text-[11px] font-bold uppercase tracking-widest text-slate-500 font-inter">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paymentHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-24 text-center text-slate-500 italic font-bold uppercase tracking-widest text-xs font-inter">No historical transactions archived</td>
                  </tr>
                ) : (
                  paymentHistory.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5 text-[10px] font-bold uppercase text-slate-500 font-inter">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-5 text-xs font-bold text-slate-900 uppercase font-poppins">{payment.subject_name}</td>
                      <td className="px-6 py-5 text-sm font-bold text-slate-900 font-poppins">{formatCurrency(payment.amount)}</td>
                      <td className="px-6 py-5">
                         <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${payment.payment_mode === 'ONLINE' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                            {payment.payment_mode === 'ONLINE' ? 'Online' : 'Cash'}
                         </span>
                      </td>
                      <td className="px-6 py-5">{getStatusBadge(payment.status)}</td>
                      <td className="px-6 py-5 text-right">
                        {payment.status === 'SUCCESS' && (
                          <button
                            onClick={() => handleDownloadReceipt(payment.id)}
                            className="bg-white hover:bg-slate-50 text-indigo-600 h-10 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-slate-200 transition-all shadow-sm ring-1 ring-blue-400/10 flex items-center gap-2 ml-auto font-poppins"
                          >
                            <Download size={14} /> Fee Receipt
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden grid grid-cols-1 gap-4">
            {paymentHistory.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-[24px] p-10 text-center border-dashed border-2 border-slate-100 dark:border-slate-800 opacity-50 font-inter">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">No history found</p>
              </div>
            ) : (
              paymentHistory.map((payment) => (
                <div key={payment.id} className="bg-white dark:bg-slate-900 rounded-[28px] p-6 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/10 space-y-4 group">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-inter">Enrollment</p>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight leading-tight group-hover:text-indigo-600 transition-colors font-poppins">{payment.subject_name}</h4>
                    </div>
                    {getStatusBadge(payment.status)}
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-50 dark:border-slate-800">
                    <div className="space-y-1">
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-inter">Date</p>
                       <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest font-poppins">
                         {new Date(payment.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                       </p>
                    </div>
                    <div className="space-y-1 text-center">
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-inter">Mode</p>
                       <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-poppins">{payment.payment_mode}</p>
                    </div>
                    <div className="text-right space-y-1">
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-inter">Value</p>
                       <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tighter leading-none font-poppins">{formatCurrency(payment.amount)}</p>
                    </div>
                  </div>
                  {payment.status === 'SUCCESS' && (
                    <button
                      onClick={() => handleDownloadReceipt(payment.id)}
                      className="w-full h-11 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-slate-900/10 dark:shadow-indigo-500/10 font-poppins"
                    >
                      <Download size={14} /> Download Receipt
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
