/**
 * Subjects and Enrollments API service
 */

import apiClient from './client';
import { ApiResponse } from './auth';

export interface Subject {
    id: number;
    name: string;
    description: string;
    category: 'EDUCATION' | 'MUSIC' | 'ART' | 'SPORTS' | 'DANCE' | 'OTHER';
    activity_type: 'SUMMER_CAMP' | 'YEAR_ROUND';
    duration_months?: number | null;
    timing_schedule?: string;
    monthly_fee?: string | null;
    instructor_name: string;
    is_active: boolean;
    fee_structure: {
        fee_amount: number;
    } | null;
    current_fee: {
        amount: string;
        duration: string;
    } | null;
    max_seats: number;
    enrolled_count: number;
    created_at: string;
}

export interface Enrollment {
    id: number;
    enrollment_id: string;
    student: {
        id: number;
        student_id: string;
        name: string;
    };
    subject: {
        id: number;
        name: string;
    };
    enrollment_date: string;
    status: 'ACTIVE' | 'COMPLETED' | 'DROPPED';
    total_fee: string;
    paid_amount: string;
    pending_amount: string;
    payment_status: string;
    created_at: string;
}

export interface CreateEnrollmentData {
    student_id: number;
    subject_id: number;
    batch_time?: string;
}

export const subjectsApi = {
    /**
     * Get all subjects with optional activity type filter
     */
    getAll: async (params?: { activity_type?: 'SUMMER_CAMP' | 'YEAR_ROUND' }): Promise<ApiResponse<Subject[]>> => {
        const response = await apiClient.get<ApiResponse<Subject[]>>(
            '/api/v1/subjects/',
            { params }
        );
        return response.data;
    },

    /**
     * Get subject by ID
     */
    getById: async (id: number): Promise<ApiResponse<Subject>> => {
        const response = await apiClient.get<ApiResponse<Subject>>(
            `/api/v1/subjects/${id}/`
        );
        return response.data;
    },

    /**
     * Create new subject
     */
    create: async (data: {
        name: string;
        description: string;
        fee_amount: number;
        max_seats?: number;
    }): Promise<ApiResponse<Subject>> => {
        const response = await apiClient.post<ApiResponse<Subject>>(
            '/api/v1/subjects/',
            data
        );
        return response.data;
    },

    /**
     * Update subject
     */
    update: async (id: number, data: {
        name?: string;
        description?: string;
        fee_amount?: number;
        max_seats?: number;
    }): Promise<ApiResponse<Subject>> => {
        const response = await apiClient.put<ApiResponse<Subject>>(
            `/api/v1/subjects/${id}/`,
            data
        );
        return response.data;
    },

    /**
     * Delete subject
     */
    delete: async (id: number): Promise<ApiResponse<any>> => {
        const response = await apiClient.delete<ApiResponse<any>>(
            `/api/v1/subjects/${id}/`
        );
        return response.data;
    },
};

export const enrollmentsApi = {
    /**
     * Get all enrollments with optional student and activity type filters
     */
    getAll: async (params?: {
        student_id?: number;
        activity_type?: 'SUMMER_CAMP' | 'YEAR_ROUND';
        page?: number;
        page_size?: number;
    }): Promise<any> => {
        const response = await apiClient.get('/api/v1/enrollments/', { params });
        return response.data;
    },

    /**
     * Get enrollment by ID
     */
    getById: async (id: number): Promise<ApiResponse<Enrollment>> => {
        const response = await apiClient.get<ApiResponse<Enrollment>>(
            `/api/v1/enrollments/${id}/`
        );
        return response.data;
    },

    /**
     * Create new enrollment
     */
    create: async (
        data: CreateEnrollmentData
    ): Promise<ApiResponse<Enrollment>> => {
        const response = await apiClient.post<ApiResponse<Enrollment>>(
            '/api/v1/enrollments/',
            data
        );
        return response.data;
    },

    /**
     * Delete enrollment
     */
    delete: async (id: number): Promise<ApiResponse<any>> => {
        const response = await apiClient.delete<ApiResponse<any>>(
            `/api/v1/enrollments/${id}/`
        );
        return response.data;
    },

    /**
     * Process refund for enrollment deletion (Admin only)
     */
    processRefund: async (id: number): Promise<{
        success: boolean;
        message: string;
        refund_amount?: number;
        refund_payment_id?: number;
        refund_receipt?: string;
        error?: { message: string };
    }> => {
        const response = await apiClient.post(
            `/api/v1/enrollments/${id}/process-refund/`
        );
        return response.data;
    },

    downloadIdCard: async (id: number): Promise<void> => {
        try {
            const response = await apiClient.get(
                `/api/v1/enrollments/${id}/download-id-card/`,
                { responseType: 'blob' }
            );

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `ID_CARD_${id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error: any) {
            if (error.response?.data instanceof Blob) {
                const text = await error.response.data.text();
                try {
                    const json = JSON.parse(text);
                    if (json.error?.message) {
                        error.message = json.error.message;
                    }
                } catch (e) {
                    console.error('Failed to parse error blob as JSON', e);
                }
            }
            throw error;
        }
    },

    openIdCardInNewTab: async (id: number): Promise<void> => {
        try {
            const response = await apiClient.get(
                `/api/v1/enrollments/${id}/download-id-card/`,
                { responseType: 'blob' }
            );

            // Create blob URL and open in new tab
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');

            // Clean up the URL after a delay
            setTimeout(() => window.URL.revokeObjectURL(url), 100);
        } catch (error: any) {
            if (error.response?.data instanceof Blob) {
                const text = await error.response.data.text();
                try {
                    const json = JSON.parse(text);
                    if (json.error?.message) {
                        error.message = json.error.message;
                    }
                } catch (e) {
                    console.error('Failed to parse error blob as JSON', e);
                }
            }
            throw error;
        }
    },

    downloadReceipt: async (id: number): Promise<void> => {
        try {
            const response = await apiClient.get(
                `/api/v1/enrollments/${id}/download-receipt/`,
                { responseType: 'blob' }
            );

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Receipt_ENR_${id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error: any) {
            if (error.response?.data instanceof Blob) {
                const text = await error.response.data.text();
                try {
                    const json = JSON.parse(text);
                    if (json.error?.message) {
                        error.message = json.error.message;
                    }
                } catch (e) {
                    console.error('Failed to parse error blob as JSON', e);
                }
            }
            throw error;
        }
    },

    openReceiptInNewTab: async (id: number): Promise<void> => {
        try {
            const response = await apiClient.get(
                `/api/v1/enrollments/${id}/download-receipt/`,
                { responseType: 'blob' }
            );

            // Create blob URL and open in new tab
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');

            // Clean up the URL after a delay
            setTimeout(() => window.URL.revokeObjectURL(url), 100);
        } catch (error: any) {
            if (error.response?.data instanceof Blob) {
                const text = await error.response.data.text();
                try {
                    const json = JSON.parse(text);
                    if (json.error?.message) {
                        error.message = json.error.message;
                    }
                } catch (e) {
                    console.error('Failed to parse error blob as JSON', e);
                }
            }
            throw error;
        }
    },
};

