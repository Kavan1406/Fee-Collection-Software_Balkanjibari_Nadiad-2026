/**
 * Payments API service
 */

import apiClient from './client';
import { ApiResponse } from './auth';

export interface Payment {
    id: number;
    payment_id: string;
    receipt_number: string;
    enrollment: number;
    student_name: string;
    student_id: string;
    subject_name: string;
    amount: string;
    payment_date: string;
    payment_mode: 'CASH' | 'ONLINE';
    transaction_id: string;
    recorded_by: number;
    recorded_by_name: string;
    notes: string;
    created_at: string;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    status?: 'CREATED' | 'SUCCESS' | 'FAILED' | 'PENDING_CONFIRMATION';
    is_installment?: boolean;
    installment_number?: number;
}

export interface CreatePaymentData {
    enrollment_id: number;
    amount: number;
    payment_date: string;
    payment_mode: 'CASH' | 'ONLINE';
    transaction_id?: string;
    notes?: string;
}

export interface PaymentPaginatedResponse<T> {
    success: boolean;
    count: number;
    next: string | null;
    previous: string | null;
    total_pages: number;
    current_page: number;
    results: T[];
}

export const paymentsApi = {
    /**
     * Get all payments with pagination and filters
     */
    getAll: async (params?: {
        page?: number;
        page_size?: number;
        student_id?: number;
        search?: string;
        payment_mode?: string;
        start_date?: string;
        end_date?: string;
    }): Promise<PaymentPaginatedResponse<Payment>> => {
        const response = await apiClient.get<PaymentPaginatedResponse<Payment>>(
            '/api/v1/payments/',
            { params }
        );
        return response.data;
    },

    /**
     * Get payment by ID
     */
    getById: async (id: number): Promise<ApiResponse<Payment>> => {
        const response = await apiClient.get<ApiResponse<Payment>>(
            `/api/v1/payments/${id}/`
        );
        return response.data;
    },

    /**
     * Record new payment
     */
    create: async (data: CreatePaymentData): Promise<ApiResponse<Payment>> => {
        const response = await apiClient.post<ApiResponse<Payment>>(
            '/api/v1/payments/',
            data
        );
        return response.data;
    },

    /**
     * Get payments for a specific student
     */
    getByStudent: async (studentId: number): Promise<ApiResponse<Payment[]>> => {
        const response = await apiClient.get<ApiResponse<Payment[]>>(
            `/api/v1/payments/student/${studentId}/`
        );
        return response.data;
    },

    /**
     * Delete payment (soft delete, Admin only)
     */
    delete: async (id: number): Promise<ApiResponse<{ message: string }>> => {
        const response = await apiClient.delete<ApiResponse<{ message: string }>>(
            `/api/v1/payments/${id}/`
        );
        return response.data;
    },

    /**
     * Get pending fees for current student
     */
    getStudentPendingFees: async (): Promise<ApiResponse<PendingFee[]>> => {
        const response = await apiClient.get<ApiResponse<PendingFee[]>>(
            '/api/v1/payments/student/pending-fees/'
        );
        return response.data;
    },

    /**
     * Create Razorpay Order (amount calculated by backend)
     */
    createRazorpayOrder: async (data: { enrollment_id: number }): Promise<any> => {
        const response = await apiClient.post(
            '/api/v1/payments/razorpay/create-order/',
            data
        );
        return response.data;
    },

    /**
     * Verify Razorpay Payment
     */
    verifyRazorpayPayment: async (data: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
        payment_id?: number;
    }): Promise<any> => {
        const response = await apiClient.post(
            '/api/v1/payments/razorpay/verify/',
            data
        );
        return response.data;
    },
    /**
     * Get payments for the current student
     */
    getMyPayments: async (): Promise<ApiResponse<Payment[]>> => {
        const response = await apiClient.get<ApiResponse<Payment[]>>(
            '/api/v1/payments/my-payments/'
        );
        return response.data;
    },

    /**
     * Download receipt (legacy - downloads file)
     */
    downloadReceipt: async (id: number): Promise<void> => {
        try {
            const response = await apiClient.get(
                `/api/v1/payments/${id}/download_receipt/`,
                { responseType: 'blob' }
            );

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Receipt_${id}.pdf`);
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

    /**
     * Open receipt in new tab
     */
    openReceiptInNewTab: async (id: number): Promise<void> => {
        try {
            const response = await apiClient.get(
                `/api/v1/payments/${id}/download_receipt/`,
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

    /**
     * Student initiating an offline payment (Cash/Cheque)
     */
    studentInitiateOffline: async (data: CreatePaymentData): Promise<ApiResponse<Payment>> => {
        const response = await apiClient.post<ApiResponse<Payment>>(
            '/api/v1/payments/student-initiate-offline/',
            data
        );
        return response.data;
    },

    /**
     * Admin/Staff confirming an offline payment
     */
    confirmPayment: async (id: number): Promise<ApiResponse<Payment>> => {
        const response = await apiClient.post<ApiResponse<Payment>>(
            `/api/v1/payments/${id}/confirm/`
        );
        return response.data;
    },

    /**
     * Get summary stats
     */
    getStats: async (): Promise<ApiResponse<{ total_paid: number; total_pending: number; total_transactions: number }>> => {
        const response = await apiClient.get<ApiResponse<{ total_paid: number; total_pending: number; total_transactions: number }>>(
            '/api/v1/payments/stats/'
        );
        return response.data;
    },

    /**
     * Export Pending Fees Report as CSV
     */
    exportPendingFeesCsv: async () => {
        const response = await apiClient.get('/api/v1/payments/export_pending_fees_csv/', {
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'pending_fees_due_report.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    /**
     * Export Payment Transaction Audit Report as CSV
     */
    exportTransactionAuditCsv: async (params?: any) => {
        const response = await apiClient.get('/api/v1/payments/export_transaction_audit_csv/', {
            params,
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'payment_transaction_audit.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    /**
     * Export Pending Fees Report as PDF
     */
    exportPendingFeesPdf: async () => {
        const response = await apiClient.get('/api/v1/payments/export_pending_fees_pdf/', {
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'pending_fees_report.pdf');
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    /**
     * Export Payment Transaction Audit Report as PDF
     */
    exportTransactionAuditPdf: async () => {
        const response = await apiClient.get('/api/v1/payments/export_transaction_audit_pdf/', {
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'transaction_audit.pdf');
        document.body.appendChild(link);
        link.click();
        link.remove();
    },
    /**
     * Helper to download files
     */
    downloadFile: async (url: string, filename: string, params: any = {}) => {
        try {
            const response = await apiClient.get(url, {
                params,
                responseType: 'blob'
            });
            const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
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

export interface PendingFee {
    id: number;
    enrollment_id: string;
    subject_name: string;
    total_fee: number;
    paid_amount: number;
    pending_amount: number;
    payment_status: string;
}
