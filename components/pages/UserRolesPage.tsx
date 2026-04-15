import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Shield, User as UserIcon, AlertCircle } from 'lucide-react'
import { usersApi, User, CreateUserData } from '@/lib/api'

export default function UserRolesPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [filterRole, setFilterRole] = useState('ALL')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [formData, setFormData] = useState<CreateUserData>({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role: 'STAFF',
    phone_number: '',
    address: '',
    area: '',
    can_view_dashboard: false,
    can_view_registration_requests: false,
    can_view_students: false,
    can_view_subjects: false,
    can_view_enrollments: false,
    can_view_payments: false,
    can_view_analytics: false,
    can_view_reports: false,
    can_view_users: false,
    can_view_settings: false,
    is_two_factor_enabled: false
  })
  const [formLoading, setFormLoading] = useState(false)

  const fetchUsers = async (page: number = 1) => {
    try {
      setLoading(true)
      // Load users with pagination (20 per page max)
      const response = await usersApi.getAll({ page, page_size: 20 })
      
      // Handle API response structure
      let usersData: User[] = []
      let total = 0
      let pages = 1
      
      if (Array.isArray(response)) {
        usersData = response
        total = response.length
        pages = 1
      } else if (response?.results && Array.isArray(response.results)) {
        // DRF paginated response
        usersData = response.results
        total = response.count || 0
        pages = Math.ceil(total / 20)
      } else if (response?.data && Array.isArray(response.data)) {
        usersData = response.data
        total = usersData.length
        pages = 1
      }
      
      setUsers(usersData)
      setTotalPages(pages)
      setTotalCount(total)
      setCurrentPage(page)
    } catch (err: any) {
      console.error('Failed to load users:', err)
      setError('Failed to load users. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError('')

    try {
      if (editingUser) {
        await usersApi.update(editingUser.id, formData)
      } else {
        await usersApi.create(formData)
      }
      setShowForm(false)
      setEditingUser(null)
      resetForm()
      fetchUsers()
    } catch (err: any) {
      console.error('User save error:', err)
      const details = err.response?.data?.error?.details
      let msg = err.response?.data?.error?.message || 'Failed to save user'
      if (typeof details === 'object') {
        msg += ': ' + Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(', ')
      } else if (typeof details === 'string') {
        msg += ': ' + details
      }
      setError(msg)
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.username}?`)) return
    try {
      await usersApi.delete(user.id)
      fetchUsers()
    } catch (err: any) {
      setError('Failed to delete user')
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      phone_number: user.phone_number,
      address: user.address,
      area: user.area,
      can_view_dashboard: user.can_view_dashboard || false,
      can_view_registration_requests: user.can_view_registration_requests || false,
      can_view_students: user.can_view_students || false,
      can_view_subjects: user.can_view_subjects || false,
      can_view_enrollments: user.can_view_enrollments || false,
      can_view_payments: user.can_view_payments || false,
      can_view_analytics: user.can_view_analytics || false,
      can_view_reports: user.can_view_reports || false,
      can_view_users: user.can_view_users || false,
      can_view_settings: user.can_view_settings || false,
      is_two_factor_enabled: user.is_two_factor_enabled || false
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      full_name: '',
      password: '',
      role: 'STAFF',
      phone_number: '',
      address: '',
      area: '',
      can_view_dashboard: false,
      can_view_registration_requests: false,
      can_view_students: false,
      can_view_subjects: false,
      can_view_enrollments: false,
      can_view_payments: false,
      can_view_analytics: false,
      can_view_reports: false,
      can_view_users: false,
      can_view_settings: false,
      is_two_factor_enabled: false
    })
    setEditingUser(null)
  }

  const setAllPermissions = (val: boolean) => {
    setFormData({
      ...formData,
      can_view_dashboard: val,
      can_view_registration_requests: val,
      can_view_students: val,
      can_view_subjects: val,
      can_view_enrollments: val,
      can_view_payments: val,
      can_view_analytics: val,
      can_view_reports: val,
      can_view_users: val,
      can_view_settings: val
    })
  }

  const roleConfigs = {
    'ADMIN': {
      label: 'Administrator',
      permissions: ['Full System Access', 'Role Management', 'Financial Oversight', 'Global Reports'],
      color: 'bg-rose-50 text-rose-600',
      description: 'Super-user with unrestricted access to all modules and configurations.'
    },
    'STAFF': {
      label: 'Staff Member',
      permissions: ['Student Management', 'Payment Records', 'Attendance Tracking', 'Activity Reports'],
      color: 'bg-indigo-50 text-indigo-600',
      description: 'Standard operator with granular access to specific institutional modules.'
    },
    'ACCOUNTANT': {
      label: 'Accountant',
      permissions: ['Payment Records', 'Financial Reports', 'Ledger Access', 'Receipt Generation'],
      color: 'bg-amber-50 text-amber-600',
      description: 'Finance focused role managing collections, refunds and revenue analytics.'
    }
  }

  const permissionsList = [
    { id: 'can_view_dashboard', label: 'Dashboard' },
    { id: 'can_view_students', label: 'Students' },
    { id: 'can_view_subjects', label: 'Subjects' },
    { id: 'can_view_enrollments', label: 'Enrollments' },
    { id: 'can_view_payments', label: 'Payments' },
    { id: 'can_view_registration_requests', label: 'Request Acceptance' },
    { id: 'can_view_analytics', label: 'Analytics' },
    { id: 'can_view_reports', label: 'Reports' },
    { id: 'can_view_users', label: 'Users' },
    { id: 'can_view_settings', label: 'Settings' },
  ]

  return (
    <div className="space-y-8 no-scrollbar pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight font-poppins uppercase">User Management</h1>
          <p className="text-slate-400 text-[10px] sm:text-sm font-medium font-inter uppercase tracking-widest mt-1">Total Registry: {users.length}</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowForm(!showForm)
          }}
          className="w-full sm:w-auto h-11 px-6 bg-indigo-600 text-white rounded-xl font-medium font-poppins text-[11px] uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          <span>Add New User</span>
        </button>
      </div>

      {/* Dynamic Role Filter Dropdown */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 font-poppins">
          <div className="w-10 h-10 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-xl">
             <Shield size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight uppercase">Registry Access Level</h2>
            <p className="text-[10px] text-slate-400 font-medium font-inter uppercase tracking-widest mt-0.5">Filter Whole System Dataset</p>
          </div>
        </div>
        
        <div className="w-full sm:w-64">
           <select 
             value={filterRole}
             onChange={(e) => setFilterRole(e.target.value)}
             className="w-full h-11 bg-slate-50 border-2 border-slate-50 rounded-xl px-4 font-bold font-inter text-slate-700 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all cursor-pointer text-xs uppercase tracking-widest shadow-sm"
           >
             <option value="ALL">Show All System Roles</option>
             <option value="ADMIN">Administrators Only</option>
             <option value="STAFF">Staff Members Only</option>
             <option value="ACCOUNTANT">Accountants Only</option>
             <option value="STUDENT">Students Only</option>
           </select>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="text-rose-600 shrink-0" size={18} />
          <p className="text-rose-800 font-medium font-inter text-sm">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-2xl shadow-indigo-500/5 animate-in zoom-in-95 duration-500">
           {/* Form logic remains same but styled for premium look */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-50">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-poppins">
                {editingUser ? 'Edit User' : 'Add New User'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[12px] font-medium text-slate-400 uppercase tracking-[0.2em] ml-1 font-inter">Username</label>
                <input
                    type="text"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    required
                    className="w-full h-12 bg-slate-50 border-2 border-slate-50 rounded-xl px-4 font-medium font-inter text-slate-700 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-medium text-slate-400 uppercase tracking-[0.2em] ml-1 font-inter">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full h-12 bg-slate-50 border-2 border-slate-50 rounded-xl px-4 font-medium font-inter text-slate-700 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-medium text-slate-400 uppercase tracking-[0.2em] ml-1 font-inter">Role</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full h-12 bg-white border-2 border-slate-100 rounded-xl px-4 font-medium font-inter text-slate-700 focus:border-indigo-600 focus:outline-none transition-all cursor-pointer shadow-sm"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="STAFF">Staff</option>
                  <option value="ACCOUNTANT">Accountant</option>
                  <option value="STUDENT">Student</option>
                </select>
              </div>

              <div className="space-y-2 col-span-1 md:col-span-2">
                <label className="text-[12px] font-medium text-slate-400 uppercase tracking-[0.2em] ml-1 font-inter">Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  className="w-full h-12 bg-slate-50 border-2 border-slate-50 rounded-xl px-4 font-medium font-inter text-slate-700 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-medium text-slate-400 uppercase tracking-[0.2em] ml-1 font-inter">Password {editingUser && '(Leave blank to keep current)'}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                  className="w-full h-12 bg-slate-50 border-2 border-slate-50 rounded-xl px-4 font-medium font-inter text-slate-700 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Modular Permissions Section */}
            {(formData.role === 'STAFF' || formData.role === 'ACCOUNTANT') && (
            <div className="border-t border-slate-100 pt-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight font-poppins">Modular Domain Permissions</h3>
                        <p className="text-slate-400 text-[12px] font-medium font-inter uppercase tracking-widest mt-1">Define Granular Staff Access Level</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {permissionsList.map((perm) => (
                        <div 
                            key={perm.id}
                            onClick={() => setFormData({ ...formData, [perm.id]: !formData[perm.id as keyof CreateUserData] })}
                            className={`p-3 rounded-xl border-2 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-2 text-center ${
                                formData[perm.id as keyof CreateUserData] 
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                            }`}
                        >
                            <Shield size={16} />
                            <span className="text-[11px] font-medium font-inter uppercase tracking-widest leading-tight">{perm.label}</span>
                        </div>
                    ))}
                </div>
            </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-50">
              <button
                type="submit"
                disabled={formLoading}
                className="flex-1 h-12 bg-indigo-600 text-white rounded-xl font-medium font-poppins text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
              >
                {formLoading ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingUser(null)
                  resetForm()
                }}
                className="px-8 h-12 bg-white text-slate-400 border-2 border-slate-100 rounded-xl font-medium font-poppins text-sm hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}


      {/* User Table Registry */}
      <div className="space-y-4">
        {/* Page Info Header */}
        {!loading && users.length > 0 && totalPages > 1 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-widest">
              👥 Page {currentPage} of {totalPages} • Showing {((currentPage - 1) * 20) + 1}-{Math.min(currentPage * 20, totalCount)} of {totalCount} users
            </p>
          </div>
        )}
        
        {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-400 font-medium font-inter uppercase tracking-widest text-[10px]">Accessing Database...</p>
            </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                <table className="w-full">
                    <thead className="bg-slate-50/50 border-b border-slate-50 font-poppins">
                        <tr>
                        <th className="px-6 py-4 text-left text-[12px] font-bold uppercase tracking-widest text-slate-400">User</th>
                        <th className="px-6 py-4 text-left text-[12px] font-bold uppercase tracking-widest text-slate-400">Role</th>
                        <th className="px-6 py-4 text-left text-[12px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                        <th className="px-6 py-4 text-left text-[12px] font-bold uppercase tracking-widest text-slate-400">Edit Permissions</th>
                        <th className="px-6 py-4 text-right text-[12px] font-bold uppercase tracking-widest text-slate-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {users.filter(u => filterRole === 'ALL' || u.role === filterRole).map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50/30 transition-colors group">
                            <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold overflow-hidden">
                                    {user.full_name?.charAt(0) || <UserIcon size={18} />}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold text-slate-900 tracking-tight capitalize font-inter">{user.full_name}</div>
                                    <div className="text-[13px] font-medium text-slate-400 truncate tracking-tight font-inter">@{user.username} • {user.email}</div>
                                </div>
                            </div>
                            </td>
                            <td className="px-6 py-4">
                             <span className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase border font-inter ${
                                user.role === 'ADMIN' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                user.role === 'STAFF' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                user.role === 'ACCOUNTANT' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                'bg-emerald-50 text-emerald-600 border-emerald-100'
                                }`}>
                                {user.role}
                            </span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600 uppercase tracking-widest font-inter">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    Active
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                {user.role === 'ADMIN' ? (
                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs font-semibold uppercase tracking-widest font-inter">Full</span>
                                ) : (user.role === 'STAFF' || user.role === 'ACCOUNTANT') ? (
                                    <button 
                                        onClick={() => handleEdit(user)}
                                        className="text-xs font-semibold text-indigo-600 uppercase tracking-widest underline decoration-2 underline-offset-4 hover:text-indigo-800 transition-colors font-inter"
                                    >
                                        Permissions
                                    </button>
                                ) : (
                                    <span className="text-slate-300 font-inter">—</span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-right">
                             <div className="flex gap-3 justify-end items-center">
                                <button
                                    onClick={() => handleEdit(user)}
                                    className="text-indigo-400 hover:text-indigo-600 transition-colors p-1"
                                    title="Edit User"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(user)}
                                    className="text-rose-400 hover:text-rose-600 transition-colors p-1"
                                    title="Delete User"
                                >
                                    <Trash2 size={16} />
                                </button>
                             </div>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden grid grid-cols-1 gap-3">
              {users.filter(u => filterRole === 'ALL' || u.role === filterRole).map((user) => (
                  <div key={user.id} className="mobile-card space-y-4">
                      <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                                  {user.full_name?.charAt(0) || <UserIcon size={18} />}
                              </div>
                              <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 truncate uppercase tracking-tight font-poppins">{user.full_name}</p>
                                  <p className="text-[10px] font-medium text-slate-400 truncate tracking-tight lowercase font-inter">@{user.username}</p>
                              </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-semibold uppercase border font-inter ${
                              user.role === 'ADMIN' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                              user.role === 'STAFF' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                              user.role === 'ACCOUNTANT' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              'bg-emerald-50 text-emerald-600 border-emerald-100'
                              }`}>
                              {user.role}
                          </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                          <div>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">Status</p>
                              <div className="flex items-center gap-1.5 text-[9px] font-semibold text-emerald-600 uppercase tracking-widest font-inter">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                  Active
                              </div>
                          </div>
                          <div>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">Email</p>
                              <p className="text-[9px] font-medium text-slate-500 truncate font-inter">{user.email}</p>
                          </div>
                      </div>

                      <div className="flex gap-2">
                          <button
                              onClick={() => handleEdit(user)}
                              className="flex-1 h-9 rounded-xl bg-indigo-600 text-white font-medium font-poppins text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100"
                          >
                              Edit Details
                          </button>
                          <button
                              onClick={() => handleDelete(user)}
                              className="h-9 px-4 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 font-medium font-poppins text-[10px]"
                          >
                              <Trash2 size={14} />
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
                  Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalCount)} of {totalCount} users
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
