'use client'

import React, { useState, useEffect } from 'react'
import {
  Users,
  BookOpen,
  Plus,
  IndianRupee,
  Clock,
  Check,
  Loader2,
  AlertCircle,
  Search,
  Calendar,
  X,
  CreditCard,
  Building,
  GraduationCap
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { studentsApi, subjectsApi, enrollmentsApi, Subject as ApiSubject } from '@/lib/api'
import { toast } from 'sonner'

interface Student {
  id: string
  student_id: string
  name: string
}

type Subject = ApiSubject & {
  registration_fee?: string | number;
  total_fee?: string | number;
}

interface Enrollment {
  id: string
  student_name: string
  student_id: string
  subject_name: string
  enrollment_date: string
  status: string
}

export default function EnrollmentPage() {
  // State
  const [students, setStudents] = useState<Student[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState<number | string>('')
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | string>('')
  const [batchTime, setBatchTime] = useState('7-8 AM')
  const [activityType, setActivityType] = useState<'YEAR_ROUND' | 'SUMMER_CAMP'>('YEAR_ROUND')

  // Search State
  const [studentSearch, setStudentSearch] = useState('')
  const [subjectSearch, setSubjectSearch] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoadingData(true)
      const [studentsRes, subjectsRes, enrollmentsRes] = await Promise.all([
        studentsApi.getAll(),
        subjectsApi.getAll(),
        enrollmentsApi.getAll()
      ])

      if (studentsRes.success !== false) setStudents((studentsRes as any).results || [])
      if (subjectsRes.success) setSubjects(subjectsRes.data || [])
      if (enrollmentsRes.success) setEnrollments(enrollmentsRes.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoadingData(false)
    }
  }

  const handleEnroll = async () => {
    if (!selectedStudentId || !selectedSubjectId) {
      toast.error('Please select both student and course')
      return
    }

    try {
      setLoading(true)
      const payload: any = {
        student: selectedStudentId,
        subject: selectedSubjectId,
      }

      if (activityType === 'SUMMER_CAMP') {
        payload.batch_time = batchTime
      }

      const response = await enrollmentsApi.create(payload)

      if (response.success) {
        toast.success('Student enrolled successfully')
        setSelectedStudentId('')
        setSelectedSubjectId('')
        fetchData() // Refresh list
      } else {
        toast.error(response.error?.message || 'Failed to enroll student')
      }
    } catch (error) {
      console.error('Error enrolling student:', error)
      toast.error('Server error occurred')
    } finally {
      setLoading(false)
    }
  }

  const selectedStudent = students.find(s => String(s.id) === String(selectedStudentId))
  const selectedSubject = subjects.find(s => String(s.id) === String(selectedSubjectId))

  const calculateTotalFee = () => {
    if (!selectedSubject) return 0
    const regFee = Number(selectedSubject.registration_fee) || 0
    const structFee = Number(selectedSubject.fee_structure?.fee_amount) || 0
    
    if (selectedSubject.activity_type === 'SUMMER_CAMP') {
      return regFee + (Number(selectedSubject.total_fee) || structFee)
    }
    return regFee + (Number(selectedSubject.monthly_fee) || structFee)
  }

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    String(s.student_id).toLowerCase().includes(studentSearch.toLowerCase())
  )

  const filteredSubjects = subjects.filter(s =>
    s.activity_type === activityType &&
    s.name.toLowerCase().includes(subjectSearch.toLowerCase())
  ).map(s => ({
    ...s,
    registration_fee: (s as any).registration_fee || 0 // Fallback for type safety
  })) as Subject[]

  const getBadgeColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE': return 'bg-emerald-50 text-emerald-600 border-emerald-100'
      case 'COMPLETED': return 'bg-indigo-50 text-indigo-600 border-indigo-100'
      case 'CANCELLED': return 'bg-rose-50 text-rose-600 border-rose-100'
      default: return 'bg-slate-50 text-slate-600 border-slate-100'
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-8 max-w-7xl mx-auto no-scrollbar">
      {/* Header */}
      <div className="flex flex-col gap-1.5 bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h1 className="text-xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 font-poppins uppercase tracking-tight">Subject Enrollment</h1>
        <p className="text-slate-500 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Administrative Admission Gateway</p>
      </div>

      <Card className="border-none shadow-2xl shadow-indigo-100 rounded-[2.5rem] overflow-hidden bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          <div className="lg:col-span-2 p-8 lg:p-12 space-y-10 border-r border-slate-50">
            {/* Activity Type Toggle */}
            <div className="flex bg-slate-50 p-1.5 rounded-2xl w-fit">
              <button
                onClick={() => { setActivityType('YEAR_ROUND'); setSelectedSubjectId(''); }}
                className={`px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activityType === 'YEAR_ROUND'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-600'
                  }`}
              >
                Academic Sessions
              </button>
              <button
                onClick={() => { setActivityType('SUMMER_CAMP'); setSelectedSubjectId(''); }}
                className={`px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activityType === 'SUMMER_CAMP'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-600'
                  }`}
              >
                Summer Camps
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Student Selection */}
              <div className="space-y-4">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  Scholars Registry
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className="text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by ID or Name..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-100 bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-500 text-sm"
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                  {filteredStudents.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStudentId(s.id)}
                      className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all group ${String(selectedStudentId) === String(s.id)
                        ? 'border-indigo-600 bg-indigo-50/50'
                        : 'border-slate-50 hover:border-slate-200'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${String(selectedStudentId) === String(s.id) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Users size={18} />
                        </div>
                        <div className="text-left">
                          <p className={`text-xs font-bold uppercase tracking-tight ${String(selectedStudentId) === String(s.id) ? 'text-indigo-600' : 'text-slate-900'}`}>{s.name}</p>
                          <p className="text-[10px] font-bold text-slate-600 tracking-widest">{s.student_id}</p>
                        </div>
                      </div>
                      {String(selectedStudentId) === String(s.id) && <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white"><Check size={14} /></div>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Selection */}
              <div className="space-y-4">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  Available Courses
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className="text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder="Filter courses..."
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-100 bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-500 text-sm"
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                  {filteredSubjects.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSubjectId(s.id)}
                      className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${selectedSubjectId === s.id
                        ? 'border-indigo-600 bg-indigo-50/50'
                        : 'border-slate-50 hover:border-slate-200'
                        }`}
                    >
                     <div className="flex justify-between items-start mb-2">
                         <p className={`text-xs font-bold uppercase tracking-tight leading-tight ${String(selectedSubjectId) === String(s.id) ? 'text-indigo-600' : 'text-slate-900'}`}>{s.name}</p>
                         <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${String(selectedSubjectId) === String(s.id) ? 'border-indigo-600 bg-indigo-600' : 'border-slate-200 bg-white'}`}>
                           {String(selectedSubjectId) === String(s.id) && <Check size={12} className="text-white" />}
                         </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                          <IndianRupee size={12} />
                          <span>{s.monthly_fee ? `₹${s.monthly_fee}/mo` : `₹${s.total_fee}`}</span>
                        </div>
                        {s.timing_schedule && (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                            <Clock size={12} />
                            <span>{s.timing_schedule}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Batch Time (for summer camp) */}
            {activityType === 'SUMMER_CAMP' && (
              <div className="pt-6 border-t border-slate-50">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-4">
                  Batch Timing Schedule
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {['7-8 AM', '8-9 AM', '5-6 PM', '6-7 PM'].map((time) => (
                    <button
                      key={time}
                      onClick={() => setBatchTime(time)}
                      className={`h-14 rounded-2xl border-2 text-[10px] font-bold uppercase tracking-widest transition-all ${batchTime === time
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                        : 'border-slate-100 bg-white text-slate-600 hover:border-indigo-200 hover:text-slate-600'
                        }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Fee Summary / Admission Receipt */}
          <div>
            <div className="bg-slate-50/80 p-8 lg:p-12 rounded-[2.5rem] lg:rounded-none h-full min-h-[600px] flex flex-col">
              <div className="flex items-center justify-between mb-10 pb-6 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Admission Fee Receipt</h3>
                <Building className="text-slate-500" size={24} />
              </div>

              {selectedStudent && selectedSubject ? (
                <div className="flex-1 flex flex-col space-y-8">
                  <div className="space-y-6">
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm transition-transform hover:scale-[1.02]">
                      <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Scholar Particulars</p>
                      <p className="font-bold text-slate-900 uppercase tracking-tight">{selectedStudent.name}</p>
                      <p className="text-[10px] font-bold text-indigo-500 tracking-widest mt-1 uppercase">{selectedStudent.student_id}</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm transition-transform hover:scale-[1.02]">
                      <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Course Assignment</p>
                      <p className="font-bold text-slate-900 uppercase tracking-tight leading-tight">{selectedSubject.name}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Batch Schedule</p>
                          <p className="text-xs font-bold text-slate-600 uppercase tracking-tight">
                            {activityType === 'SUMMER_CAMP' ? batchTime : (selectedSubject.timing_schedule || 'Regulated')}
                          </p>
                       </div>
                       <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Academic Duration</p>
                          <p className="text-xs font-bold text-slate-600 uppercase tracking-tight">
                            {selectedSubject.duration_months ? `${selectedSubject.duration_months} Months` : 'Program Length'}
                          </p>
                       </div>
                    </div>
                  </div>

                  <div className="pt-10 mt-auto border-t border-dashed border-slate-300 space-y-8">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                         <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Net Payable Capital</span>
                         <p className="text-[9px] text-slate-600 italic font-bold">inclusive of registry charges</p>
                      </div>
                      <span className="text-4xl font-bold text-indigo-600 tracking-tighter italic">
                        ₹{calculateTotalFee().toLocaleString()}
                      </span>
                    </div>
                    
                    <button
                      onClick={handleEnroll}
                      disabled={!selectedStudentId || !selectedSubjectId || loading}
                      className="w-full h-16 rounded-[2rem] font-bold text-sm uppercase tracking-[0.2em] bg-indigo-600 text-white shadow-2xl shadow-indigo-500/40 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-[0.98] group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                         <>
                            <Loader2 className="animate-spin" size={20} />
                            <span>Authenticating...</span>
                         </>
                      ) : (
                         <>
                           <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                           <span>Confirm Admission</span>
                         </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 rounded-[2.5rem] bg-indigo-50 text-indigo-200 mb-6 flex items-center justify-center">
                    <GraduationCap size={40} />
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.1em] leading-relaxed max-w-[200px]">
                    Awaiting Selection To Generate Secure Fee Receipt
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Enrolled Students List */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
           <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600 shadow-sm">
             <Calendar size={22} />
           </div>
           <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Active Admissions</h2>
        </div>

        <div className="hidden lg:block overflow-hidden rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-indigo-100 bg-white">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-left">
                <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-slate-600">Timestamp</th>
                <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-slate-600">Student Scholar</th>
                <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-slate-600">Course Particulars</th>
                <th className="px-8 py-6 text-slate-500 text-[10px] font-bold uppercase tracking-widest text-slate-600">Registry Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {enrollments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center opacity-30">
                    <Users className="mx-auto w-12 h-12 mb-4" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em]">No admissions archived in current ledger</p>
                  </td>
                </tr>
              ) : (
                enrollments.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-8 py-6 text-[10px] font-bold tracking-tight text-slate-600 font-mono uppercase">
                      {new Date(e.enrollment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">{e.student_name}</span>
                        <span className="text-[10px] font-bold text-indigo-500 tracking-widest">{e.student_id}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-xs font-bold text-slate-900 uppercase tracking-tight">{e.subject_name}</td>
                    <td className="px-8 py-6 text-center">
                      <span className={`px-4 py-2 rounded-2xl text-[9px] font-bold uppercase tracking-widest border ${getBadgeColor(e.status)} shadow-sm`}>
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden space-y-6">
          {enrollments.map((e) => (
            <div key={e.id} className="card-standard p-6 bg-white shadow-xl shadow-indigo-100">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">Scholar Particulars</p>
                  <p className="text-base font-bold text-slate-900 uppercase tracking-tight">{e.student_name}</p>
                  <p className="text-[10px] font-bold text-indigo-500 tracking-widest mt-1">{e.student_id}</p>
                </div>
                <span className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest border ${getBadgeColor(e.status)}`}>
                  {e.status}
                </span>
              </div>
              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                <div className="flex justify-between items-center">
                   <div className="flex flex-col gap-1">
                      <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Course Particulars</p>
                      <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">{e.subject_name}</p>
                   </div>
                   <div className="text-right flex flex-col gap-1">
                      <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Archived Date</p>
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{new Date(e.enrollment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                   </div>
                </div>
              </div>
            </div>
          ))}
          {enrollments.length === 0 && (
             <div className="card-standard py-20 text-center border-dashed opacity-40 bg-white">
                <Users className="mx-auto w-12 h-12 text-slate-200 mb-4" />
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">No admissions archived</p>
             </div>
          )}
        </div>
      </section>
    </div>
  )
}
