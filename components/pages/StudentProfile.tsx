'use client'

import { useState, useEffect } from 'react'
import { User, Mail, Phone, MapPin, Calendar, BookOpen, Loader2, AlertCircle, Edit2, Save, X, Camera } from 'lucide-react'
import { studentsApi, Student } from '@/lib/api'
import { API_BASE_URL, getMediaUrl } from '@/lib/api/client'
import { useNotifications } from '@/hooks/useNotifications'

export default function StudentProfile() {
  const { notifySuccess, notifyError } = useNotifications()
  const [imgError, setImgError] = useState(false)
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [imageError, setImageError] = useState(false)


  // Editable fields
  const [editData, setEditData] = useState({
    phone: '',
    address: '',
    photo: null as File | null
  })
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        const response = await studentsApi.getMe()
        if (response.success && response.data) {
          setStudent(response.data)
          setEditData({
            phone: response.data.phone || '',
            address: response.data.address || '',
            photo: null
          })
        } else {
          setError('Failed to fetch profile data')
        }
      } catch (err) {
        console.error(err)
        setError('Failed to connect to server')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setEditData({ ...editData, photo: file })
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      setImgError(false); // Reset imgError when a new photo is selected
    }
  }

  const handleSave = async () => {
    if (!student) return

    try {
      setSaving(true)
      const formData = new FormData()
      formData.append('phone', editData.phone)
      formData.append('address', editData.address)
      if (editData.photo) {
        formData.append('photo', editData.photo)
      }

      const response = await studentsApi.updateProfile(student.id, formData)
      if (response.success && response.data) {
        setStudent(response.data)
        setIsEditing(false)
        setPhotoPreview(null)
        setImageError(false)
        setImgError(false) // Reset imgError on successful save
        notifySuccess('Profile updated successfully')
      }
    } catch (err: any) {
      notifyError(err.response?.data?.error?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (student) {
      setEditData({
        phone: student.phone || '',
        address: student.address || '',
        photo: null
      })
      setPhotoPreview(null)
      setIsEditing(false)
      setImgError(false) // Reset imgError on cancel
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
          <AlertCircle size={20} />
          {error || 'Profile not found'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 no-scrollbar pb-10">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-950 uppercase tracking-tight font-poppins">Access Control & Profile</h1>
          <p className="text-[10px] sm:text-xs font-bold text-slate-900 uppercase tracking-widest mt-1 font-inter">Personal account management</p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full sm:w-auto h-11 sm:h-12 px-6 rounded-xl sm:rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 font-poppins"
          >
            <Edit2 size={16} />
            <span>Edit Profile</span>
          </button>
        ) : (
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex-1 sm:flex-none h-11 sm:h-12 px-6 rounded-xl sm:rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all font-bold text-[11px] uppercase tracking-widest font-poppins"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-2 sm:flex-none h-11 sm:h-12 px-8 rounded-xl sm:rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 font-poppins"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>Save Changes</span>
            </button>
          </div>
        )}
      </div>

    {/* Premium Banner Section */}
      <div className="relative px-2 sm:px-0">
        <div className="h-28 xs:h-32 sm:h-40 bg-indigo-600 rounded-[24px] sm:rounded-[32px] shadow-2xl shadow-indigo-200/50 overflow-hidden relative">
        </div>
        
        <div className="mx-2 xs:mx-4 sm:mx-10 -mt-12 xs:-mt-16 sm:-mt-20 relative z-10">
          <div className="bg-white dark:bg-slate-900 p-4 xs:p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-50 dark:border-slate-800 relative group transition-all duration-500">
            <div className="flex flex-col md:flex-row items-center gap-4 xs:gap-6 sm:gap-10">
              <div className="relative group/photo shrink-0">
                <div className={`h-24 w-24 xs:h-32 xs:w-32 sm:h-40 sm:w-40 rounded-[20px] xs:rounded-[24px] sm:rounded-[32px] border-[4px] sm:border-[6px] border-white dark:border-slate-800 shadow-2xl overflow-hidden transition-all duration-500 ${isEditing ? 'ring-4 ring-indigo-500/20' : ''} bg-slate-100 flex items-center justify-center text-slate-300 font-bold text-3xl xs:text-4xl sm:text-5xl font-poppins`}>
                  {(photoPreview || student?.photo) && !imgError ? (
                    <img 
                      src={photoPreview || getMediaUrl(student?.photo) || ''} 
                      alt={student?.name || 'Student'} 
                      className={`w-full h-full object-cover transition-all duration-500 ${isEditing ? 'scale-110 opacity-80' : ''}`}
                      onError={() => {
                        console.warn(`[StudentProfile] Failed to load photo: ${getMediaUrl(student?.photo)}`);
                        setImgError(true);
                      }}
                    />
                  ) : (
                    <span className="opacity-80">{student?.name?.[0]?.toUpperCase() || 'S'}</span>
                  )}
                  {isEditing && (
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white cursor-pointer rounded-[20px] xs:rounded-[24px] sm:rounded-[32px] transition-all opacity-0 group-hover/photo:opacity-100 backdrop-blur-[2px]">
                      <div className="text-center">
                        <Camera className="mx-auto mb-1 xs:mb-2" size={24} />
                        <span className="text-[8px] xs:text-[10px] font-bold uppercase tracking-widest leading-none">Update<br/>Photo</span>
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
                    </label>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 border-[3px] xs:border-[4px] sm:border-[6px] border-white dark:border-slate-800 h-6 w-6 xs:h-8 xs:w-8 sm:h-10 sm:w-10 rounded-full shadow-lg"></div>
              </div>
              
              <div className="flex-1 text-center md:text-left space-y-1 xs:space-y-2">
                        <div className="flex items-center justify-center md:justify-start gap-3 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-sm mb-4 max-w-fit">
                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-950 uppercase tracking-[0.2em] font-inter">Student Records</span>
                            <span className="text-[14px] sm:text-[18px] font-bold text-black dark:text-white uppercase tracking-tighter font-poppins">Personal Profile</span>
                        </div>
                <h2 className="text-xl xs:text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight font-poppins line-clamp-2 uppercase">{student.name}</h2>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 xs:gap-3 sm:gap-4 text-slate-950 font-bold uppercase tracking-widest text-[8px] xs:text-[9px] sm:text-[10px] font-inter">
                  <p className="text-blue-900 font-bold">{student.student_id}</p>
                  <span className="w-1 h-1 rounded-full bg-slate-950"></span>
                  <p className="line-clamp-1 lowercase">{student.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

        <div className="p-4 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
            {/* Personal Info */}
            <div className="space-y-4 sm:space-y-6">
              <h3 className="text-[14px] sm:text-[18px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2 font-poppins">
                <User size={16} className="text-indigo-900" /> Personal Details
              </h3>
              <div className="space-y-4 sm:space-y-5">
                <div className="group">
                  <p className="text-[10px] sm:text-[13px] font-bold text-slate-900 uppercase tracking-widest mb-1 font-inter">Age & Gender</p>
                  <p className="text-sm sm:text-[15px] font-bold text-slate-900 dark:text-white leading-tight font-poppins">{student.age} Years • <span className="capitalize">{student.gender?.toLowerCase() || 'N/A'}</span></p>
                </div>
                <div className="group">
                  <p className="text-[10px] sm:text-[13px] font-bold text-slate-900 uppercase tracking-widest mb-1 font-inter">Blood Group</p>
                  <p className="text-sm sm:text-[15px] font-bold text-slate-900 dark:text-white leading-tight font-poppins">{student.blood_group || 'N/A'}</p>
                </div>
                <div className="group">
                  <p className="text-[10px] sm:text-[13px] font-bold text-slate-900 uppercase tracking-widest mb-1 font-inter">Parent / Guardian</p>
                  <p className="text-sm sm:text-[15px] font-bold text-slate-900 dark:text-white leading-tight uppercase tracking-tight font-poppins">{student.parent_name || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-4 sm:space-y-6">
              <h3 className="text-[14px] sm:text-sm font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2 font-poppins">
                <Phone size={16} className="text-indigo-900" /> Contact Details
              </h3>
              <div className="space-y-4 sm:space-y-5">
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest font-inter">Phone Number</p>
                    {isEditing && (
                      <span className="text-[8px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ring-1 ring-amber-100 font-inter">
                        Editable
                      </span>
                    )}
                  </div>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editData.phone}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      className="w-full h-10 px-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 font-inter"
                      maxLength={10}
                    />
                  ) : (
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight font-poppins">{student.phone}</p>
                  )}
                </div>
                <div className="group">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1 group-hover:text-indigo-500 transition-colors font-inter">Email Address</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate font-poppins">{student.email || 'N/A'}</p>
                </div>
                <div className="group">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1 group-hover:text-indigo-500 transition-colors font-inter">Member Since</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight font-poppins">
                    {new Date(student.enrollment_date).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Location Info */}
            <div className="space-y-4 sm:space-y-6">
              <h3 className="text-[14px] sm:text-sm font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2 font-poppins">
                <MapPin size={16} className="text-indigo-700" /> Residency
              </h3>
              <div className="space-y-4 sm:space-y-5">
                <div className="group">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1 group-hover:text-indigo-500 transition-colors font-inter">Area</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight uppercase tracking-tight font-poppins">{student.area}</p>
                </div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest font-inter">Full Address</p>
                    {isEditing && (
                      <span className="text-[8px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ring-1 ring-amber-100 font-inter">
                        Editable
                      </span>
                    )}
                  </div>
                  {isEditing ? (
                    <textarea
                      value={editData.address}
                      onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border-2 border-slate-100 dark:border-slate-800 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 resize-none text-[11px] font-inter"
                    />
                  ) : (
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-tight font-inter">
                      {student.address}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Status Details */}
      <div className="px-4 pb-8">
        <div className="bg-white dark:bg-slate-900 rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-6 sm:mb-8 tracking-tight uppercase font-poppins">Account Status</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 sm:p-6 border border-slate-100 dark:border-slate-700 group transition-all">
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-3 font-inter">Enrollment</p>
              <span className={`inline-flex px-4 py-2 rounded-xl text-[10px] font-bold tracking-widest border shadow-sm font-inter ${student.status === 'ACTIVE'
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100 uppercase'
                : 'bg-rose-50 text-rose-600 border-rose-100 uppercase'
                }`}>
                {student.status}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 sm:p-6 border border-slate-100 dark:border-slate-700 group transition-all">
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-3 font-inter">Financial Standing</p>
              <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight font-poppins">{student.payment_status}</p>
              <p className="text-[8px] sm:text-[9px] font-bold text-slate-700 mt-2 uppercase tracking-widest leading-tight font-inter">Calculated based on active enrollments</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
