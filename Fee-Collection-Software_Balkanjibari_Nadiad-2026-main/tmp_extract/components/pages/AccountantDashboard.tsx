'use client'

import { useState, useEffect } from 'react'
import { 
    CreditCard, 
    TrendingUp, 
    AlertCircle, 
    ArrowUpRight, 
    History, 
    FileText, 
    Download,
    Users
} from 'lucide-react'
import { ledgerApi, AccountantDashboardStats, analyticsApi, PaymentTrend, SubjectDistribution, DashboardStats } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

interface AccountantDashboardProps {
    setCurrentPage: (page: string) => void
}

export default function AccountantDashboard({ setCurrentPage }: AccountantDashboardProps) {
    const [stats, setStats] = useState<AccountantDashboardStats | null>(null)
    const [globalStats, setGlobalStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [trends, setTrends] = useState<PaymentTrend[]>([])
    const [distribution, setDistribution] = useState<SubjectDistribution[]>([])

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [response, analyticsStats, trendsRes, distRes] = await Promise.all([
                    ledgerApi.getDashboardStats(),
                    analyticsApi.getDashboardStats(),
                    analyticsApi.getPaymentTrends(),
                    analyticsApi.getSubjectDistribution()
                ])

                if (response.success && response.data) {
                    setStats(response.data)
                }
                if (analyticsStats.success && analyticsStats.data) {
                    setGlobalStats(analyticsStats.data)
                }
                // @ts-ignore
                if (trendsRes.success) setTrends(trendsRes.data || trendsRes)
                // @ts-ignore
                if (distRes.success) setDistribution(distRes.data || distRes)

            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchStats()
    }, [])

    const StatCard = ({ title, value, icon: Icon, color, subValue, isCurrency = true }: any) => (
        <div className="card-standard p-4 sm:p-6 flex flex-col gap-2 sm:gap-4">
            <div className="flex items-center justify-between">
                <div className={`w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg sm:rounded-2xl bg-white shadow-sm border border-slate-100`}>
                    <Icon className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: color.replace('bg-', '') }} />
                </div>
            </div>
            <div>
                <p className="text-[8px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 font-inter">{title}</p>
                <div className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight font-poppins">
                    {isCurrency ? `₹${Number(value).toLocaleString()}` : Number(value).toLocaleString()}
                </div>
                {subValue && (
                    <p className="text-[8px] sm:text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-semibold uppercase tracking-tighter font-inter">
                        {subValue}
                    </p>
                )}
            </div>
        </div>
    )

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-32 w-full rounded-xl" />
                    ))}
                </div>
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight font-poppins">Accounts Console</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-[10px] sm:text-sm font-medium font-inter">Financial overview and fee collection tracking</p>
                </div>
                <button
                    onClick={() => setCurrentPage('reports')}
                    className="w-full sm:w-auto h-10 sm:h-11 btn-standard bg-indigo-600 text-white shadow-lg shadow-indigo-100 text-[10px] sm:text-sm font-medium font-poppins uppercase tracking-widest"
                >
                    <FileText size={16} /> <span className="hidden xs:inline">Generate Reports</span><span className="xs:hidden">Reports</span>
                </button>
            </div>

            {/* Grid Stats */}
            <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Active Students"
                    value={globalStats?.total_students || 0}
                    icon={Users}
                    color="#4f46e5"
                    subValue="System Wide"
                    isCurrency={false}
                />
                <StatCard
                    title="Today's Collection"
                    value={globalStats?.today_revenue || stats?.today_collection || 0}
                    icon={CreditCard}
                    color="#10b981"
                    subValue="All Modes"
                />
                <StatCard
                    title="Total Revenue"
                    value={globalStats?.total_revenue || stats?.monthly_revenue || 0}
                    icon={TrendingUp}
                    color="#3b82f6"
                    subValue={`${globalStats?.growth_rate || 0}% Monthly Growth`}
                />
                <StatCard
                    title="Outstanding Dues"
                    value={globalStats?.total_pending || stats?.outstanding_fees || 0}
                    icon={AlertCircle}
                    color="#f59e0b"
                    subValue="Pending amount"
                />
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 font-poppins">
                            <TrendingUp size={18} className="text-blue-600" />
                            Collection Trend (6 Months)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-48 sm:h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trends}>
                                    <defs>
                                        <linearGradient id="colorAmountAcc" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis 
                                        dataKey="month" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 12, fill: '#9ca3af' }}
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 12, fill: '#9ca3af' }}
                                        tickFormatter={(val) => `₹${val}`}
                                    />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                        formatter={(val: number) => `₹${val.toLocaleString()}`}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="amount" 
                                        stroke="#4f46e5" 
                                        strokeWidth={3}
                                        fillOpacity={1} 
                                        fill="url(#colorAmountAcc)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 font-poppins">
                            <Users size={18} className="text-purple-600" />
                            Subject Popularity
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-48 sm:h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={distribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {distribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                {/* Recent Transactions */}
                <Card className="rounded-2xl border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-50 dark:border-gray-700">
                        <CardTitle className="text-sm sm:text-base font-bold uppercase tracking-widest flex items-center gap-2 text-gray-900 dark:text-white font-poppins">
                            <History className="w-5 h-5 text-indigo-500" />
                            Recent Transactions
                        </CardTitle>
                        <button
                            onClick={() => setCurrentPage('payments')}
                            className="btn-standard h-9 px-4 text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 font-medium uppercase tracking-widest font-poppins"
                        >
                            View All
                        </button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-50 dark:divide-gray-700">
                            {stats?.recent_transactions.map((tx: any) => (
                                <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors border border-gray-100 dark:border-gray-600">
                                            {tx.payment_mode === 'CASH' ? <CreditCard size={18} /> : <TrendingUp size={18} />}
                                        </div>
                                        <div className="min-w-0 font-inter">
                                            <p className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white uppercase truncate">{tx.student_name}</p>
                                            <p className="text-[10px] font-medium text-gray-400 uppercase truncate">{tx.subject_name} • {tx.payment_id}</p>
                                        </div>
                                    </div>
                                    <div className="text-right ml-3 shrink-0">
                                        <p className="font-bold text-sm text-emerald-600 tracking-tight font-poppins">₹{parseFloat(tx.amount).toLocaleString()}</p>
                                        <p className="text-[9px] font-medium text-gray-400 uppercase tracking-widest font-inter">{new Date(tx.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                                    </div>
                                </div>
                            ))}
                            {(!stats?.recent_transactions || stats.recent_transactions.length === 0) && (
                                <div className="text-center py-12">
                                    <History className="mx-auto w-10 h-10 text-gray-200 dark:text-gray-700 mb-3" />
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No recent transactions</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 font-poppins font-semibold">
                            <ArrowUpRight className="w-5 h-5 text-indigo-500" />
                            Quick Actions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <button
                            onClick={() => setCurrentPage('payments')}
                            className="flex items-center justify-between p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/30 dark:bg-indigo-900/10 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 transition-all active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-3">
                                <CreditCard className="text-indigo-600" />
                                <div className="text-left">
                                    <p className="font-bold text-sm font-poppins">Record Payment</p>
                                    <p className="text-xs text-muted-foreground font-medium font-inter">Collect cash or verify online dues</p>
                                </div>
                            </div>
                            <ArrowUpRight size={16} className="text-indigo-400" />
                        </button>

                        <button
                            onClick={() => setCurrentPage('ledger')}
                            className="flex items-center justify-between p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-900/10 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-all active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-3">
                                <FileText className="text-emerald-600" />
                                <div className="text-left">
                                    <p className="font-bold text-sm font-poppins">Student Fee Ledger</p>
                                    <p className="text-xs text-muted-foreground font-medium font-inter">View chronological financial history</p>
                                </div>
                            </div>
                            <ArrowUpRight size={16} className="text-emerald-400" />
                        </button>

                        <button
                            onClick={() => setCurrentPage('reports')}
                            className="flex items-center justify-between p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-all active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-3">
                                <Download className="text-blue-600" />
                                <div className="text-left">
                                    <p className="font-bold text-sm font-poppins">Export Reports</p>
                                    <p className="text-xs text-muted-foreground font-medium font-inter">Daily, Monthly & Outstanding reports</p>
                                </div>
                            </div>
                            <ArrowUpRight size={16} className="text-blue-400" />
                        </button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
