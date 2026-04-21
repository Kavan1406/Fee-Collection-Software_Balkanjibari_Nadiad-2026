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

  return (
    <div className="p-2.5 sm:p-6 space-y-4">
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight font-poppins">Subject-wise Batch-wise Enrollment Report</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium font-inter">Generate live student enrollment data grouped by batch and subject, with export options for CSV and PDF.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
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

          <div className="grid gap-3 sm:grid-cols-2">
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
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={generateSubjectBatchReport}
            disabled={batchReportLoading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            {batchReportLoading ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
            Generate Report
          </button>

          {batchReportData ? (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleBatchReportDownload('CSV')}
                disabled={!!downloading}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-bold uppercase tracking-widest text-emerald-600 border border-emerald-100"
              >
                {downloading === 'subject_batch_CSV' ? <Loader2 size={12} className="animate-spin" /> : <Download size={14} />}
                Download CSV
              </button>
              <button
                onClick={() => handleBatchReportDownload('PDF')}
                disabled={!!downloading}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-50 px-4 py-3 text-xs font-bold uppercase tracking-widest text-indigo-600 border border-indigo-100"
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
          <div className="grid gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Selected Subject</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{batchReportData.subject_name}</p>
              <p className="text-xs text-slate-500">{batchReportData.batch === 'ALL' ? 'All batches' : batchReportData.batch}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Date Range</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{batchReportData.start_date} → {batchReportData.end_date}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Total Students</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{batchReportData.total_students}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Generated</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{batchReportData.generated_at}</p>
            </div>
          </div>

          {batchReportData.totals_by_batch?.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {batchReportData.totals_by_batch.map((entry: any) => (
                <div key={entry.batch_time} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">Batch</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{entry.batch_time}</p>
                  <p className="mt-3 text-2xl font-bold text-slate-900">{entry.total_students}</p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Sr. No.</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Student Name</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Login ID</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Subject</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Batch</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Enrollment Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batchReportData.rows?.map((row: any, index: number) => (
                  <tr key={`${row.student_id}-${index}`} className="bg-white">
                    <td className="px-4 py-3 text-xs font-semibold text-slate-700">{index + 1}</td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-900">{row.student_name}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{row.login_id}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{row.subject_name}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{row.batch_time}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{row.enrollment_date}</td>
                  </tr>
                ))}
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
