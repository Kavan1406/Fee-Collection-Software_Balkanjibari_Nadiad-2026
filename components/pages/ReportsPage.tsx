'use client'

import { Download, FileText, Loader2, Calendar } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { analyticsApi, subjectsApi } from '@/lib/api'
import { useNotifications } from '@/hooks/useNotifications'

interface ReportsPageProps {
  userRole: 'admin' | 'staff' | 'student' | 'accountant'
}

export default function ReportsPage({ userRole }: ReportsPageProps) {
  const { notifySuccess, notifyError } = useNotifications()
  const [downloading, setDownloading] = useState<string | null>(null)
  const [batchReportLoading, setBatchReportLoading] = useState(false)
  const [batchReportData, setBatchReportData] = useState<any | null>(null)
  const [allSubjects, setAllSubjects] = useState<any[]>([])
  const [subjectBatches, setSubjectBatches] = useState<string[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [selectedBatch, setSelectedBatch] = useState<string>('ALL')
  const [startReportDate, setStartReportDate] = useState(new Date().toISOString().split('T')[0])
  const [endReportDate, setEndReportDate] = useState(new Date().toISOString().split('T')[0])

  const startDateRef = useRef<HTMLInputElement>(null)
  const endDateRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await subjectsApi.getAll()
        const data = (response as any)?.data || response
        const subjects = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
          ? data.results
          : []

        setAllSubjects(subjects)

        if (subjects.length > 0) {
          const firstSubjectId = subjects[0].id.toString()
          setSelectedSubject(firstSubjectId)
          await loadSubjectBatches(firstSubjectId)
        }
      } catch (error) {
        console.error('Failed to load subjects for report filters:', error)
        notifyError('Unable to load subjects for report filters')
      }
    }

    fetchSubjects()
  }, [])

  const loadSubjectBatches = async (subjectId: string) => {
    if (!subjectId) {
      setSubjectBatches([])
      return
    }

    try {
      const response = await subjectsApi.getBatches(Number(subjectId))
      const data = (response as any)?.data || response
      const batches = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
        ? data.results
        : []

      setSubjectBatches(
        batches
          .map((batch: any) => batch?.batch_time || batch?.name || String(batch || ''))
          .filter(Boolean)
      )
    } catch (error) {
      console.error('Failed to load batches for selected subject:', error)
      setSubjectBatches([])
    }
  }

  const handleSubjectChange = async (subjectId: string) => {
    setSelectedSubject(subjectId)
    setSelectedBatch('ALL')
    setBatchReportData(null)
    await loadSubjectBatches(subjectId)
  }

  const generateSubjectBatchReport = async () => {
    if (!selectedSubject) {
      notifyError('Please select a subject')
      return
    }

    if (startReportDate > endReportDate) {
      notifyError('Start date cannot be after end date')
      return
    }

    try {
      setBatchReportLoading(true)
      const response = await analyticsApi.getSubjectBatchEnrollmentReport(
        Number(selectedSubject),
        selectedBatch,
        startReportDate,
        endReportDate
      )
      const data = (response as any)?.data || response
      setBatchReportData(data || null)
      notifySuccess('Subject and batch enrollment report generated successfully')
    } catch (error) {
      console.error('Subject/batch enrollment report generation failed:', error)
      notifyError('Failed to generate the report')
    } finally {
      setBatchReportLoading(false)
    }
  }

  const handleBatchReportDownload = async (format: 'CSV' | 'PDF') => {
    if (!selectedSubject) {
      notifyError('Please select a subject before downloading')
      return
    }

    try {
      setDownloading(`subject_batch_${format}`)
      if (format === 'PDF') {
        await analyticsApi.exportSubjectBatchEnrollmentReportPdf(
          Number(selectedSubject),
          selectedBatch,
          startReportDate,
          endReportDate
        )
      } else {
        await analyticsApi.exportSubjectBatchEnrollmentReportCsv(
          Number(selectedSubject),
          selectedBatch,
          startReportDate,
          endReportDate
        )
      }
      notifySuccess(`${format} Report downloaded successfully`)
    } catch (error) {
      console.error('Subject/batch report download failed:', error)
      notifyError(`Failed to download ${format} report`)
    } finally {
      setDownloading(null)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount)
  }

  return (
    <div className="p-2.5 sm:p-6 space-y-4">
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight font-poppins">Enrollment & Payment Report</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium font-inter">Generate detailed enrollment and payment reports with subject and batch filters.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Subject</label>
            <select
              value={selectedSubject}
              onChange={(event) => handleSubjectChange(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-900"
            >
              {allSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Batch</label>
            <select
              value={selectedBatch}
              onChange={(event) => setSelectedBatch(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-900"
            >
              <option value="ALL">All Batches</option>
              {subjectBatches.map((batch) => (
                <option key={batch} value={batch}>{batch}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Start Date</label>
            <input
              ref={startDateRef}
              type="date"
              value={startReportDate}
              onChange={(event) => setStartReportDate(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">End Date</label>
            <input
              ref={endDateRef}
              type="date"
              value={endReportDate}
              onChange={(event) => setEndReportDate(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={generateSubjectBatchReport}
            disabled={batchReportLoading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {batchReportLoading ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
            Generate Report
          </button>

          {batchReportData ? (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleBatchReportDownload('CSV')}
                disabled={!!downloading}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-bold uppercase tracking-widest text-emerald-600 border border-emerald-100 disabled:opacity-50"
              >
                {downloading === 'subject_batch_CSV' ? <Loader2 size={12} className="animate-spin" /> : <Download size={14} />}
                Download CSV
              </button>
              <button
                onClick={() => handleBatchReportDownload('PDF')}
                disabled={!!downloading}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-50 px-4 py-3 text-xs font-bold uppercase tracking-widest text-indigo-600 border border-indigo-100 disabled:opacity-50"
              >
                {downloading === 'subject_batch_PDF' ? <Loader2 size={12} className="animate-spin" /> : <FileText size={14} />}
                Download PDF
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {batchReportLoading ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-slate-500 shadow-sm">
          <Loader2 size={18} className="mx-auto mb-3 animate-spin" />
          <p className="text-sm font-semibold uppercase tracking-widest">Loading report data...</p>
        </div>
      ) : batchReportData ? (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid gap-3 lg:grid-cols-6">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Subject</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{batchReportData.subject_name}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-blue-50 p-3">
              <p className="text-[10px] uppercase tracking-widest text-blue-600">Total Students</p>
              <p className="mt-1 text-2xl font-bold text-blue-900">{batchReportData.summary?.total_students || 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-green-50 p-3">
              <p className="text-[10px] uppercase tracking-widest text-green-600">Total Paid</p>
              <p className="mt-1 text-sm font-bold text-green-900">{formatCurrency(batchReportData.summary?.total_paid || 0)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-red-50 p-3">
              <p className="text-[10px] uppercase tracking-widest text-red-600">Total Pending</p>
              <p className="mt-1 text-sm font-bold text-red-900">{formatCurrency(batchReportData.summary?.total_pending || 0)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-purple-50 p-3">
              <p className="text-[10px] uppercase tracking-widest text-purple-600">Total Fees</p>
              <p className="mt-1 text-sm font-bold text-purple-900">{formatCurrency(batchReportData.summary?.total_enrolled || 0)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-600">Generated</p>
              <p className="mt-1 text-xs font-bold text-slate-900">{batchReportData.generated_at}</p>
            </div>
          </div>

          {/* Payment Mode Breakdown */}
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-cyan-50 p-4">
              <p className="text-[10px] uppercase tracking-widest text-cyan-600 font-bold">Online Payments</p>
              <p className="mt-2 text-2xl font-bold text-cyan-900">{formatCurrency(batchReportData.summary?.online_payments || 0)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-orange-50 p-4">
              <p className="text-[10px] uppercase tracking-widest text-orange-600 font-bold">Offline Payments</p>
              <p className="mt-2 text-2xl font-bold text-orange-900">{formatCurrency(batchReportData.summary?.offline_payments || 0)}</p>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-900 text-white sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-widest">Sr. No.</th>
                  <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-widest">Student Name</th>
                  <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-widest">Student ID</th>
                  <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-widest">Subject</th>
                  <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-widest">Batch</th>
                  <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-widest">Enrollment Date</th>
                  <th className="px-3 py-2 text-right text-[9px] font-bold uppercase tracking-widest">Total Fee</th>
                  <th className="px-3 py-2 text-right text-[9px] font-bold uppercase tracking-widest">Paid Amount</th>
                  <th className="px-3 py-2 text-right text-[9px] font-bold uppercase tracking-widest">Pending</th>
                  <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-widest">Payment Mode</th>
                  <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-widest">Payment Status</th>
                  <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-widest">Payment ID</th>
                  <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-widest">Ref. No</th>
                  <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-widest">Phone</th>
                  <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-widest">Receipt ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batchReportData.rows?.length > 0 ? (
                  batchReportData.rows.map((row: any, index: number) => (
                    <tr key={`${row.student_id}-${index}`} className="bg-white hover:bg-slate-50 transition">
                      <td className="px-3 py-2 font-semibold text-slate-700">{row.sr_no || index + 1}</td>
                      <td className="px-3 py-2 font-medium text-slate-900">{row.student_name}</td>
                      <td className="px-3 py-2 text-slate-700">{row.student_id}</td>
                      <td className="px-3 py-2 text-slate-700">{row.subject}</td>
                      <td className="px-3 py-2 text-slate-700">{row.batch_time}</td>
                      <td className="px-3 py-2 text-slate-700">{row.enrollment_date}</td>
                      <td className="px-3 py-2 text-right font-medium text-slate-900">{formatCurrency(row.total_fee || 0)}</td>
                      <td className="px-3 py-2 text-right font-medium text-green-600">{formatCurrency(row.paid_amount || 0)}</td>
                      <td className="px-3 py-2 text-right font-medium text-red-600">{formatCurrency(row.pending_amount || 0)}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                          row.payment_mode === 'Online'
                            ? 'bg-blue-100 text-blue-700'
                            : row.payment_mode === 'Offline'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {row.payment_mode}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                          row.payment_status === 'Success'
                            ? 'bg-green-100 text-green-700'
                            : row.payment_status === 'Pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {row.payment_status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700 font-mono text-[8px]">{row.payment_id}</td>
                      <td className="px-3 py-2 text-slate-700 font-mono text-[8px]">{row.payment_reference_no}</td>
                      <td className="px-3 py-2 text-slate-700">{row.phone_number}</td>
                      <td className="px-3 py-2 text-slate-700 font-mono text-[8px]">{row.receipt_id}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={15} className="px-4 py-8 text-center text-slate-500">
                      No enrollment records found for the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-400">
          <p className="text-sm font-semibold uppercase tracking-widest">No report generated yet</p>
          <p className="mt-2 text-xs">Choose subject, batch, and date range above, then click Generate Report.</p>
        </div>
      )}
    </div>
  )
}
