import apiClient from './client';
import { ApiResponse } from './auth';
import { Payment } from './payments';

export interface FeeLedgerEntry {
    id: number;
    student: number;
    student_name: string;
    student_id_code: string;
    transaction_type: 'PAYMENT' | 'REFUND' | 'ADJUSTMENT';
    amount: number;
    reference_payment?: number;
    reference_payment_id?: string;
    created_by: number;
    created_by_name: string;
    notes: string;
    created_at: string;
}

export interface AccountantDashboardStats {
    today_collection: number;
    monthly_revenue: number;
    outstanding_fees: number;
    recent_transactions: Payment[];
}

export interface StudentLedgerResponse {
    entries: FeeLedgerEntry[];
    outstanding_balance: number;
}

export const ledgerApi = {
    /**
     * Get accountant dashboard statistics
     */
    getDashboardStats: async (): Promise<ApiResponse<AccountantDashboardStats>> => {
        const response = await apiClient.get<ApiResponse<AccountantDashboardStats>>('/api/v1/payments/dashboard/');
        return response.data;
    },

    /**
     * Get fee ledger entries with filtering
     */
    getLedgerEntries: async (params?: {
        student_id?: number;
        transaction_type?: string;
        search?: string;
        page?: number;
    }): Promise<any> => {
        const response = await apiClient.get('/api/v1/payments/ledger/', { params });
        return response.data;
    },

    /**
     * Get specific student's ledger
     */
    getStudentLedger: async (studentId: number): Promise<ApiResponse<StudentLedgerResponse>> => {
        const response = await apiClient.get<ApiResponse<StudentLedgerResponse>>(`/api/v1/payments/ledger/student/${studentId}/`);
        return response.data;
    }
};
