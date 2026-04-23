import React, { useState } from 'react'
import { LogOut, Menu, User, Settings, Shield, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import ProfileSettings from '@/components/ProfileSettings'
import NotificationBell from '@/components/NotificationBell'
import { API_BASE_URL, getMediaUrl } from '@/lib/api/client'
import { useAuth } from '@/contexts/AuthContext'
interface TopNavbarProps {
  onLogout: () => void
  onMenuToggle: () => void
  userName?: string
  userRole?: string
  setCurrentPage?: (page: string) => void
  currentPage?: string
  isSidebarOpen?: boolean
}

export default function TopNavbar({ onLogout, onMenuToggle, userName, userRole, setCurrentPage, currentPage, isSidebarOpen }: TopNavbarProps) {
  const { user } = useAuth()
  const [showProfileModal, setShowProfileModal] = useState(false)
  // Safe fallback for userName
  const displayName = userName || user?.full_name || 'User';
  const displayRole = userRole || user?.role || 'user';
  const userPhoto = user?.photo;

  return (
    <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-30 px-3 sm:px-6 py-4 sm:py-5 flex items-center justify-between border-b border-slate-100">
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={onMenuToggle}
          className="p-1.5 text-slate-500 hover:text-blue-600 transition-colors shrink-0"
          title="Toggle sidebar"
        >
          {isSidebarOpen ? (
            <X size={20} />
          ) : (
            <Menu size={20} />
          )}
        </button>
        <div className="flex items-center gap-2 pl-1 sm:pl-4 border-l border-slate-100 min-w-0">
          <img src="/logo.jpeg" alt="Logo" className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg object-contain shadow-sm border border-slate-50 shrink-0" />
          <h1 className="text-[9px] xs:text-[10px] sm:text-lg font-bold text-slate-900 tracking-tighter font-poppins uppercase truncate">
             Balkan-Ji-Bari
          </h1>
          <span className="text-slate-200 text-lg hidden lg:inline">—</span>
          <span className="text-xs sm:text-base font-semibold text-blue-600 uppercase tracking-widest hidden md:inline font-poppins">
            {currentPage?.replace('-', ' ')}
          </span>
        </div>
      </div>


      <div className="flex items-center gap-2 sm:gap-4">
        <NotificationBell />
        
        {/* User Info - Direct Modal Access */}
        <button 
          onClick={() => setShowProfileModal(true)}
          className="h-10 flex items-center gap-3 pl-4 border-l border-slate-100 hover:bg-slate-50 px-3 rounded-xl transition-all group"
        >
          <div className="text-right hidden md:block">
            <p className="font-semibold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors leading-none font-poppins">{displayName}</p>
            <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-tighter font-inter">{displayRole}</p>
          </div>
          <div className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold shadow-md shadow-indigo-500/10 transition-transform group-hover:scale-105 overflow-hidden">
            {userPhoto ? (
              <img 
                src={getMediaUrl(userPhoto) || ''} 
                alt={displayName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.parentElement!.innerHTML = displayName.charAt(0).toUpperCase();
                }}
              />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>
        </button>

        {/* Profile Modal */}
        <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-poppins">Profile Settings</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <ProfileSettings />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
