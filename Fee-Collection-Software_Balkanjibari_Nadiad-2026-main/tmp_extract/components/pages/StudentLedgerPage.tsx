'use client'

import { useState, useEffect } from 'react'
import {
    Search,
    Filter,
    Calendar,
    ArrowLeft,
    Download,
    FileText,
    User,
    CreditCard,
    History,
    AlertCircle,
    Receipt
} from 'lucide-react'
import { ledgerApi, FeeLedgerEntry, paymentsApi } from '@/lib/api'
import { useNotifications } from '@/hooks/useNotifications'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface StudentLedgerPageProps {
    userRole: string
}

export default function StudentLedgerPage({ userRole }: StudentLedgerPageProps) {
    const { notifySuccess, notifyError } = useNotifications()
    const [entries, setEntries] = useState<FeeLedgerEntry[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
    const [outstandingBalance, setOutstandingBalance] = useState<number>(0)

    // In a real implementation, we'd have a student search/select
    // For now, we'll list all ledger entries if no student is selected
    useEffect(() => {
        const fetchLedger = async () => {
            setLoading(true)
            try {
                const response = await ledgerApi.getLedgerEntries({
                    search: searchTerm,
                    student_id: selectedStudentId || undefined
                })
                if (response.results) {
                    setEntries(response.results)
                }
            } catch (error) {
                console.error('Failed to fetch ledger:', error)
            } finally {
                setLoading(false)
            }
        }

        const timer = setTimeout(() => {
            fetchLedger()
        }, 500)

        return () => clearTimeout(timer)
    }, [searchTerm, selectedStudentId])

    const handleDownloadReceipt = async (paymentId: number) => {
        try {
            await paymentsApi.downloadReceipt(paymentId)
            notifySuccess('Receipt downloaded successfully')
        } catch (error) {
            console.error('Error downloading receipt:', error)
            notifyError('Failed to download receipt')
        }
    }

    const getTransactionTypeColor = (type: string) => {
        switch (type) {
            case 'PAYMENT': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30'
            case 'REFUND': return 'bg-red-100 text-red-700 dark:bg-red-900/30'
            case 'ADJUSTMENT': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    return (
        <div className="space-y-4 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-8 rounded-[24px] sm:rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20">
                <div className="space-y-1">
                    <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white uppercase tracking-tight font-poppins">Financial Ledger</h1>
                    <p className="text-slate-400 text-[10px] sm:text-sm font-bold uppercase tracking-widest leading-none font-inter">Complete Payment History</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button className="flex-1 sm:flex-none h-11 sm:h-12 px-6 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-bold uppercase tracking-widest transition-all hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-2 font-poppins">
                        <Download size={14} className="text-indigo-600" /> 
                        <span>CSV Export</span>
                    </button>
                    <button className="flex-1 sm:flex-none h-11 sm:h-12 px-6 bg-indigo-600 text-white rounded-xl sm:rounded-2xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] font-poppins">
                        <FileText size={14} /> 
                        <span>PDF Ledger</span>
                    </button>
                </div>
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-4">
                {/* Filters */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/10 overflow-hidden sticky top-6">
                        <div className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 py-4 px-6">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-poppins">Filters & Search</h3>
                        </div>
                        <div className="space-y-5 p-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 font-inter">Search Records</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <input
                                        placeholder="Name or Transaction ID..."
                                        className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-sm font-bold uppercase tracking-tight focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-inter"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 font-inter">Category</label>
                                <select className="w-full h-10 px-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all appearance-none cursor-pointer font-inter text-slate-600">
                                    <option value="">All Types</option>
                                    <option value="PAYMENT">Payments Only</option>
                                    <option value="REFUND">Refunds Only</option>
                                    <option value="ADJUSTMENT">Adjustments Only</option>
                                </select>
                            </div>

                            <div className="pt-4 border-t border-slate-50 dark:border-slate-800">
                                <div className="flex items-center gap-2 text-indigo-600 mb-2 font-inter">
                                    <AlertCircle size={14} />
                                    <span className="text-[9px] font-bold uppercase tracking-widest">Transparency Notice</span>
                                </div>
                                <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider font-inter">
                                    Every transaction is encrypted and logged for auditing purposes.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ledger Content */}
                <div className="lg:col-span-3">
                    {loading ? (
                        <div className="grid gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                            ))}
                        </div>
                    ) : entries.length > 0 ? (
                        <div className="space-y-4">
                            {/* Desktop Table View */}
                            <div className="hidden lg:block bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-gray-50 dark:bg-gray-700/50">
                                        <TableRow className="hover:bg-transparent border-b border-gray-100 dark:border-gray-700 font-poppins">
                                            <TableHead className="text-[10px] font-bold uppercase tracking-widest">Date</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-widest">Student</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-widest">Type</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-widest">Reference</TableHead>
                                            <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest">Amount</TableHead>
                                            <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y divide-gray-50 dark:divide-gray-700">
                                        {entries.map((entry) => (
                                            <TableRow key={entry.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group">
                                                <TableCell className="text-sm font-inter">
                                                    <div className="flex items-center gap-2 font-bold text-gray-600 text-[11px] uppercase tracking-tighter">
                                                        <Calendar size={14} />
                                                        {new Date(entry.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col font-inter">
                                                        <span className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-tight">{entry.student_name}</span>
                                                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{entry.student_id_code}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={`${getTransactionTypeColor(entry.transaction_type)} border-none text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full font-inter`}>
                                                        {entry.transaction_type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-[11px] font-bold font-mono text-gray-600">
                                                    {entry.reference_payment_id || '—'}
                                                </TableCell>
                                                <TableCell className={`text-right font-bold text-base tracking-tighter font-poppins ${entry.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {entry.amount > 0 ? '+' : ''}₹{parseFloat(entry.amount.toString()).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {entry.reference_payment && (
                                                        <button
                                                            onClick={() => handleDownloadReceipt(entry.reference_payment!)}
                                                            className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all h-9 font-poppins"
                                                        >
                                                            <Receipt size={14} />
                                                            Receipt
                                                        </button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Card Layout */}
                            <div className="lg:hidden grid grid-cols-1 gap-4">
                                {entries.map((entry) => (
                                    <div key={entry.id} className="bg-white dark:bg-slate-900 rounded-[28px] p-6 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/10 space-y-5">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-inter">Transaction Date</span>
                                                <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight font-inter">
                                                    <Calendar size={14} className="text-indigo-600" />
                                                    {new Date(entry.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                            </div>
                                            <Badge className={`${getTransactionTypeColor(entry.transaction_type)} border-none text-[8px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm font-inter`}>
                                                {entry.transaction_type}
                                            </Badge>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 space-y-4">
                                            <div className="flex justify-between items-center">
                                                <div className="min-w-0 font-inter">
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Contributor</p>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white uppercase truncate tracking-tight">{entry.student_name}</p>
                                                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">{entry.student_id_code}</p>
                                                </div>
                                                <div className="text-right font-inter">
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Ref ID</p>
                                                    <p className="text-[11px] font-bold font-mono text-slate-500 uppercase">{entry.reference_payment_id || '—'}</p>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-inter">Net Value</p>
                                                <p className={`text-xl font-bold tracking-tighter text-emerald-600 font-poppins ${entry.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {entry.amount > 0 ? '+' : ''}₹{parseFloat(entry.amount.toString()).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>

                                        {entry.reference_payment && (
                                            <button
                                                onClick={() => handleDownloadReceipt(entry.reference_payment!)}
                                                className="w-full h-12 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white shadow-xl shadow-slate-900/10 dark:shadow-indigo-500/10 flex items-center justify-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-[0.98] font-poppins"
                                            >
                                                <Receipt size={18} /> Download Receipt
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-20 text-center shadow-sm">
                            <History className="mx-auto w-12 h-12 text-gray-200 dark:text-gray-700 mb-4" />
                            <p className="text-sm font-bold text-gray-600 uppercase tracking-widest">No ledger entries found</p>
                            <p className="text-[11px] font-bold text-gray-600 mt-2 uppercase tracking-widest">Try adjusting your filters</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
