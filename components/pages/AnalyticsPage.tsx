'use client'

import { useState, useEffect } from 'react'
import { Calendar, Loader2, ArrowUp, ArrowDown } from 'lucide-react'
import { 
  AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  CartesianGrid, XAxis, YAxis, LineChart, Line, BarChart, Bar, Legend 
} from 'recharts'
import {
  PaymentTrend,
  SubjectDistribution,
  PaymentStatusDistribution,
  DashboardStats
} from '@/lib/api'
import { useTheme } from '@/contexts/ThemeContext'

// Cache buster: v1.0.3
export default function AnalyticsPage() {
  const { isDarkMode } = useTheme()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [paymentTrends, setPaymentTrends] = useState<PaymentTrend[]>([])
  const [subjectData, setSubjectData] = useState<SubjectDistribution[]>([])
  const [paymentStatusData, setPaymentStatusData] = useState<PaymentStatusDistribution[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Debug: Log theme state
  useEffect(() => {
    console.log('Analytics Page - isDarkMode:', isDarkMode)
    console.log('Analytics Page - document has dark class:', document.documentElement.classList.contains('dark'))
  }, [isDarkMode])

  // Theme-aware colors for charts
  const chartColors = {
    line: isDarkMode ? '#60a5fa' : '#3b82f6',
    grid: isDarkMode ? '#374151' : '#e5e7eb',
    text: isDarkMode ? '#f3f4f6' : '#1f2937',
  }


  useEffect(() => {
    fetchAnalytics()
  }, [selectedPeriod, startDate, endDate])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const [
        statsRes,
        trendsRes,
        subjectsRes,
        statusRes
      ] = await Promise.all([
        analyticsApi.getDashboardStats(selectedPeriod, startDate, endDate),
        analyticsApi.getPaymentTrends(selectedPeriod, startDate, endDate),
        analyticsApi.getSubjectDistribution(),
        analyticsApi.getPaymentStatusDistribution(selectedPeriod, startDate, endDate)
      ])

      if (statsRes.success) setStats(statsRes.data)
      if (trendsRes.success) setPaymentTrends(trendsRes.data)
      if (subjectsRes.success) setSubjectData(subjectsRes.data)
      if (statusRes.success) setPaymentStatusData(statusRes.data)

    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: any) => `₹${Number(val).toLocaleString('en-IN')}`

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const periods = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'quarter', label: 'This Quarter' },
    { id: 'year', label: 'This Year' },
    { id: 'all', label: 'Whole System' },
  ]

  return (
    <div className="p-2.5 sm:p-6 space-y-4">
      <div className="flex justify-between items-center bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight font-poppins">Financial Intelligence</h1>
          <p className="text-slate-400 text-[10px] sm:text-sm mt-0.5 font-medium font-inter">Real-time revenue and enrollment performance metrics</p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="card-standard p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pt-2">
          <div className="flex items-center gap-3 font-poppins">
            <div className="w-10 h-10 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-xl">
              <Calendar size={20} />
            </div>
            <h2 className="text-base font-bold text-slate-900">Analytics Period</h2>
          </div>
 
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-100 font-inter">
                <span className="text-[8px] text-gray-400 uppercase font-bold min-w-8">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setSelectedPeriod('custom')
                  }}
                  className="w-full bg-transparent border-none focus:ring-0 h-6 text-[10px] font-bold font-inter"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-100 font-inter">
                <span className="text-[8px] text-gray-400 uppercase font-bold min-w-8">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setSelectedPeriod('custom')
                  }}
                  className="w-full bg-transparent border-none focus:ring-0 h-6 text-[10px] font-bold font-inter"
                />
              </div>
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); setSelectedPeriod('month'); }}
                className="text-[9px] text-rose-500 hover:text-rose-600 font-bold uppercase tracking-widest self-end sm:self-center font-poppins"
              >
                Reset
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {periods.map((period) => (
            <button
              key={period.id}
              onClick={() => {
                setSelectedPeriod(period.id)
                setStartDate('')
                setEndDate('')
              }}
              className={`h-10 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-[9px] uppercase tracking-widest font-poppins ${selectedPeriod === period.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100'
                }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="card-standard p-4 flex flex-col gap-2">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-inter">Total Students</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-poppins">{Number(stats.total_students).toLocaleString()}</p>
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg self-start font-inter">
              <ArrowUp size={10} />
              <span className="text-[8px] font-bold uppercase tracking-wider">{stats.new_students_this_month} new</span>
            </div>
          </div>
          <div className="card-standard p-4 flex flex-col gap-2">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-inter">Total Revenue</p>
            <p className="text-xl sm:text-2xl font-bold text-indigo-600 tracking-tight font-poppins">{formatCurrency(stats.total_revenue)}</p>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest font-inter">Invoiced Volume</p>
          </div>
          <div className="card-standard p-4 flex flex-col gap-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-inter">Pending Fees</p>
            <p className="text-xl sm:text-2xl font-bold text-rose-500 tracking-tight font-poppins">{formatCurrency(stats.total_pending)}</p>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest font-inter">Total Outstanding</p>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Line Chart - Fee Collection Over Time */}
        <div className="card-standard p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-widest font-poppins">Collection Trend</h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-inter">Last 6 Months</span>
          </div>
          <div className="h-48 xs:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={paymentTrends}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 900, fill: chartColors.text }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 900, fill: chartColors.text }}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 900 }}
                  formatter={(val: number) => `₹${val.toLocaleString()}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#4f46e5" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorAmount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subject Popularity - Donut Chart */}
        <div className="card-standard p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-widest font-poppins">Subject Market Share</h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-inter">Enrolled Students</span>
          </div>
          <div className="h-48 xs:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subjectData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {subjectData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 900 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart - Subject-wise Collection */}
        <div className="card-standard p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-widest font-poppins">Subject Impact</h2>
          <div className="h-48 xs:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartColors.grid} />
                <XAxis type="number" stroke={chartColors.text} tick={{ fontSize: 9, fontWeight: 900 }} />
                <YAxis dataKey="name" type="category" width={80} stroke={chartColors.text} tick={{ fontSize: 9, fontWeight: 900 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    backgroundColor: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    fontSize: '10px',
                    fontWeight: 900
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {subjectData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Pie Chart - Paid vs Pending */}
      <div className="card-standard p-6">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-widest font-poppins">Status Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {paymentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    borderRadius: '12px',
                    backgroundColor: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    fontSize: '10px',
                    fontWeight: 900
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4">
            {paymentStatusData.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-black/10 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm font-inter">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: item.color }}></div>
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-widest font-poppins">{item.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-900 dark:text-white font-poppins">{formatCurrency(item.value)}</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter font-inter">{item.percentage}% Contribution</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
