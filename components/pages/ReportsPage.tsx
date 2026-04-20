'use client'

import { Download, FileText, Loader2, Calendar, BarChart3, BookOpen, Users, Info, Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { useState, useRef } from 'react'
import { analyticsApi, paymentsApi, studentsApi } from '@/lib/api'
import { useNotifications } from '@/hooks/useNotifications'

interface ReportsPageProps {
  userRole: 'admin' | 'staff' | 'student' | 'accountant'
}

export default function ReportsPage({ userRole }: ReportsPageProps) {
  const { notifySuccess, notifyError } = useNotifications()
  const [downloading, setDownloading] = useState<string | null>(null)
  const [dateReportLoading, setDateReportLoading] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [startReportDate, setStartReportDate] = useState(new Date().toISOString().split('T')[0])
  const [endReportDate, setEndReportDate] = useState(new Date().toISOString().split('T')[0])
  const [dateReportData, setDateReportData] = useState<any | null>(null)
  const [subjectReportLoading, setSubjectReportLoading] = useState(false)
  const [showSubjectDatePicker, setShowSubjectDatePicker] = useState(false)
  const [selectedSubjectReportDate, setSelectedSubjectReportDate] = useState(new Date().toISOString().split('T')[0])
  const [subjectReportData, setSubjectReportData] = useState<any | null>(null)
  const [activityType, setActivityType] = useState<'ALL' | 'SUMMER_CAMP' | 'YEAR_ROUND'>('ALL')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  
  // New Report States (Session 12)
  const [batchReportLoading, setBatchReportLoading] = useState(false)
  const [batchReportData, setBatchReportData] = useState<any | null>(null)
  const [razorpayReportLoading, setRazorpayReportLoading] = useState(false)
  const [razorpayReportData, setRazorpayReportData] = useState<any | null>(null)
  const [balkanjiReportLoading, setBalkanjiReportLoading] = useState(false)
  const [balkanjiReportData, setBalkanjiReportData] = useState<any | null>(null)
  const [subjectwiseTotalLoading, setSubjectwiseTotalLoading] = useState(false)
  const [subjectwiseTotalData, setSubjectwiseTotalData] = useState<any | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const startDateRef = useRef<HTMLInputElement>(null)
  const subjectDateRef = useRef<HTMLInputElement>(null)

  const reports = [
    { id: 'payment', name: 'Monthly Collection Report', type: 'CSV', date: new Date().toISOString().split('T')[0], size: 'Dynamic', desc: 'Revenue trends and cash flow analysis' },
    { id: 'enrollment', name: 'Student Enrollment Report', type: 'CSV', date: new Date().toISOString().split('T')[0], size: 'Dynamic', desc: 'Subject distribution and enrollment trends' },
    { id: 'pending', name: 'Pending Fees List', type: 'CSV', date: new Date().toISOString().split('T')[0], size: 'Dynamic', desc: 'Detailed list of outstanding dues' },
    { id: 'audit', name: 'Payment Transaction Audit', type: 'CSV', date: new Date().toISOString().split('T')[0], size: 'Dynamic', desc: 'Full audit log of all financial transactions' },
  ]

  const handleDownload = async (id: string, format: 'CSV' | 'PDF' = 'CSV') => {
    try {
      setDownloading(`${id}_${format}`)

      // Map report IDs to correct API methods
      if (id === 'daily') {
        format === 'CSV' ? await analyticsApi.exportDailyCollectionCsv() : await analyticsApi.exportDailyCollectionPdf()
      } else if (id === 'payment') {
        format === 'CSV' ? await analyticsApi.exportMonthlyCollectionCsv() : await analyticsApi.exportMonthlyCollectionPdf()
      } else if (id === 'subject_detailed') {
        format === 'CSV' ? await analyticsApi.exportBatchReportCsv() : await analyticsApi.exportBatchReportPdf()
      } else if (id === 'total_detailed') {
        format === 'CSV' ? await analyticsApi.exportTotalEnrollmentsCsv() : await analyticsApi.exportTotalEnrollmentsPdf()
      } else if (id === 'enrollment') {
        format === 'CSV' ? await analyticsApi.exportEnrollmentReportCsv() : await analyticsApi.exportEnrollmentReportPdf()
      } else if (id === 'pending') {
        format === 'CSV' ? await paymentsApi.exportPendingFeesCsv() : await paymentsApi.exportPendingFeesPdf()
      } else if (id === 'audit') {
        format === 'CSV' ? await paymentsApi.exportTransactionAuditCsv() : await paymentsApi.exportTransactionAuditPdf()
      }
      notifySuccess(`${format} Report downloaded successfully`)
    } catch (error) {
      console.error('Download failed:', error)
      notifyError(`Failed to generate ${format} report`)
    } finally {
      setDownloading(null)
    }
  }

  const generateDateWiseReport = async (startDate: string, endDate: string) => {
    try {
      setDateReportLoading(true)
      const response = await analyticsApi.getDateWiseFeeReport(startDate, endDate)
      const data = (response as any)?.data || response
      setDateReportData(data || null)
      notifySuccess('Date-wise report generated successfully')
    } catch (error) {
      console.error('Date-wise report generation failed:', error)
      notifyError('Failed to generate date-wise report')
    } finally {
      setDateReportLoading(false)
    }
  }

  const handleDateWiseDownload = async (format: 'CSV' | 'PDF') => {
    if (!startReportDate || !endReportDate) {
      notifyError('Please select both start and end date first')
      return
    }

    if (startReportDate > endReportDate) {
      notifyError('Start date cannot be after end date')
      return
    }

    try {
      setDownloading(`date_wise_${format}`)
      if (format === 'PDF') {
        await analyticsApi.exportDateWiseFeeReportPdf(startReportDate, endReportDate)
      } else {
        await analyticsApi.exportDateWiseFeeReportCsv(startReportDate, endReportDate)
      }
      notifySuccess(`${format} Report downloaded successfully`)
    } catch (error) {
      console.error('Date-wise report download failed:', error)
      notifyError(`Failed to download ${format} report`)
    } finally {
      setDownloading(null)
    }
  }

  const formatCurrency = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN')}`

  const generateSubjectWiseReport = async (date: string) => {
    try {
      setSubjectReportLoading(true)
      const response = await analyticsApi.getSubjectWiseDailyFeeReport(date)
      const data = (response as any)?.data || response
      setSubjectReportData(data || null)
      notifySuccess('Subject-wise report generated successfully')
    } catch (error) {
      console.error('Subject-wise report generation failed:', error)
      notifyError('Failed to generate subject-wise report')
    } finally {
      setSubjectReportLoading(false)
    }
  }

  const handleSubjectWiseDownload = async (format: 'CSV' | 'PDF') => {
    if (!selectedSubjectReportDate) {
      notifyError('Please select a date first')
      return
    }

    try {
      setDownloading(`subject_wise_${format}`)
      if (format === 'PDF') {
        await analyticsApi.exportSubjectWiseDailyFeeReportPdf(selectedSubjectReportDate)
      } else {
        await analyticsApi.exportSubjectWiseDailyFeeReportCsv(selectedSubjectReportDate)
      }
      notifySuccess(`${format} Report downloaded successfully`)
    } catch (error) {
      console.error('Subject-wise report download failed:', error)
      notifyError(`Failed to download ${format} report`)
    } finally {
      setDownloading(null)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportResult(null)
    try {
      const res = await studentsApi.importCsv(file)
      if (res.success) {
        setImportResult(res.data)
        notifySuccess(res.message || 'Import successful')
      } else {
        notifyError(res.error || 'Import failed')
      }
    } catch (error: any) {
      notifyError(error.response?.data?.error || 'Failed to connect to server')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // New Report Handlers (Session 12)
  const generateBatchReport = async () => {
    try {
      setBatchReportLoading(true)
      // Batch report is generated on the fly when downloading
      // Just set a placeholder for now
      setBatchReportData({ generated: true })
      notifySuccess('Batch report ready')
    } catch (error) {
      notifyError('Failed to generate batch report')
    } finally {
      setBatchReportLoading(false)
    }
  }

  const generateRazorpayReport = async () => {
    try {
      setRazorpayReportLoading(true)
      const response = await analyticsApi.getOnlineRazorpayReport()
      const data = (response as any)?.data || response
      setRazorpayReportData(data || null)
      notifySuccess('Razorpay report generated successfully')
    } catch (error) {
      console.error('Razorpay report generation failed:', error)
      notifyError('Failed to generate Razorpay report')
    } finally {
      setRazorpayReportLoading(false)
    }
  }

  const generateBalkanjiReport = async () => {
    try {
      setBalkanjiReportLoading(true)
      const response = await analyticsApi.getOnlineBalkanjiReport()
      const data = (response as any)?.data || response
      setBalkanjiReportData(data || null)
      notifySuccess('Balkanji Bari online report generated successfully')
    } catch (error) {
      console.error('Balkanji report generation failed:', error)
      notifyError('Failed to generate Balkanji report')
    } finally {
      setBalkanjiReportLoading(false)
    }
  }

  const generateSubjectwiseTotalReport = async () => {
    try {
      setSubjectwiseTotalLoading(true)
      const response = await analyticsApi.getSubjectwiseTotalReport()
      const data = (response as any)?.data || response
      setSubjectwiseTotalData(data || null)
      notifySuccess('Subject-wise total report generated successfully')
    } catch (error) {
      console.error('Subject-wise total report generation failed:', error)
      notifyError('Failed to generate subject-wise total report')
    } finally {
      setSubjectwiseTotalLoading(false)
    }
  }

  const handleNewReportDownload = async (reportId: string, format: 'CSV' | 'PDF') => {
    try {
      setDownloading(`${reportId}_${format}`)
      if (reportId === 'batch') {
        format === 'CSV' ? await analyticsApi.exportBatchReportCsv() : await analyticsApi.exportBatchReportPdf()
      } else if (reportId === 'razorpay') {
        format === 'CSV' ? await analyticsApi.exportOnlineRazorpayReportCsv() : await analyticsApi.exportOnlineRazorpayReportPdf()
      } else if (reportId === 'balkanji') {
        format === 'CSV' ? await analyticsApi.exportOnlineBalkanjiReportCsv() : await analyticsApi.exportOnlineBalkanjiReportPdf()
      } else if (reportId === 'subjectwise_total') {
        format === 'CSV' ? await analyticsApi.exportSubjectwiseTotalReportCsv() : await analyticsApi.exportSubjectwiseTotalReportPdf()
      }
      notifySuccess(`${format} Report downloaded successfully`)
    } catch (error) {
      console.error('Download failed:', error)
      notifyError(`Failed to generate ${format} report`)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="p-2.5 sm:p-6 space-y-4">
      <div className="flex justify-between items-center bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight font-poppins">System Reports</h1>
          <p className="text-slate-500 text-[10px] sm:text-sm mt-0.5 font-medium font-inter">Generate and export system-wide audit data</p>
        </div>
      </div>

      {/* Activity Type Filter */}
      <div className="card-standard p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest font-inter">Filter Global Data:</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'SUMMER_CAMP', label: 'Summer Camp' },
            ].map((bt) => (
              <button
                key={bt.id}
                onClick={() => setActivityType(bt.id as any)}
                className={`h-11 px-6 rounded-xl font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-xs uppercase tracking-widest font-poppins ${activityType === bt.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100'
                  }`}
              >
                {bt.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1 font-inter">
          <Info size={12} className="text-indigo-500" />
          Reports are strictly filtered for Summer Camp 2026 data
        </p>
      </div>

      {/* Quick Generate Section */}
      <div className="card-standard p-6">
        <h2 className="text-base font-bold text-slate-900 mb-6 uppercase tracking-widest pt-1 font-poppins">Generate Instant Reports</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6">
          {[
            { id: 'daily', title: 'Daily Collection', icon: Calendar, color: 'text-orange-600', bgColor: 'bg-orange-50' },
            { id: 'payment', title: 'Monthly Collection', icon: BarChart3, color: 'text-blue-600', bgColor: 'bg-blue-50' },
            { id: 'subject_detailed', title: 'Subject Detailed', icon: BookOpen, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
            { id: 'total_detailed', title: 'Enrollment List', icon: Users, color: 'text-purple-600', bgColor: 'bg-purple-50' },
          ].map((report) => (
            <div
              key={report.id}
              className="group bg-white p-6 rounded-2xl transition-all text-center space-y-4 border border-slate-50 shadow-sm hover:shadow-md"
            >
              <div className={`w-12 h-12 flex items-center justify-center rounded-2xl ${report.bgColor} ${report.color} mx-auto transition-transform group-hover:scale-110`}>
                <report.icon size={24} />
              </div>
              <p className="font-bold text-xs text-slate-900 uppercase tracking-tight truncate font-inter">{report.title}</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => handleDownload(report.id, 'CSV')}
                  disabled={!!downloading}
                  className="h-8 px-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-[10px] uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100/50 flex-1 font-poppins"
                >
                  {downloading === `${report.id}_CSV` ? <Loader2 size={12} className="animate-spin" /> : 'CSV'}
                </button>
                <button
                  onClick={() => handleDownload(report.id, 'PDF')}
                  disabled={!!downloading}
                  className="h-8 px-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-[10px] uppercase tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100/50 flex-1 font-poppins"
                >
                  {downloading === `${report.id}_PDF` ? <Loader2 size={12} className="animate-spin" /> : 'PDF'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Date-wise Report */}
      <div className="card-standard p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-widest font-poppins">Date-wise Fee Collection Report</h2>
            <p className="text-xs text-slate-500 mt-1 font-inter">Generate fee collection summary for a selected date range</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setShowDatePicker(true)
                if (startDateRef.current?.showPicker) {
                  startDateRef.current.showPicker()
                } else {
                  startDateRef.current?.focus()
                }
              }}
              className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-[10px] sm:text-xs font-bold uppercase tracking-widest font-poppins flex items-center gap-2"
            >
              <Calendar size={14} />
              Date-wise Report
            </button>
            {showDatePicker && (
              <>
                <input
                  ref={startDateRef}
                  type="date"
                  value={startReportDate}
                  onChange={(e) => setStartReportDate(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
                />
                <input
                  type="date"
                  value={endReportDate}
                  onChange={(e) => setEndReportDate(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
                />
                <button
                  onClick={() => {
                    if (!startReportDate || !endReportDate) {
                      notifyError('Please select both start and end date')
                      return
                    }
                    if (startReportDate > endReportDate) {
                      notifyError('Start date cannot be after end date')
                      return
                    }
                    generateDateWiseReport(startReportDate, endReportDate)
                  }}
                  className="h-10 px-4 rounded-xl bg-emerald-600 text-white text-[10px] sm:text-xs font-bold uppercase tracking-widest font-poppins"
                >
                  Generate Report
                </button>
              </>
            )}
          </div>
        </div>

        {dateReportLoading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-xs font-bold uppercase tracking-widest font-inter">Generating Report...</span>
          </div>
        ) : dateReportData ? (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest font-poppins">Date</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest font-poppins">Online Fees</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest font-poppins">Offline Fees</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest font-poppins">Total Fees</th>
                  </tr>
                </thead>
                <tbody>
                  {dateReportData.rows?.map((row: any) => (
                    <tr key={row.date} className="border-b border-slate-100 bg-white">
                      <td className="px-4 py-4 text-xs font-bold text-slate-900 font-inter">{row.date}</td>
                      <td className="px-4 py-4 text-xs font-semibold text-right text-slate-700 font-inter">{formatCurrency(row.online_fees)}</td>
                      <td className="px-4 py-4 text-xs font-semibold text-right text-slate-700 font-inter">{formatCurrency(row.offline_fees)}</td>
                      <td className="px-4 py-4 text-xs font-bold text-right text-indigo-700 font-poppins">{formatCurrency(row.total_fees)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-inter">Grand Total</p>
                <p className="text-lg font-bold text-slate-900 font-poppins">{formatCurrency(dateReportData.grand_total)}</p>
              </div>
              <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50">
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest font-inter">Final Cumulative Total</p>
                <p className="text-lg font-bold text-indigo-700 font-poppins">{formatCurrency(dateReportData.final_cumulative_total)}</p>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => handleDateWiseDownload('CSV')}
                disabled={!!downloading}
                className="h-10 px-4 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 font-poppins"
              >
                {downloading === 'date_wise_CSV' ? <Loader2 size={12} className="animate-spin" /> : <Download size={14} />}
                Download CSV
              </button>
              <button
                onClick={() => handleDateWiseDownload('PDF')}
                disabled={!!downloading}
                className="h-10 px-4 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 font-poppins"
              >
                {downloading === 'date_wise_PDF' ? <Loader2 size={12} className="animate-spin" /> : <FileText size={14} />}
                Download PDF
              </button>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-slate-400">
            <p className="text-xs font-bold uppercase tracking-widest font-inter">Select start and end date to generate report</p>
          </div>
        )}
      </div>

      {/* Subject-wise Daily Report */}
      <div className="card-standard p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-widest font-poppins">Subject-wise Daily Fee Report</h2>
            <p className="text-xs text-slate-500 mt-1 font-inter">Generate subject-level fee collection summary for a selected date</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setShowSubjectDatePicker(true)
                if (subjectDateRef.current?.showPicker) {
                  subjectDateRef.current.showPicker()
                } else {
                  subjectDateRef.current?.focus()
                }
              }}
              className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-[10px] sm:text-xs font-bold uppercase tracking-widest font-poppins flex items-center gap-2"
            >
              <Calendar size={14} />
              Subject-wise Report
            </button>
            {showSubjectDatePicker && (
              <>
                <input
                  ref={subjectDateRef}
                  type="date"
                  value={selectedSubjectReportDate}
                  onChange={(e) => setSelectedSubjectReportDate(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
                />
                <button
                  onClick={() => {
                    if (!selectedSubjectReportDate) {
                      notifyError('Please select a date')
                      return
                    }
                    generateSubjectWiseReport(selectedSubjectReportDate)
                  }}
                  className="h-10 px-4 rounded-xl bg-emerald-600 text-white text-[10px] sm:text-xs font-bold uppercase tracking-widest font-poppins"
                >
                  Generate Report
                </button>
              </>
            )}
          </div>
        </div>

        {subjectReportLoading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-xs font-bold uppercase tracking-widest font-inter">Generating Report...</span>
          </div>
        ) : subjectReportData ? (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest font-poppins">Subject Name</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest font-poppins">Total Students</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest font-poppins">Total Fees Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectReportData.rows?.length > 0 ? (
                    subjectReportData.rows.map((row: any) => (
                      <tr key={row.subject_name} className="border-b border-slate-100 bg-white">
                        <td className="px-4 py-4 text-xs font-bold text-slate-900 font-inter">{row.subject_name}</td>
                        <td className="px-4 py-4 text-xs font-semibold text-right text-slate-700 font-inter">{row.total_students}</td>
                        <td className="px-4 py-4 text-xs font-bold text-right text-indigo-700 font-poppins">{formatCurrency(row.total_fees_collected)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-xs font-bold text-slate-400 uppercase tracking-widest font-inter">No records found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 max-w-sm ml-auto">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-inter">Grand Total</p>
              <p className="text-lg font-bold text-slate-900 font-poppins">{formatCurrency(subjectReportData.grand_total)}</p>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => handleSubjectWiseDownload('CSV')}
                disabled={!!downloading}
                className="h-10 px-4 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 font-poppins"
              >
                {downloading === 'subject_wise_CSV' ? <Loader2 size={12} className="animate-spin" /> : <Download size={14} />}
                Download CSV
              </button>
              <button
                onClick={() => handleSubjectWiseDownload('PDF')}
                disabled={!!downloading}
                className="h-10 px-4 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 font-poppins"
              >
                {downloading === 'subject_wise_PDF' ? <Loader2 size={12} className="animate-spin" /> : <FileText size={14} />}
                Download PDF
              </button>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-slate-400">
            <p className="text-xs font-bold uppercase tracking-widest font-inter">Select a date to generate subject-wise report</p>
          </div>
        )}
      </div>

      {/* Bulk Data Management (Importer) */}
      <div className="card-standard p-6 bg-gradient-to-br from-indigo-50/50 to-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-200">
              <Upload size={24} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-widest font-poppins">Bulk Data Migration</h2>
              <p className="text-xs text-slate-500 mt-1 font-medium font-inter">Import students and enrollments via CSV file</p>
              <div className="mt-2 flex gap-3">
                <a href="#" className="text-[10px] font-bold text-indigo-600 hover:underline uppercase tracking-tighter">Download Sample CSV</a>
                <span className="text-[10px] text-slate-300">|</span>
                <p className="text-[10px] text-slate-400 italic">Expected: name, phone, email, subject, batch_time...</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 min-w-[200px]">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleImport}
              className="hidden" 
              accept=".csv"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="h-12 px-6 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {importing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              {importing ? 'Processing File...' : 'Upload Student Data'}
            </button>
          </div>
        </div>

        {/* Import Results Summary */}
        {importResult && (
          <div className="mt-6 p-4 rounded-2xl bg-white border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-indigo-50">
              <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest font-inter">Import Results Summary</span>
              <button onClick={() => setImportResult(null)} className="text-[10px] text-slate-400 hover:text-slate-600 uppercase font-bold">Dismiss</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase font-inter">New Students</p>
                <p className="text-xl font-black text-emerald-600 font-poppins">{importResult.created}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase font-inter">Profiles Updated</p>
                <p className="text-xl font-black text-indigo-600 font-poppins">{importResult.updated}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase font-inter">Failures</p>
                <p className="text-xl font-black text-rose-500 font-poppins">{importResult.errors?.length || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase font-inter">Total Rows</p>
                <p className="text-xl font-black text-slate-900 font-poppins">{(importResult.created + importResult.updated + (importResult.errors?.length || 0))}</p>
              </div>
            </div>
            
            {importResult.errors?.length > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-100 max-h-32 overflow-y-auto no-scrollbar">
                <p className="text-[10px] font-bold text-rose-700 uppercase mb-2 flex items-center gap-1 font-inter">
                   <AlertCircle size={12} /> Some rows failed to import:
                </p>
                <ul className="space-y-1">
                  {importResult.errors.map((err: string, i: number) => (
                    <li key={i} className="text-[9px] text-rose-600 font-medium font-inter">• {err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Available Reports Table */}
      <div className="card-standard overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-100 p-6">
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-widest font-poppins">Report Catalog</h2>
        </div>
        <div className="overflow-x-auto no-scrollbar hidden lg:block">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 sm:px-6 py-4 text-left text-[10px] sm:text-sm font-bold text-gray-600 uppercase tracking-wider font-poppins">Report Name</th>
                <th className="px-3 sm:px-6 py-4 text-left text-[10px] sm:text-sm font-bold text-gray-600 uppercase tracking-wider font-poppins">Formats</th>
                <th className="px-3 sm:px-6 py-4 text-left text-[10px] sm:text-sm font-bold text-gray-600 uppercase tracking-wider hidden sm:table-cell font-poppins">Refreshed</th>
                <th className="px-3 sm:px-6 py-4 text-right text-[10px] sm:text-sm font-bold text-gray-600 uppercase tracking-wider font-poppins">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 sm:px-6 py-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 bg-indigo-50 rounded-lg">
                        <FileText size={16} className="text-indigo-600 sm:size-5" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-gray-900 font-inter">{report.name}</p>
                        <p className="text-[10px] text-gray-500 line-clamp-1 font-inter">{report.desc}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4">
                    <div className="flex gap-1">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-800">CSV</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800">PDF</span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 text-xs text-gray-500 hidden sm:table-cell font-inter">{report.date}</td>
                  <td className="px-3 sm:px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleDownload(report.id, 'CSV')}
                        disabled={!!downloading}
                        className="w-10 h-10 flex items-center justify-center hover:bg-green-50 text-green-600 rounded-xl transition-all border border-transparent hover:border-green-100"
                        title="Download CSV"
                      >
                        <Download size={18} />
                      </button>
                      <button
                        onClick={() => handleDownload(report.id, 'PDF')}
                        disabled={!!downloading}
                        className="w-10 h-10 flex items-center justify-center hover:bg-indigo-50 text-indigo-600 rounded-xl transition-all border border-transparent hover:border-indigo-100"
                        title="Download PDF"
                      >
                        <FileText size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View for Reports */}
        <div className="lg:hidden divide-y divide-slate-100">
            {reports.map((report) => (
                <div key={report.id} className="p-4 space-y-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-xl">
                                <FileText size={18} className="text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-slate-900 uppercase tracking-tight font-poppins">{report.name}</p>
                                <p className="text-[9px] font-medium text-slate-400 mt-0.5 line-clamp-1 font-inter">{report.desc}</p>
                            </div>
                        </div>
                        <div className="flex gap-1.5 grayscale opacity-60">
                            <span className="px-1.5 py-0.5 rounded-[4px] text-[8px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">CSV</span>
                            <span className="px-1.5 py-0.5 rounded-[4px] text-[8px] font-bold bg-blue-50 text-blue-700 border border-blue-100">PDF</span>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleDownload(report.id, 'CSV')}
                            disabled={!!downloading}
                            className="flex-1 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 font-medium text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 font-poppins"
                        >
                            {downloading === `${report.id}_CSV` ? <Loader2 size={12} className="animate-spin" /> : <Download size={14} />}
                            Download CSV
                        </button>
                        <button
                            onClick={() => handleDownload(report.id, 'PDF')}
                            disabled={!!downloading}
                            className="flex-1 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 font-medium text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 font-poppins"
                        >
                            {downloading === `${report.id}_PDF` ? <Loader2 size={12} className="animate-spin" /> : <FileText size={14} />}
                            Download PDF
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* NEW REPORTS SECTION - Session 12 */}
      <div className="space-y-6">
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-6 uppercase tracking-widest pt-1 font-poppins">Advanced Reports</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Batchwise Report */}
            <div className="border border-slate-100 rounded-2xl p-6 space-y-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight font-poppins">Batchwise Report</h3>
                  <p className="text-xs text-slate-500 mt-1 font-inter">Student enrollments grouped by batch time</p>
                </div>
                <div className="p-2 bg-orange-50 rounded-xl">
                  <Calendar size={20} className="text-orange-600" />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => generateBatchReport()}
                  disabled={batchReportLoading || !!downloading}
                  className="flex-1 h-10 px-4 rounded-lg bg-orange-50 text-orange-600 border border-orange-100 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 font-poppins hover:bg-orange-100 transition-all"
                >
                  {batchReportLoading ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
                  Generate
                </button>
                <button
                  onClick={() => handleNewReportDownload('batch', 'CSV')}
                  disabled={!batchReportData || !!downloading}
                  className="flex-1 h-10 px-4 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 font-poppins disabled:opacity-50"
                >
                  {downloading === 'batch_CSV' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  CSV
                </button>
                <button
                  onClick={() => handleNewReportDownload('batch', 'PDF')}
                  disabled={!batchReportData || !!downloading}
                  className="flex-1 h-10 px-4 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 font-poppins disabled:opacity-50"
                >
                  {downloading === 'batch_PDF' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                  PDF
                </button>
              </div>
            </div>

            {/* Online Razorpay Report */}
            <div className="border border-slate-100 rounded-2xl p-6 space-y-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight font-poppins">Razorpay Payments</h3>
                  <p className="text-xs text-slate-500 mt-1 font-inter">Online payments via Razorpay gateway</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-xl">
                  <BarChart3 size={20} className="text-blue-600" />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => generateRazorpayReport()}
                  disabled={razorpayReportLoading || !!downloading}
                  className="flex-1 h-10 px-4 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 font-poppins hover:bg-blue-100 transition-all"
                >
                  {razorpayReportLoading ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
                  Generate
                </button>
                <button
                  onClick={() => handleNewReportDownload('razorpay', 'CSV')}
                  disabled={!razorpayReportData || !!downloading}
                  className="flex-1 h-10 px-4 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 font-poppins disabled:opacity-50"
                >
                  {downloading === 'razorpay_CSV' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  CSV
                </button>
                <button
                  onClick={() => handleNewReportDownload('razorpay', 'PDF')}
                  disabled={!razorpayReportData || !!downloading}
                  className="flex-1 h-10 px-4 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 font-poppins disabled:opacity-50"
                >
                  {downloading === 'razorpay_PDF' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                  PDF
                </button>
              </div>
            </div>

            {/* Online Balkanji Bari Report */}
            <div className="border border-slate-100 rounded-2xl p-6 space-y-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight font-poppins">All Online Payments</h3>
                  <p className="text-xs text-slate-500 mt-1 font-inter">Complete online payment history and status</p>
                </div>
                <div className="p-2 bg-emerald-50 rounded-xl">
                  <Users size={20} className="text-emerald-600" />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => generateBalkanjiReport()}
                  disabled={balkanjiReportLoading || !!downloading}
                  className="flex-1 h-10 px-4 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 font-poppins hover:bg-emerald-100 transition-all"
                >
                  {balkanjiReportLoading ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
                  Generate
                </button>
                <button
                  onClick={() => handleNewReportDownload('balkanji', 'CSV')}
                  disabled={!balkanjiReportData || !!downloading}
                  className="flex-1 h-10 px-4 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 font-poppins disabled:opacity-50"
                >
                  {downloading === 'balkanji_CSV' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  CSV
                </button>
                <button
                  onClick={() => handleNewReportDownload('balkanji', 'PDF')}
                  disabled={!balkanjiReportData || !!downloading}
                  className="flex-1 h-10 px-4 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 font-poppins disabled:opacity-50"
                >
                  {downloading === 'balkanji_PDF' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                  PDF
                </button>
              </div>
            </div>

            {/* Subjectwise Total Report */}
            <div className="border border-slate-100 rounded-2xl p-6 space-y-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight font-poppins">Subject Statistics</h3>
                  <p className="text-xs text-slate-500 mt-1 font-inter">Subject-wise fees, enrollments, and collection %</p>
                </div>
                <div className="p-2 bg-purple-50 rounded-xl">
                  <BookOpen size={20} className="text-purple-600" />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => generateSubjectwiseTotalReport()}
                  disabled={subjectwiseTotalLoading || !!downloading}
                  className="flex-1 h-10 px-4 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 font-poppins hover:bg-purple-100 transition-all"
                >
                  {subjectwiseTotalLoading ? <Loader2 size={14} className="animate-spin" /> : <BookOpen size={14} />}
                  Generate
                </button>
                <button
                  onClick={() => handleNewReportDownload('subjectwise_total', 'CSV')}
                  disabled={!subjectwiseTotalData || !!downloading}
                  className="flex-1 h-10 px-4 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 font-poppins disabled:opacity-50"
                >
                  {downloading === 'subjectwise_total_CSV' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  CSV
                </button>
                <button
                  onClick={() => handleNewReportDownload('subjectwise_total', 'PDF')}
                  disabled={!subjectwiseTotalData || !!downloading}
                  className="flex-1 h-10 px-4 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 font-poppins disabled:opacity-50"
                >
                  {downloading === 'subjectwise_total_PDF' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                  PDF
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Report Data Tables - Display after generation */}
        {batchReportData && (
          <div className="card-standard p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-tight font-poppins">Batchwise Data</h3>
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 font-poppins">Batch</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-600 font-poppins">Students</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-600 font-poppins">Total Fees</th>
                  </tr>
                </thead>
                <tbody>
                  {batchReportData.rows?.map((row: any, i: number) => (
                    <tr key={i} className="border-b border-slate-100 bg-white hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{row.batch_time || row.batch || 'N/A'}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{row.student_count || 0}</td>
                      <td className="px-4 py-3 text-right font-bold text-indigo-600">{row.total_fees ? `₹${parseFloat(row.total_fees).toFixed(2)}` : '₹0.00'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {razorpayReportData && (
          <div className="card-standard p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-tight font-poppins">Razorpay Payments Data</h3>
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 font-poppins">Student</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-600 font-poppins">Amount</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 font-poppins">Status</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 font-poppins">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {razorpayReportData.rows?.map((row: any, i: number) => (
                    <tr key={i} className="border-b border-slate-100 bg-white hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{row.student_name}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">₹{parseFloat(row.amount || 0).toFixed(2)}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${row.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>{row.status}</span></td>
                      <td className="px-4 py-3 text-slate-600">{new Date(row.payment_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {balkanjiReportData && (
          <div className="card-standard p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-tight font-poppins">All Online Payments Data</h3>
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 font-poppins">Student</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-600 font-poppins">Amount</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 font-poppins">Status</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 font-poppins">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {balkanjiReportData.rows?.map((row: any, i: number) => (
                    <tr key={i} className="border-b border-slate-100 bg-white hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{row.student_name}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">₹{parseFloat(row.amount || 0).toFixed(2)}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${row.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>{row.status}</span></td>
                      <td className="px-4 py-3 text-slate-600">{new Date(row.payment_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {subjectwiseTotalData && (
          <div className="card-standard p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-tight font-poppins">Subject-wise Statistics</h3>
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 font-poppins">Subject</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-600 font-poppins">Enrollments</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-600 font-poppins">Total Fees</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-600 font-poppins">Collected</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-600 font-poppins">Pending</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-600 font-poppins">Collection %</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectwiseTotalData.rows?.map((row: any, i: number) => (
                    <tr key={i} className="border-b border-slate-100 bg-white hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{row.subject_name}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{row.total_enrollments || 0}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">₹{parseFloat(row.total_fees || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">₹{parseFloat(row.total_paid || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-bold text-orange-600">₹{parseFloat(row.total_pending || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right"><span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 font-bold">{parseFloat(row.collection_percentage || 0).toFixed(1)}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
