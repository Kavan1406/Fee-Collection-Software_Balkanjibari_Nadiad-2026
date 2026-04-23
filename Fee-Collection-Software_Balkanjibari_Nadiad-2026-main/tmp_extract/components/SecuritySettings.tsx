'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, ShieldAlert, ShieldCheck, QrCode, AlertTriangle, Key, Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function SecuritySettings() {
    const { user, setup2FA, verify2FA, disable2FA, refreshUser, changePassword } = useAuth();
    const [isSettingUp, setIsSettingUp] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [secret, setSecret] = useState<string | null>(null);
    const [otpCode, setOtpCode] = useState('');

    // Password Change State
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleEnableClick = async () => {
        setIsLoading(true);
        setError('');
        setSuccess('');
        try {
            console.log('Initializing 2FA setup...');
            const data = await setup2FA();
            setQrCode(data.qrCode);
            setSecret(data.secret);
            setIsSettingUp(true);
        } catch (err: any) {
            console.error('2FA Setup Init Error:', err);
            setError(err.message || 'Failed to initialize 2FA setup');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifySetup = async () => {
        if (otpCode.length !== 6) {
            setError('Please enter a 6-digit code.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            console.log(`Verifying 2FA setup for ${user?.email} with code: ${otpCode}`);
            await verify2FA(user!.email, otpCode);
            setSuccess('Two-factor authentication enabled successfully!');
            setIsSettingUp(false);
            setQrCode(null);
            setOtpCode('');
            await refreshUser();
        } catch (err: any) {
            console.error('2FA Verification Error:', err);
            setError(err.message || 'Invalid OTP code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisable = async () => {
        const code = prompt('Please enter your current 6-digit OTP to disable 2FA:');
        if (!code) return;

        setIsLoading(true);
        setError('');
        try {
            await disable2FA(code);
            setSuccess('Two-factor authentication has been disabled.');
            await refreshUser();
        } catch (err: any) {
            setError(err.message || 'Failed to disable 2FA. Correct OTP is required.');
        } finally {
            setIsLoading(false);
        }
    };

    if (user?.role === 'STUDENT') {
        return (
            <div className="p-8 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">
                2FA is currently only available for Admin and Staff accounts.
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl text-indigo-600 dark:text-indigo-400 shadow-sm shrink-0">
                    <Shield size={22} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight font-poppins">Security Terminal</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest leading-none mt-1">Manage authentication & 2FA</p>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 flex items-center gap-3 text-rose-700 animate-in fade-in slide-in-from-top-2 duration-300">
                    <ShieldAlert size={20} />
                    <p className="text-xs font-bold uppercase tracking-widest">{error}</p>
                </div>
            )}

            {success && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-3 text-emerald-700 animate-in fade-in slide-in-from-top-2 duration-300">
                    <ShieldCheck size={20} />
                    <p className="text-xs font-bold uppercase tracking-widest">{success}</p>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                    <Key size={20} className="text-blue-600" />
                    <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight font-poppins">Change Password</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 font-inter">Current Password</label>
                        <input
                            type="password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            className="w-full h-11 input-standard text-sm font-medium"
                            placeholder="••••••••"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 font-inter">New Password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full h-11 input-standard text-sm font-medium"
                            placeholder="••••••••"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 font-inter">Confirm New Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full h-11 input-standard text-sm font-medium"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={async () => {
                            if (newPassword !== confirmPassword) {
                                setError('Passwords do not match');
                                return;
                            }
                            setIsLoading(true);
                            setError('');
                            try {
                                await changePassword(oldPassword, newPassword);
                                setSuccess('Password changed successfully!');
                                setOldPassword('');
                                setNewPassword('');
                                setConfirmPassword('');
                            } catch (err: any) {
                                setError(err.message || 'Failed to change password');
                            } finally {
                                setIsLoading(false);
                            }
                        }}
                        disabled={isLoading || !oldPassword || !newPassword}
                        className="w-full sm:w-auto h-12 px-10 rounded-xl font-bold text-[11px] uppercase tracking-widest bg-slate-900 text-white shadow-lg shadow-black/10 hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale font-poppins"
                    >
                        {isLoading ? <Loader2 className="animate-spin invisible" size={18} /> : 'Update Password'}
                        {isLoading && <Loader2 className="animate-spin absolute" size={18} />}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                        <h3 className="font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2 uppercase tracking-tight font-poppins text-sm">
                            Two-Factor Authentication (TOTP)
                            {user?.is_2fa_enabled && (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm border border-emerald-100 font-inter">
                                    <ShieldCheck size={12} />
                                    Active
                                </span>
                            )}
                        </h3>
                        <p className="text-[11px] sm:text-[12px] font-medium text-slate-500 max-w-md leading-relaxed font-inter">
                            Add an extra layer of security to your account by requiring a 6-digit code from an authenticator app when you log in.
                        </p>
                    </div>

                    {!isSettingUp && (
                        <div className="w-full sm:w-auto">
                            {user?.is_2fa_enabled ? (
                                <button
                                    onClick={handleDisable}
                                    disabled={isLoading}
                                    className="w-full sm:w-auto h-11 px-8 rounded-xl font-bold text-[11px] uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all active:scale-[0.98] font-poppins"
                                >
                                    Disable 2FA
                                </button>
                            ) : (
                                <button
                                    onClick={handleEnableClick}
                                    disabled={isLoading}
                                    className="w-full sm:w-auto h-11 px-8 rounded-xl font-bold text-[11px] uppercase tracking-widest bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-[0.98] font-poppins"
                                >
                                    Enable 2FA
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {isSettingUp && qrCode && (
                    <div className="mt-6 p-4 sm:p-8 bg-indigo-50/10 rounded-2xl border border-indigo-100/50 space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-blue-600 font-bold uppercase tracking-widest text-[11px] font-poppins">
                                        <QrCode size={18} />
                                        <span>Step 1: Scan QR Code</span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed font-inter">
                                        Open your authenticator app (e.g., Google Authenticator, Microsoft Authenticator, or Authy) and scan this QR code to add your account.
                                    </p>
                                </div>

                                <div className="bg-white p-4 rounded-2xl shadow-md inline-block border border-slate-100 mx-auto md:mx-0">
                                    <img src={qrCode} alt="2FA QR Code" className="w-40 h-40 sm:w-48 sm:h-48" />
                                </div>

                                <div className="p-4 bg-white/60 dark:bg-black/20 rounded-xl border border-dashed border-blue-200">
                                    <p className="text-[10px] text-blue-500 uppercase font-bold tracking-widest mb-2">Manual Entry Key</p>
                                    <p className="text-xs font-mono text-slate-600 dark:text-slate-400 break-all bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800">{secret}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-blue-600 font-bold uppercase tracking-widest text-[11px] font-poppins">
                                        <Key size={18} />
                                        <span>Step 2: Verify Setup</span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed font-inter">
                                        Enter the 6-digit code from your app to confirm everything is working correctly.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                        placeholder="000000"
                                        className="w-full h-[72px] rounded-2xl text-center text-4xl tracking-[0.5em] font-bold text-blue-600 bg-white border-2 border-blue-100 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-poppins"
                                    />
                                    <button
                                        onClick={handleVerifySetup}
                                        disabled={isLoading || otpCode.length !== 6}
                                        className="w-full h-14 rounded-xl bg-blue-600 text-white shadow-xl shadow-blue-500/20 text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 font-poppins"
                                    >
                                        {isLoading ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'Activate 2FA'}
                                    </button>
                                    <button
                                        onClick={() => setIsSettingUp(false)}
                                        className="w-full py-2 text-xs text-slate-400 font-bold uppercase tracking-widest hover:text-slate-600 transition-all font-poppins"
                                    >
                                        Cancel Setup
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                            <AlertTriangle className="text-amber-500 shrink-0" size={18} />
                            <p className="text-[11px] text-amber-800 font-bold uppercase tracking-tight leading-relaxed">
                                <span className="text-rose-600">🛡️ Important:</span> If you lose access to your authenticator app, you will need to contact a super-admin to reset your 2FA. Save your Manual Entry Key in a secure place.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
