'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';
import { Bell, Mail, MessageSquare, Phone, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function NotificationSettings() {
    const { user, refreshUser } = useAuth();
    const [preferences, setPreferences] = useState({
        notify_email: true,
        notify_whatsapp: true,
        notify_sms: false,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        if (user) {
            setPreferences({
                notify_email: user.notify_email ?? true,
                notify_whatsapp: user.notify_whatsapp ?? true,
                notify_sms: user.notify_sms ?? false,
            });
        }
    }, [user]);

    const handleToggle = (key: keyof typeof preferences) => {
        setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        setStatus(null);
        try {
            const response = await authApi.updateProfile(preferences);
            if (response.success) {
                setStatus({ type: 'success', message: 'Preferences updated!' });
                await refreshUser();
            } else {
                setStatus({ type: 'error', message: 'Failed to update preferences.' });
            }
        } catch (err: any) {
            setStatus({
                type: 'error',
                message: err.response?.data?.error?.message || 'Something went wrong.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <Bell size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white font-poppins">Notification Preferences</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-inter">Manage how you receive alerts and updates</p>
                </div>
            </div>

            {status && (
                <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                    }`}>
                    {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <p className="font-medium text-sm">{status.message}</p>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
                {/* Email Notifications */}
                <div className="p-6 flex items-center justify-between">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <Mail size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800 font-poppins">Email Notifications</h4>
                            <p className="text-sm text-gray-500 font-inter">Receive summaries and security alerts via email.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleToggle('notify_email')}
                        className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 focus:outline-none ${preferences.notify_email ? 'bg-indigo-600' : 'bg-gray-200'}`}
                    >
                        <div className={`w-6 h-6 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${preferences.notify_email ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>

                {/* WhatsApp Notifications */}
                <div className="p-6 flex items-center justify-between">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600">
                            <MessageSquare size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800 font-poppins">WhatsApp Alerts</h4>
                            <p className="text-sm text-gray-500 font-inter">Get instant updates for payments and registration.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleToggle('notify_whatsapp')}
                        className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 focus:outline-none ${preferences.notify_whatsapp ? 'bg-indigo-600' : 'bg-gray-200'}`}
                    >
                        <div className={`w-6 h-6 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${preferences.notify_whatsapp ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>

                {/* SMS Notifications */}
                <div className="p-6 flex items-center justify-between">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                            <Phone size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800 font-poppins">SMS Notifications</h4>
                            <p className="text-sm text-gray-500 font-inter">Receive critical alerts via text message.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleToggle('notify_sms')}
                        className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 focus:outline-none ${preferences.notify_sms ? 'bg-indigo-600' : 'bg-gray-200'}`}
                    >
                        <div className={`w-6 h-6 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${preferences.notify_sms ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>

                <div className="p-6 bg-slate-50/50 dark:bg-slate-800/20">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="btn-standard bg-indigo-600 text-white shadow-md w-full sm:w-auto sm:ml-auto px-8 font-semibold font-poppins"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                Saving...
                            </>
                        ) : 'Save Preferences'}
                    </button>
                </div>
            </div>
        </div>
    );
}
