'use client'

import { Download, FileText, Loader2, Calendar, BarChart2, BookOpen, ChevronDown, ChevronUp, Users } from 'lucide-react'
import { useState, useRef, useEffect, Fragment } from 'react'
import { analyticsApi, subjectsApi } from '@/lib/api'
import { useNotifications } from '@/hooks/useNotifications'
import type { DateWiseFeeReportRow, SubjectDateWiseSubjectRow } from '@/lib/api/analytics'

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

  // ── Date-wise Fee Collection Report State ─────────────────────────────────
  const [dwStartDate, setDwStartDate] = useState(new Date().toISOString().split('T')[0])
  const [dwEndDate, setDwEndDate] = useState(new Date().toISOString().split('T')[0])
  const [dwPaymentMode, setDwPaymentMode] = useState<'ALL' | 'OFFLINE' | 'ONLINE'>('ALL')
  const [dwLoading, setDwLoading] = useState(false)
  const [dwReportData, setDwReportData] = useState<any | null>(null)
  const [dwDownloading, setDwDownloading] = useState<string | null>(null)

  // ── Report 3: Date-wise Subject-wise Fee Collection State ─────────────────
  const [r3StartDate, setR3StartDate] = useState(new Date().toISOString().split('T')[0])
  const [r3EndDate, setR3EndDate] = useState(new Date().toISOString().split('T')[0])
  const [r3SelectedSubjectIds, setR3SelectedSubjectIds] = useState<number[]>([])
  const [r3SelectAll, setR3SelectAll] = useState(true)
  const [r3Loading, setR3Loading] = useState(false)
  const [r3ReportData, setR3ReportData] = useState<any | null>(null)
  const [r3Downloading, setR3Downloading] = useState<string | null>(null)
  const [r3SubjectDropOpen, setR3SubjectDropOpen] = useState(false)
  const [r3ExpandedSubjects, setR3ExpandedSubjects] = useState<Record<string, boolean>>({})

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

  // ── Date-wise Fee Collection Handlers ────────────────────────────────────
  const generateDateWiseFeeReport = async () => {
    if (dwStartDate > dwEndDate) {
      notifyError('Start date cannot be after end date')
      return
    }
    try {
      setDwLoading(true)
      const response = await analyticsApi.getDateWiseFeeReport(dwStartDate, dwEndDate)
      const data = (response as any)?.data || response
      setDwReportData(data || null)
      notifySuccess('Date-wise fee collection report generated successfully')
    } catch (error) {
      console.error('Date-wise fee report generation failed:', error)
      notifyError('Failed to generate the date-wise fee report')
    } finally {
      setDwLoading(false)
    }
  }

  const handleDwDownload = async (format: 'CSV' | 'PDF') => {
    try {
      setDwDownloading(format)
      if (format === 'CSV') {
        await analyticsApi.exportDateWiseFeeReportCsv(dwStartDate, dwEndDate)
      } else {
        await analyticsApi.exportDateWiseFeeReportPdf(dwStartDate, dwEndDate)
      }
      notifySuccess(`${format} downloaded successfully`)
    } catch (error) {
      console.error('Date-wise fee report download failed:', error)
      notifyError(`Failed to download ${format} report`)
    } finally {
      setDwDownloading(null)
    }
  }

  // ── Report 3 Handlers ────────────────────────────────────────────────────
  const toggleR3Subject = (id: number) => {
    setR3SelectedSubjectIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      setR3SelectAll(next.length === allSubjects.length)
      return next
    })
  }

  const toggleR3SelectAll = () => {
    if (r3SelectAll) {
      setR3SelectedSubjectIds([])
      setR3SelectAll(false)
    } else {
      setR3SelectedSubjectIds(allSubjects.map((s: any) => s.id))
      setR3SelectAll(true)
    }
  }

  const generateR3Report = async () => {
    if (r3StartDate > r3EndDate) {
      notifyError('Start date cannot be after end date')
      return
    }
    try {
      setR3Loading(true)
      const ids = r3SelectAll ? undefined : (r3SelectedSubjectIds.length > 0 ? r3SelectedSubjectIds : undefined)
      const response = await analyticsApi.getSubjectDateWiseFeeReport(r3StartDate, r3EndDate, ids)
      const data = (response as any)?.data || response
      setR3ReportData(data || null)
      // auto-expand all subjects
      if (data?.subjects) {
        const expanded: Record<string, boolean> = {}
        data.subjects.forEach((s: any) => { expanded[s.subject_name] = true })
        setR3ExpandedSubjects(expanded)
      }
      notifySuccess('Report 3 generated successfully')
    } catch (error) {
      console.error('Report 3 generation failed:', error)
      notifyError('Failed to generate Subject-wise Fee report')
    } finally {
      setR3Loading(false)
    }
  }

  const handleR3Download = async (format: 'CSV' | 'PDF') => {
    try {
      setR3Downloading(format)
      const ids = r3SelectAll ? undefined : (r3SelectedSubjectIds.length > 0 ? r3SelectedSubjectIds : undefined)
      if (format === 'CSV') {
        await analyticsApi.exportSubjectDateWiseFeeReportCsv(r3StartDate, r3EndDate, ids)
      } else {
        await analyticsApi.exportSubjectDateWiseFeeReportPdf(r3StartDate, r3EndDate, ids)
      }
      notifySuccess(`${format} downloaded successfully`)
    } catch (error) {
      console.error('Report 3 download failed:', error)
      notifyError(`Failed to download ${format} report`)
    } finally {
      setR3Downloading(null)
    }
  }

  // Filter rows client-side based on payment mode selection
  const dwFilteredRows: DateWiseFeeReportRow[] = (() => {
    const rows: DateWiseFeeReportRow[] = dwReportData?.rows ?? []
    if (dwPaymentMode === 'OFFLINE') {
      return rows.map((r) => ({ ...r, online_fees: 0, total_fees: r.offline_fees }))
    }
    if (dwPaymentMode === 'ONLINE') {
      return rows.map((r) => ({ ...r, offline_fees: 0, total_fees: r.online_fees }))
    }
    return rows
  })()

  const dwGrandOffline = dwFilteredRows.reduce((s, r) => s + r.offline_fees, 0)
  const dwGrandOnline  = dwFilteredRows.reduce((s, r) => s + r.online_fees, 0)
  const dwGrandTotal   = dwFilteredRows.reduce((s, r) => s + r.total_fees, 0)

  const isAllBatch = selectedBatch === 'ALL'

  const batchGroups: Record<string, any[]> = {}
  if (batchReportData?.rows) {
    for (const row of batchReportData.rows) {
      const bn = row.batch_time || 'Unknown'
      if (!batchGroups[bn]) batchGroups[bn] = []
      batchGroups[bn].push(row)
    }
  }
  const sortedBatchNames = Object.keys(batchGroups).sort()
  const totalStudents = batchReportData?.rows?.length ?? 0

  return (
    <div className="p-2.5 sm:p-6 space-y-4">
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight font-poppins">Subject-Wise Batch-Wise Enrollment Report</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium font-inter">Generate a student list for a subject and batch within a date range.</p>
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
              <p className="text-[10px] uppercase tracking-widest text-blue-600">
                {isAllBatch ? 'Total Students' : `Students in ${selectedBatch}`}
              </p>
              <p className="mt-1 text-2xl font-bold text-blue-900">{totalStudents}</p>
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
                  <th className="px-4 py-3 text-center text-[9px] font-bold uppercase tracking-widest w-16">Sr. No.</th>
                  <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-widest">Student Name</th>
                  <th className="px-4 py-3 text-center text-[9px] font-bold uppercase tracking-widest w-36">Student ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {totalStudents > 0 ? (
                  <>
                    {isAllBatch ? (
                      sortedBatchNames.map((batchName) => {
                        const batchRows = batchGroups[batchName]
                        return (
                          <Fragment key={`batch-${batchName}`}>
                            <tr className="bg-indigo-50 border-t-2 border-indigo-100">
                              <td colSpan={3} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-indigo-700">
                                {batchName} &nbsp;•&nbsp; {batchRows.length} Student{batchRows.length !== 1 ? 's' : ''}
                              </td>
                            </tr>
                            {batchRows.map((row: any, index: number) => (
                              <tr
                                key={`${row.student_id}-${index}`}
                                className={index % 2 === 0 ? 'bg-white hover:bg-slate-50 transition' : 'bg-slate-50 hover:bg-slate-100 transition'}
                              >
                                <td className="px-4 py-3 text-center font-semibold text-slate-500">{row.sr_no || index + 1}</td>
                                <td className="px-4 py-3 font-medium text-slate-900 break-words">{row.student_name}</td>
                                <td className="px-4 py-3 text-center text-slate-700 font-mono">{row.student_id}</td>
                              </tr>
                            ))}
                          </Fragment>
                        )
                      })
                    ) : (
                      batchReportData.rows.map((row: any, index: number) => (
                        <tr
                          key={`${row.student_id}-${index}`}
                          className={index % 2 === 0 ? 'bg-white hover:bg-slate-50 transition' : 'bg-slate-50 hover:bg-slate-100 transition'}
                        >
                          <td className="px-4 py-3 text-center font-semibold text-slate-500">{row.sr_no || index + 1}</td>
                          <td className="px-4 py-3 font-medium text-slate-900 break-words">{row.student_name}</td>
                          <td className="px-4 py-3 text-center text-slate-700 font-mono">{row.student_id}</td>
                        </tr>
                      ))
                    )}
                    <tr className="bg-slate-800 text-white">
                      <td colSpan={3} className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest">
                        {isAllBatch
                          ? `Total: ${totalStudents} Student${totalStudents !== 1 ? 's' : ''} across ${sortedBatchNames.length} Batch${sortedBatchNames.length !== 1 ? 'es' : ''}`
                          : `Total: ${totalStudents} Student${totalStudents !== 1 ? 's' : ''} in ${selectedBatch}`
                        }
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
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
      {/* ════════════════════════════════════════════════════════════════
          REPORT 2: DATE-WISE FEE COLLECTION
      ════════════════════════════════════════════════════════════════ */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-xl bg-indigo-100 p-2">
            <BarChart2 size={20} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight font-poppins">
              Date-Wise Fee Collection Report
            </h2>
            <p className="text-slate-500 text-sm mt-0.5 font-medium font-inter">
              Aggregate offline &amp; online fee collections per date within the selected range.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Start Date</label>
            <input
              type="date"
              value={dwStartDate}
              onChange={(e) => setDwStartDate(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">End Date</label>
            <input
              type="date"
              value={dwEndDate}
              onChange={(e) => setDwEndDate(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Payment Mode</label>
            <select
              value={dwPaymentMode}
              onChange={(e) => setDwPaymentMode(e.target.value as 'ALL' | 'OFFLINE' | 'ONLINE')}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-900"
            >
              <option value="ALL">All</option>
              <option value="OFFLINE">Offline (Cash)</option>
              <option value="ONLINE">Online (Razorpay)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={generateDateWiseFeeReport}
              disabled={dwLoading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {dwLoading ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
              Generate Report
            </button>
          </div>
        </div>

        {/* Export buttons (shown only when data is ready) */}
        {dwReportData && !dwLoading && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => handleDwDownload('CSV')}
              disabled={!!dwDownloading}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-bold uppercase tracking-widest text-emerald-600 border border-emerald-100 disabled:opacity-50"
            >
              {dwDownloading === 'CSV' ? <Loader2 size={12} className="animate-spin" /> : <Download size={14} />}
              Download CSV
            </button>
            <button
              onClick={() => handleDwDownload('PDF')}
              disabled={!!dwDownloading}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-50 px-4 py-3 text-xs font-bold uppercase tracking-widest text-indigo-600 border border-indigo-100 disabled:opacity-50"
            >
              {dwDownloading === 'PDF' ? <Loader2 size={12} className="animate-spin" /> : <FileText size={14} />}
              Download PDF
            </button>
          </div>
        )}
      </div>

      {/* ── Date-wise Report Output ─────────────────────────────────────── */}
      {dwLoading ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-slate-500 shadow-sm">
          <Loader2 size={18} className="mx-auto mb-3 animate-spin" />
          <p className="text-sm font-semibold uppercase tracking-widest">Loading report data…</p>
        </div>
      ) : dwReportData ? (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Date Range</p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {dwReportData.start_date} → {dwReportData.end_date}
              </p>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
              <p className="text-[10px] uppercase tracking-widest text-orange-600 font-bold">Total Offline (Cash)</p>
              <p className="mt-1 text-2xl font-bold text-orange-900">{formatCurrency(dwGrandOffline)}</p>
            </div>
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
              <p className="text-[10px] uppercase tracking-widest text-cyan-600 font-bold">Total Online (Razorpay)</p>
              <p className="mt-1 text-2xl font-bold text-cyan-900">{formatCurrency(dwGrandOnline)}</p>
            </div>
            <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
              <p className="text-[10px] uppercase tracking-widest text-green-600 font-bold">Grand Total</p>
              <p className="mt-1 text-2xl font-bold text-green-900">{formatCurrency(dwGrandTotal)}</p>
            </div>
          </div>

          {/* Data table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-900 text-white sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-center text-[9px] font-bold uppercase tracking-widest w-14">Sr. No.</th>
                  <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-widest">Date</th>
                  {dwPaymentMode !== 'ONLINE' && (
                    <th className="px-4 py-3 text-right text-[9px] font-bold uppercase tracking-widest">Offline Fees</th>
                  )}
                  {dwPaymentMode !== 'OFFLINE' && (
                    <th className="px-4 py-3 text-right text-[9px] font-bold uppercase tracking-widest">Online Fees</th>
                  )}
                  <th className="px-4 py-3 text-right text-[9px] font-bold uppercase tracking-widest">Total Fees</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dwFilteredRows.length > 0 ? (
                  <>
                    {dwFilteredRows.map((row, index) => (
                      <tr
                        key={row.date + index}
                        className={index % 2 === 0 ? 'bg-white hover:bg-slate-50 transition' : 'bg-slate-50 hover:bg-slate-100 transition'}
                      >
                        <td className="px-4 py-3 text-center font-semibold text-slate-400">{index + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        {dwPaymentMode !== 'ONLINE' && (
                          <td className="px-4 py-3 text-right text-orange-700 font-semibold">
                            {formatCurrency(row.offline_fees)}
                          </td>
                        )}
                        {dwPaymentMode !== 'OFFLINE' && (
                          <td className="px-4 py-3 text-right text-cyan-700 font-semibold">
                            {formatCurrency(row.online_fees)}
                          </td>
                        )}
                        <td className="px-4 py-3 text-right text-green-800 font-bold">
                          {formatCurrency(row.total_fees)}
                        </td>
                      </tr>
                    ))}
                    {/* Grand total row */}
                    <tr className="bg-slate-900 text-white">
                      <td className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest" colSpan={2}>
                        Grand Total ({dwFilteredRows.length} day{dwFilteredRows.length !== 1 ? 's' : ''})
                      </td>
                      {dwPaymentMode !== 'ONLINE' && (
                        <td className="px-4 py-3 text-right font-bold text-orange-300">
                          {formatCurrency(dwGrandOffline)}
                        </td>
                      )}
                      {dwPaymentMode !== 'OFFLINE' && (
                        <td className="px-4 py-3 text-right font-bold text-cyan-300">
                          {formatCurrency(dwGrandOnline)}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right font-bold text-green-300">
                        {formatCurrency(dwGrandTotal)}
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No fee collection records found for the selected date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-400">
          <BarChart2 size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold uppercase tracking-widest">No report generated yet</p>
          <p className="mt-2 text-xs">Choose a date range and payment mode above, then click Generate Report.</p>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          REPORT 3: DATE-WISE SUBJECT-WISE FEE COLLECTION
      ════════════════════════════════════════════════════════════════ */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-xl bg-violet-100 p-2">
            <BookOpen size={20} className="text-violet-600" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight font-poppins">
              Date-wise Subject-wise Fee Collection Report
            </h2>
            <p className="text-slate-500 text-sm mt-0.5 font-medium font-inter">
              View fees collected per subject &amp; batch within the selected date range, sorted A→Z.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Start Date */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Start Date</label>
            <input
              type="date"
              value={r3StartDate}
              onChange={(e) => setR3StartDate(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">End Date</label>
            <input
              type="date"
              value={r3EndDate}
              onChange={(e) => setR3EndDate(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900"
            />
          </div>

          {/* Subject Multi-select */}
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
              Subjects ({r3SelectAll ? 'All' : r3SelectedSubjectIds.length} selected)
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setR3SubjectDropOpen(p => !p)}
                className="w-full flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-900 text-left"
              >
                <span className="truncate">
                  {r3SelectAll
                    ? 'All Subjects'
                    : r3SelectedSubjectIds.length === 0
                    ? 'Select subjects…'
                    : `${r3SelectedSubjectIds.length} subject(s) selected`}
                </span>
                {r3SubjectDropOpen ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
              </button>

              {r3SubjectDropOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                  {/* Select All row */}
                  <label className="flex items-center gap-3 px-4 py-3 hover:bg-violet-50 cursor-pointer border-b border-slate-100 bg-violet-50/50">
                    <input
                      type="checkbox"
                      checked={r3SelectAll}
                      onChange={toggleR3SelectAll}
                      className="w-4 h-4 accent-violet-600 rounded"
                    />
                    <span className="text-xs font-bold text-violet-700 uppercase tracking-widest">Select All</span>
                  </label>
                  <div className="max-h-52 overflow-y-auto">
                    {[...allSubjects].sort((a: any, b: any) => a.name.localeCompare(b.name)).map((sub: any) => (
                      <label key={sub.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={r3SelectAll || r3SelectedSubjectIds.includes(sub.id)}
                          onChange={() => { setR3SelectAll(false); toggleR3Subject(sub.id) }}
                          className="w-4 h-4 accent-violet-600 rounded"
                        />
                        <span className="text-sm text-slate-700 font-medium">{sub.name}</span>
                      </label>
                    ))}
                  </div>
                  <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
                    <button
                      onClick={() => setR3SubjectDropOpen(false)}
                      className="w-full text-xs font-bold text-violet-600 uppercase tracking-widest hover:underline"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={generateR3Report}
            disabled={r3Loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-50 shadow-lg shadow-violet-500/20"
          >
            {r3Loading ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
            Generate Report
          </button>

          {r3ReportData && !r3Loading && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleR3Download('CSV')}
                disabled={!!r3Downloading}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-bold uppercase tracking-widest text-emerald-600 border border-emerald-100 disabled:opacity-50"
              >
                {r3Downloading === 'CSV' ? <Loader2 size={12} className="animate-spin" /> : <Download size={14} />}
                Download CSV
              </button>
              <button
                onClick={() => handleR3Download('PDF')}
                disabled={!!r3Downloading}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-50 px-4 py-3 text-xs font-bold uppercase tracking-widest text-indigo-600 border border-indigo-100 disabled:opacity-50"
              >
                {r3Downloading === 'PDF' ? <Loader2 size={12} className="animate-spin" /> : <FileText size={14} />}
                Download PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Report 3 Output ─────────────────────────────────────────────── */}
      {r3Loading ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-slate-500 shadow-sm">
          <Loader2 size={18} className="mx-auto mb-3 animate-spin text-violet-500" />
          <p className="text-sm font-semibold uppercase tracking-widest">Loading report data…</p>
        </div>
      ) : r3ReportData ? (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Date Range</p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {r3ReportData.start_date} → {r3ReportData.end_date}
              </p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
              <p className="text-[10px] uppercase tracking-widest text-violet-600 font-bold">Subjects</p>
              <p className="mt-1 text-2xl font-bold text-violet-900">{r3ReportData.subjects?.length ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-[10px] uppercase tracking-widest text-blue-600 font-bold">Total Students</p>
              <p className="mt-1 text-2xl font-bold text-blue-900">{r3ReportData.grand_total_students ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
              <p className="text-[10px] uppercase tracking-widest text-green-600 font-bold">Grand Total Fees</p>
              <p className="mt-1 text-2xl font-bold text-green-900">{formatCurrency(r3ReportData.grand_total_fees ?? 0)}</p>
            </div>
          </div>

          {/* Data table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-900 text-white sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-center text-[9px] font-bold uppercase tracking-widest w-14">Sr.</th>
                  <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-widest">Subject</th>
                  <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-widest">Batch</th>
                  <th className="px-4 py-3 text-right text-[9px] font-bold uppercase tracking-widest">Students</th>
                  <th className="px-4 py-3 text-right text-[9px] font-bold uppercase tracking-widest">Fees Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {r3ReportData.subjects?.length > 0 ? (
                  <>
                    {r3ReportData.subjects.map((sub: SubjectDateWiseSubjectRow, subIdx: number) => {
                      const isExpanded = r3ExpandedSubjects[sub.subject_name] !== false
                      return (
                        <Fragment key={`sub-${sub.subject_name}`}>
                          {/* Subject header row – click to expand/collapse */}
                          <tr
                            className="bg-violet-50 border-t-2 border-violet-100 cursor-pointer hover:bg-violet-100 transition"
                            onClick={() => setR3ExpandedSubjects(p => ({ ...p, [sub.subject_name]: !isExpanded }))}
                          >
                            <td className="px-4 py-3 text-center text-violet-400 font-bold">{subIdx + 1}</td>
                            <td className="px-4 py-3" colSpan={2}>
                              <div className="flex items-center gap-2">
                                {isExpanded
                                  ? <ChevronUp size={14} className="text-violet-500 shrink-0" />
                                  : <ChevronDown size={14} className="text-violet-500 shrink-0" />}
                                <span className="text-[11px] font-black uppercase tracking-widest text-violet-800">
                                  {sub.subject_name}
                                </span>
                                <span className="text-[10px] text-violet-500 font-medium">
                                  ({sub.batches.length} batch{sub.batches.length !== 1 ? 'es' : ''})
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                                <Users size={10} /> {sub.subject_total_students}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-black text-violet-800">
                              {formatCurrency(sub.subject_total_fees)}
                            </td>
                          </tr>

                          {/* Batch rows – only shown when expanded */}
                          {isExpanded && sub.batches.map((batch, batchIdx) => (
                            <tr
                              key={`${sub.subject_name}-${batch.batch_time}-${batchIdx}`}
                              className={batchIdx % 2 === 0 ? 'bg-white hover:bg-slate-50 transition' : 'bg-slate-50 hover:bg-slate-100 transition'}
                            >
                              <td className="px-4 py-3 text-center text-slate-400 font-medium pl-8">{batchIdx + 1}</td>
                              <td className="px-4 py-3 text-slate-400 text-[10px] font-medium italic pl-6">↳ {sub.subject_name}</td>
                              <td className="px-4 py-3 text-slate-700 font-semibold">{batch.batch_time}</td>
                              <td className="px-4 py-3 text-right font-semibold text-slate-700">{batch.student_count}</td>
                              <td className="px-4 py-3 text-right font-bold text-green-800">
                                {formatCurrency(batch.fees_collected)}
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      )
                    })}

                    {/* Grand total row */}
                    <tr className="bg-slate-900 text-white">
                      <td className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest" colSpan={3}>
                        Grand Total ({r3ReportData.subjects?.length} subjects)
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-blue-300">
                        {r3ReportData.grand_total_students}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-300">
                        {formatCurrency(r3ReportData.grand_total_fees)}
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No fee collection records found for the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-400">
          <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold uppercase tracking-widest">No report generated yet</p>
          <p className="mt-2 text-xs">Choose a date range and subjects above, then click Generate Report.</p>
        </div>
      )}
    </div>
  )
}
