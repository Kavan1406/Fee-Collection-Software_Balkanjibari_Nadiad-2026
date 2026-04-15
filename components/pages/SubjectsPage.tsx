'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, AlertCircle, BookOpen, Loader2, Users } from 'lucide-react'
import { subjectsApi } from '@/lib/api'

interface Subject {
  id: number
  name: string
  description: string
  category: string
  activity_type: string
  instructor_name: string
  default_batch_timing?: string
  timing_schedule?: string
  current_fee: {
    amount: string
    duration: string
  } | null
  max_seats: number
  enrolled_count: number
  is_active: boolean
}

interface SubjectsPageProps {
  userRole: 'admin' | 'staff' | 'student' | 'accountant'
  canEdit?: boolean
}

export default function SubjectsPage({ userRole, canEdit }: SubjectsPageProps) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'MUSIC',
    instructor_name: '',
    fee_amount: 0,
    fee_duration: '1_MONTH',
    default_batch_timing: '7:00 AM - 8:00 AM',
    timing_schedule: '',
    activity_type: 'SUMMER_CAMP',
    max_seats: 50
  })
  const [formLoading, setFormLoading] = useState(false)

  const canAdd = userRole === 'admin' || userRole === 'staff' || userRole === 'accountant'
  const canDelete = userRole === 'admin'

  // Fetch subjects
  const fetchSubjects = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await subjectsApi.getAll({ page: currentPage, page_size: 20 })
      const subjectsData = response.data || (Array.isArray(response) ? response : [])
      setSubjects(subjectsData)
      
      // Set pagination info
      setTotalPages(response?.total_pages || Math.ceil(subjectsData.length / 20) || 1)
      setTotalCount(response?.count || subjectsData.length || 0)
    } catch (err: any) {
      setError(err.message || 'Failed to load subjects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubjects()
  }, [currentPage])

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'MUSIC',
      instructor_name: '',
      fee_amount: 0,
      fee_duration: '1_MONTH',
      default_batch_timing: '7:00 AM - 8:00 AM',
      timing_schedule: '',
      activity_type: 'SUMMER_CAMP',
      max_seats: 50
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError('')

    try {
      if (editingSubject) {
        await subjectsApi.update(editingSubject.id, formData)
      } else {
        await subjectsApi.create(formData)
      }
      await fetchSubjects()
      setShowForm(false)
      setEditingSubject(null)
      resetForm()
    } catch (err: any) {
      console.error(err)
      const responseData = err?.response?.data
      let detailedMessage = err?.response?.data?.error?.message

      if (!detailedMessage && responseData && typeof responseData === 'object') {
        detailedMessage = Object.entries(responseData)
          .map(([field, value]) => {
            const normalized = Array.isArray(value) ? value.join(', ') : String(value)
            return `${field}: ${normalized}`
          })
          .join(' | ')
      }

      setError(detailedMessage || 'Failed to save subject. Ensure all fields are valid.')
    } finally {
      setFormLoading(false)
    }
  }

  const handleEdit = (subject: any) => {
    setEditingSubject(subject)
    setFormData({
      name: subject.name,
      description: subject.description || '',
      category: subject.category || 'MUSIC',
      instructor_name: subject.instructor_name || '',
      fee_amount: parseFloat(subject.current_fee?.amount || '0'),
      fee_duration: subject.current_fee?.duration || '1_MONTH',
      default_batch_timing: subject.default_batch_timing || '7:00 AM - 8:00 AM',
      timing_schedule: subject.timing_schedule || '',
      activity_type: subject.activity_type || 'SUMMER_CAMP',
      max_seats: subject.max_seats || 50
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this subject?')) return

    try {
      await subjectsApi.delete(id)
      await fetchSubjects()
    } catch (err: any) {
      setError(err.message || 'Failed to delete subject')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
        <p className="text-gray-500 font-medium animate-pulse uppercase tracking-widest text-xs font-inter">Loading Subjects...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-poppins uppercase tracking-tight">Subjects</h1>
          <p className="text-slate-400 text-[10px] sm:text-sm mt-0.5 font-medium font-inter">Browse and manage all available academic courses</p>
        </div>
        {canAdd && (
          <button
            onClick={() => {
              setShowForm(true)
              setEditingSubject(null)
              resetForm()
            }}
            className="btn-standard transition-all hover:scale-105 active:scale-95 bg-indigo-600 text-white flex items-center gap-2 px-5 py-2.5 rounded-xl font-poppins font-bold text-sm shadow-lg shadow-indigo-500/20"
          >
            <Plus size={18} />
            <span>Add Subject</span>
          </button>
        )}
      </div>
      
      {/* ---- Subjects Overview (Schedule View) ---- */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-poppins font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
            <BookOpen size={16} className="text-indigo-600" /> Summer Camp Subject Schedule
          </h3>
          <button 
            onClick={() => fetchSubjects()}
            className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black text-slate-500 transition-all uppercase"
          >
            <Plus size={10} className="rotate-45" /> Refresh Data
          </button>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-2 text-[11px] font-black text-slate-400 uppercase">Subject</th>
                <th className="px-4 py-2 text-[11px] font-black text-slate-400 uppercase">Batch Time</th>
                <th className="px-4 py-2 text-[11px] font-black text-slate-400 uppercase text-center">Fee</th>
                <th className="px-4 py-2 text-[11px] font-black text-slate-400 uppercase text-right">Availability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subjects.filter((s: any) => s.activity_type === 'SUMMER_CAMP').map((s: any) => {
                const isFull = s.enrolled_count >= s.max_seats
                const fee = s.current_fee ? s.current_fee.amount : s.monthly_fee || '0'
                return (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-[13px] font-bold text-slate-700">{s.name}</td>
                    <td className="px-4 py-3 text-[12px] text-slate-500">{s.default_batch_timing}</td>
                    <td className="px-4 py-3 text-[13px] font-black text-indigo-600 text-center">₹{parseFloat(fee).toFixed(0)}</td>
                    <td className="px-4 py-3 text-right">
                      {isFull ? (
                        <span className="px-2 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded uppercase">FULL</span>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-500">
                          {s.max_seats - (s.enrolled_count || 0)} / {s.max_seats} LEFT
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="glass-premium rounded-2xl p-4 sm:p-6 shadow-lg">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 font-poppins uppercase tracking-tight">
            {editingSubject ? 'Edit Subject' : 'New Activity'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-[9px] font-medium text-gray-400 uppercase mb-0.5 ml-1 font-inter">Subject Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full input-standard h-10 text-[11px] font-medium font-inter uppercase"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] font-medium text-gray-400 uppercase mb-0.5 ml-1 font-inter">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full input-standard h-10 text-[11px] font-medium font-inter"
                  required
                >
                  <option value="EDUCATION">Education</option>
                  <option value="MUSIC">Music</option>
                  <option value="ART">Art</option>
                  <option value="SPORTS">Sports</option>
                  <option value="DANCE">Dance</option>
                  <option value="COMPUTER">Computer</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-medium text-gray-400 uppercase mb-0.5 ml-1 font-inter">Instructor</label>
                <input
                  type="text"
                  value={formData.instructor_name}
                  onChange={(e) => setFormData({ ...formData, instructor_name: e.target.value })}
                  className="w-full input-standard h-10 text-[11px] font-medium font-inter uppercase"
                />
              </div>
              <div>
                <label className="block text-[9px] font-medium text-gray-400 uppercase mb-0.5 ml-1 font-inter">Fee (₹) *</label>
                <input
                  type="number"
                  value={formData.fee_amount}
                  onChange={(e) => setFormData({ ...formData, fee_amount: parseFloat(e.target.value) || 0 })}
                  className="w-full input-standard h-10 text-[11px] font-medium font-inter"
                  required
                  min="0"
                />
              </div>
              <div>
                <label className="block text-[9px] font-medium text-gray-400 uppercase mb-0.5 ml-1 font-inter">Duration *</label>
                <select
                  value={formData.fee_duration}
                  onChange={(e) => setFormData({ ...formData, fee_duration: e.target.value })}
                  className="w-full input-standard h-10 text-[11px] font-medium font-inter"
                  required
                >
                  <option value="1_MONTH">1 Month</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-medium text-gray-400 uppercase mb-0.5 ml-1 font-inter">Activity Type *</label>
                <select
                  value={formData.activity_type}
                  onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })}
                  className="w-full input-standard h-10 text-[11px] font-medium font-inter"
                  required
                >
                  <option value="SUMMER_CAMP">Summer Camp</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-medium text-gray-400 uppercase mb-0.5 ml-1 font-inter">Total Seats *</label>
                <input
                  type="number"
                  value={formData.max_seats}
                  onChange={(e) => setFormData({ ...formData, max_seats: parseInt(e.target.value) || 0 })}
                  className="w-full input-standard h-10 text-[11px] font-medium font-inter"
                  required
                  min="1"
                />
              </div>
              <div>
                <label className="block text-[9px] font-medium text-gray-400 uppercase mb-0.5 ml-1 font-inter">Default Batch Time *</label>
                <input
                  type="text"
                  value={formData.default_batch_timing}
                  onChange={(e) => setFormData({ ...formData, default_batch_timing: e.target.value })}
                  className="w-full input-standard h-10 text-[11px] font-medium font-inter"
                  required
                  placeholder="e.g. 11:00 AM - 12:00 PM"
                />
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-medium text-gray-400 uppercase mb-0.5 ml-1 font-inter">All Batch Timings</label>
              <textarea
                value={formData.timing_schedule}
                onChange={(e) => setFormData({ ...formData, timing_schedule: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/40 dark:bg-black/10 border border-white/20 dark:border-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white text-[11px] font-medium font-inter resize-none shadow-inner"
                rows={2}
                placeholder="Use | to separate timings. Example: Batch A: 7:00 AM - 8:00 AM | Batch B: 6:00 PM - 7:00 PM"
              />
            </div>
            <div>
              <label className="block text-[9px] font-medium text-gray-400 uppercase mb-0.5 ml-1 font-inter">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/40 dark:bg-black/10 border border-white/20 dark:border-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white text-[11px] font-medium font-inter resize-none uppercase shadow-inner"
                rows={3}
                placeholder="Course curriculum..."
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="submit"
                disabled={formLoading}
                className="h-11 sm:h-12 bg-indigo-600 text-white rounded-xl font-medium font-poppins text-[11px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 w-full sm:flex-1 active:scale-[0.98] transition-all"
              >
                {formLoading ? 'Saving...' : editingSubject ? 'Update Subject' : 'Create Subject'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingSubject(null)
                  resetForm()
                }}
                className="h-11 sm:h-12 bg-white/40 dark:bg-black/10 text-gray-500 border border-slate-200 dark:border-slate-800 rounded-xl font-medium font-poppins text-[11px] uppercase tracking-widest w-full sm:w-32 active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subjects Grid */}
      <div className="space-y-4">
        {/* Page Info Header */}
        {!loading && subjects.length > 0 && totalPages > 1 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-widest">
              📚 Page {currentPage} of {totalPages} • Showing {((currentPage - 1) * 20) + 1}-{Math.min(currentPage * 20, totalCount)} of {totalCount} subjects
            </p>
          </div>
        )}
        
        {subjects.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="text-gray-300" size={32} />
            </div>
            <p className="text-gray-500 font-medium font-inter uppercase tracking-widest text-xs">No subjects found</p>
            <p className="text-gray-400 text-sm mt-1 font-inter">Get started by creating a new subject.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {subjects.map((subject: any) => (
              <div
                key={subject.id}
                className="group relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-indigo-200/50 transition-all duration-300 ring-1 ring-slate-900/[0.02]"
              >
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="px-2 py-1 rounded-lg text-[10px] font-medium font-inter uppercase tracking-widest bg-indigo-50 text-indigo-600">
                        {subject.category}
                      </span>
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-medium font-inter uppercase tracking-widest ${subject.activity_type === 'SUMMER_CAMP'
                        ? 'bg-orange-50 text-orange-600'
                        : 'bg-purple-50 text-purple-600'
                        }`}>
                        {subject.activity_type === 'SUMMER_CAMP' ? 'Summer Camp' : 'Year-Round'}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-gray-900 dark:text-white leading-tight uppercase tracking-tight font-poppins group-hover:text-indigo-600 transition-colors truncate">
                      {subject.name}
                    </h3>
                  </div>
                  {canAdd && (
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => handleEdit(subject)}
                        className="w-8 h-8 flex items-center justify-center bg-white/40 dark:bg-black/10 text-gray-400 hover:text-indigo-600 rounded-lg transition-all border border-white/20"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(subject.id)}
                          className="w-8 h-8 flex items-center justify-center bg-white/40 dark:bg-black/10 text-gray-400 hover:text-rose-500 rounded-lg transition-all border border-white/20"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-5 line-clamp-2 h-8 leading-relaxed font-inter uppercase tracking-tight">
                  {subject.description || 'No description provided.'}
                </p>

                <div className="space-y-2.5 pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest font-inter">Instructor</span>
                    <span className="text-[10px] font-semibold text-gray-900 dark:text-white uppercase font-poppins">{subject.instructor_name || 'TBA'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest font-inter">Pricing</span>
                    <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 font-poppins">
                      ₹{parseFloat(subject.current_fee?.amount || '0').toLocaleString('en-IN')}
                      <span className="text-[8px] text-gray-400 ml-0.5 font-inter">/{subject.current_fee?.duration?.split('_')[0]}MO</span>
                    </span>
                  </div>

                  {/* Enrollment Badge */}
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-black/10 rounded-2xl border border-slate-100 dark:border-white/5 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-inter">Enrolled</p>
                        <p className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-tight font-poppins">{subject.enrolled_count} / {subject.max_seats} Students</p>
                      </div>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${subject.enrolled_count >= subject.max_seats ? 'bg-rose-500 shadow-rose-500/20' : 'bg-indigo-600 shadow-indigo-500/20'}`}>
                        <Users size={18} className="text-white" />
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${subject.enrolled_count >= subject.max_seats ? 'bg-rose-500' : 'bg-indigo-600'}`}
                        style={{ width: `${Math.min(100, (subject.enrolled_count / subject.max_seats) * 100)}%` }}
                      ></div>
                    </div>
                    
                    {subject.enrolled_count >= subject.max_seats && (
                      <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest text-center animate-pulse">No Seats Available</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalCount)} of {totalCount} subjects
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Page {currentPage} of {totalPages}
              </p>
            </div>
            
            <div className="flex gap-2 items-center">
              {/* Previous Button */}
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed font-medium text-sm uppercase tracking-widest active:scale-95"
                title="Previous page"
              >
                ← Prev
              </button>

              {/* Page Numbers - Show 3 pages max */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage <= 2) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 1) {
                    pageNum = totalPages - 2 + i;
                  } else {
                    pageNum = currentPage - 1 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-lg font-bold text-sm transition-all active:scale-95 ${
                        currentPage === pageNum
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title={`Go to page ${pageNum}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Button */}
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed font-medium text-sm uppercase tracking-widest active:scale-95"
                title="Next page"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      )}
    </div>
  )
}
