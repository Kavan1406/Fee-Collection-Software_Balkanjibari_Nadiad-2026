'use client'

import React from 'react'

export const SkeletonPulse = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-xl ${className}`} />
)

export const SkeletonCard = () => (
  <div className="p-5 rounded-[24px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-all overflow-hidden relative">
    <SkeletonPulse className="w-14 h-14 rounded-2xl shrink-0" />
    <div className="flex-1 space-y-2">
      <SkeletonPulse className="h-3 w-16" />
      <SkeletonPulse className="h-6 w-24" />
    </div>
  </div>
)

export const SkeletonTable = ({ rows = 5 }: { rows?: number }) => (
  <div className="card-standard overflow-hidden border-none shadow-xl bg-white dark:bg-slate-900">
    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
      <SkeletonPulse className="h-10 w-48" />
      <SkeletonPulse className="h-10 w-32" />
    </div>
    <div className="p-6 space-y-4">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-50 last:border-0">
          <SkeletonPulse className="w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonPulse className="h-4 w-1/4" />
            <SkeletonPulse className="h-3 w-1/6" />
          </div>
          <SkeletonPulse className="h-8 w-24 rounded-lg" />
        </div>
      ))}
    </div>
  </div>
)

export const SkeletonDashboard = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center mb-2">
      <div className="space-y-2">
        <SkeletonPulse className="h-8 w-64" />
        <SkeletonPulse className="h-4 w-48" />
      </div>
      <SkeletonPulse className="h-10 w-32" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
       <div className="lg:col-span-2 space-y-6">
          <SkeletonTable rows={3} />
          <SkeletonTable rows={2} />
       </div>
       <div className="space-y-6">
          <div className="h-[400px] w-full rounded-[24px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6">
              <SkeletonPulse className="h-4 w-32 mb-6" />
              <div className="space-y-4">
                 <SkeletonPulse className="h-12 w-full" />
                 <SkeletonPulse className="h-12 w-full" />
                 <SkeletonPulse className="h-12 w-full" />
              </div>
          </div>
       </div>
    </div>
  </div>
)
