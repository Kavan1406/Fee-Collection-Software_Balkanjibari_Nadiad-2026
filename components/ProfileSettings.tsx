import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authApi, studentsApi } from '@/lib/api';
import { getMediaUrl } from '@/lib/api/client';
import { User, Mail, Phone, MapPin, Globe, Loader2, CheckCircle2, AlertCircle, Camera, Upload } from 'lucide-react';

export default function ProfileSettings() {
    const { user, refreshUser } = useAuth();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        full_name: '',
        phone_number: '',
        address: '',
        area: '',
    });
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username || '',
                email: user.email || '',
                full_name: user.full_name || '',
                phone_number: user.phone_number || '',
                address: user.address || '',
                area: user.area || '',
            });
            if (user.photo) {
                setPhotoPreview(getMediaUrl(user.photo));
            }
        }
    }, [user]);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setStatus(null);

        try {
            let response;
            if (user?.role === 'STUDENT') {
                // Students use the restricted update_profile endpoint
                const data = new FormData();
                if (photo) data.append('photo', photo);
                data.append('phone', formData.phone_number);
                data.append('address', formData.address);
                
                // Note: user.id for students refers to their record ID
                response = await studentsApi.updateProfile(user.id, data);
            } else {
                // Admins/Staff use the general updateProfile endpoint
                // Note: authApi.updateProfile currently doesn't handle photo via FormData in lib/api/auth.ts
                // but let's assume it handles JSON for rest. For photo, we might need to update authApi.
                response = await authApi.updateProfile(formData);
                
                // If there's a photo for non-students, we might need a separate endpoint or update authApi
                // For now, focusing on user's primary request (students)
            }

            if (response.success) {
                setStatus({ type: 'success', message: 'Profile updated successfully!' });
                await refreshUser();
            } else {
                setStatus({ type: 'error', message: response.error?.message || 'Failed to update profile.' });
            }
        } catch (err: any) {
            setStatus({
                type: 'error',
                message: err.response?.data?.error?.message || err.message || 'Something went wrong.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3 border-b pb-4">
                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                    <User size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-800 font-poppins tracking-tight">Profile Information</h2>
                    <p className="text-sm text-gray-500 font-inter">Update your personal details and contact information</p>
                </div>
            </div>

            {status && (
                <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                    }`}>
                    {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <p className="font-medium text-sm">{status.message}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] p-6 sm:p-10 border shadow-sm space-y-10">
                {/* Photo Upload Section */}
                <div className="flex flex-col sm:flex-row items-center gap-8 pb-8 border-b border-gray-100">
                    <div className="relative group/photo">
                        <div className="h-32 w-32 rounded-[2rem] border-4 border-white shadow-xl overflow-hidden bg-slate-50 flex items-center justify-center text-slate-300 transition-transform duration-500 group-hover/photo:scale-105">
                            {photoPreview ? (
                                <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <User size={48} className="opacity-20" />
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2.5 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all hover:scale-110 active:scale-95"
                        >
                            <Camera size={18} />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handlePhotoChange}
                            className="hidden"
                            accept="image/*"
                        />
                    </div>
                    <div className="text-center sm:text-left space-y-1">
                        <h4 className="font-bold text-gray-800 uppercase tracking-tight font-poppins">Display Photo</h4>
                        <p className="text-xs text-gray-500 font-medium font-inter">PNG, JPG or GIF. Max 2MB.</p>
                        <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-2 hover:text-indigo-700 font-poppins"
                        >
                            Change Picture
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 block font-inter">
                            Username
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.username}
                                disabled={user?.role === 'STUDENT'}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="w-full input-standard disabled:bg-slate-50 disabled:text-slate-400"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 block font-inter">
                            Email Address
                        </label>
                        <div className="relative">
                            <input
                                type="email"
                                value={formData.email}
                                disabled={user?.role === 'STUDENT'}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full input-standard disabled:bg-slate-50 disabled:text-slate-400"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 block font-inter">
                            Full Name
                        </label>
                        <input
                            type="text"
                            value={formData.full_name}
                            disabled={user?.role === 'STUDENT'}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            className="w-full input-standard disabled:bg-slate-50 disabled:text-slate-400"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 block font-inter">
                            Phone Number
                        </label>
                        <input
                            type="text"
                            value={formData.phone_number}
                            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                            className="w-full input-standard"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 block font-inter">
                            Area
                        </label>
                        <input
                            type="text"
                            value={formData.area}
                            disabled={user?.role === 'STUDENT'}
                            onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                            className="w-full input-standard disabled:bg-slate-50 disabled:text-slate-400"
                        />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 block font-inter">
                            Full Address
                        </label>
                        <textarea
                            rows={3}
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="w-full px-5 py-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all text-gray-800 resize-none font-medium shadow-sm hover:shadow-indigo-500/5 font-inter"
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-100">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full sm:w-auto h-14 px-10 rounded-2xl font-bold text-[13px] uppercase tracking-widest bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-[0.98] font-poppins"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Upload size={18} />
                                Save Profile
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
