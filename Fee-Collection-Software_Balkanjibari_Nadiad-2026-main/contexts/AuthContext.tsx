/**
 * Authentication Context
 * Manages user authentication state and provides auth methods
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, User } from '@/lib/api';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<{ twoFactorRequired: boolean; email?: string; user?: User }>;
    verify2FA: (email: string, otpCode: string) => Promise<void>;
    setup2FA: () => Promise<{ qrCode: string; secret: string }>;
    disable2FA: (otpCode: string, userId?: number) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check if user is already logged in on mount
    useEffect(() => {
        const initAuth = async () => {
            const token = sessionStorage.getItem('access_token');
            if (token) {
                try {
                    const response = await authApi.getCurrentUser();
                    if (response.success && response.data) {
                        setUser(response.data);
                    } else {
                        // Token invalid, clear storage
                        sessionStorage.clear();
                    }
                } catch (error) {
                    console.error('Failed to fetch user:', error);
                    sessionStorage.clear();
                }
            }
            setIsLoading(false);
        };

        const setMockUser = (role: 'ADMIN' | 'STAFF' | 'STUDENT') => {
            console.warn(`TEMPORARY LOGIN BYPASS ENABLED. Setting mock ${role} user.`);
            setUser({
                id: role === 'ADMIN' ? 1 : (role === 'STAFF' ? 2 : 3),
                username: role.toLowerCase(),
                email: `${role.toLowerCase()}@example.com`,
                full_name: `System ${role} (Bypass Mode)`,
                role: role,
                phone_number: '0000000000',
                address: 'Temp Bypass',
                area: 'Temp Bypass',
                is_active: true
            });
        };

        initAuth();
    }, []);

    const login = async (username: string, password: string) => {
        try {
            const response = await authApi.login({ username, password });

            if (response.success && response.two_factor_required) {
                return { twoFactorRequired: true, email: response.email };
            }

            if (response.success && response.data) {
                const { access, refresh, user: userData } = response.data;
                sessionStorage.setItem('access_token', access);
                sessionStorage.setItem('refresh_token', refresh);
                setUser(userData);
                return { twoFactorRequired: false, user: userData };
            } else {
                throw new Error('Login failed');
            }
        } catch (error: any) {
            console.error('Login error:', error);
            if (!error.response) {
                throw new Error('Server connection timed out or network error. Please ensure the backend is running.');
            }
            throw new Error(error.response?.data?.error?.message || 'Invalid username or password.');
        }
    };

    const verify2FA = async (email: string, otpCode: string) => {
        try {
            const response = await authApi.verify2FA(email, otpCode);
            if (response.success && response.data) {
                const { access, refresh, user: userData } = response.data;
                sessionStorage.setItem('access_token', access);
                sessionStorage.setItem('refresh_token', refresh);
                setUser(userData);
            } else {
                throw new Error(response.message || 'Verification failed');
            }
        } catch (error: any) {
            console.error('Verify 2FA error:', error);
            const errorMessage = typeof error.response?.data?.error === 'string'
                ? error.response.data.error
                : (error.response?.data?.error?.message || error.message || 'Invalid OTP code');
            throw new Error(errorMessage);
        }
    };

    const setup2FA = async () => {
        const response = await authApi.setup2FA();
        if (response.success) {
            return { qrCode: response.qr_code, secret: response.secret };
        }
        throw new Error('Failed to setup 2FA');
    };

    const disable2FA = async (otpCode: string, userId?: number) => {
        const response = await authApi.disable2FA(otpCode, userId);
        if (!response.success) {
            throw new Error(response.error?.message || 'Failed to disable 2FA');
        }
    };

    const logout = async () => {
        try {
            const refreshToken = sessionStorage.getItem('refresh_token');
            if (refreshToken) {
                await authApi.logout(refreshToken);
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear tokens and user state
            sessionStorage.clear();
            setUser(null);
        }
    };

    const refreshUser = async () => {
        try {
            const response = await authApi.getCurrentUser();
            if (response.success && response.data) {
                setUser(response.data);
            }
        } catch (error) {
            console.error('Failed to refresh user:', error);
        }
    };

    const changePassword = async (oldPassword: string, newPassword: string) => {
        const response = await authApi.changePassword(oldPassword, newPassword);
        if (!response.success) {
            throw new Error(response.error?.message || 'Failed to change password');
        }
    };

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        verify2FA,
        setup2FA,
        disable2FA,
        logout,
        refreshUser,
        changePassword,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
