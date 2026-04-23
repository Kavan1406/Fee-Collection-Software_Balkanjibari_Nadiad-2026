/**
 * Authentication API service
 */

import apiClient from './client';

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface User {
    id: number;
    username: string;
    email: string;
    full_name: string;
    role: 'ADMIN' | 'STAFF' | 'STUDENT' | 'ACCOUNTANT';
    phone_number: string;
    address: string;
    area: string;
    can_view_dashboard?: boolean;
    can_view_registration_requests?: boolean;
    can_view_students?: boolean;
    can_view_subjects?: boolean;
    can_view_enrollments?: boolean;
    can_view_payments?: boolean;
    can_view_analytics?: boolean;
    can_view_reports?: boolean;
    can_view_users?: boolean;
    can_view_settings?: boolean;
    is_two_factor_enabled?: boolean;
    is_active?: boolean;
    notify_email?: boolean;
    notify_whatsapp?: boolean;
    notify_sms?: boolean;
    is_2fa_enabled?: boolean;
    photo?: string | null;
}

export interface LoginResponse {
    success: boolean;
    two_factor_required?: boolean;
    email?: string;
    message?: string;
    data?: {
        access: string;
        refresh: string;
        user: User;
    };
}

export interface Setup2FAResponse {
    success: boolean;
    qr_code: string;
    secret: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        code: number;
        details: Record<string, unknown>;
    };
}

export const authApi = {
    /**
     * Login with username and password
     */
    login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
        const response = await apiClient.post<LoginResponse>(
            `/api/v1/auth/login/?_t=${Date.now()}`,
            credentials,
            { timeout: 180000 } // Extended timeout for cold-starts
        );
        return response.data;
    },

    /**
     * Logout and blacklist refresh token
     */
    logout: async (refreshToken: string): Promise<void> => {
        await apiClient.post('/api/v1/auth/logout/', {
            refresh: refreshToken,
        });
    },

    /**
     * Get current user details
     */
    getCurrentUser: async (): Promise<ApiResponse<User>> => {
        const response = await apiClient.get<ApiResponse<User>>(`/api/v1/auth/me/?_t=${Date.now()}`);
        return response.data;
    },

    /**
     * Change password
     */
    changePassword: async (
        oldPassword: string,
        newPassword: string
    ): Promise<ApiResponse<{ message: string }>> => {
        const response = await apiClient.post<ApiResponse<{ message: string }>>(
            '/api/v1/auth/password/change/',
            {
                old_password: oldPassword,
                new_password: newPassword,
            }
        );
        return response.data;
    },
    /**
     * Update user profile
     */
    updateProfile: async (data: Partial<User>): Promise<ApiResponse<User>> => {
        const response = await apiClient.put<ApiResponse<User>>(
            '/api/v1/auth/profile/update/',
            data
        );
        return response.data;
    },

    /**
     * Verify 2FA OTP code
     */
    verify2FA: async (email: string, otpCode: string): Promise<LoginResponse> => {
        const response = await apiClient.post<LoginResponse>(
            '/api/v1/auth/2fa/verify/',
            { email, otp_code: otpCode },
            { timeout: 180000 } // Extended timeout for cold-starts
        );
        return response.data;
    },

    /**
     * Setup 2FA - gets QR code
     */
    setup2FA: async (): Promise<Setup2FAResponse> => {
        const response = await apiClient.post<Setup2FAResponse>('/api/v1/auth/2fa/setup/');
        return response.data;
    },

    /**
     * Disable 2FA
     */
    disable2FA: async (otpCode: string, userId?: number): Promise<ApiResponse<{ message: string }>> => {
        const response = await apiClient.post<ApiResponse<{ message: string }>>(
            '/api/v1/auth/2fa/disable/',
            { otp_code: otpCode, user_id: userId }
        );
        return response.data;
    },
};
