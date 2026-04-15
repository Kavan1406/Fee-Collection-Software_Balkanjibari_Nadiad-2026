'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Edit2, Trash2, Search, AlertCircle, CreditCard, Download, Loader2, User, BookOpen } from 'lucide-react'
import { studentsApi, subjectsApi, enrollmentsApi, paymentsApi, Student, CreateStudentData } from '@/lib/api'
import { API_BASE_URL, getMediaUrl } from '@/lib/api/client'
import { useNotifications } from '@/hooks/useNotifications'
import StudentProfileView from './StudentProfileView'
import { SkeletonTable } from '@/components/Skeleton'

const SUBJECT_BATCH_TIMINGS: Record<string, string[]> = {
  'Music': ['9:00 AM – 10:00 AM'],
  'Tabla': ['5:00 PM – 6:00 PM'],
  'Drum Class': ['6:00 PM – 7:00 PM'],
  'Keyboard (Casio)': ['6:00 PM – 7:00 PM'],
  'YouTube': ['9:00 AM – 10:00 AM'],
  'Spoken English': ['7:00 PM – 8:00 PM'],
  'Skating': ['Batch A: 7:00 AM – 8:00 AM', 'Batch B: 6:00 PM – 7:00 PM', 'Batch C: 7:00 PM – 8:00 PM', 'Batch D: 8:00 PM – 9:00 PM'],
  'Badminton': ['6:00 PM – 7:00 PM'],
  'Table Tennis': ['Batch A: 7:00 AM – 8:00 AM', 'Batch B: 6:00 PM – 7:00 PM'],
  'Karate': ['7:00 PM – 8:00 PM'],
  'Western Dance': ['10:00 AM – 11:00 AM'],
  'Yogasan': ['7:00 AM – 8:00 AM'],
  'Mehendi': ['Batch A: 5:00 PM – 6:00 PM', 'Batch B: 6:00 PM – 7:00 PM'],
  'Pencil Sketch': ['Batch A: 5:00 PM – 6:00 PM (Ages 7–12)', 'Batch B: 6:00 PM – 7:00 PM (Ages 7–16)'],
  'Calligraphy': ['10:00 AM – 11:00 AM'],
  'Guitar': ['8:00 AM – 9:00 AM'],
  'Bharat Natyam': ['11:00 AM – 12:00 PM'],
  'Abacus and Brain Development': ['11:00 AM – 12:00 PM'],
  'Vedic Maths': ['5:00 PM – 6:00 PM'],
  'Kathak Dance': ['5:00 PM – 6:00 PM'],
  'Zumba': ['6:00 PM – 7:00 PM'],
  'Karaoke': ['10:00 AM – 11:00 AM'],
  'Mind Power Mastery': ['8:00 AM – 9:00 AM'],
}

const normalizeBatchTime = (value: string) =>
  (value || '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const extractTimeRangeKey = (value: string) => {
  const normalized = normalizeBatchTime(value)
  const rangeMatch = normalized.match(/\d{1,2}:\d{2}\s*(?:am|pm)\s*-\s*\d{1,2}:\d{2}\s*(?:am|pm)/)
  return rangeMatch ? rangeMatch[0] : normalized
}

const getUniqueBatchTimings = (subject: any): string[] => {
  const fromSchedule = (subject?.timing_schedule || '')
    .split('|')
    .map((part: string) => part.trim())
    .filter(Boolean)
  const fromDefault = subject?.default_batch_timing ? [subject.default_batch_timing] : []
  const fromBackend = [...fromSchedule, ...fromDefault]
  const fallback = SUBJECT_BATCH_TIMINGS[subject?.name || ''] || []
  const merged = fromBackend.length > 0 ? fromBackend : fallback

  const bestByRange = new Map<string, string>()
  for (const item of merged) {
    const text = (item || '').trim()
    if (!text) continue

    const rangeKey = extractTimeRangeKey(text)
    const current = bestByRange.get(rangeKey)

    // Prefer labeled variants like "Batch A: ..." over plain timing duplicates.
    const isLabeled = /batch\s*[a-z0-9]+\s*:/i.test(text)
    const currentIsLabeled = current ? /batch\s*[a-z0-9]+\s*:/i.test(current) : false

    if (!current || (isLabeled && !currentIsLabeled)) {
      bestByRange.set(rangeKey, text)
    }
  }

  return Array.from(bestByRange.values())
}

interface StudentsPageProps {
  userRole: 'admin' | 'staff' | 'student' | 'accountant'
  canEdit?: boolean
}

export default function StudentsPage({ userRole, canEdit }: StudentsPageProps) {
  const { notifySuccess, notifyError, notifyInfo } = useNotifications()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [viewingStudentId, setViewingStudentId] = useState<number | null>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [areaFilter, setAreaFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const formatDateForUI = (val: string) => {
    if (!val) return ''
    const [y, m, d] = val.split('-')
    if (y && m && d) return `${d}-${m}-${y}`
    return val
  }

  const formatDateForAPI = (val: string) => {
    if (!val) return ''
    const parts = val.split('-')
    if (parts.length === 3) {
      const [d, m, y] = parts
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    return val
  }

  const handleDateInput = (field: 'date_of_birth' | 'enrollment_date', value: string) => {
    let digits = value.replace(/\D/g, '')
    let formatted = ''
    if (digits.length > 0) {
      formatted += digits.substring(0, 2)
      if (digits.length > 2) {
        formatted += '-' + digits.substring(2, 4)
        if (digits.length > 4) {
          formatted += '-' + digits.substring(4, 8)
        }
      }
    }
    
    setFormData((prev: any) => {
        const newData = { ...prev, [field]: formatted }
        
        // Auto-calculate age if field is date_of_birth
        if (field === 'date_of_birth' && formatted.length === 10) {
          const [d, m, y] = formatted.split('-').map(Number)
          if (d && m && y && y > 1900) {
            const dob = new Date(y, m - 1, d)
            const refDate = new Date(2026, 4, 1) // Reference May 1, 2026
            let age = refDate.getFullYear() - dob.getFullYear()
            const m_diff = refDate.getMonth() - dob.getMonth()
            if (m_diff < 0 || (m_diff === 0 && refDate.getDate() < dob.getDate())) {
              age--
            }
            newData.age = age
          }
        }
        return newData
    })
  }

  // Form state
  const [formData, setFormData] = useState<any>({
    name: '',
    date_of_birth: '',
    age: '',
    gender: 'MALE' as 'MALE' | 'FEMALE' | 'OTHER',
    address: '',
    city: '',
    pincode: '',
    email: '',
    enrollment_date: (() => {
      const today = new Date()
      const d = String(today.getDate()).padStart(2, '0')
      const m = String(today.getMonth() + 1).padStart(2, '0')
      const y = today.getFullYear()
      return `${d}-${m}-${y}`
    })(),
    enrollments: [{ subject_id: '', batch_time: '', include_library_fee: true }],
    photo: null as File | null,
    payment_method: 'CASH'
  })
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([])
  const [formLoading, setFormLoading] = useState(false)
  const [countryCode, setCountryCode] = useState('+91')

  const canAdd = userRole === 'admin' || userRole === 'staff' || userRole === 'accountant'
  const canUpdate = userRole === 'admin' || userRole === 'staff' || userRole === 'accountant'
  const canDelete = userRole === 'admin'

  // Fetch subjects for enrollment
  const fetchSubjects = async () => {
    try {
      const response = await subjectsApi.getAll()
      // @ts-ignore
      setAvailableSubjects(response.data || response)
    } catch (err) {
      console.error('Failed to fetch subjects:', err)
    }
  }

  useEffect(() => {
    fetchSubjects()
  }, [])

  // Scroll to form when it becomes visible
  useEffect(() => {
    if (showForm && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [showForm])

  // Fetch students
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const response = await studentsApi.getAll({
        page: currentPage,
        page_size: 20,
        search: searchTerm || undefined,
        area: areaFilter || undefined,
        status: statusFilter || undefined,
      }) as any

      // Handle both paginated and non-paginated responses
      if (response.results) {
        setStudents(response.results)
        setTotalPages(response.total_pages || 1)
        setTotalCount(response.count || response.results.length)
      } else if (Array.isArray(response)) {
        setStudents(response)
        setTotalPages(1)
        setTotalCount(response.length)
      } else if (response.data && Array.isArray(response.data)) {
        setStudents(response.data)
        setTotalPages(1)
        setTotalCount(response.data.length)
      } else {
        setStudents([])
        setTotalPages(1)
        setTotalCount(0)
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch students')
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchTerm, areaFilter, statusFilter])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  const [lastCreatedId, setLastCreatedId] = useState<number | null>(null)
  const [lastEnrollmentIds, setLastEnrollmentIds] = useState<number[]>([])
  const [lastPaymentMethod, setLastPaymentMethod] = useState<'CASH' | 'ONLINE' | null>(null)
  const [submittedCredentials, setSubmittedCredentials] = useState<{studentId: string, username: string, password: string} | null>(null)

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.phone.length !== 10) {
      notifyError('Phone number must be exactly 10 digits')
      return
    }
    if (formData.age < 4 || formData.age > 17) {
      notifyError('Student age must be between 4 and 17 years')
      return
    }

    // Validate age based on Date of Birth
    if (formData.date_of_birth) {
      const [d, m, y] = formData.date_of_birth.split('-').map(Number)
      if (d && m && y) {
        const dob = new Date(y, m - 1, d)
        const today = new Date()
        let calculatedAge = today.getFullYear() - dob.getFullYear()
        const monthDiff = today.getMonth() - dob.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          calculatedAge--
        }

        if (calculatedAge < 4 || calculatedAge > 17) {
          notifyError(`Based on the Date of Birth, the student's age is ${calculatedAge}. It must be between 4 and 17 years.`)
          return
        }
      }
    }
    if (formData.enrollments.length === 0 && !editingStudent) {
      notifyError('Please enroll in at least one subject')
      return
    }
    if (formData.enrollments.length > 4) {
      notifyError('Maximum 4 subjects allowed')
      return
    }

    setFormLoading(true)
    setError('')

    try {
      // Clean up formData: replace empty strings with null for optional fields
      // and filter ONLY the fields the backend expects for registration
      const allowedFields = [
        'name', 'age', 'gender', 'date_of_birth', 'phone',
        'email', 'address', 'city', 'pincode', 'enrollment_date', 'enrollments', 'photo', 'payment_method', 'status'
      ];

      const submissionData: any = {};
      allowedFields.forEach(field => {
        let value = formData[field];

        // Specific handling for dates: convert to YYYY-MM-DD
        if (field === 'date_of_birth' || field === 'enrollment_date') {
          value = formatDateForAPI(value);
        }

        // Sanitization
        if (value === '' || value === undefined) {
          value = null;
        }

        // Specific handling for photo: must be a File or null
        if (field === 'photo' && value !== null && !(value instanceof File)) {
          value = null;
        }

        // Age conversion
        if (field === 'age' && typeof value === 'string') {
          value = parseInt(value, 10) || null;
        }

        submissionData[field] = value;
      });

      let result;
      if (editingStudent) {
        result = await studentsApi.update(editingStudent.id, submissionData)
        notifySuccess('Student updated successfully')
        setShowForm(false)
        setEditingStudent(null)
        resetForm()
      } else {
        console.log('DEBUG: Submitting student data:', submissionData);
        result = await studentsApi.registerOffline(submissionData)
        console.log('DEBUG: Save result:', result);
        notifySuccess('Registration Successful')
        // Store for receipt/id card printing
        if (result.data) {
          const studentId = result.data.id;
          const enrollmentIds = (result.data.enrollments || []).map((e: any) => e.id);

          setLastCreatedId(studentId);
          setLastEnrollmentIds(enrollmentIds);

          const paymentMethod = submissionData.payment_method || 'CASH';
          setLastPaymentMethod(paymentMethod as any);

          if (paymentMethod === 'CASH') {
            // After successful creation, set credentials for the display
            const createdStudent: any = result.data
            setSubmittedCredentials({
              studentId: createdStudent.student_id,
              username: createdStudent.login_username,
              password: createdStudent.login_password_hint
            });
            notifySuccess('Registration Successful. Fees are pending in cash mode.');
          } else {
            // For ONLINE payments, just notify user
            notifyInfo('Student created. Receipt and ID card will be available after payment confirmation.');
            setShowForm(false);
            resetForm();
          }
        }
      }
      fetchStudents()
    } catch (err: any) {
      console.error('FULL ERROR OBJECT:', err);
      console.error('Response Status:', err.response?.status);
      console.error('Response Data:', err.response?.data);
      console.error('Response Headers:', err.response?.headers);

      const fieldErrors = err.response?.data;
      let errorMsg = '';

      if (typeof fieldErrors === 'string' && fieldErrors.includes('<!DOCTYPE html>')) {
        errorMsg = 'Server Error (500). Please check backend logs.';
      } else if (fieldErrors?.error?.message) {
        errorMsg = fieldErrors.error.message;
      } else if (typeof fieldErrors === 'object' && Object.keys(fieldErrors).length > 0) {
        const firstError = Object.entries(fieldErrors)[0];
        errorMsg = `${firstError[0]}: ${JSON.stringify(firstError[1])}`;
      } else {
        errorMsg = err.message || 'Failed to save student (Unknown Error)';
      }

      notifyError(errorMsg);
    } finally {
      setFormLoading(false)
    }
  }

  const handleDownloadICard = async (enrollmentId: number, studentName: string, subjectName: string) => {
    try {
      notifyInfo(`Generating ID Card for ${studentName} (${subjectName})...`)
      await enrollmentsApi.downloadIdCard(enrollmentId)
      notifySuccess('ID Card downloaded successfully')
    } catch (err: any) {
      console.error('Failed to download ID card:', err)
      notifyError(err.response?.data?.error?.message || 'Failed to download ID card')
    }
  }

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this student?')) return

    try {
      await studentsApi.delete(id)
      fetchStudents()
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete student')
    }
  }

  // Handle edit
  const handleEdit = (student: Student) => {
    setEditingStudent(student)
    setFormData({
      name: student.name,
      age: student.age || '',
      gender: student.gender || 'MALE',
      date_of_birth: formatDateForUI(student.date_of_birth || ''),
      phone: student.phone || '',
      address: student.address,
      city: (student as any).city || '',
      pincode: (student as any).pincode || '',
      email: student.email || '',
      status: student.status || 'ACTIVE',
      enrollment_date: formatDateForUI(student.enrollment_date),
      enrollments: student.enrollments ? student.enrollments.map(e => ({
        subject_id: e.subject_id.toString(),
        batch_time: e.batch_time,
        include_library_fee: e.include_library_fee
      })) : [],
      photo: null
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      date_of_birth: '',
      phone: '',
      address: '',
      city: '',
      pincode: '',
      email: '',
      status: 'ACTIVE',
      enrollment_date: (() => {
        const today = new Date()
        const d = String(today.getDate()).padStart(2, '0')
        const m = String(today.getMonth() + 1).padStart(2, '0')
        const y = today.getFullYear()
        return `${d}-${m}-${y}`
      })(),
      enrollments: [{ subject_id: '', batch_time: '', include_library_fee: true }],
      photo: null,
      payment_method: 'CASH'
    })
    setEditingStudent(null)
    setLastCreatedId(null)
    setLastEnrollmentIds([])
    setLastPaymentMethod(null)
  }

  const handlePrintReceipt = async () => {
    if (!lastCreatedId) {
      notifyError('No student recently created');
      return;
    }
    try {
      const response = await paymentsApi.getAll({ student_id: lastCreatedId });
      if (response.results && response.results.length > 0) {
        for (const payment of response.results) {
          // Use the standardized authenticated download method
          await paymentsApi.downloadReceipt(payment.id);
        }
        notifySuccess('Receipts downloaded');
      } else {
        notifyError('No payments found for this student');
      }
    } catch (err) {
      console.error('Receipt download error:', err);
      notifyError('Failed to download receipts');
    }
  };

  const handlePrintICard = async () => {
    if (!lastEnrollmentIds || lastEnrollmentIds.length === 0) {
      notifyError('No enrollments found');
      return;
    }
    try {
      for (const enrId of lastEnrollmentIds) {
        // Use the standardized authenticated download method from enrollmentsApi
        await enrollmentsApi.downloadIdCard(enrId);
      }
      notifySuccess('ID Cards downloaded');
    } catch (err) {
      console.error('ID Card download error:', err);
      notifyError('Failed to download ID Cards');
    }
  };

  const handleEnrollmentChange = (index: number, field: string, value: any) => {
    const newEnrollments = [...formData.enrollments]
    
    if (field === 'subject_id') {
      const sub = availableSubjects.find(s => s.id === value)
      if (sub) {
        // Auto-select first available batch time
        const timings = getUniqueBatchTimings(sub)
        newEnrollments[index] = { 
          ...newEnrollments[index], 
          [field]: value,
          batch_time: timings.length > 0 ? timings[0] : (sub.default_batch_timing || '')
        }
      } else {
        newEnrollments[index] = { ...newEnrollments[index], [field]: value }
      }
    } else {
      newEnrollments[index] = { ...newEnrollments[index], [field]: value }
    }
    
    setFormData({ ...formData, enrollments: newEnrollments })
  }

  const addEnrollmentField = () => {
    if (formData.enrollments.length >= 4) {
      notifyError('Maximum 4 subjects allowed')
      return
    }
    // Library fee is disabled by default for subsequent subjects (smart logic)
    setFormData({
      ...formData,
      enrollments: [...formData.enrollments, { subject_id: '', batch_time: '7-8 AM', include_library_fee: false }]
    })
  }

  const removeEnrollmentField = (index: number) => {
    const newEnrollments = formData.enrollments.filter((_: any, i: number) => i !== index)
    setFormData({ ...formData, enrollments: newEnrollments })
  }

  const getEnrollmentFeeBreakdown = (enr: any) => {
    const subject = availableSubjects.find((s: any) => s.id === enr.subject_id)
    const subjectFee = parseFloat(subject?.current_fee?.amount || '0')
    const libraryFee = enr.include_library_fee ? 10 : 0
    return {
      subjectFee,
      libraryFee,
      totalFee: subjectFee + libraryFee,
    }
  }

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase()
    if (s.includes('paid') || s.includes('full') || s.includes('active')) {
      return 'bg-emerald-50 text-emerald-600'
    } else if (s.includes('partial')) {
      return 'bg-blue-50 text-blue-600'
    } else if (s.includes('pending') || s.includes('inactive')) {
      return 'bg-rose-50 text-rose-600'
    } else {
      return 'bg-slate-50 text-slate-600'
    }
  }

  if (viewingStudentId) {
    return (
      <StudentProfileView 
        studentId={viewingStudentId} 
        onBack={() => setViewingStudentId(null)} 
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="h1 uppercase tracking-tight">Students Management</h1>
          <p className="text-slate-500 text-[10px] sm:text-sm mt-1 font-medium font-inter uppercase tracking-widest leading-none">Browse and manage all registered student records</p>
        </div>
        {canAdd && (
          <button
            onClick={() => {
              setEditingStudent(null)
              resetForm()
              setShowForm(true)
            }}
            className="w-full sm:w-auto h-11 px-6 rounded-xl font-poppins font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-xs uppercase tracking-widest bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"
          >
            <Plus size={18} />
            <span>Add New Student Registration</span>
          </button>
        )}
      </div>

      {/* Success Credentials Box */}
      {submittedCredentials && (
        <div className="bg-emerald-50 dark:bg-emerald-900/10 border-2 border-emerald-500 rounded-3xl p-8 shadow-xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16" />
           <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                 <Plus className="rotate-45" size={32} />
              </div>
              <div className="flex-1 text-center md:text-left">
                 <h2 className="text-xl font-black text-slate-900 dark:text-white font-poppins mb-1 uppercase tracking-tight">Registration Successful</h2>
                 <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Student account <b>{submittedCredentials.studentId}</b> created. Fees are currently pending in cash mode.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-auto">
                 <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Username</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white font-poppins">{submittedCredentials.username}</p>
                 </div>
                 <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Password</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white font-poppins font-mono tracking-wider">{submittedCredentials.password}</p>
                 </div>
              </div>
              <button 
                onClick={() => {
                  setSubmittedCredentials(null);
                  setShowForm(false);
                  resetForm();
                }}
                className="px-6 h-12 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform active:scale-95"
              >
                Done
              </button>
           </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="text-red-600" size={20} />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Search and Filters */}
      <div className="card-standard p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Search size={18} />
            </span>
            <input
              type="text"
              placeholder="Search by student name or ID..."
              className="w-full pl-12 h-11 input-standard text-sm font-medium font-inter"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:w-auto">
            <select
              className="h-11 input-standard text-[11px] sm:text-sm font-medium uppercase tracking-wider font-inter"
              value={areaFilter}
              onChange={(e) => {
                setAreaFilter(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">All Localities</option>
            </select>
            <select
              className="h-11 input-standard text-[11px] sm:text-sm font-medium uppercase tracking-wider font-inter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">All Status</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Add/Edit Student Form */}
      {showForm && (
        <div ref={formRef} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[24px] p-6 shadow-xl scroll-mt-20">
          <h2 className="h2 mb-6">
            {editingStudent ? 'Edit Student Record' : 'New Student Registration'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="space-y-8">
              {/* ---- Personal Information ---- */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <User size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Personal Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase px-1">Full Name *</label>
                    <input
                      type="text"
                      placeholder="Enter student's full name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full input-standard"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase px-1">Enrollment Date *</label>
                    <input
                      type="text"
                      placeholder="DD-MM-YYYY"
                      value={formData.enrollment_date}
                      onChange={(e) => handleDateInput('enrollment_date', e.target.value)}
                      required
                      className="w-full input-standard"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase px-1">Date of Birth *</label>
                    <input
                      type="text"
                      placeholder="DD-MM-YYYY"
                      value={formData.date_of_birth}
                      onChange={(e) => handleDateInput('date_of_birth', e.target.value)}
                      required
                      className="w-full input-standard"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase px-1">Age (4 - 17) <span className="text-blue-500 lowercase font-normal italic">(Auto)</span></label>
                    <input
                      type="text"
                      readOnly
                      placeholder="Age"
                      value={formData.age ? `${formData.age} Years` : 'Enter DOB'}
                      className="w-full input-standard bg-gray-50/80 dark:bg-gray-800/50 font-bold text-blue-600 dark:text-blue-400 cursor-not-allowed"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase px-1">Gender *</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      required
                      className="w-full input-standard"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  {editingStudent && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase px-1">Student Status *</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        required
                        className="w-full input-standard text-indigo-600 font-bold"
                      >
                        <option value="ACTIVE">Active (Studying)</option>
                        <option value="INACTIVE">Inactive (Left)</option>
                        <option value="GRADUATED">Graduated</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* ---- Contact Details ---- */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <AlertCircle size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Contact Details</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase px-1">Contact Number (10 Digits) *</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600">
                        +91
                      </span>
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        maxLength={10}
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                        required
                        className="flex-1 input-standard rounded-l-none"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase px-1">Email Address <span className="text-gray-400">(Optional)</span></label>
                    {/* Email is optional. If provided, it can be used for multiple student registrations. */}
                    <input
                      type="email"
                      placeholder="student@example.com (optional - can be shared across registrations)"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full input-standard"
                    />
                  </div>
                  <div className="md:col-span-2 flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase px-1">Full Address *</label>
                    <textarea
                      placeholder="Enter house no, street, area details..."
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      required
                      rows={2}
                      className="w-full input-standard resize-none py-3"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase px-1">City / Village *</label>
                    <input
                      type="text"
                      placeholder="e.g. Nadiad"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                      className="w-full input-standard"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase px-1">Pincode *</label>
                    <input
                      type="text"
                      placeholder="6-digit pincode"
                      maxLength={6}
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '') })}
                      required
                      className="w-full input-standard"
                    />
                  </div>
                </div>
              </div>

              {/* Photos & Document Section */}
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-500 uppercase px-1">Student Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({ ...formData, photo: e.target.files?.[0] || null })}
                    className="w-full input-standard border-dashed bg-gray-50/30"
                  />
                </div>
              </div>

              {/* ---- Subject Enrollment Section ---- */}
              <div className="space-y-6 pt-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <BookOpen size={18} />
                    </div>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Subject Enrollment</h3>
                  </div>
                  <button
                    type="button"
                    onClick={addEnrollmentField}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 transition-all uppercase tracking-widest"
                  >
                    <Plus size={14} /> Add Subject
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.enrollments.map((enr: any, index: number) => (
                    <div key={index} className="relative p-6 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4 group">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-indigo-300 dark:text-indigo-700 uppercase tracking-[3px]">Enrollment #{index + 1}</span>
                        {formData.enrollments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEnrollmentField(index)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Subject</label>
                          <select
                            className="w-full input-standard bg-white dark:bg-gray-900"
                            value={enr.subject_id}
                            onChange={(e) => handleEnrollmentChange(index, 'subject_id', parseInt(e.target.value))}
                            required
                          >
                            <option value="">Select Subject</option>
                            {availableSubjects.map(sub => (
                              <option key={sub.id} value={sub.id}>
                                {sub.name} (₹{parseFloat(sub.current_fee?.amount || '0')})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Batch Time</label>
                          <select
                            className="w-full input-standard bg-white dark:bg-gray-900"
                            value={enr.batch_time}
                            onChange={(e) => handleEnrollmentChange(index, 'batch_time', e.target.value)}
                            required
                          >
                            <option value="">Select Time</option>
                            {(() => {
                                const sub = availableSubjects.find(s => s.id === enr.subject_id)
                                const timings = sub ? getUniqueBatchTimings(sub) : []
                                return timings.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))
                            })()}
                          </select>
                        </div>
                      </div>

                      {enr.subject_id && (() => {
                        const fees = getEnrollmentFeeBreakdown(enr)
                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subject Fees</p>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">Rs. {fees.subjectFee.toLocaleString()}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Library Fee</p>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">Rs. {fees.libraryFee.toLocaleString()}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Total Fees</p>
                              <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Rs. {fees.totalFee.toLocaleString()}</p>
                            </div>
                          </div>
                        )
                      })()}
                      
                      <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                             <BookOpen size={14} />
                           </div>
                           <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Include Library Fee (₹10)</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={enr.include_library_fee || false}
                          onChange={(e) => handleEnrollmentChange(index, 'include_library_fee', e.target.checked)}
                          className="w-5 h-5 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  ))}

                  {/* Summary Box */}
                  <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <div className="relative flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div className="text-center sm:text-left">
                        <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest mb-1">Final Summary</p>
                        <h4 className="text-xl font-bold">Total Admission Fee</h4>
                      </div>
                      <div className="flex flex-col items-center sm:items-end">
                        <span className="text-3xl font-black">
                          ₹{(() => {
                            const totalSubjectFees = formData.enrollments.reduce((acc: number, enr: any) => {
                              const sub = availableSubjects.find(s => s.id === enr.subject_id);
                              return acc + (sub?.current_fee?.amount ? parseFloat(sub.current_fee.amount) : 0);
                            }, 0);
                            const libraryFee = formData.enrollments.filter((e: any) => e.include_library_fee).length * 10;
                            return totalSubjectFees + libraryFee;
                          })()}
                        </span>
                        <span className="text-[11px] font-medium text-white/70 italic">
                          (Includes subjects + library fees)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              <button
                type="submit"
                disabled={formLoading}
                className="btn-standard btn-font flex-1 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20 uppercase tracking-widest text-xs"
              >
                {formLoading ? 'Saving...' : editingStudent ? 'Update Student' : 'Proceed Payment by Cash'}
              </button>

              {lastCreatedId && (
                <>
                  <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-lg text-sm font-medium border border-blue-100 dark:border-blue-800">
                    Registration saved with CASH (Pending). Use Request Acceptance to confirm cash and generate receipt + ID card.
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                className="btn-standard btn-font bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-8 uppercase tracking-widest text-xs"
              >
                {lastCreatedId ? 'Close' : 'Cancel'}
              </button>
            </div>
          </form>
        </div >
      )}

      {/* Students List Container */}
      <div className="space-y-4">
        {/* Page Info Header */}
        {!loading && students.length > 0 && totalPages > 1 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-widest">
              👥 Page {currentPage} of {totalPages} • Showing {((currentPage - 1) * 20) + 1}-{Math.min(currentPage * 20, totalCount)} of {totalCount} students
            </p>
          </div>
        )}
        
        {loading ? (
          <SkeletonTable rows={8} />
        ) : students.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="text-gray-300" size={32} />
            </div>
            <p className="text-gray-500 font-bold">No students found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or search term</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (Hidden below LG) */}
            <div className="hidden lg:block bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-slate-700 rounded-[24px] shadow-xl overflow-hidden">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 font-inter font-medium">
                      <th className="px-6 py-4 text-left text-[11px] text-slate-400 uppercase tracking-widest font-poppins">Student</th>
                      <th className="px-6 py-4 text-left text-[11px] text-slate-400 uppercase tracking-widest font-poppins">Area</th>
                      <th className="px-6 py-4 text-right text-[11px] text-slate-400 uppercase tracking-widest font-poppins">Fee Info</th>
                      <th className="px-6 py-4 text-left text-[11px] text-slate-400 uppercase tracking-widest pl-12 font-poppins">Status</th>
                      <th className="px-6 py-4 text-right text-[11px] text-slate-400 uppercase tracking-widest font-poppins">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 table-font font-inter font-medium leading-relaxed">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap font-inter">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold text-xl shadow-sm group border border-sky-100/50">
                              {(() => {
                                const isLogo = student.photo && (student.photo.includes('logo.jpeg') || student.photo.includes('avatar'));
                                const photoUrl = !isLogo ? getMediaUrl(student.photo) : null;
                                return (
                                  <div className="w-full h-full relative flex items-center justify-center">
                                    <span className="opacity-80 translate-y-[1px]">{student.name?.[0]?.toUpperCase() || 'S'}</span>
                                    {photoUrl && (
                                      <img
                                        src={photoUrl}
                                        alt={student.name}
                                        className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-110"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                          console.warn(`[StudentsPage] Failed to load: ${photoUrl}`);
                                        }}
                                      />
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                            <div>
                              <p className="text-[15px] font-semibold text-gray-900 dark:text-white leading-tight font-inter">{student.name}</p>
                              <p className="text-[12px] font-medium text-indigo-500 uppercase tracking-widest mt-0.5 font-inter">{student.student_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-inter">
                          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{student.area}</p>
                        </td>
                        <td className="px-6 py-4 font-inter text-right">
                          <div className="flex flex-col items-end">
                            <p className="text-[13px] font-semibold text-gray-900 dark:text-white font-inter">₹{parseFloat(student.total_fees?.toString() || '0').toLocaleString()}</p>
                            <p className="text-[12px] font-medium text-red-500 uppercase font-inter">Pending: ₹{parseFloat(student.total_pending?.toString() || '0').toLocaleString()}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-inter">
                          <span className={`px-3 py-1 rounded-full text-[12px] font-semibold uppercase tracking-wider shadow-sm font-inter ${getStatusColor(student.payment_status)}`}>
                            {student.payment_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            {canUpdate && (
                              <button onClick={() => handleEdit(student)} className="w-10 h-10 flex items-center justify-center hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl transition-all active:scale-90" title="Edit">
                                <Edit2 size={18} />
                              </button>
                            )}
                            {canDelete && (
                              <button onClick={() => handleDelete(student.id)} className="w-10 h-10 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl transition-all active:scale-90" title="Delete">
                                <Trash2 size={18} />
                              </button>
                            )}
                            <button 
                              onClick={() => setViewingStudentId(student.id)}
                              className="w-10 h-10 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl transition-all active:scale-90" 
                              title="View Profile"
                            >
                              <User size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile/Tablet Card View (Visible below LG) */}
            <div className="lg:hidden grid grid-cols-1 gap-4 px-1 sm:px-0">
              {students.map((student) => (
                <div key={student.id} className="bg-white dark:bg-slate-900 rounded-[28px] p-6 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/10 group transition-all">
                  <div className="flex gap-5 mb-5">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[20px] overflow-hidden bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center border border-sky-100/50 shadow-sm flex-shrink-0 text-sky-600 dark:text-sky-400 font-bold text-2xl group-hover:scale-105 transition-transform">
                      {(() => {
                        const isLogo = student.photo && (student.photo.includes('logo.jpeg') || student.photo.includes('avatar'));
                        const photoUrl = !isLogo ? getMediaUrl(student.photo) : null;
                        
                        return (
                          <div className="w-full h-full relative flex items-center justify-center">
                            <span className="opacity-80 translate-y-[1px]">{student.name?.[0]?.toUpperCase() || 'S'}</span>
                            {photoUrl && (
                              <img
                                src={photoUrl}
                                alt={student.name}
                                className="absolute inset-0 w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                      <p className="font-bold text-lg sm:text-xl text-slate-900 dark:text-white truncate tracking-tight font-poppins uppercase">{student.name}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] sm:text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-0.5 rounded-lg border border-indigo-100/50">
                          ID: {student.student_id}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-widest shadow-sm ${getStatusColor(student.payment_status)}`}>
                          {student.payment_status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl mb-4 border border-slate-100 dark:border-slate-700">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fee Balance</p>
                      <p className="text-base font-bold text-rose-600">₹{parseFloat(student.total_pending?.toString() || '0').toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Locality</p>
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate uppercase tracking-tight">{student.area || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                       <button
                        onClick={() => handleEdit(student)}
                        className="flex-1 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 h-12 rounded-xl font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 active:scale-95 transition-all"
                      >
                        <Edit2 size={16} /> Edit
                      </button>
                      {canDelete && (
                         <button
                          onClick={() => handleDelete(student.id)}
                          className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center border border-rose-100 dark:border-rose-900/50 active:scale-95 transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => setViewingStudentId(student.id)}
                      className="w-full bg-slate-900 dark:bg-indigo-600 text-white h-12 sm:h-14 rounded-xl font-bold text-[11px] sm:text-[12px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] transition-all"
                    >
                      <User size={18} /> View Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                    Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalCount)} of {totalCount} students
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
          </>
        )}
      </div>
    </div>
  )
}
