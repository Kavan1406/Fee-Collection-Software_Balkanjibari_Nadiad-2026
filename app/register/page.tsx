'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, AlertCircle, Plus, Trash2, Loader2, Lock, Download, BookOpen, CreditCard, ShieldCheck as LucideShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

import { API_BASE_URL } from '@/lib/api/client'

const API_BASE = API_BASE_URL

interface Subject {
  id: number
  name: string
  activity_type: 'SUMMER_CAMP' | 'YEAR_ROUND'
  timing_schedule?: string
  default_batch_timing?: string
  monthly_fee?: string | null
  current_fee?: { amount: string; duration: string } | null
  max_seats: number
  enrolled_count: number
  age_limit?: string
}

interface SelectedSubject {
  subject_id: number
  subject_name: string
  batch_time: string
  include_library_fee: boolean
}

interface EnrolledSubject {
  subject: string
  batch_time: string
  fee: number
  enrollment_id: string
}

interface SuccessData {
  student_id: string
  username: string
  password: string
  enrolled_subjects: EnrolledSubject[]
  total_paid: number
  receipt_token: string
}

const LIBRARY_FEE = 10

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

const getUniqueBatchTimings = (subject: Subject | undefined): string[] => {
  const fromSchedule = (subject?.timing_schedule || '')
    .split('|')
    .map((part) => part.trim())
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

    const isLabeled = /batch\s*[a-z0-9]+\s*:/i.test(text)
    const currentIsLabeled = current ? /batch\s*[a-z0-9]+\s*:/i.test(current) : false

    if (!current || (isLabeled && !currentIsLabeled)) {
      bestByRange.set(rangeKey, text)
    }
  }

  return Array.from(bestByRange.values())
}

// Load Razorpay script dynamically
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function RegisterPage() {
  const router = useRouter()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isMounted, setIsMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isPaymentLoading, setIsPaymentLoading] = useState(false)
  const [selectedSubjects, setSelectedSubjects] = useState<SelectedSubject[]>([
    { subject_id: 0, subject_name: '', batch_time: '', include_library_fee: true }
  ])
  const [successData, setSuccessData] = useState<SuccessData | null>(null)
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false)

  const [todayDisplay, setTodayDisplay] = useState('')
  const [currentIST, setCurrentIST] = useState('')

  useEffect(() => {
    setIsMounted(true)
    
    // Attempt to load from cache
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('balkanji_subjects_cache')
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed)) setSubjects(parsed)
        } catch (e) {
          console.error('[Cache] Load failed:', e)
        }
      }
    }

    const t = new Date()
    setTodayDisplay(`${String(t.getDate()).padStart(2, '0')}-${String(t.getMonth() + 1).padStart(2, '0')}-${t.getFullYear()}`)
    
    // Set periodic update for time
    const updateTime = () => {
      setCurrentIST(new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const [form, setForm] = useState({
    name: '',
    date_of_birth: '',
    age: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    pincode: '',
  })

  // Load form from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('registration_form_draft')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setForm(prev => ({ ...prev, ...parsed }))
        } catch (e) {
          console.error('[Form] Failed to load draft:', e)
        }
      }
    }
  }, [])

  // Save form to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && form.name) {
      localStorage.setItem('registration_form_draft', JSON.stringify(form))
    }
  }, [form])

  const [isSubjectsLoading, setIsSubjectsLoading] = useState(true)
  const normalizedEmail = form.email.trim()

  const fetchSubjects = useCallback(async () => {
    try {
      setIsSubjectsLoading(true)
      const fetchUrl = `${API_BASE_URL}/api/v1/subjects/`
      
      if (typeof window !== 'undefined') {
        console.log(`[DEBUG] Fetching subjects from: ${fetchUrl}`)
      }
      const response = await fetch(fetchUrl)
      if (!response.ok) {
        console.error(`[ERROR] Fetch failed with status: ${response.status}`)
        throw new Error('Failed to fetch subjects')
      }
      const result = await response.json()
      console.log(`[DEBUG] Subjects result:`, result)
      
      // Handle various response structures (prioritize result.data for this backend)
      const list = result.data || result.results || (Array.isArray(result) ? result : [])
      const sortedList = [...list].sort((a, b) => a.name.localeCompare(b.name))
      
      setSubjects(sortedList)
      
      // Update cache permanently for this session
      if (sortedList.length > 0) {
        sessionStorage.setItem('balkanji_subjects_cache', JSON.stringify(sortedList))
      }
    } catch (error) {
      console.error('Error fetching subjects:', error)
      // Auto-retry once after 3 seconds (Cold start protection)
      setTimeout(() => fetchSubjects(), 3000)
    } finally {
      setIsSubjectsLoading(false)
    }
  }, [API_BASE])

  useEffect(() => {
    fetchSubjects()
  }, [fetchSubjects])

  // Auto-calculate age from DOB
  const handleDobChange = (value: string) => {
    // Mask input to DD-MM-YYYY
    let digits = value.replace(/\D/g, '')
    let formatted = ''
    if (digits.length > 0) {
      let day = digits.substring(0, 2)
      if (day.length === 2 && parseInt(day) > 31) day = '31'
      if (day.length === 2 && parseInt(day) === 0) day = '01'
      formatted += day
      if (digits.length > 2) {
        let month = digits.substring(2, 4)
        if (month.length === 2 && parseInt(month) > 12) month = '12'
        if (month.length === 2 && parseInt(month) === 0) month = '01'
        formatted += '-' + month
        if (digits.length > 4) {
          formatted += '-' + digits.substring(4, 8)
        }
      }
    }

    let calculatedAge = ''
    if (formatted.length === 10) {
      const [d, m, y] = formatted.split('-').map(Number)
      if (d && m && y && y > 1900) {
        const dob = new Date(y, m - 1, d)
        // reference date: May 1, 2026 (Summer Camp start)
        const refDate = new Date(2026, 4, 1) 
        let age = refDate.getFullYear() - dob.getFullYear()
        const m_diff = refDate.getMonth() - dob.getMonth()
        if (m_diff < 0 || (m_diff === 0 && refDate.getDate() < dob.getDate())) {
          age--
        }
        calculatedAge = String(age)
      }
    }

    setForm(prev => ({ ...prev, date_of_birth: formatted, age: calculatedAge }))
  }

  // Subject fee helper
  const getSubjectFee = (subjectId: number): number => {
    const s = subjects.find(x => x.id === subjectId)
    if (!s) return 0
    if (s.current_fee) return parseFloat(s.current_fee.amount)
    if (s.monthly_fee) return parseFloat(s.monthly_fee)
    return 0
  }

  // Helper to parse age limit (e.g. "10 to 16", "4 to 16")
  const checkAgeEligibility = (studentAge: string, limitStr?: string) => {
    if (!studentAge || !limitStr) return { eligible: true }
    
    const ageNum = parseInt(studentAge)
    if (isNaN(ageNum)) return { eligible: true }

    // Parse "XX to YY" or "XX-YY"
    const match = limitStr.match(/(\d+)\s*(?:to|-)\s*(\d+)/i)
    if (match) {
      const min = parseInt(match[1])
      const max = parseInt(match[2])
      if (ageNum < min || ageNum > max) {
        return { eligible: false, min, max }
      }
    }
    return { eligible: true }
  }

  // Fee calculation
  const feeBreakdown = selectedSubjects.map((sub, i) => {
    const subFee = getSubjectFee(sub.subject_id)
    const libFee = i === 0 ? LIBRARY_FEE : 0
    return { ...sub, subFee, libFee, total: subFee + libFee }
  })

  const grandTotal = feeBreakdown.reduce((acc, f) => acc + f.total, 0)

  // Subject management
  const addSubject = () => {
    if (selectedSubjects.length >= 4) { toast.error('Maximum 4 subjects allowed.'); return }
    setSelectedSubjects(prev => [
      ...prev,
      { subject_id: 0, subject_name: '', batch_time: '', include_library_fee: false }
    ])
  }

  const removeSubject = (idx: number) => {
    if (selectedSubjects.length === 1) return // First subject cannot be removed
    setSelectedSubjects(prev => prev.filter((_, i) => i !== idx))
  }

  const updateSubject = (idx: number, field: keyof SelectedSubject, value: any) => {
    setSelectedSubjects(prev => {
      const updated = [...prev]
      if (field === 'subject_id') {
        const val = parseInt(value as string)
        const subInfo = subjects.find(s => s.id === val)
        if (subInfo && subInfo.enrolled_count >= subInfo.max_seats) {
          toast.error(`Sorry, ${subInfo.name} batch is full! Please select another subject.`, {
            icon: <AlertCircle className="text-rose-500" />
          })
          return prev
        }
        updated[idx] = { ...updated[idx], subject_id: val, subject_name: subInfo?.name || '', batch_time: subInfo?.default_batch_timing || '' }
      } else if (field === 'batch_time') {
        const valClean = (value || '').trim().toLowerCase()
        const conflict = updated.some((row, i) => {
          if (i === idx || !row.subject_id) return false
          return (row.batch_time || '').trim().toLowerCase() === valClean
        })
        if (conflict) { 
          toast.error(`Time slot "${value}" is already occupied by another selected subject.`) 
          return prev 
        }
      }
      // No need for setError('') here anymore
      if (field === 'subject_id') {
        const sub = subjects.find(s => s.id === Number(value))
        if (sub && sub.enrolled_count >= sub.max_seats) {
          toast.error(`Sorry, "${sub.name}" has no available seats.`);
          return prev;
        }
        // Auto-select first available batch time for this subject
        const timings = getUniqueBatchTimings(sub)
        updated[idx] = { 
          ...updated[idx], 
          subject_id: Number(value), 
          subject_name: sub?.name || '',
          batch_time: timings.length > 0 ? timings[0] : ''
        }
      } else {
        updated[idx] = { ...updated[idx], [field]: value }
      }
      return updated
    })
  }


  // Validate form before payment
  // NOTE: Email is optional. If provided, it can be used for multiple student registrations.
  const validate = (): string => {
    if (!form.name.trim()) return 'Full name is required.'
    if (!form.date_of_birth || form.date_of_birth.length < 10) return 'Valid date of birth is required (DD-MM-YYYY).'
    const age = parseInt(form.age)
    if (isNaN(age) || age < 4 || age > 18) return 'Student age must be between 4 and 18 years for Summer Camp eligibility.'
    if (!form.gender) return 'Gender selection is required.'
    if (!form.phone.trim()) return 'Mobile number is required.'
    if (!/^\d{10}$/.test(form.phone)) return 'Please enter a valid 10-digit mobile number.'
    if (normalizedEmail && !/\S+@\S+\.\S+/.test(normalizedEmail)) return 'Please enter a valid email address format.'
    if (!form.address.trim()) return 'Full address is required.'
    if (!form.city.trim()) return 'City/Village name is required.'
    if (!/^\d{6}$/.test(form.pincode)) return 'Please enter a valid 6-digit pincode.'
    const validSubs = selectedSubjects.filter(s => s.subject_id > 0)
    if (validSubs.length === 0) return 'Please select at least one subject.'
    if (grandTotal <= 0) return 'Fee calculation error. Please reselect subjects.'
    return ''
  }

  // Handle online payment - Razorpay gateway
  const handlePayNow = async () => {
    const err = validate()
    if (err) { toast.error(err); return }
    setIsPaymentLoading(true)

    try {
      // Step 1: Register student and get Razorpay order
      const fd = new FormData()
      fd.append('name', form.name.trim())
      fd.append('date_of_birth', (() => {
        const [d, m, y] = form.date_of_birth.split('-')
        return `${y}-${m}-${d}`
      })())
      fd.append('age', form.age)
      fd.append('gender', form.gender)
      fd.append('phone', form.phone.trim())
      fd.append('email', normalizedEmail)
      fd.append('address', form.address.trim())
      fd.append('city', form.city.trim())
      fd.append('pincode', form.pincode)
      fd.append('enrollment_date', (() => {
        const t = new Date()
        return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
      })())
      const validSubs = selectedSubjects.filter(s => s.subject_id > 0)
      fd.append('subjects_data', JSON.stringify(validSubs))
      // Photo can be added from the student profile page after login

      const regRes = await fetch(`${API_BASE}/api/v1/students/register/`, {
        method: 'POST',
        body: fd,
      })
      const regData = await regRes.json()

      if (!regRes.ok || !regData.success) {
        toast.error(regData.error || 'Registration failed. Please try again.')
        setIsPaymentLoading(false)
        return
      }

      const {
        student_id, username, order_id, amount, key_id,
        payment_ids, test_mode
      } = regData

      // Step 2: Open Razorpay checkout
      const rzpLoaded = await loadRazorpayScript()

      if (!rzpLoaded || test_mode) {
        // Test mode: simulate payment success
        await handlePaymentSuccess({
          razorpay_order_id: order_id,
          razorpay_payment_id: `pay_test_${Date.now()}`,
          razorpay_signature: 'test_sig',
        }, student_id, payment_ids)
        return
      }

      const options = {
        key: key_id,
        amount: regData.amount_paise,
        currency: 'INR',
        name: 'Balkanji Ni Bari',
        description: 'Summer Camp Enrollment Fee',
        order_id: order_id,
        prefill: {
          name: form.name,
          email: normalizedEmail,
          contact: form.phone,
        },
        theme: { color: '#4F46E5' },
        handler: async (response: any) => {
          await handlePaymentSuccess(response, student_id, payment_ids)
        },
        modal: {
          ondismiss: () => {
            toast.error('Payment was cancelled. Please complete payment to activate your account.')
            setIsPaymentLoading(false)
          }
        }
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()

    } catch (e: any) {
      toast.error('Network error. Please check your connection and try again.')
      setIsPaymentLoading(false)
    }
  }

  const handlePaymentSuccess = async (
    response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
    student_id: string,
    payment_ids: number[]
  ) => {
    let verifyTimeout: ReturnType<typeof setTimeout> | undefined
    try {
      const verifyController = new AbortController()
      verifyTimeout = setTimeout(() => verifyController.abort(), 120000)

      const verifyRes = await fetch(`${API_BASE}/api/v1/students/confirm-registration-payment/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: verifyController.signal,
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          student_id,
          payment_ids,
        }),
      })
      if (verifyTimeout) clearTimeout(verifyTimeout)

      const rawBody = await verifyRes.text()
      let verifyData: any = {}
      try {
        verifyData = rawBody ? JSON.parse(rawBody) : {}
      } catch {
        verifyData = { success: false, error: rawBody || 'Invalid server response.' }
      }

      if (!verifyRes.ok) {
        toast.error(verifyData?.error || verifyData?.message || 'Payment verification failed. Please contact the office.')
        return
      }

      if (verifyData.success) {
        // Clear the draft form after successful registration
        if (typeof window !== 'undefined') {
          localStorage.removeItem('registration_form_draft')
        }
        setSuccessData(verifyData)
      } else {
        toast.error(verifyData.error || 'Payment verification failed. Please contact the office.')
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        toast.error('Verification timed out. Please check your internet and retry. If payment was debited, contact office with payment ID.')
      } else {
        toast.error('Payment was received but verification failed. Please contact the office with your payment ID.')
      }
    } finally {
      if (verifyTimeout) clearTimeout(verifyTimeout)
      setIsPaymentLoading(false)
    }
  }

  const handleDownloadReceipt = async () => {
    if (!successData?.receipt_token) return
    setIsDownloadingReceipt(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/students/download-receipt/?token=${successData.receipt_token}`)
      if (!res.ok) throw new Error('Failed to download receipt')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const contentDisposition = res.headers.get('content-disposition')
      const filenameMatch = contentDisposition?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i)
      const serverFilename = filenameMatch?.[1]?.replace(/['"]/g, '').trim()
      const studentCode = String(successData.student_id || 'student').toLowerCase()
      a.download = serverFilename || `receipt_${studentCode}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download receipt. Please try again.')
    } finally {
      setIsDownloadingReceipt(false)
    }
  }

  // Styles
  const inputCls = "font-inter w-full px-4 py-2.5 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none transition bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-blue-400 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 text-[15px] transition-all shadow-sm tracking-[0.3px]"
  const labelCls = "font-inter block text-[13px] font-semibold text-slate-600 dark:text-slate-400 mb-1 tracking-[0.3px]"
  const sectionTitle = "font-poppins text-[20px] font-bold text-blue-950 dark:text-indigo-300 uppercase tracking-[0.8px] mb-4 border-b-2 border-blue-100 dark:border-white/10 pb-2 w-full transition-colors flex items-center justify-center gap-2"


  // ===================== SUCCESS SCREEN =====================
  if (successData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 py-6 px-4 flex items-center justify-center transition-colors">
        <div className="w-full max-w-lg">
          {/* Success header */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-indigo-100 dark:border-indigo-900/30 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-6 text-center">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg border border-white/20">
                <CheckCircle className="text-white" size={32} />
              </div>
              <h1 className="font-poppins text-xl font-black text-white mb-1">Registration Successful!</h1>
              <p className="text-indigo-100 text-xs text-opacity-80">Payment confirmed • Account created</p>
            </div>

            <div className="p-5 space-y-4">
              {/* Credentials box */}
              <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900/30 shadow-sm">
                <p className="text-primary dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-2">Your Login Credentials</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-primary dark:text-indigo-300 text-sm font-medium">Student ID</span>
                    <span className="text-slate-900 dark:text-white font-bold text-lg">{successData.student_id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-primary dark:text-indigo-300 text-sm font-medium">Username</span>
                    <span className="text-slate-900 dark:text-white font-bold font-mono">{successData.username}</span>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-3 mt-2 border border-amber-100 dark:border-amber-900/30">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-700 dark:text-amber-400 text-sm font-bold flex items-center gap-1"><Lock size={13} /> Password</span>
                      <span className="text-amber-800 dark:text-amber-300 font-bold font-mono text-lg">{successData.password}</span>
                    </div>
                    <p className="text-amber-600 dark:text-amber-500 text-[10px] mt-1 font-medium">Save this password — it will not be shown again.</p>
                  </div>
                </div>
              </div>

              {/* Subjects enrolled */}
              <div>
                <p className="text-slate-500 dark:text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Subjects Enrolled</p>
                <div className="space-y-2">
                  {successData.enrolled_subjects.map((s, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-2.5 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <BookOpen size={14} className="text-primary" />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{s.subject}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">({s.batch_time})</span>
                      </div>
                      <span className="text-sm font-bold text-primary dark:text-indigo-400">₹{s.fee.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/30">
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2"><CreditCard size={14} />Total Paid</span>
                  <span className="text-base font-bold text-blue-700 dark:text-blue-400">₹{successData.total_paid.toFixed(0)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleDownloadReceipt}
                  disabled={isDownloadingReceipt}
                  className="w-full py-3.5 rounded-xl font-poppins font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #2563EB, #4F46E5)' }}
                >
                  {isDownloadingReceipt
                    ? <><Loader2 size={18} className="animate-spin" /> Generating Receipt...</>
                    : <><Download size={18} /> Download Fee Receipt</>
                  }
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full py-3.5 rounded-xl font-poppins font-bold text-primary border-2 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition"
                >
                  Go to Login Page
                </button>
              </div>

              {/* Thank you */}
              <div className="text-center py-4 border-t border-slate-100 dark:border-slate-800 mt-2 transition-colors font-inter">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl mb-4 border border-blue-100 dark:border-blue-900/30">
                  <p className="text-sm font-bold text-blue-900 dark:text-blue-300">🪪 Student ID Card Collection</p>
                  <p className="text-xs text-blue-800 dark:text-blue-400 mt-1">Collect your ID card from the office between <span className="font-black">1 May to 3 May 2026</span>.</p>
                </div>
                
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Important</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 underline decoration-amber-400 decoration-2 underline-offset-4">Remember your credentials and take a screenshot of this page.</p>
                
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 italic">
                  <p className="text-slate-600 dark:text-slate-400 font-medium max-w-sm mx-auto">
                    Your enrollment for Summer Camp 2026 has been successfully processed. 
                    {normalizedEmail ? (
                      <>A confirmation mail is being sent to <strong>{normalizedEmail}</strong></>
                    ) : (
                      <>Login details have been sent to your phone number <strong>{form.phone}</strong> via SMS.</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const anyIneligible = selectedSubjects.some(s => {
    const subData = subjects.find(x => x.id === s.subject_id);
    return !checkAgeEligibility(form.age, subData?.age_limit).eligible;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-2 sm:py-6 px-3 sm:px-4 transition-colors">
      <div className="relative z-10 max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.push('/')}
            className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-indigo-400 hover:bg-blue-50 dark:hover:bg-indigo-950 transition border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="Logo" className="w-12 h-12 rounded-full object-contain border border-indigo-100 dark:border-indigo-900/30 shadow-sm" />
            <div>
              <h1 className="font-poppins text-[26px] font-black text-slate-900 dark:text-white leading-tight uppercase tracking-[0.5px]">NEW STUDENT REGISTRATION Form</h1>
              <p className="font-inter text-blue-600 dark:text-indigo-400 text-[15px] font-bold tracking-[0.5px] uppercase">BALKAN-JI-BARI, NADIAD</p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 shadow-xl border border-slate-200 dark:border-slate-800 relative overflow-hidden transition-colors">


          <div className="space-y-5">

            {/* ---- Enrollment Date & Time (Read-only) ---- */}
            <div>
              <h2 className={sectionTitle}>
                Enrollment Date & Time
              </h2>
              <div className="w-full px-5 py-1.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40 flex items-center justify-between shadow-sm transition-all">
                {/* Date on Left */}
                <div className="flex flex-col items-start font-inter">
                  <span className="text-[10px] font-bold text-blue-400 dark:text-indigo-400 uppercase tracking-widest leading-none mb-1">DATE</span>
                  <span className="text-lg font-black text-blue-900 dark:text-white tracking-tight">
                    {todayDisplay}
                  </span>
                </div>
                {/* Time on Right */}
                <div className="flex items-center gap-2 font-inter">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-blue-400 dark:text-indigo-400 uppercase tracking-widest leading-none mb-1">TIME</span>
                    <span className="text-lg font-black text-blue-900 dark:text-white flex items-center gap-1">
                      {currentIST ? (() => {
                        const timePart = currentIST.split(',')[1].trim()
                        const [time, ampm] = timePart.split(' ')
                        const [h, m] = time.split(':')
                        return `${h}:${m} ${ampm.toLowerCase()}`
                      })() : '--:--'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ---- Personal Information ---- */}
            <div>
              <h2 className={sectionTitle}>Personal Information</h2>
              <div className="grid grid-cols-1 gap-4">

                {/* Full Name */}
                <div>
                  <label className={labelCls}>Full Name <span className="text-red-500">*</span></label>
                  <input
                    className={inputCls}
                    placeholder="Enter student's full name"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* DOB */}
                  <div>
                    <label className={labelCls}>Date of Birth <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      className={inputCls}
                      placeholder="DD-MM-YYYY"
                      maxLength={10}
                      value={form.date_of_birth}
                      onChange={e => handleDobChange(e.target.value)}
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium italic">Format: DD-MM-YYYY</p>
                  </div>
                  
                  {/* Age (Auto-calculated) */}
                  <div>
                    <label className={labelCls}>Age <span className="text-slate-400 font-normal">(Auto)</span></label>
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        className={`${inputCls} bg-slate-50 dark:bg-slate-800/50 font-black text-blue-700 dark:text-indigo-400 cursor-not-allowed`}
                        value={form.age ? `${form.age} Years` : 'Enter DOB'}
                      />
                    </div>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className={labelCls}>Gender <span className="text-red-500">*</span></label>
                    <select
                      className={inputCls}
                      value={form.gender}
                      onChange={e => setForm({ ...form, gender: e.target.value })}
                    >
                      <option value="">Select Gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

              </div>
            </div>

            {/* ---- Contact Details ---- */}
            <div>
              <h2 className={sectionTitle}>Contact Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Mobile Number <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    className={inputCls}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Email Address</label>
                  {/* Email is optional. If provided, it can be used for multiple student registrations. */}
                  <input
                    type="email"
                    className={inputCls}
                    placeholder="Optional - can be shared across registrations"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Full Address <span className="text-red-500">*</span></label>
                  <textarea
                    className={inputCls + ' resize-none'}
                    placeholder="House no., street name..."
                    rows={2}
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>City / Village <span className="text-red-500">*</span></label>
                  <input
                    className={inputCls}
                    placeholder="e.g. Nadiad, Anand..."
                    value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Pincode <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="6-digit pincode"
                    maxLength={6}
                    value={form.pincode}
                    onChange={e => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  />
                </div>
              </div>
            </div>




            {/* ---- Subject Selection - Client Guarded ---- */}
            {isMounted && (
              <div>
                <h2 className={sectionTitle}>Subject Enrollment</h2>
              
              {/* Template Download Button */}
              <div className="mb-4 bg-blue-50 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-bold text-blue-900 dark:text-blue-300 uppercase tracking-[1.5px]">Activity Guide</p>
                  <p className="text-[10px] text-blue-700 dark:text-blue-400">Download the full Summer Camp subject schedule & rules.</p>
                </div>
                <button
                  type="button"
                  onClick={() => window.open('/Summer-Camp-Details.pdf', '_blank')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black flex items-center gap-1 shadow-sm transition-all"
                >
                  <Download size={12} /> DOWNLOAD PDF
                </button>
              </div>

              <div className="flex items-center justify-between mb-3 pt-2">
                <p className="font-inter text-sm text-slate-500 dark:text-slate-400 font-medium italic">Select subjects <span className="text-slate-400 dark:text-slate-500">(max 4)</span></p>
                <button
                  type="button"
                  onClick={addSubject}
                  className="font-inter flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-primary dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition border border-indigo-200 dark:border-indigo-900/50 shadow-sm"
                >
                  <Plus size={14} /> Add Subject
                </button>
              </div>

              <div className="space-y-3">
                {selectedSubjects.map((sub, idx) => {
                  const takenIds = new Set(
                    selectedSubjects.filter((_, i) => i !== idx).map(s => s.subject_id).filter(id => id > 0)
                  )
                  const summerCamp = subjects.filter(s => s.activity_type === 'SUMMER_CAMP' && !takenIds.has(s.id))
                  const yearRound = subjects.filter(s => s.activity_type !== 'SUMMER_CAMP' && !takenIds.has(s.id))
                  const subFee = getSubjectFee(sub.subject_id)
                  const libFee = idx === 0 ? LIBRARY_FEE : 0

                  const subData = subjects.find(x => x.id === sub.subject_id)
                  const eligibility = checkAgeEligibility(form.age, subData?.age_limit)
                  const isEligible = eligibility.eligible

                  return (
                    <div key={idx} className={`p-4 rounded-xl border transition-all duration-300 shadow-sm ${
                      !isEligible 
                        ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50' 
                        : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800'
                    }`}>
                      {!isEligible && (
                        <div className="flex items-center gap-2 mb-3 py-1.5 px-3 bg-white dark:bg-slate-900/50 rounded-lg border border-rose-100 dark:border-rose-900/30 animate-in fade-in slide-in-from-top-2">
                          <AlertCircle size={14} className="text-rose-500 shrink-0" />
                          <p className="text-[11px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                            Ineligible: Subject requires age {subData?.age_limit} (Student: {form.age})
                          </p>
                        </div>
                      )}
                      
                      <div className="flex items-start gap-3">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-500 mb-1 block uppercase tracking-wider">Subject</label>
                            <select
                              className="w-full px-3 py-2.5 rounded-lg text-slate-800 dark:text-white text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none shadow-sm transition-all font-inter"
                              value={sub.subject_id}
                              onChange={e => updateSubject(idx, 'subject_id', e.target.value)}
                            >
                              <option value={0}>{isSubjectsLoading ? 'Loading subjects...' : 'Select subject'}</option>
                              {summerCamp.length > 0 && (
                                <optgroup label="☀️ Summer Camp 2026">
                                  {summerCamp.map(s => {
                                    const fee = s.current_fee
                                      ? `₹${s.current_fee.amount}`
                                      : s.monthly_fee ? `₹${s.monthly_fee}` : ''
                                    return (
                                      <option key={s.id} value={s.id}>
                                        {s.name} — {fee}
                                      </option>
                                    )
                                  })}
                                </optgroup>
                              )}
                            </select>
                            {sub.subject_id > 0 && (
                              <p className="text-[12px] text-blue-600 dark:text-indigo-400 mt-1 font-bold uppercase tracking-tighter">
                                Selected: Rs.{subFee.toFixed(0)} + Rs.{libFee} Library
                              </p>
                            )}
                          </div>
                          
                           {/* Batch Time - Only show when subject is selected */}
                          {sub.subject_id > 0 ? (
                            <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-500 mb-1 block uppercase tracking-wider">Batch Time</label>
                              <select
                                className="w-full px-3 py-2.5 rounded-lg text-slate-800 dark:text-white text-sm bg-indigo-50 dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none shadow-sm transition-all font-inter font-bold"
                                value={sub.batch_time}
                                onChange={e => updateSubject(idx, 'batch_time', e.target.value)}
                              >
                                {(() => {
                                  const options = getUniqueBatchTimings(subData)
                                  return options.length > 0 ? options.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                  )) : (
                                    <option value="">No timings available</option>
                                  )
                                })()}
                              </select>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full pt-4">
                              <p className="text-[10px] text-slate-400 italic">Choose a subject to see timings</p>
                            </div>
                          )}
                        </div>
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => removeSubject(idx)}
                            className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

               {/* ---- Fee Summary - Refined Classy Table Design ---- */}
               {feeBreakdown.some(f => f.subFee > 0) && (
                <div className="mt-8 font-inter">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-0.5 w-8 bg-blue-600/30 rounded-full"></div>
                    <p className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-[2px]">Enrollment Summary</p>
                  </div>
                  
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Subject</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Batch</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">Fee</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">Library</th>
                          <th className="px-4 py-3 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {feeBreakdown.filter(f => f.subject_id > 0).map((f, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200 text-sm">{f.subject_name}</td>
                            <td className="px-4 py-3.5 text-[12px] text-slate-500 dark:text-slate-400 font-medium">{f.batch_time}</td>
                            <td className="px-4 py-3.5 text-right font-medium text-slate-600 dark:text-slate-400 text-sm">₹{f.subFee.toFixed(0)}</td>
                            <td className="px-4 py-3.5 text-right font-medium text-slate-600 dark:text-slate-400 text-sm">₹{f.libFee.toFixed(0)}</td>
                            <td className="px-4 py-3.5 text-right font-black text-slate-900 dark:text-white text-sm">₹{f.total.toFixed(0)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20">
                        <tr>
                          <td colSpan={4} className="px-4 py-5 text-right font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[11px]">
                            Total Amount Payable
                          </td>
                          <td className="px-4 py-5 text-right font-black text-blue-600 dark:text-white text-[22px]">
                            ₹{grandTotal.toFixed(0)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="flex items-start gap-2 px-1 mt-4">
                    <AlertCircle size={14} className="text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 italic leading-relaxed">
                      Your fee includes a one-time ₹10 library charge. Total amount is final and inclusive of all taxes.
                    </p>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* ---- Payment Method: Online Only ---- */}
            <div className="mt-8 space-y-4">
              <button
                type="button"
                onClick={handlePayNow}
                disabled={isPaymentLoading || grandTotal <= 0 || anyIneligible}
                className="w-full py-3.5 rounded-xl font-poppins font-black text-white text-[16px] tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl active:scale-[0.99] border-b-4 border-blue-950/20"
                style={{ background: grandTotal > 0 && !anyIneligible ? 'linear-gradient(135deg, #1E40AF, #3B82F6)' : '#9CA3AF' }}
              >
                {anyIneligible 
                  ? <><AlertCircle size={20} /> AGE INELIGIBLE</>
                  : isPaymentLoading
                    ? <><Loader2 size={20} className="animate-spin" /> VERIFYING...</>
                    : <><CreditCard size={20} /> PAY ONLINE</>
                }
              </button>

              <p className="text-center text-gray-400 text-xs">
                <span className="block">Secure payment via Razorpay. Account created instantly after payment.</span>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-gray-400 text-xs mt-5">
          © 2026 BALKAN-JI-BARI, NADIAD. All rights reserved.
        </p>
      </div>
    </div>
  )
}
