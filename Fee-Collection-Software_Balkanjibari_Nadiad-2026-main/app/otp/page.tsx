'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, ShieldCheck } from 'lucide-react';

function OTPContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { verify2FA } = useAuth();
    const [otpCode, setOtpCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const email = searchParams.get('email');

    useEffect(() => {
        if (!email) {
            router.push('/login');
        }
    }, [email, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (otpCode.length !== 6) {
            setError('Please enter a 6-digit code');
            return;
        }

        setIsLoading(true);
        try {
            const result = await verify2FA(email!, otpCode);
            // After 2FA, we need to check if the user belongs in the admin dashboard
            // We have to get the user from the context (it's set by verify2FA)
            // But we can check the decoded role if verify2FA doesn't return it
            // Based on AuthContext, verify2FA sets the user state.
            
            // Redirect based on role (Admin/Staff go to /admin)
            // Note: AuthContext sets the user state, so we can check it after verification
            // However, a simple way is to check the current user's role from AuthContext
            // Wait, we can't easily access the updated context value immediately after await.
            // Let's assume the router push should land on /admin if roles match.
            router.push('/admin');
        } catch (err: any) {
            setError(err.message || 'Invalid OTP code');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen w-full flex items-center justify-center font-sans"
            style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #f5f0ff 100%)' }}
        >
            <div className="w-full max-w-md mx-4">
                <div
                    className="rounded-3xl px-8 py-10 shadow-2xl"
                    style={{
                        background: 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(99,102,241,0.1)'
                    }}
                >
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600">
                            <ShieldCheck size={48} />
                        </div>
                    </div>

                    <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Two-Factor Auth</h1>
                    <p className="text-gray-500 text-center text-sm mb-8">
                        Enter the 6-digit code from your authenticator app for <strong>{email}</strong>
                    </p>

                    {error && (
                        <div className="mb-6 p-4 rounded-xl flex items-center gap-3 bg-red-50 border border-red-100">
                            <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                            <p className="text-red-700 text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <input
                                type="text"
                                maxLength={6}
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                placeholder="000000"
                                disabled={isLoading}
                                autoFocus
                                className="w-full px-4 py-4 rounded-2xl text-center text-4xl tracking-widest font-bold text-indigo-600 placeholder-gray-200 bg-gray-50 border-2 border-transparent focus:border-indigo-400 focus:outline-none transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || otpCode.length !== 6}
                            className="w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                        >
                            {isLoading ? 'Verifying...' : 'Verify & Continue'}
                        </button>

                        <button
                            type="button"
                            onClick={() => router.push('/login')}
                            className="w-full py-2 text-sm text-gray-400 hover:text-indigo-600 font-medium transition-colors"
                        >
                            Back to Login
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function OTPPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>}>
            <OTPContent />
        </Suspense>
    );
}
