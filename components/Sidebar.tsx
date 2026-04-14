'use client'

import { LayoutDashboard, Users, BookOpen, LogIn, CreditCard, BarChart3, FileText, Settings, Lock, User, LogOut, X } from 'lucide-react'

import { User as UserType } from '@/lib/api'

interface SidebarProps {
  currentPage: string
  setCurrentPage: (page: string) => void
  user: UserType | null
  isOpen: boolean
  onLogout?: () => void
}

type StaffPermissionKey =
  | 'can_view_dashboard'
  | 'can_view_students'
  | 'can_view_subjects'
  | 'can_view_enrollments'
  | 'can_view_payments'
  | 'can_view_registration_requests'
  | 'can_view_analytics'
  | 'can_view_reports'
  | 'can_view_users'
  | 'can_view_settings'

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'STAFF', 'ACCOUNTANT', 'STUDENT'], permission: 'can_view_dashboard' as StaffPermissionKey },
  { id: 'profile', label: 'My Profile', icon: User, roles: ['STUDENT'] },
  { id: 'subjects-fees', label: 'My Subjects & Fees', icon: BookOpen, roles: ['STUDENT'] },
  { id: 'student-payments', label: 'My Payments', icon: CreditCard, roles: ['STUDENT'] },
  { id: 'students', label: 'Students', icon: Users, roles: ['ADMIN', 'STAFF', 'ACCOUNTANT'], permission: 'can_view_students' as StaffPermissionKey },
  { id: 'subjects', label: 'Subjects', icon: BookOpen, roles: ['ADMIN', 'STAFF'], permission: 'can_view_subjects' as StaffPermissionKey },
  { id: 'enrollments', label: 'Enrollments', icon: LogIn, roles: ['ADMIN', 'STAFF'], permission: 'can_view_enrollments' as StaffPermissionKey },
  { id: 'payments', label: 'Payments', icon: CreditCard, roles: ['ADMIN', 'STAFF', 'ACCOUNTANT'], permission: 'can_view_payments' as StaffPermissionKey },
  { id: 'request-acceptance', label: 'Request Acceptance', icon: CreditCard, roles: ['ADMIN', 'STAFF', 'ACCOUNTANT'], permission: 'can_view_registration_requests' as StaffPermissionKey },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['ADMIN', 'STAFF', 'ACCOUNTANT'], permission: 'can_view_analytics' as StaffPermissionKey },
  { id: 'reports', label: 'Reports', icon: FileText, roles: ['ADMIN', 'STAFF', 'ACCOUNTANT'], permission: 'can_view_reports' as StaffPermissionKey },
  { id: 'users', label: 'Users', icon: Lock, roles: ['ADMIN', 'STAFF'], permission: 'can_view_users' as StaffPermissionKey },
  { id: 'settings', label: 'Settings', icon: Settings, roles: ['ADMIN', 'STAFF'], permission: 'can_view_settings' as StaffPermissionKey },
]

export default function Sidebar({ currentPage, setCurrentPage, user, isOpen, onLogout }: SidebarProps) {
  const userRole = user?.role || 'STUDENT'
  
  const visibleItems = menuItems.filter(item => {
    // Basic role check
    if (!item.roles.includes(userRole)) return false
    
    // Granular permission check for Staff
    if (userRole === 'STAFF' && item.permission) {
        return (user as any)[item.permission] === true
    }
    
    return true
  })

  return (
    <aside
      className={`fixed lg:static inset-y-0 left-0 z-50 ${isOpen ? 'translate-x-0 w-[240px]' : '-translate-x-full w-0'
      } bg-white dark:bg-slate-900 border-r border-slate-100 transition-all duration-300 ease-in-out overflow-hidden flex flex-col font-inter`}
    >
      <div className="p-4 flex items-center gap-2.5 border-b border-slate-50 mb-2">
        <div className="w-10 h-10 flex items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm border border-slate-100 p-0.5 shrink-0">
           <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-contain" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-slate-900 leading-none tracking-tighter text-xs uppercase font-poppins">
            Balkan-Ji-Bari
          </span>
          <span className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-tighter font-inter">
            Fee Collection Software
          </span>
        </div>
      </div>
 
      {/* Navigation section */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1 no-scrollbar pt-2">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full h-11 flex items-center gap-3 px-4 rounded-xl transition-all duration-200 ${isActive
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-50'
                }`}
            >
              <Icon size={18} className="flex-shrink-0" />
              {isOpen && <span className="text-[14px] font-medium truncate leading-none font-inter">{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Bottom Identity Section */}
      <div className="p-4 mt-auto">
        <div className="flex items-center gap-3 bg-purple-100 dark:bg-purple-900/20 p-3 rounded-2xl border border-purple-200/50">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0">
            {userRole === 'ADMIN' ? 'A' : userRole === 'STAFF' ? 'S' : userRole === 'ACCOUNTANT' ? 'AC' : 'ST'}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-slate-400 leading-none mb-1 uppercase tracking-wider font-inter">Current Role</p>
            <p className="text-sm font-bold text-slate-900 capitalize truncate font-poppins">{userRole.toLowerCase()}</p>
          </div>
        </div>
        
        <button
          onClick={onLogout}
          className="w-full mt-4 h-11 flex items-center justify-center gap-2 px-4 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 font-poppins font-medium text-sm transition-colors"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
