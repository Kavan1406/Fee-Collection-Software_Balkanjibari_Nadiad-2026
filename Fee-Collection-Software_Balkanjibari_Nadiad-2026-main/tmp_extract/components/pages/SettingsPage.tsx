'use client'

import React, { useState } from 'react'
import { User, Shield, Bell } from 'lucide-react'
import ProfileSettings from '@/components/ProfileSettings'
import SecuritySettings from '@/components/SecuritySettings'
import NotificationSettings from '@/components/NotificationSettings'

interface SettingsPageProps {
  userRole: 'admin' | 'staff' | 'student' | 'accountant'
  canEdit?: boolean
}

export default function SettingsPage({ userRole, canEdit }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState('security')
  const tabs = [
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1 mb-2 px-1">
        <h1 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white uppercase tracking-tight font-poppins">Account Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-[15px] font-medium font-inter">Manage your security preferences and notification settings</p>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex border-b border-gray-100 dark:border-gray-700 overflow-x-auto bg-gray-50/30 dark:bg-gray-900/50 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-8 py-4 sm:py-5 font-bold text-sm uppercase tracking-widest transition-all border-b-2 whitespace-nowrap font-poppins ${isActive
                  ? 'text-indigo-600 border-indigo-600 bg-white dark:bg-slate-800 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]'
                  : 'text-slate-400 border-transparent hover:text-slate-600 bg-slate-50/50 dark:bg-slate-900/50'
                  }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="p-4 sm:p-8">
          {activeTab === 'security' && <SecuritySettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
        </div>
      </div>
    </div>
  )
}
