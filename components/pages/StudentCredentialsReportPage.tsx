'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Download, Loader2, Search, X, Eye, EyeOff, Copy, CheckCircle2 } from 'lucide-react'
import { studentsApi, Student } from '@/lib/api'
import { useNotifications } from '@/hooks/useNotifications'

interface StudentCredential extends Student {
  visible: boolean
}

interface StudentCredentialsReportPageProps {
  userRole: 'admin' | 'staff' | 'student' | 'accountant'
}

export default function StudentCredentialsReportPage({ userRole }: StudentCredentialsReportPageProps) {
  const { notifySuccess, notifyError } = useNotifications()
  const [students, setStudents] = useState<StudentCredential[]>([])
  const [filteredStudents, setFilteredStudents] = useState<StudentCredential[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const isAdmin = userRole === 'admin'

  // Fetch all students
  const fetchStudents = async () => {
    try {
      setLoading(true)
      const res = await studentsApi.getAll({ page_size: 500 })
      const data = (res?.results || res?.data || (Array.isArray(res) ? res : [])) as Student[]
      const withVisibility = data.map(s => ({ ...s, visible: false }))
      setStudents(withVisibility)
      setFilteredStudents(withVisibility)
    } catch (err: any) {
      notifyError(err?.message || 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  // Filter students by search term
  useEffect(() => {
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim()
      setFilteredStudents(
        students.filter(s =>
          s.name?.toLowerCase().includes(search) ||
          s.student_id?.toLowerCase().includes(search) ||
          s.email?.toLowerCase().includes(search)
        )
      )
    } else {
      setFilteredStudents(students)
    }
  }, [searchTerm, students])

  const toggleVisibility = (studentId: string) => {
    setStudents(prev =>
      prev.map(s =>
        s.student_id === studentId ? { ...s, visible: !s.visible } : s
      )
    )
    setFilteredStudents(prev =>
      prev.map(s =>
        s.student_id === studentId ? { ...s, visible: !s.visible } : s
      )
    )
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    notifySuccess('Copied to clipboard!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const exportAsCSV = () => {
    try {
      const headers = ['Student ID', 'Name', 'Email', 'Phone', 'Username', 'Password Hint', 'Status', 'Enrollment Date']
      const rows = students.map(s => [
        s.student_id,
        s.name,
        s.email || '-',
        s.phone || '-',
        s.login_username || '-',
        s.login_password_hint || '-',
        s.status || '-',
        s.enrollment_date || '-'
      ])

      const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `student_credentials_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()

      notifySuccess(`Exported ${students.length} students to CSV`)
    } catch (err: any) {
      notifyError('Failed to export CSV')
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-500">Only admins can access this report.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 font-poppins uppercase tracking-tight">
            Student Credentials & Logs
          </h1>
          <p className="text-slate-500 text-[10px] sm:text-sm mt-1 font-medium font-inter uppercase tracking-widest">
            Complete student database with login credentials and enrollment information
          </p>
        </div>
        <button
          onClick={exportAsCSV}
          disabled={loading || students.length === 0}
          className="h-11 px-6 rounded-xl font-medium font-poppins flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-xs uppercase tracking-widest bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 disabled:opacity-60"
          title="Export all credentials as CSV"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, student ID, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-10 pr-8 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold uppercase tracking-widest placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              title="Clear search"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <p className="text-[9px] text-slate-400 mt-2 font-inter">
          {searchTerm ? `${filteredStudents.length} of ${students.length} results` : `Showing all ${students.length} students`}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Total Students</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{students.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">With Credentials</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {students.filter(s => s.login_username).length}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Active Status</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {students.filter(s => s.status === 'ACTIVE').length}
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
          <p className="text-gray-500 font-medium animate-pulse uppercase tracking-widest text-xs font-inter">
            Loading student data...
          </p>
        </div>
      )}

      {/* No Results */}
      {!loading && filteredStudents.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <AlertCircle size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-bold">No students found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your search criteria</p>
        </div>
      )}

      {/* Students Table */}
      {!loading && filteredStudents.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Student Info</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Login Credentials</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Contact</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{student.name}</p>
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">
                          ID: {student.student_id}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                            Username
                          </p>
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono bg-slate-100 px-2 py-1 rounded text-slate-700">
                              {student.login_username ? (
                                student.visible ? student.login_username : '••••••••'
                              ) : (
                                '-'
                              )}
                            </code>
                            {student.login_username && (
                              <>
                                <button
                                  onClick={() => toggleVisibility(student.student_id || '')}
                                  className="p-1 hover:bg-slate-200 rounded transition-colors"
                                  title="Toggle visibility"
                                >
                                  {student.visible ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                                <button
                                  onClick={() => copyToClipboard(student.login_username || '', `user-${student.id}`)}
                                  className="p-1 hover:bg-slate-200 rounded transition-colors"
                                  title="Copy username"
                                >
                                  {copiedId === `user-${student.id}` ? (
                                    <CheckCircle2 size={14} className="text-emerald-600" />
                                  ) : (
                                    <Copy size={14} />
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                            Password Hint
                          </p>
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono bg-slate-100 px-2 py-1 rounded text-slate-700">
                              {student.login_password_hint ? (
                                student.visible ? student.login_password_hint : '••••••••'
                              ) : (
                                '-'
                              )}
                            </code>
                            {student.login_password_hint && (
                              <button
                                onClick={() => copyToClipboard(student.login_password_hint || '', `pass-${student.id}`)}
                                className="p-1 hover:bg-slate-200 rounded transition-colors"
                                title="Copy password hint"
                              >
                                {copiedId === `pass-${student.id}` ? (
                                  <CheckCircle2 size={14} className="text-emerald-600" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm text-slate-700">{student.email || '-'}</p>
                        <p className="text-sm text-slate-700">{student.phone || '-'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <span
                          className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest w-fit ${
                            student.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-600'
                              : student.status === 'INACTIVE'
                              ? 'bg-orange-50 text-orange-600'
                              : 'bg-slate-50 text-slate-600'
                          }`}
                        >
                          {student.status || 'Unknown'}
                        </span>
                        {student.enrollment_date && (
                          <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">
                            Enrolled: {new Date(student.enrollment_date).toLocaleDateString('en-IN')}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => copyToClipboard(
                          `${student.student_id} | ${student.name} | ${student.login_username || '-'} | ${student.login_password_hint || '-'}`,
                          `full-${student.id}`
                        )}
                        className="inline-flex items-center gap-1 px-3 h-9 rounded-lg bg-blue-600 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-blue-700"
                        title="Copy full details"
                      >
                        {copiedId === `full-${student.id}` ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <Copy size={14} />
                        )}
                        Copy All
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
