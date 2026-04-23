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

// ── Report 3: Date-wise Subject-wise Fee Collection ───────────────────────────
export interface SubjectDateWiseBatchRow {
    batch_time: string;
    student_count: number;
    fees_collected: number;
}

export interface SubjectDateWiseSubjectRow {
    subject_name: string;
    batches: SubjectDateWiseBatchRow[];
    subject_total_students: number;
    subject_total_fees: number;
}

export interface SubjectDateWiseFeeReport {
    start_date: string;
    end_date: string;
    subjects: SubjectDateWiseSubjectRow[];
    grand_total_students: number;
    grand_total_fees: number;
}

// ── Report 4: Enrollment & Payment Report ────────────────────────────────────
export interface EnrollmentPaymentReportRow {
    sr_no: number;
    student_name: string;
    student_id: string;
    subject: string;
    batch_time: string;
    enrollment_dt: string;
    paid_amount: number;
    pending_amount: number;
    total_fee: number;
    pay_mode: string;
    pay_status: string;
    pay_id: string;
    pay_ref: string;
    phone: string;
    receipt_id: string;
}

export interface EnrollmentPaymentReport {
    rows: EnrollmentPaymentReportRow[];
    summary: {
        total_records: number;
        grand_paid: number;
        grand_pending: number;
        grand_total: number;
    };
    filters: {
        start_date: string;
        end_date: string;
        subject_id: string | null;
        batch_time: string | null;
    };
}

// ── Report 5: Subject-wise Total Summary ─────────────────────────────────────
export interface SubjectTotalSummaryRow {
    sr_no: number;
    subject_name: string;
    total_students: number;
    total_fees: number;
}

export interface SubjectTotalSummaryReport {
    rows: SubjectTotalSummaryRow[];
    summary: {
        grand_students: number;
        grand_fees: number;
    };
    filters: {
        start_date: string;
        end_date: string;
    };
}

export interface SubjectBatchEnrollmentReportRow {
    subject_name: string;
    batch_time: string;
    student_name: string;
    student_id: string;
    login_id: string;
    enrollment_date: string;
    enrollment_id: string;
    password: string;
    total_fee: number;
    paid_amount: number;
    pending_amount: number;
    payment_mode: string;
    payment_status: string;
    payment_id: string;
    payment_reference_no: string;
    phone_number: string;
    receipt_id: string;
    payment_date: string;
    payment_time: string;
}

export interface SubjectBatchEnrollmentReport {
    subject_id: number;
    subject_name: string;
    batch: string;
    start_date: string;
    end_date: string;
    generated_at: string;
    rows: SubjectBatchEnrollmentReportRow[];
    summary: {
        total_students: number;
        total_fees: number;
        total_enrolled: number;
        total_paid: number;
        total_pending: number;
        online_payments: number;
        offline_payments: number;
    };
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

    getSubjectBatchEnrollmentReport: async (
        subject_id: number,
        batch: string,
        start_date: string,
        end_date: string
    ): Promise<ApiResponse<SubjectBatchEnrollmentReport>> => {
        const response = await apiClient.get<ApiResponse<SubjectBatchEnrollmentReport>>(
            '/api/v1/analytics/subject_batch_enrollment_report/',
            { params: { subject_id, batch, start_date, end_date } }
        );
        return response.data;
    },

    exportSubjectBatchEnrollmentReportCsv: async (
        subject_id: number,
        batch: string,
        start_date: string,
        end_date: string
    ) =>
        analyticsApi.downloadFile(
            '/api/v1/analytics/export_subject_batch_enrollment_report_csv/',
            `subject_batch_enrollment_report_${subject_id}_${batch}_${start_date}_to_${end_date}.csv`,
            { subject_id, batch, start_date, end_date }
        ),

    exportSubjectBatchEnrollmentReportPdf: async (
        subject_id: number,
        batch: string,
        start_date: string,
        end_date: string
    ) =>
        analyticsApi.downloadFile(
            '/api/v1/analytics/export_subject_batch_enrollment_report_pdf/',
            `subject_batch_enrollment_report_${subject_id}_${batch}_${start_date}_to_${end_date}.pdf`,
            { subject_id, batch, start_date, end_date }
        ),

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

    // ── Report 3: Date-wise Subject-wise Fee Collection ─────────────────────
    getSubjectDateWiseFeeReport: async (
        start_date: string,
        end_date: string,
        subject_ids?: number[]
    ): Promise<ApiResponse<SubjectDateWiseFeeReport>> => {
        const params: any = { start_date, end_date };
        if (subject_ids && subject_ids.length > 0) {
            params.subject_ids = subject_ids.join(',');
        }
        const response = await apiClient.get<ApiResponse<SubjectDateWiseFeeReport>>(
            '/api/v1/analytics/subject_date_wise_fee_report/',
            { params }
        );
        return response.data;
    },

    exportSubjectDateWiseFeeReportCsv: async (
        start_date: string,
        end_date: string,
        subject_ids?: number[]
    ) => {
        const params: any = { start_date, end_date };
        if (subject_ids && subject_ids.length > 0) {
            params.subject_ids = subject_ids.join(',');
        }
        return analyticsApi.downloadFile(
            '/api/v1/analytics/export_subject_date_wise_fee_report_csv/',
            `subject-date-wise-fee-${start_date}-to-${end_date}.csv`,
            params
        );
    },

    exportSubjectDateWiseFeeReportPdf: async (
        start_date: string,
        end_date: string,
        subject_ids?: number[]
    ) => {
        const params: any = { start_date, end_date };
        if (subject_ids && subject_ids.length > 0) {
            params.subject_ids = subject_ids.join(',');
        }
        return analyticsApi.downloadFile(
            '/api/v1/analytics/export_subject_date_wise_fee_report_pdf/',
            `subject-date-wise-fee-${start_date}-to-${end_date}.pdf`,
            params
        );
    },

    // ── Report 4: Enrollment & Payment Report ────────────────────────────────
    getEnrollmentPaymentReport: async (
        startDate: string,
        endDate: string,
        subjectId?: string,
        batchTime?: string
    ): Promise<ApiResponse<EnrollmentPaymentReport>> => {
        const params: Record<string, string> = { start_date: startDate, end_date: endDate };
        if (subjectId) params.subject_id = subjectId;
        if (batchTime)  params.batch_time  = batchTime;
        const response = await apiClient.get<ApiResponse<EnrollmentPaymentReport>>(
            '/api/v1/analytics/enrollment_payment_report/', { params }
        );
        return response.data;
    },

    exportEnrollmentPaymentReportCsv: async (
        startDate: string,
        endDate: string,
        subjectId?: string,
        batchTime?: string
    ): Promise<void> => {
        const params: Record<string, string> = { start_date: startDate, end_date: endDate };
        if (subjectId) params.subject_id = subjectId;
        if (batchTime)  params.batch_time  = batchTime;
        const response = await apiClient.get(
            '/api/v1/analytics/export_enrollment_payment_report_csv/', { params, responseType: 'blob' }
        );
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `Enrollment_Payment_Report_${startDate}_to_${endDate}.csv`;
        document.body.appendChild(a); a.click(); a.remove();
        window.URL.revokeObjectURL(url);
    },

    exportEnrollmentPaymentReportPdf: async (
        startDate: string,
        endDate: string,
        subjectId?: string,
        batchTime?: string
    ): Promise<void> => {
        const params: Record<string, string> = { start_date: startDate, end_date: endDate };
        if (subjectId) params.subject_id = subjectId;
        if (batchTime)  params.batch_time  = batchTime;
        const response = await apiClient.get(
            '/api/v1/analytics/export_enrollment_payment_report_pdf/', { params, responseType: 'blob' }
        );
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `Enrollment_Payment_Report_${startDate}_to_${endDate}.pdf`;
        document.body.appendChild(a); a.click(); a.remove();
        window.URL.revokeObjectURL(url);
    },

    // ── Report 5: Subject-wise Total Summary ─────────────────────────────────
    getSubjectTotalSummaryReport: async (
        start_date: string,
        end_date: string,
        subject_ids?: number[]
    ): Promise<ApiResponse<SubjectTotalSummaryReport>> => {
        const params: any = { start_date, end_date };
        if (subject_ids && subject_ids.length > 0) {
            params.subject_ids = subject_ids.join(',');
        }
        const response = await apiClient.get<ApiResponse<SubjectTotalSummaryReport>>(
            '/api/v1/analytics/subject_total_summary_report/',
            { params }
        );
        return response.data;
    },

    exportSubjectTotalSummaryCsv: async (start_date: string, end_date: string) =>
        analyticsApi.downloadFile(
            '/api/v1/analytics/export_subject_total_summary_csv/',
            `Subject_Total_Summary_Report_${start_date}_to_${end_date}.csv`,
            { start_date, end_date }
        ),

    exportSubjectTotalSummaryPdf: async (start_date: string, end_date: string) =>
        analyticsApi.downloadFile(
            '/api/v1/analytics/export_subject_total_summary_pdf/',
            `Subject_Total_Summary_Report_${start_date}_to_${end_date}.pdf`,
            { start_date, end_date }
        ),

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
