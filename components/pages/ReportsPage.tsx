'use client'

import { Download, FileText, Loader2, Calendar } from 'lucide-react'
import { useState, useRef } from 'react'
import { analyticsApi, paymentsApi } from '@/lib/api'
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

  const startDateRef = useRef<HTMLInputElement>(null)
  const subjectDateRef = useRef<HTMLInputElement>(null)

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


  return (
    <div className="p-2.5 sm:p-6 space-y-4">
      <div className="flex justify-between items-center bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight font-poppins">System Reports: Summer Camp 2026</h1>
          <p className="text-slate-500 text-[10px] sm:text-sm mt-0.5 font-medium font-inter">Generate and export system-wide audit data</p>
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
                  {subjectReportData.rows?.map((row: any, i: number) => (
                    <tr key={i} className="border-b border-slate-100 bg-white">
                      <td className="px-4 py-4 text-xs font-bold text-slate-900 font-inter">{row.subject_name}</td>
                      <td className="px-4 py-4 text-xs font-semibold text-right text-slate-700 font-inter">{row.total_students}</td>
                      <td className="px-4 py-4 text-xs font-bold text-right text-emerald-600 font-poppins">{formatCurrency(row.total_fees_collected)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            <p className="text-xs font-bold uppercase tracking-widest font-inter">Select a date to generate report</p>
          </div>
        )}
      </div>

    </div>
  )
}
