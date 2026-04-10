/**
 * Users management API service
 */

import apiClient from './client';
import { ApiResponse, User } from './auth';

export interface CreateUserData {
    username: string;
    email: string;
    full_name: string;
    password?: string;
    role: 'ADMIN' | 'STAFF' | 'STUDENT' | 'ACCOUNTANT';
    phone_number?: string;
    address?: string;
    area?: string;
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
}

export const usersApi = {
    /**
     * Get all users
     */
    getAll: async (): Promise<ApiResponse<User[]>> => {
        const response = await apiClient.get<ApiResponse<User[]>>(
            '/api/v1/auth/users/'
        );
        return response.data;
    },

    /**
     * Create new user
     */
    create: async (data: CreateUserData): Promise<ApiResponse<User>> => {
        const response = await apiClient.post<ApiResponse<User>>(
            '/api/v1/auth/users/',
            data
        );
        return response.data;
    },

    /**
     * Update user
     */
    update: async (id: number, data: Partial<CreateUserData>): Promise<ApiResponse<User>> => {
        const response = await apiClient.put<ApiResponse<User>>(
            `/api/v1/auth/users/${id}/`,
            data
        );
        return response.data;
    },

    /**
     * Delete user
     */
    delete: async (id: number): Promise<ApiResponse<any>> => {
        const response = await apiClient.delete<ApiResponse<any>>(
            `/api/v1/auth/users/${id}/`
        );
        return response.data;
    }
};
