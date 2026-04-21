'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, AlertCircle, BookOpen, Loader2, Users, Grid3X3, Lock, Unlock, X } from 'lucide-react'
import { subjectsApi } from '@/lib/api'
import { toast } from 'sonner'

interface Subject {
  id: number
  name: string
  description: string
  category: string
  activity_type: string
  instructor_name: string
  current_fee: {
    amount: string
    duration: string
  } | null
  max_seats: number
  enrolled_count: number
  is_active: boolean
}

interface SubjectBatch {
  id: number
  subject: number
  batch_time: string
  capacity_limit: number
  is_active: boolean
  enrolled_count: number
  available_seats: number
  is_full: boolean
  created_at: string
  updated_at: string
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
  const [showBatchManager, setShowBatchManager] = useState(false)
  const [selectedSubjectForBatch, setSelectedSubjectForBatch] = useState<Subject | null>(null)
  const [batches, setBatches] = useState<SubjectBatch[]>([])
  const [batchLoading, setBatchLoading] = useState(false)
  const [newBatch, setNewBatch] = useState({ batch_time: '', capacity_limit: 50 })
  const [editingBatch, setEditingBatch] = useState<SubjectBatch | null>(null)
  const [editingBatchCapacity, setEditingBatchCapacity] = useState<number | null>(null)
  const [showEditBatchModal, setShowEditBatchModal] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'MUSIC',
    instructor_name: '',
    fee_amount: 0,
    fee_duration: '1_MONTH',
    default_batch_timing: '7-8 AM',
    activity_type: 'SUMMER_CAMP',
    max_seats: 50
  })
  const [formLoading, setFormLoading] = useState(false)

  const canAdd = userRole === 'admin' || (userRole === 'staff' && canEdit)
  const canDelete = userRole === 'admin'

  // Fetch subjects
  const fetchSubjects = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await subjectsApi.getAll()
      const subjectsList = response.data ?? []
      subjectsList.sort((a: Subject, b: Subject) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
      setSubjects(subjectsList)
    } catch (err: any) {
      setError(err.message || 'Failed to load subjects')
    } finally {
      setLoading(false)
    }
  }

  // Fetch batches for a subject
  const fetchBatches = async (subjectId: number) => {
    try {
      setBatchLoading(true)
      const response = await subjectsApi.getBatches(subjectId)
      setBatches(response.data || [])
    } catch (err: any) {
      toast.error(err.message || 'Failed to load batches')
      setBatches([])
    } finally {
      setBatchLoading(false)
    }
  }

  useEffect(() => {
    fetchSubjects()
  }, [])

  // Load batches when batch manager is opened
  useEffect(() => {
    if (showBatchManager && selectedSubjectForBatch) {
      fetchBatches(selectedSubjectForBatch.id)
    }
  }, [showBatchManager, selectedSubjectForBatch])

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'MUSIC',
      instructor_name: '',
      fee_amount: 0,
      fee_duration: '1_MONTH',
      default_batch_timing: '7-8 AM',
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
        toast.success('Subject updated successfully')
      } else {
        await subjectsApi.create(formData)
        toast.success('Subject created successfully')
      }
      await fetchSubjects()
      setShowForm(false)
      setEditingSubject(null)
      resetForm()
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error?.message || 'Failed to save subject. Ensure all fields are valid.')
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
      default_batch_timing: subject.default_batch_timing || '7-8 AM',
      activity_type: subject.activity_type || 'SUMMER_CAMP',
      max_seats: subject.max_seats || 50
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this subject?')) return

    try {
      await subjectsApi.delete(id)
      toast.success('Subject deleted successfully')
      await fetchSubjects()
    } catch (err: any) {
      setError(err.message || 'Failed to delete subject')
    }
  }

  // Batch management handlers
  const handleOpenBatchManager = (subject: Subject) => {
    setSelectedSubjectForBatch(subject)
    setShowBatchManager(true)
  }

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSubjectForBatch || !newBatch.batch_time) return

    try {
      await subjectsApi.createBatch({
        subject: selectedSubjectForBatch.id,
        batch_time: newBatch.batch_time,
        capacity_limit: newBatch.capacity_limit,
        is_active: true
      })
      toast.success('Batch created successfully')
      setNewBatch({ batch_time: '', capacity_limit: 50 })
      await fetchBatches(selectedSubjectForBatch.id)
    } catch (err: any) {
      toast.error(err.message || 'Failed to create batch')
    }
  }

  const handleToggleBatchStatus = async (batch: SubjectBatch) => {
    try {
      await subjectsApi.toggleBatchStatus(selectedSubjectForBatch!.id, batch.id)
      toast.success(`Batch ${batch.is_active ? 'disabled' : 'enabled'} successfully`)
      await fetchBatches(selectedSubjectForBatch!.id)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update batch')
    }
  }

  const handleUpdateBatchCapacity = async (batch: SubjectBatch, newCapacity: number) => {
    try {
      await subjectsApi.updateBatch(selectedSubjectForBatch!.id, batch.id, { capacity_limit: newCapacity })
      toast.success('Batch capacity updated successfully')
      await fetchBatches(selectedSubjectForBatch!.id)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update batch capacity')
    }
  }

  const handleDeleteBatch = async (batch: SubjectBatch) => {
    if (!confirm('Are you sure you want to delete this batch?')) return

    try {
      await subjectsApi.deleteBatch(selectedSubjectForBatch!.id, batch.id)
      toast.success('Batch deleted successfully')
      await fetchBatches(selectedSubjectForBatch!.id)
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete batch')
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
            className="btn-standard"
          >
            <Plus size={18} />
            <span>Add Subject</span>
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="glass-premium rounded-2xl p-4 sm:p-6 shadow-lg">
          <h2 className="text-lg font-bold text-gray-900 mb-3 font-poppins uppercase tracking-tight">
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
                  <option value="YEAR_ROUND">Year-Round</option>
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
            </div>
            <div>
              <label className="block text-[9px] font-medium text-gray-400 uppercase mb-0.5 ml-1 font-inter">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 text-[11px] font-medium font-inter resize-none uppercase shadow-inner"
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
                className="h-11 sm:h-12 bg-white/40 text-gray-500 border border-slate-200 rounded-xl font-medium font-poppins text-[11px] uppercase tracking-widest w-full sm:w-32 active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subjects Grid */}
      {subjects.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
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
              className="group relative bg-white rounded-2xl overflow-hidden border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-indigo-200/50 transition-all duration-300 ring-1 ring-slate-900/[0.02]"
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
                    <h3 className="font-bold text-base text-gray-900 leading-tight uppercase tracking-tight font-poppins group-hover:text-indigo-600 transition-colors truncate">
                      {subject.name}
                    </h3>
                  </div>
                  {canAdd && (
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => handleOpenBatchManager(subject)}
                        className="w-8 h-8 flex items-center justify-center bg-white/40 text-gray-400 hover:text-cyan-500 rounded-lg transition-all border border-white/20"
                        title="Manage Batches"
                      >
                        <Grid3X3 size={14} />
                      </button>
                      <button
                        onClick={() => handleEdit(subject)}
                        className="w-8 h-8 flex items-center justify-center bg-white/40 text-gray-400 hover:text-indigo-600 rounded-lg transition-all border border-white/20"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(subject.id)}
                          className="w-8 h-8 flex items-center justify-center bg-white/40 text-gray-400 hover:text-rose-500 rounded-lg transition-all border border-white/20"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-[10px] font-medium text-gray-500 mb-5 line-clamp-2 h-8 leading-relaxed font-inter uppercase tracking-tight">
                  {subject.description || 'No description provided.'}
                </p>

                <div className="space-y-2.5 pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest font-inter">Instructor</span>
                    <span className="text-[10px] font-semibold text-gray-900 uppercase font-poppins">{subject.instructor_name || 'TBA'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest font-inter">Pricing</span>
                    <span className="text-sm font-semibold text-indigo-600 font-poppins">
                      ₹{parseFloat(subject.current_fee?.amount || '0').toLocaleString('en-IN')}
                      <span className="text-[8px] text-gray-400 ml-0.5 font-inter">/{subject.current_fee?.duration?.split('_')[0]}MO</span>
                    </span>
                  </div>

                  {/* Enrollment Badge */}
                  <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-inter">Enrolled</p>
                        <p className="text-xs font-semibold text-slate-900 uppercase tracking-tight font-poppins">{subject.enrolled_count} / {subject.max_seats} Students</p>
                      </div>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${subject.enrolled_count >= subject.max_seats ? 'bg-rose-500 shadow-rose-500/20' : 'bg-indigo-600 shadow-indigo-500/20'}`}>
                        <Users size={18} className="text-white" />
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
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
      )}

      {/* Batch Manager Modal */}
      {showBatchManager && selectedSubjectForBatch && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-cyan-50 to-blue-50 p-6 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-poppins uppercase tracking-tight">Manage Batches</h2>
                <p className="text-xs text-slate-500 mt-1 font-inter uppercase tracking-widest">{selectedSubjectForBatch.name}</p>
              </div>
              <button
                onClick={() => setShowBatchManager(false)}
                className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-600" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Add New Batch Form */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-bold text-slate-900 mb-4 font-poppins uppercase tracking-widest">Add New Batch</h3>
                <form onSubmit={handleCreateBatch} className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-[9px] font-medium text-gray-400 uppercase mb-0.5 ml-1 font-inter">Batch Time *</label>
                    <input
                      type="text"
                      placeholder="e.g. 7-8 AM"
                      value={newBatch.batch_time}
                      onChange={(e) => setNewBatch({ ...newBatch, batch_time: e.target.value })}
                      className="w-full input-standard h-10 text-[11px] font-medium font-inter uppercase"
                      required
                    />
                  </div>
                  <div className="w-full sm:w-36">
                    <label className="block text-[9px] font-medium text-gray-400 uppercase mb-0.5 ml-1 font-inter">Capacity *</label>
                    <input
                      type="number"
                      min={1}
                      value={newBatch.capacity_limit}
                      onChange={(e) => setNewBatch({ ...newBatch, capacity_limit: parseInt(e.target.value) || 50 })}
                      className="w-full input-standard h-10 text-[11px] font-medium font-inter"
                      required
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="h-10 px-5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-medium text-[11px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
                    >
                      <Plus size={14} />
                      Add Batch
                    </button>
                  </div>
                </form>
              </div>

              {/* Existing Batches */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-4 font-poppins uppercase tracking-widest">All Existing Batches</h3>
                {batchLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-cyan-600" size={32} />
                  </div>
                ) : batches.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    <Grid3X3 className="mx-auto text-slate-300 mb-3" size={32} />
                    <p className="text-sm font-medium text-slate-500">No batches available for this subject</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {batches.map((batch) => (
                      <div
                        key={batch.id}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          batch.is_active
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200 opacity-75'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-slate-900 uppercase text-sm font-poppins tracking-tight">
                                {batch.batch_time}
                              </h4>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                                batch.is_active
                                  ? 'bg-green-200 text-green-700'
                                  : 'bg-red-200 text-red-700'
                              }`}>
                                {batch.is_active ? 'Open' : 'Closed'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 font-medium">
                              Enrolled: <span className="font-bold">{batch.enrolled_count}</span> / <span className="font-bold">{batch.capacity_limit}</span> 
                              {batch.is_full && <span className="text-red-600 ml-2">🔴 FULL</span>}
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => handleToggleBatchStatus(batch)}
                              className={`h-9 px-3 rounded-lg font-medium text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${
                                batch.is_active
                                  ? 'bg-red-500 hover:bg-red-600 text-white'
                                  : 'bg-green-500 hover:bg-green-600 text-white'
                              }`}
                              title={batch.is_active ? 'Stop enrollments' : 'Resume enrollments'}
                            >
                              {batch.is_active ? (
                                <>
                                  <Lock size={14} />
                                  Stop
                                </>
                              ) : (
                                <>
                                  <Unlock size={14} />
                                  Open
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setEditingBatch(batch)
                                setEditingBatchCapacity(batch.capacity_limit)
                                setShowEditBatchModal(true)
                              }}
                              className="h-9 px-3 rounded-lg font-medium text-xs uppercase tracking-widest transition-all active:scale-95 bg-blue-500 hover:bg-blue-600 text-white"
                              title="Edit batch capacity"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteBatch(batch)}
                              className="h-9 px-3 rounded-lg font-medium text-xs uppercase tracking-widest transition-all active:scale-95 bg-slate-300 hover:bg-slate-400 text-slate-900"
                              title="Delete batch"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              batch.is_full
                                ? 'bg-red-500'
                                : batch.available_seats < batch.capacity_limit * 0.2
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{
                              width: `${Math.min(100, (batch.enrolled_count / batch.capacity_limit) * 100)}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowBatchManager(false)}
                className="h-10 px-6 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-medium text-sm uppercase tracking-widest transition-colors"
              >
                Close
              </button>
            </div>

            {/* Edit Batch Capacity Modal */}
            {showEditBatchModal && editingBatch && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 font-poppins uppercase tracking-tight">
                    Edit Batch Capacity Limit
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    <span className="font-semibold">Batch:</span> {editingBatch.batch_time}
                  </p>
                  <p className="text-sm text-slate-600 mb-6">
                    <span className="font-semibold">Currently Enrolled:</span> {editingBatch.enrolled_count} students
                  </p>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-widest">
                      New Capacity Limit
                    </label>
                    <input
                      type="number"
                      min={editingBatch.enrolled_count}
                      value={editingBatchCapacity || ''}
                      onChange={(e) => setEditingBatchCapacity(parseInt(e.target.value) || editingBatch.capacity_limit)}
                      className="w-full h-11 px-4 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      Minimum limit: {editingBatch.enrolled_count} (current enrollments)
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowEditBatchModal(false)
                        setEditingBatch(null)
                        setEditingBatchCapacity(null)
                      }}
                      className="flex-1 h-10 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-medium text-sm uppercase tracking-widest transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (editingBatchCapacity && editingBatchCapacity !== editingBatch.capacity_limit) {
                          handleUpdateBatchCapacity(editingBatch, editingBatchCapacity)
                          setShowEditBatchModal(false)
                          setEditingBatch(null)
                          setEditingBatchCapacity(null)
                        }
                      }}
                      className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm uppercase tracking-widest transition-colors active:scale-95"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
