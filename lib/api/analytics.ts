/**
 * Analytics API service
 */

import apiClient from './client';
import { ApiResponse } from './auth';

export interface DashboardStats {
    total_students: number;
    total_revenue: number;
    total_pending: number;
    today_revenue: number;
    growth_rate: number;
    new_students_this_month: number;
}

export interface PaymentTrend {
    month: string;
    full_date: string;
    amount: number;
}

export interface SubjectDistribution {
    name: string;
    value: number;
    percentage: number;
    fill: string;
}

export interface PaymentStatusDistribution {
    name: string;
    value: number;
    percentage: number;
    color: string;
}

export interface DateWiseFeeReportRow {
    date: string;
    online_fees: number;
    offline_fees: number;
    total_fees: number;
    cumulative_total: number;
}

export interface DateWiseFeeReport {
    start_date: string;
    end_date: string;
    rows: DateWiseFeeReportRow[];
    grand_total: number;
    final_cumulative_total: number;
}

export interface SubjectWiseDailyFeeReportRow {
    subject_name: string;
    total_students: number;
    total_fees_collected: number;
}

export interface SubjectWiseDailyFeeReport {
    date: string;
    rows: SubjectWiseDailyFeeReportRow[];
    grand_total: number;
}

export const analyticsApi = {
    /**
     * Get high-level dashboard stats
     */
    getDashboardStats: async (period?: string, start_date?: string, end_date?: string): Promise<ApiResponse<DashboardStats>> => {
        const response = await apiClient.get<ApiResponse<DashboardStats>>(
            '/api/v1/analytics/dashboard_stats/',
            { params: { period, start_date, end_date } }
        );
        return response.data;
    },

    /**
     * Get payment trends
     */
    getPaymentTrends: async (period?: string, start_date?: string, end_date?: string): Promise<ApiResponse<PaymentTrend[]>> => {
        const response = await apiClient.get<ApiResponse<PaymentTrend[]>>(
            '/api/v1/analytics/payment_trends/',
            { params: { period, start_date, end_date } }
        );
        return response.data;
    },

    /**
     * Get subject distribution
     */
    getSubjectDistribution: async (): Promise<ApiResponse<SubjectDistribution[]>> => {
        const response = await apiClient.get<ApiResponse<SubjectDistribution[]>>(
            '/api/v1/analytics/subject_distribution/'
        );
        return response.data;
    },

    /**
     * Get payment status distribution
     */
    getPaymentStatusDistribution: async (period?: string, start_date?: string, end_date?: string): Promise<ApiResponse<PaymentStatusDistribution[]>> => {
        const response = await apiClient.get<ApiResponse<PaymentStatusDistribution[]>>(
            '/api/v1/analytics/payment_status_distribution/',
            { params: { period, start_date, end_date } }
        );
        return response.data;
    },

    /**
     * Helper to download files
     */
    downloadFile: async (url: string, filename: string, params: any = {}) => {
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
    },

    exportMonthlyCollectionCsv: async () =>
        analyticsApi.downloadFile('/api/v1/analytics/export_monthly_collection_csv/', 'monthly_collection.csv'),

    exportMonthlyCollectionPdf: async () =>
        analyticsApi.downloadFile('/api/v1/analytics/export_monthly_collection_pdf/', 'monthly_collection.pdf'),

    exportEnrollmentReportCsv: async () =>
        analyticsApi.downloadFile('/api/v1/analytics/export_enrollment_report_csv/', 'enrollment_report.csv'),

    exportEnrollmentReportPdf: async () =>
        analyticsApi.downloadFile('/api/v1/analytics/export_enrollment_report_pdf/', 'enrollment_report.pdf'),

    exportDailyCollectionCsv: async (date?: string) =>
        analyticsApi.downloadFile('/api/v1/analytics/export_daily_collection_csv/', `daily_collection_${date || 'today'}.csv`, { date }),

    exportDailyCollectionPdf: async (date?: string) =>
        analyticsApi.downloadFile('/api/v1/analytics/export_daily_collection_pdf/', `daily_collection_${date || 'today'}.pdf`, { date }),

    exportSubjectReportPdf: async () =>
        analyticsApi.downloadFile('/api/v1/analytics/export_subject_report_pdf/', 'subject_wise_report.pdf'),

    exportBatchReportCsv: async () =>
        analyticsApi.downloadFile('/api/v1/analytics/export_batch_report_csv/', 'batch_wise_report.csv'),

    exportBatchReportPdf: async () =>
        analyticsApi.downloadFile('/api/v1/analytics/export_batch_report_pdf/', 'batch_wise_report.pdf'),

    exportTotalEnrollmentsCsv: async () =>
        analyticsApi.downloadFile('/api/v1/analytics/export_total_enrollments_csv/', 'detailed_enrollments.csv'),

    exportTotalEnrollmentsPdf: async () =>
        analyticsApi.downloadFile('/api/v1/analytics/export_total_enrollments_pdf/', 'detailed_enrollments.pdf'),

    exportTimeIntervalReportCsv: async (start_hour: number, end_hour: number) =>
        analyticsApi.downloadFile('/api/v1/analytics/export_time_interval_report_csv/', 'timing_report.csv', { start_hour, end_hour }),

    exportTimeIntervalReportPdf: async (start_hour: number, end_hour: number) =>
        analyticsApi.downloadFile('/api/v1/analytics/export_time_interval_report_pdf/', 'timing_report.pdf', { start_hour, end_hour }),

    getDateWiseFeeReport: async (start_date: string, end_date: string): Promise<ApiResponse<DateWiseFeeReport>> => {
        const response = await apiClient.get<ApiResponse<DateWiseFeeReport>>(
            '/api/v1/analytics/date_wise_fee_report/',
            { params: { start_date, end_date } }
        );
        return response.data;
    },

    exportDateWiseFeeReportCsv: async (start_date: string, end_date: string) =>
        analyticsApi.downloadFile('/api/v1/analytics/export_date_wise_fee_report_csv/', `fee-report-${start_date}-to-${end_date}.csv`, { start_date, end_date }),

    exportDateWiseFeeReportPdf: async (start_date: string, end_date: string) =>
        analyticsApi.downloadFile('/api/v1/analytics/export_date_wise_fee_report_pdf/', `fee-report-${start_date}-to-${end_date}.pdf`, { start_date, end_date }),

    getSubjectWiseDailyFeeReport: async (date: string): Promise<ApiResponse<SubjectWiseDailyFeeReport>> => {
        const response = await apiClient.get<ApiResponse<SubjectWiseDailyFeeReport>>(
            '/api/v1/analytics/subject_wise_daily_fee_report/',
            { params: { date } }
        );
        return response.data;
    },

    exportSubjectWiseDailyFeeReportCsv: async (date: string) =>
        analyticsApi.downloadFile('/api/v1/analytics/export_subject_wise_daily_fee_report_csv/', `subject-report-${date}.csv`, { date }),

    exportSubjectWiseDailyFeeReportPdf: async (date: string) =>
        analyticsApi.downloadFile('/api/v1/analytics/export_subject_wise_daily_fee_report_pdf/', `subject-report-${date}.pdf`, { date }),

    /**
     * Get statistics for the current student
     */
    getStudentStats: async (): Promise<ApiResponse<any>> => {
        const response = await apiClient.get<ApiResponse<any>>('/api/v1/analytics/student-stats/');
        return response.data;
    },

    // ===== NEW REPORT ENDPOINTS (Session 12) =====

    getOnlineRazorpayReport: async (): Promise<ApiResponse<any>> => {
        const response = await apiClient.get<ApiResponse<any>>(
            '/api/v1/analytics/online_razorpay_report/'
        );
        return response.data;
    },

    exportOnlineRazorpayReportCsv: async () =>
        analyticsApi.downloadFile('/api/v1/analytics/export_online_razorpay_report_csv/', 'online_razorpay_report.csv'),

    exportOnlineRazorpayReportPdf: async () =>
        analyticsApi.downloadFile('/api/v1/analytics/export_online_razorpay_report_pdf/', 'online_razorpay_report.pdf'),

    getOnlineBalkanjiReport: async (): Promise<ApiResponse<any>> => {
        const response = await apiClient.get<ApiResponse<any>>(
            '/api/v1/analytics/online_balkanji_bari_report/'
        );
        return response.data;
    },

    exportOnlineBalkanjiReportCsv: async () =>
        analyticsApi.downloadFile('/api/v1/analytics/export_online_balkanji_bari_report_csv/', 'online_balkanji_bari_report.csv'),

    exportOnlineBalkanjiReportPdf: async () =>
        analyticsApi.downloadFile('/api/v1/analytics/export_online_balkanji_bari_report_pdf/', 'online_balkanji_bari_report.pdf'),

    getSubjectwiseTotalReport: async (): Promise<ApiResponse<any>> => {
        const response = await apiClient.get<ApiResponse<any>>(
            '/api/v1/analytics/subjectwise_total_report/'
        );
        return response.data;
    },

    exportSubjectwiseTotalReportCsv: async () =>
        analyticsApi.downloadFile('/api/v1/analytics/export_subjectwise_total_report_csv/', 'subjectwise_total_report.csv'),

    exportSubjectwiseTotalReportPdf: async () =>
        analyticsApi.downloadFile('/api/v1/analytics/export_subjectwise_total_report_pdf/', 'subjectwise_total_report.pdf'),

    // ===== Session 14: Comprehensive Admin Analytics =====

    /**
     * Get comprehensive admin dashboard data
     * Includes all students, fees, subjects, payments data
     */
    getAdminDashboardComprehensive: async (): Promise<ApiResponse<any>> => {
        const response = await apiClient.get<ApiResponse<any>>(
            '/api/v1/analytics/admin_dashboard_comprehensive/'
        );
        return response.data;
    },

    /**
     * Get lightweight dashboard summary
     * Quick load with only key metrics
     */
    getAdminDashboardSummary: async (): Promise<ApiResponse<any>> => {
        const response = await apiClient.get<ApiResponse<any>>(
            '/api/v1/analytics/admin_dashboard_summary/'
        );
        return response.data;
    },
};
