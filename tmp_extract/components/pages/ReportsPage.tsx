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
  const [activityType, setActivityType] = useState<'ALL' | 'SUMMER_CAMP' | 'YEAR_ROUND'>('ALL')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
              { id: 'ALL', label: 'All Activities' },
              { id: 'SUMMER_CAMP', label: 'Summer Camp' },
              { id: 'YEAR_ROUND', label: 'Year-Round' },
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
        {activityType !== 'ALL' && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1 font-inter">
            <Info size={12} className="text-indigo-500" />
            Reports will be filtered to show only {activityType === 'SUMMER_CAMP' ? 'Summer Camp' : 'Year-Round'} data
          </p>
        )}
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
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-3 sm:px-6 py-4 text-left text-[10px] sm:text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider font-poppins">Report Name</th>
                <th className="px-3 sm:px-6 py-4 text-left text-[10px] sm:text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider font-poppins">Formats</th>
                <th className="px-3 sm:px-6 py-4 text-left text-[10px] sm:text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell font-poppins">Refreshed</th>
                <th className="px-3 sm:px-6 py-4 text-right text-[10px] sm:text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider font-poppins">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-3 sm:px-6 py-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                        <FileText size={16} className="text-indigo-600 dark:text-indigo-400 sm:size-5" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white font-inter">{report.name}</p>
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
                  <td className="px-3 sm:px-6 py-4 text-xs text-gray-500 dark:text-gray-400 hidden sm:table-cell font-inter">{report.date}</td>
                  <td className="px-3 sm:px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleDownload(report.id, 'CSV')}
                        disabled={!!downloading}
                        className="w-10 h-10 flex items-center justify-center hover:bg-green-50 text-green-600 dark:text-green-400 rounded-xl transition-all border border-transparent hover:border-green-100 dark:hover:border-green-900/50"
                        title="Download CSV"
                      >
                        <Download size={18} />
                      </button>
                      <button
                        onClick={() => handleDownload(report.id, 'PDF')}
                        disabled={!!downloading}
                        className="w-10 h-10 flex items-center justify-center hover:bg-indigo-50 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/50"
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
    </div>
  )
}
