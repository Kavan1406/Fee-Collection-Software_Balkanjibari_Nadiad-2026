/**
 * Students API service
 */

import apiClient from './client';
import { ApiResponse } from './auth';

export interface Student {
    id: number;
    student_id: string;
    login_username?: string;
    login_password_hint?: string;
    name: string;
    age?: number;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    date_of_birth?: string;
    parent_name: string;
    phone: string;
    address: string;
    area: string;
    email: string;
    blood_group: string;
    photo?: string;
    enrollment_date: string;
    status: 'ACTIVE' | 'INACTIVE' | 'GRADUATED';
    payment_status: string;
    total_enrollments: number;
    total_fees: number;
    total_paid: number;
    total_pending: number;
    paid_enrollments?: { id: number; subject_name: string }[];
    enrollments?: {
        id: number;
        subject_id: number;
        subject_name: string;
        batch_time: string;
        include_library_fee: boolean;
        total_fee: number;
        paid_amount: number;
        pending_amount: number;
        status: string;
    }[];
    created_at: string;
    updated_at: string;
}

export interface CreateStudentData {
    name: string;
    age: number;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    date_of_birth?: string;
    parent_name: string;
    phone: string;
    address: string;
    area: string;
    email?: string;
    blood_group?: string;
    enrollment_date?: string;
    enrollments?: { subject_id: number; batch_time: string }[];
    photo?: File | null;
}

export interface StudentPaginatedResponse<T> {
    success: boolean;
    count: number;
    next: string | null;
    previous: string | null;
    total_pages: number;
    current_page: number;
    results: T[];
}

export const studentsApi = {
    /**
     * Get all students with pagination and filters
     */
    getAll: async (params?: {
        page?: number;
        page_size?: number;
        search?: string;
        area?: string;
        status?: string;
    }): Promise<StudentPaginatedResponse<Student>> => {
        const response = await apiClient.get<StudentPaginatedResponse<Student>>(
            '/api/v1/students/',
            { params }
        );
        return response.data;
    },

    /**
     * Get student by ID
     */
    getById: async (id: number): Promise<ApiResponse<Student>> => {
        const response = await apiClient.get<ApiResponse<Student>>(
            `/api/v1/students/${id}/`
        );
        return response.data;
    },

    /**
     * Create new student
     */
    create: async (data: CreateStudentData): Promise<ApiResponse<Student>> => {
        const formData = new FormData();
        Object.keys(data).forEach(key => {
            const value = (data as any)[key];
            if (key === 'enrollments') {
                formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
            } else if (key === 'photo') {
                if (value instanceof File) {
                    formData.append(key, value);
                }
                // If photo is null or undefined, we explicitly skip appending it.
                // If it's a string (existing URL), it should not be sent via FormData for update.
                // For creation, it should only be a File or null/undefined.
            } else if (value !== null && value !== undefined) {
                formData.append(key, value);
            }
        });

        const response = await apiClient.post<ApiResponse<Student>>(
            '/api/v1/students/',
            formData
        );
        return response.data;
    },

    /**
     * Offline registration alias endpoint.
     */
    registerOffline: async (data: CreateStudentData): Promise<ApiResponse<Student>> => {
        const formData = new FormData();
        Object.keys(data).forEach(key => {
            const value = (data as any)[key];
            if (key === 'enrollments') {
                formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
            } else if (key === 'photo') {
                if (value instanceof File) {
                    formData.append(key, value);
                }
            } else if (value !== null && value !== undefined) {
                formData.append(key, value);
            }
        });

        try {
            const response = await apiClient.post<ApiResponse<Student>>(
                '/api/v1/students/register-offline/',
                formData
            );
            return response.data;
        } catch (error: any) {
            const status = error?.response?.status;
            if (status === 404 || status === 405) {
                const fallbackResponse = await apiClient.post<ApiResponse<Student>>(
                    '/api/v1/students/',
                    formData
                );
                return fallbackResponse.data;
            }
            throw error;
        }
    },

    /**
     * Update student
     */
    update: async (
        id: number,
        data: Partial<CreateStudentData>
    ): Promise<ApiResponse<Student>> => {
        const formData = new FormData();
        Object.keys(data).forEach(key => {
            const value = (data as any)[key];
            if (key === 'enrollments') {
                formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
            } else if (key === 'photo') {
                if (value instanceof File) {
                    formData.append(key, value);
                }
            } else if (value !== null && value !== undefined) {
                formData.append(key, value);
            }
        });

        const response = await apiClient.patch<ApiResponse<Student>>(
            `/api/v1/students/${id}/`,
            formData
        );
        return response.data;
    },

    /**
     * Delete student (soft delete)
     */
    delete: async (id: number): Promise<ApiResponse<{ message: string }>> => {
        const response = await apiClient.delete<ApiResponse<{ message: string }>>(
            `/api/v1/students/${id}/`
        );
        return response.data;
    },

    /**
     * Get current student profile
     */
    getMe: async (): Promise<ApiResponse<Student>> => {
        const response = await apiClient.get<ApiResponse<Student>>('/api/v1/students/me/');
        return response.data;
    },

    /**
     * Update student profile (students can only update photo, address, phone)
     */
    updateProfile: async (id: number, data: FormData): Promise<ApiResponse<Student>> => {
        const response = await apiClient.patch<ApiResponse<Student>>(
            `/api/v1/students/${id}/update_profile/`,
            data
        );
        return response.data;
    },

    /**
     * Import students from CSV
     */
    importCsv: async (file: File): Promise<any> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post('/api/v1/students/import-csv/', formData, {
            headers: { 'Content-Type': 'multipart/form-data ' }
        });
        return response.data;
    },
};

// ── Registration Request API ──────────────────────────────────────────────────

export interface RegistrationRequest {
    id: number;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    rejection_reason?: string;
    name: string;
    age?: number;
    gender?: string;
    date_of_birth?: string;
    photo?: string;
    parent_name?: string;
    phone: string;
    email?: string;
    address?: string;
    area?: string;
    blood_group?: string;
    enrollment_date?: string;
    payment_method: 'CASH' | 'ONLINE';
    subjects_data: { subject_id: number; subject_name: string; batch_time: string; include_library_fee: boolean }[];
    created_student_id?: string;
    created_at: string;
    updated_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export const registrationRequestsApi = {
    /** Public — submit a new registration request (no auth token) */
    submit: async (data: FormData): Promise<{ success: boolean; message: string; id?: number }> => {
        const response = await fetch(`${API_BASE}/api/v1/students/registration-requests/`, {
            method: 'POST',
            body: data,
        });
        const json = await response.json();

        if (response.ok && json.success) {
            return json;
        }

        // Extract a human-readable error message from any backend response shape
        let message = 'Submission failed. Please try again.';

        if (typeof json === 'object' && json !== null) {
            if (typeof json.message === 'string') {
                message = json.message;
            } else if (json.error) {
                // { success: false, error: { message: "..." } } or { error: "string" }
                if (typeof json.error === 'string') {
                    message = json.error;
                } else if (typeof json.error === 'object' && json.error.message) {
                    message = json.error.message;
                } else {
                    // error is an object with field-level errors
                    message = Object.entries(json.error)
                        .map(([f, v]) => `${f}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
                        .join(' | ');
                }
            } else if (json.detail) {
                message = String(json.detail);
            } else if (!json.success) {
                // DRF field-level errors at top level: { name: ["required"], phone: ["..."] }
                const entries = Object.entries(json).filter(([k]) => k !== 'success');
                if (entries.length > 0) {
                    message = entries
                        .map(([f, v]) => `${f}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
                        .join(' | ');
                }
            }
        }

        return { success: false, message };
    },

    /** Admin — create a new registration request directly */
    adminCreate: async (data: FormData): Promise<{ success: boolean; message: string; id?: number }> => {
        const response = await apiClient.post('/api/v1/students/registration-requests/', data);
        return response.data;
    },


    /** Admin — list all requests, optionally filtered by status */
    list: async (status?: string): Promise<{ success: boolean; results?: RegistrationRequest[]; data?: RegistrationRequest[] }> => {
        const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
        const url = `${API_BASE}/api/v1/students/registration-requests/${status ? `?status=${status}` : ''}`;
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.json();
    },

    /** Admin — accept a request */
    accept: async (id: number): Promise<{
        success: boolean;
        message?: string;
        student_id?: string;
        login_username?: string;
        login_password_hint?: string;
        payment_status?: string;
        enrollment_id?: number;
        payment_id?: number;
        error?: any
    }> => {
        const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
        const response = await fetch(`${API_BASE}/api/v1/students/registration-requests/${id}/accept/`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.json();
    },

    /** Admin — reject a request */
    reject: async (id: number, reason: string): Promise<{ success: boolean; message?: string }> => {
        const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
        const response = await fetch(`${API_BASE}/api/v1/students/registration-requests/${id}/reject/`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason }),
        });
        return response.json();
    },
};

