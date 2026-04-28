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
    class_mode: 'ONLINE' | 'OFFLINE' | 'BOTH';
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

export interface SubjectBatch {
    id: number;
    subject: number;
    batch_time: string;
    capacity_limit: number;
    is_active: boolean;
    enrolled_count: number;
    available_seats: number;
    is_full: boolean;
    created_at: string;
    updated_at: string;
}

export interface Enrollment {
    id: number;
    enrollment_id: string;
    student: {
        id: number;
        student_id: string;
        name: string;
        phone?: string;
    };
    subject: {
        id: number;
        name: string;
    };
    enrollment_date: string;
    created_at?: string;
    status: 'ACTIVE' | 'COMPLETED' | 'DROPPED';
    batch_time?: string;
    total_fee: string;
    paid_amount: string;
    pending_amount: string;
    payment_status: string;
    payment_mode?: string;
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

    /**
     * Batch Management Methods
     */

    /**
     * Get all batches for a subject
     */
    getBatches: async (subjectId: number): Promise<ApiResponse<SubjectBatch[]>> => {
        const response = await apiClient.get<ApiResponse<SubjectBatch[]>>(
            `/api/v1/subjects/${subjectId}/batches/`
        );
        return response.data;
    },

    /**
     * Create a new batch for a subject
     */
    createBatch: async (data: {
        subject: number;
        batch_time: string;
        capacity_limit: number;
        is_active?: boolean;
    }): Promise<ApiResponse<SubjectBatch>> => {
        const response = await apiClient.post<ApiResponse<SubjectBatch>>(
            `/api/v1/subjects/${data.subject}/batches/`,
            data
        );
        return response.data;
    },

    /**
     * Update batch capacity or status
     */
    updateBatch: async (subjectId: number, batchId: number, data: {
        batch_time?: string;
        capacity_limit?: number;
        is_active?: boolean;
    }): Promise<ApiResponse<SubjectBatch>> => {
        const response = await apiClient.patch<ApiResponse<SubjectBatch>>(
            `/api/v1/subjects/${subjectId}/batches/${batchId}/`,
            data
        );
        return response.data;
    },

    /**
     * Toggle batch active/inactive status
     */
    toggleBatchStatus: async (subjectId: number, batchId: number): Promise<ApiResponse<SubjectBatch>> => {
        const response = await apiClient.patch<ApiResponse<SubjectBatch>>(
            `/api/v1/subjects/${subjectId}/batches/${batchId}/toggle-status/`
        );
        return response.data;
    },

    /**
     * Delete a batch
     */
    deleteBatch: async (subjectId: number, batchId: number): Promise<ApiResponse<any>> => {
        const response = await apiClient.delete<ApiResponse<any>>(
            `/api/v1/subjects/${subjectId}/batches/${batchId}/`
        );
        return response.data;
    },
};

export const enrollmentsApi = {
    getDocumentRequestConfig: () => {
        const token = typeof window !== 'undefined'
            ? (sessionStorage.getItem('access_token') || localStorage.getItem('access_token'))
            : null;

        return {
            responseType: 'blob' as const,
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                Accept: 'application/pdf, application/json, */*',
            },
        };
    },

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
     * Update enrollment (PATCH)
     */
    update: async (id: number, data: any): Promise<ApiResponse<Enrollment>> => {
        const response = await apiClient.patch<ApiResponse<Enrollment>>(
            `/api/v1/enrollments/${id}/`,
            data
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
                enrollmentsApi.getDocumentRequestConfig()
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
            console.error('downloadIdCard failed:', error?.message || error);
            return;
        }
    },

    openIdCardInNewTab: async (id: number, targetWindow?: Window | null): Promise<void> => {
        try {
            const response = await apiClient.get(
                `/api/v1/enrollments/${id}/download-id-card/`,
                enrollmentsApi.getDocumentRequestConfig()
            );

            // Create blob URL and open in new tab
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            if (targetWindow && !targetWindow.closed) {
                targetWindow.location.href = url;
            } else {
                window.open(url, '_blank');
            }

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
            console.error('openIdCardInNewTab failed:', error?.message || error);
            return;
        }
    },

    downloadReceipt: async (id: number): Promise<void> => {
        try {
            const response = await apiClient.get(
                `/api/v1/enrollments/${id}/download-receipt/`,
                enrollmentsApi.getDocumentRequestConfig()
            );

            const contentDisposition = response.headers?.['content-disposition'] as string | undefined;
            const filenameMatch = contentDisposition?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
            const serverFilename = filenameMatch?.[1]?.replace(/['"]/g, '').trim();
            const downloadFilename = serverFilename || `receipt_${id}.pdf`;

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', downloadFilename);
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
            console.error('downloadReceipt failed:', error?.message || error);
            return;
        }
    },

    openReceiptInNewTab: async (id: number, targetWindow?: Window | null): Promise<void> => {
        try {
            const response = await apiClient.get(
                `/api/v1/enrollments/${id}/download-receipt/`,
                enrollmentsApi.getDocumentRequestConfig()
            );

            // Create blob URL and open in new tab
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            if (targetWindow && !targetWindow.closed) {
                targetWindow.location.href = url;
            } else {
                window.open(url, '_blank');
            }

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
            console.error('openReceiptInNewTab failed:', error?.message || error);
            return;
        }
    },

    /**
     * Clear pending dues by marking enrollment fully paid (Admin/Staff).
     */
    clearPending: async (id: number, payment_mode: 'CASH' | 'ONLINE'): Promise<ApiResponse<{ message: string }>> => {
        const response = await apiClient.post<ApiResponse<{ message: string }>>(
            `/api/v1/enrollments/${id}/clear-pending/`,
            { payment_mode }
        );
        return response.data;
    },

    bulkDownloadIdCards: async (params: {
        subject_id?: number;
        batch_time?: string;
        payment_mode?: 'ONLINE' | 'OFFLINE';
    }): Promise<void> => {
        try {
            const response = await apiClient.get(
                '/api/v1/enrollments/bulk-download-id-cards/',
                { 
                    params,
                    ...enrollmentsApi.getDocumentRequestConfig()
                }
            );

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            const filename = `Bulk_ID_Cards_${new Date().toISOString().slice(0, 10)}.pdf`;
            link.setAttribute('download', filename);
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
            console.error('bulkDownloadIdCards failed:', error?.message || error);
            throw error;
        }
    },
};

