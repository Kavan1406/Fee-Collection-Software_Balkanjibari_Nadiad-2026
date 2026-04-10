'use client'

import React, { useState } from 'react'
import { AlertCircle, Eye, EyeOff, UserPlus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()
  
  // --- OPTIMISTIC PRE-WARM (v3.1) ---
  // Initiate server wake-up as soon as the user landing on the login page
  React.useEffect(() => {
    const warmUp = async () => {
      try {
        const apiClient = (await import('@/lib/api/client')).default;
        console.log("%c PRE-WARM: Initiating optimistic server wake-up... ", "background: #4f46e5; color: #fff; font-weight: bold; padding: 2px 5px; border-radius: 4px;");
        await apiClient.get('/health/');
        console.log("%c PRE-WARM: Server is awake and ready! ", "background: #10b981; color: #fff; font-weight: bold; padding: 2px 5px; border-radius: 4px;");
      } catch (e) {
        console.warn("[PRE-WARM] Heartbeat failed, server might still be booting or offline.");
      }
    };
    warmUp();
  }, []);
  // ----------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password')
      return
    }

    setIsLoading(true)
    try {
      const result = await login(username, password)
      if (result.twoFactorRequired) {
        router.push(`/otp?email=${encodeURIComponent(result.email || '')}`)
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 sm:p-6"
    >
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-2xl px-6 sm:px-10 py-8 sm:py-12 shadow-xl border border-slate-200 dark:border-slate-800">
          {/* Logo — large, centered, no subtitle */}
          <div className="flex justify-center mb-8">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-50 dark:border-indigo-900/30 shadow-md">
              <img
                src="/logo.jpeg"
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 p-3 rounded-xl flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <AlertCircle className="text-red-500 flex-shrink-0" size={18} />
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-600 mb-1.5 font-inter">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={isLoading}
                className="w-full input-standard border-2"
                style={{ border: '2px solid #e0e0e0' }}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-600 mb-1.5 font-inter">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isLoading}
                  className="w-full input-standard pr-12 border-2"
                  style={{ border: '2px solid #e0e0e0' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-standard bg-indigo-600 text-white shadow-md py-3.5"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  <span>Signing in...</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-xs uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* New Student Registration Button */}
          <button
            onClick={() => router.push('/register')}
            className="w-full btn-standard border-2 border-indigo-200 bg-indigo-50/10 text-indigo-600 hover:bg-indigo-50"
          >
            <UserPlus size={18} />
            New Student Registration
          </button>
        </div>
      </div>

      {/* Cash Payment Notice (Wide Horizontal Banner) */}
      <div className="mt-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="p-6 rounded-[24px] border border-red-200 bg-red-50/50 dark:bg-rose-950/20 dark:border-rose-900/50 shadow-sm relative overflow-hidden group">
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 relative z-10 transition-transform duration-500">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center shrink-0 border border-rose-200/50">
              <AlertCircle className="text-rose-600 dark:text-rose-400" size={24} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 flex-1">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest pl-0.5 font-poppins">Instruction (English)</p>
                <p className="text-rose-900 dark:text-rose-200 text-[13.5px] font-medium leading-relaxed text-center lg:text-left font-inter">
                  For admission through cash payment, you have to visit the <span className="text-rose-600 font-semibold decoration-rose-500/30 underline-offset-4 decoration-2">Balkanji Ni Bari, Nadiad</span> office between <strong>15 April to 25 April</strong> during <strong>5:00 PM to 7:00 PM</strong> for filling the online form with cash. Students who need help filling the online form may also visit the office during the same hours.
                </p>
              </div>
              <div className="space-y-2 border-t lg:border-t-0 lg:border-l border-rose-200/50 pt-6 lg:pt-0 lg:pl-12">
                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest pl-0.5 font-poppins">સૂચના (ગુજરાતી)</p>
                <p className="text-rose-900 dark:text-rose-200 text-[13.5px] font-medium leading-relaxed text-center lg:text-left font-inter" lang="gu">
                  રોકડ ચૂકવણી દ્વારા પ્રવેશ માટે, <span className="text-rose-600 font-semibold">૧૫ એપ્રિલ થી ૨૫ એપ્રિલ</span> દરમિયાન <span className="font-semibold">સાંજે ૫:૦૦ થી ૭:૦૦ વાગ્યા</span> સુધી બાળકાંજી ની બારી, નડિયાદ ઓફિસમાં રૂબરૂ આવવું. ઓનલાઈન ફોર્મ ભરવામાં मदद જોઈતી હોય તેવા વિદ્યાર્થીઓ પણ ઉક્ત સમય દરમિયાન ઓફિસની મુલાકાત લઈ શકે છે.
                </p>
              </div>
            </div>
          </div>
          {/* Subtle radial glow background decoration */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-rose-200/20 rounded-full blur-3xl pointer-events-none" />
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-gray-400 text-xs mt-8 font-inter">
        © 2026 Balkan-Ji-Bari, NADIAD. All rights reserved.
      </p>
    </div>
  )
}
